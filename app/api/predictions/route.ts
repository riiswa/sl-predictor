import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function validateP4P(p4p: any): string | null {
    if (!p4p) return null

    const validateGender = (picks: any[] | undefined, gender: string) => {
        if (!picks || picks.length === 0) return null
        const athleteIds = picks.map(p => p.athlete_id)
        const uniqueIds = new Set(athleteIds)
        if (uniqueIds.size !== athleteIds.length) {
            return `${gender} P4P: Cannot pick same athlete in multiple positions`
        }
        return null
    }

    const menError = validateGender(p4p.men, 'Men')
    if (menError) return menError

    const womenError = validateGender(p4p.women, 'Women')
    if (womenError) return womenError

    return null
}

function buildRows(userId: string, competitionId: string, podium: any, p4p: any, now: string) {
    const rows: any[] = []

    if (podium) {
        for (const [category_id, picks] of Object.entries(podium as Record<string, any[]>)) {
            for (const pick of picks) {
                rows.push({
                    user_id:        userId,
                    competition_id: competitionId,
                    category_id,
                    module:         'podium',
                    position:       pick.position,
                    athlete_id:     pick.athlete_id,
                    submitted_at:   now,
                })
            }
        }
    }

    if (p4p) {
        for (const pick of (p4p.men ?? [])) {
            rows.push({
                user_id:        userId,
                competition_id: competitionId,
                category_id:    null,
                module:         'p4p_men',
                position:       pick.position,
                athlete_id:     pick.athlete_id,
                submitted_at:   now,
            })
        }
        for (const pick of (p4p.women ?? [])) {
            rows.push({
                user_id:        userId,
                competition_id: competitionId,
                category_id:    null,
                module:         'p4p_women',
                position:       pick.position,
                athlete_id:     pick.athlete_id,
                submitted_at:   now,
            })
        }
    }

    return rows
}

// ── POST — first submission ─────────────────────────────

export async function POST(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { competition_id, podium, p4p } = body

    const p4pError = validateP4P(p4p)
    if (p4pError) return NextResponse.json({ error: p4pError }, { status: 400 })

    const { data: comp } = await supabase
        .from('competitions')
        .select('status, prediction_deadline')
        .eq('id', competition_id)
        .single()

    if (!comp) return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    if (comp.status !== 'open') return NextResponse.json({ error: 'Competition is not open' }, { status: 400 })
    if (new Date() > new Date(comp.prediction_deadline)) return NextResponse.json({ error: 'Deadline has passed' }, { status: 400 })

    const { count } = await supabase
        .from('predictions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('competition_id', competition_id)

    if ((count ?? 0) > 0) return NextResponse.json({ error: 'Already submitted — use PUT to modify' }, { status: 400 })

    const now  = new Date().toISOString()
    const rows = buildRows(user.id, competition_id, podium, p4p, now)

    if (rows.length === 0) return NextResponse.json({ error: 'No predictions provided' }, { status: 400 })

    const { error } = await supabase.from('predictions').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, predictions_count: rows.length })
}

// ── PUT — modify existing predictions ──────────────────────

export async function PUT(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { competition_id, podium, p4p } = body

    const p4pError = validateP4P(p4p)
    if (p4pError) return NextResponse.json({ error: p4pError }, { status: 400 })

    const { data: comp } = await supabase
        .from('competitions')
        .select('status, prediction_deadline')
        .eq('id', competition_id)
        .single()

    if (!comp) return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    if (comp.status !== 'open') return NextResponse.json({ error: 'Competition is not open' }, { status: 400 })
    if (new Date() > new Date(comp.prediction_deadline)) return NextResponse.json({ error: 'Deadline has passed' }, { status: 400 })

    // Delete all existing predictions for this user + competition
    // Uses admin client because the predictions table has no own_delete RLS policy
    const adminSupabase = createAdminClient()
    const { error: deleteError } = await adminSupabase
        .from('predictions')
        .delete()
        .eq('user_id', user.id)
        .eq('competition_id', competition_id)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    // Re-check deadline before insert (race condition protection)
    const { data: compAfterDelete } = await supabase
        .from('competitions')
        .select('status, prediction_deadline')
        .eq('id', competition_id)
        .single()

    if (!compAfterDelete) return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    if (compAfterDelete.status !== 'open') return NextResponse.json({ error: 'Competition is not open' }, { status: 400 })
    if (new Date() > new Date(compAfterDelete.prediction_deadline)) return NextResponse.json({ error: 'Deadline has passed' }, { status: 400 })

    // Re-insert with new submitted_at (tiebreaker resets)
    const now  = new Date().toISOString()
    const rows = buildRows(user.id, competition_id, podium, p4p, now)

    if (rows.length === 0) return NextResponse.json({ error: 'No predictions provided' }, { status: 400 })

    const { error: insertError } = await supabase.from('predictions').insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ success: true, predictions_count: rows.length, updated: true })
}
