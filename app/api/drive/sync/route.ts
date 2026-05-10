import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readDriveFile } from '@/lib/google-drive'
import { parseRoster } from '@/lib/csv-parser'
import { computeRIS } from '@/lib/scoring'

export async function POST(req: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { drive_file_id, metadata } = body
    if (!drive_file_id) return NextResponse.json({ error: 'Missing drive_file_id' }, { status: 400 })

    try {
        const { data: driveFile } = await supabase
            .from('drive_files')
            .select('*')
            .eq('drive_file_id', drive_file_id)
            .single()

        if (!driveFile) return NextResponse.json({ error: 'Drive file not found' }, { status: 404 })

        const isNew = !driveFile.competition_id
        if (isNew && !metadata) {
            return NextResponse.json({ error: 'Metadata required for new competition' }, { status: 400 })
        }

        // Download + parse
        const fileData = await readDriveFile(drive_file_id, driveFile.mime_type)
        const { athletes, hasResults, categories } = parseRoster(fileData, driveFile.file_name)

        if (athletes.length === 0) {
            return NextResponse.json({ error: 'No athletes found in file' }, { status: 400 })
        }

        // Create or update competition
        let competitionId: string

        if (isNew) {
            const { data: newComp, error: compError } = await supabase
                .from('competitions')
                .insert({
                    name:                metadata.name,
                    country:             metadata.country,
                    flag:                metadata.flag || '',
                    organizer:           metadata.organizer || '',
                    date_start:          metadata.date_start,
                    date_end:            metadata.date_end || metadata.date_start,
                    prediction_deadline: metadata.prediction_deadline,
                    drive_file_id,
                    status:              'upcoming',
                    results_visible:     false,
                    scoring_config: {
                        podium: { points_exact: 10, points_partial: 5, positions: 3 },
                        p4p:    { points_exact: 20, points_partial: 10, positions: 3 },
                    },
                })
                .select('id')
                .single()

            if (compError) throw new Error(compError.message)
            competitionId = newComp.id

            await supabase
                .from('drive_files')
                .update({ competition_id: competitionId })
                .eq('drive_file_id', drive_file_id)
        } else {
            competitionId = driveFile.competition_id
            if (metadata) {
                await supabase.from('competitions').update({
                    name:                metadata.name,
                    country:             metadata.country,
                    flag:                metadata.flag,
                    organizer:           metadata.organizer,
                    date_start:          metadata.date_start,
                    date_end:            metadata.date_end || metadata.date_start,
                    prediction_deadline: metadata.prediction_deadline,
                }).eq('id', competitionId)
            }
        }

        // Upsert categories
        const { data: existingCats } = await supabase
            .from('categories')
            .select('id, gender, weight_class')
            .eq('competition_id', competitionId)

        const existingCatMap: Record<string, string> = {}
        for (const c of existingCats ?? []) {
            existingCatMap[`${c.gender}_${c.weight_class}`] = c.id
        }

        for (const cat of categories) {
            const key = `${cat.gender}_${cat.weight_class}`
            if (!existingCatMap[key]) {
                const { data: newCat } = await supabase
                    .from('categories')
                    .insert({ ...cat, competition_id: competitionId })
                    .select('id')
                    .single()
                if (newCat) existingCatMap[key] = newCat.id
            }
        }

        // Upsert athletes
        const athleteIdMap: Record<string, string> = {}

        for (const a of athletes) {
            const catKey     = `${a.gender}_${a.weight_class}`
            const categoryId = existingCatMap[catKey]
            if (!categoryId) continue

            const { data: existing } = await supabase
                .from('athletes')
                .select('id')
                .eq('competition_id', competitionId)
                .eq('first_name', a.first_name)
                .eq('last_name', a.last_name)
                .maybeSingle()

            const baseAthleteData = {
                competition_id: competitionId,
                category_id:    categoryId,
                first_name:     a.first_name,
                last_name:      a.last_name,
                nationality:    a.nationality,
                bodyweight:     a.bodyweight,
                muscle_up:      a.muscle_up,
                pullup:         a.pullup,
                dip:            a.dip,
                squat:          a.squat,
            }

            let athleteId: string

            if (existing) {
                // For existing athlete, only update Instagram if provided in CSV
                const updateData: any = baseAthleteData
                if (a.instagram_id) {
                    updateData.instagram_id = a.instagram_id
                    updateData.instagram_is_dummy = false
                }
                await supabase.from('athletes').update(updateData).eq('id', existing.id)
                athleteId = existing.id
            } else {
                // For new athlete, set Instagram ID or generate dummy
                const athleteData = {
                    ...baseAthleteData,
                    instagram_id: a.instagram_id,
                    instagram_is_dummy: false,
                }
                const { data: inserted } = await supabase
                    .from('athletes')
                    .insert(athleteData)
                    .select('id')
                    .single()
                athleteId = inserted!.id

                // Generate dummy Instagram ID if not provided
                if (!a.instagram_id) {
                    const dummyId = `dummy_${athleteId}`
                    await supabase.from('athletes').update({
                        instagram_id: dummyId,
                        instagram_is_dummy: true,
                    }).eq('id', athleteId)
                }
            }

            const key = `${a.gender}_${a.weight_class}_${a.first_name}_${a.last_name}`
            athleteIdMap[key] = athleteId
        }

        // Compute results if lifts are present
        const warnings: string[] = []
        let missingDataCount = 0

        if (hasResults) {
            // Group athletes by category to compute ranks
            const catAthletes: Record<string, {
                athleteId: string
                ris_score: number | null
                dnf: boolean
                missing_data: boolean
                muscle_up: number | null
                pullup: number | null
                dip: number | null
                squat: number | null
            }[]> = {}

            for (const a of athletes) {
                const catKey     = `${a.gender}_${a.weight_class}`
                const categoryId = existingCatMap[catKey]
                const athleteKey = `${a.gender}_${a.weight_class}_${a.first_name}_${a.last_name}`
                const athleteId  = athleteIdMap[athleteKey]

                if (!categoryId || !athleteId) continue

                // Skip athletes with no lifts at all
                if (a.muscle_up === null && a.pullup === null && a.dip === null && a.squat === null) continue

                const { ris_score, dnf, missing_data } = computeRIS(
                    a.muscle_up, a.pullup, a.dip, a.squat, a.bodyweight
                )

                if (missing_data) {
                    missingDataCount++
                    warnings.push(`${a.first_name} ${a.last_name}: bodyweight missing — RIS not computed`)
                }

                if (!catAthletes[categoryId]) catAthletes[categoryId] = []
                catAthletes[categoryId].push({ athleteId, ris_score, dnf, missing_data, muscle_up: a.muscle_up, pullup: a.pullup, dip: a.dip, squat: a.squat })
            }

            // Compute rank_in_category per category
            for (const [categoryId, catEntries] of Object.entries(catAthletes)) {
                // Sort: valid RIS scores first (desc), then DNF, then missing data
                const sorted = [...catEntries].sort((a, b) => {
                    if (a.ris_score !== null && b.ris_score !== null) return b.ris_score - a.ris_score
                    if (a.ris_score !== null) return -1
                    if (b.ris_score !== null) return 1
                    return 0
                })

                let rank = 1
                for (const entry of sorted) {
                    const rankValue = entry.dnf || entry.missing_data ? null : rank

                    const resultData = {
                        competition_id:   competitionId,
                        category_id:      categoryId,
                        athlete_id:       entry.athleteId,
                        rank_in_category: rankValue,
                        ris_score:        entry.ris_score,
                        muscle_up:        entry.muscle_up,
                        pullup:           entry.pullup,
                        dip:              entry.dip,
                        squat:            entry.squat,
                        dnf:              entry.dnf,
                        disqualified:     false,
                        category_changed: false,
                        missing_data:     entry.missing_data,
                        imported_at:      new Date().toISOString(),
                    }

                    const { data: existingResult } = await supabase
                        .from('results')
                        .select('id')
                        .eq('competition_id', competitionId)
                        .eq('athlete_id', entry.athleteId)
                        .maybeSingle()

                    if (existingResult) {
                        await supabase.from('results').update(resultData).eq('id', existingResult.id)
                    } else {
                        await supabase.from('results').insert(resultData)
                    }

                    if (!entry.dnf && !entry.missing_data) rank++
                }
            }
        }

        const newStatus = hasResults
            ? (missingDataCount > 0 ? 'results_pending' : 'results_pending')
            : 'synced'

        await supabase
            .from('drive_files')
            .update({
                last_synced_at: new Date().toISOString(),
                sync_status:    newStatus,
                has_results:    hasResults,
                competition_id: competitionId,
            })
            .eq('drive_file_id', drive_file_id)

        return NextResponse.json({
            success:          true,
            competition_id:   competitionId,
            athletes_count:   athletes.length,
            categories_count: categories.length,
            has_results:      hasResults,
            missing_data:     missingDataCount,
            warnings,
            status:           newStatus,
        })

    } catch (err: any) {
        console.error('Drive sync error:', err)
        return NextResponse.json({ error: err.message ?? 'Sync failed' }, { status: 500 })
    }
}