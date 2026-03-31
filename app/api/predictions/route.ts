import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { competition_id, podium, p4p, strongest } = body

    // 1. Fetch competition — check status + deadline
    const { data: comp } = await supabase
        .from('competitions')
        .select('status, prediction_deadline, scoring_config')
        .eq('id', competition_id)
        .single()

    if (!comp) return NextResponse.json({ error: 'Competition not found' }, { status: 404 })

    if (comp.status !== 'open') {
        return NextResponse.json({ error: 'Competition is not open for predictions' }, { status: 400 })
    }

    if (new Date() > new Date(comp.prediction_deadline)) {
        return NextResponse.json({ error: 'Prediction deadline has passed' }, { status: 400 })
    }

    // 2. Check for existing predictions (no duplicates)
    const { count } = await supabase
        .from('predictions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('competition_id', competition_id)

    if ((count ?? 0) > 0) {
        return NextResponse.json({ error: 'You have already submitted predictions for this competition' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // 3. Build predictions rows
    const rows: any[] = []

    // Podium predictions (module: 'podium')
    if (podium) {
        for (const [category_id, picks] of Object.entries(podium as Record<string, any[]>)) {
            for (const pick of picks) {
                rows.push({
                    user_id:        user.id,
                    competition_id,
                    category_id,
                    module:         'podium',
                    position:       pick.position,
                    athlete_id:     pick.athlete_id,
                    submitted_at:   now,
                })
            }
        }
    }

    // P4P predictions (module: 'p4p_men' | 'p4p_women')
    if (p4p) {
        for (const pick of (p4p.men ?? [])) {
            rows.push({
                user_id:        user.id,
                competition_id,
                category_id:    null,
                module:         'p4p_men',
                position:       pick.position,
                athlete_id:     pick.athlete_id,
                submitted_at:   now,
            })
        }
        for (const pick of (p4p.women ?? [])) {
            rows.push({
                user_id:        user.id,
                competition_id,
                category_id:    null,
                module:         'p4p_women',
                position:       pick.position,
                athlete_id:     pick.athlete_id,
                submitted_at:   now,
            })
        }
    }

    // 4. Insert predictions
    if (rows.length > 0) {
        const { error } = await supabase.from('predictions').insert(rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 5. Handle strongest streetlifter (season prediction — separate table)
    if (strongest) {
        const seasonRows = []
        if (strongest.men_athlete_id) {
            // Check if already submitted for this season+gender
            const { count } = await supabase
                .from('season_predictions')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('season', 2026)
                .eq('gender', 'men')

            if ((count ?? 0) === 0) {
                seasonRows.push({
                    user_id:    user.id,
                    season:     2026,
                    gender:     'men',
                    athlete_id: strongest.men_athlete_id,
                    submitted_at: now,
                })
            }
        }
        if (strongest.women_athlete_id) {
            const { count } = await supabase
                .from('season_predictions')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('season', 2026)
                .eq('gender', 'women')

            if ((count ?? 0) === 0) {
                seasonRows.push({
                    user_id:    user.id,
                    season:     2026,
                    gender:     'women',
                    athlete_id: strongest.women_athlete_id,
                    submitted_at: now,
                })
            }
        }
        if (seasonRows.length > 0) {
            const { error } = await supabase.from('season_predictions').insert(seasonRows)
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        }
    }

    return NextResponse.json({ success: true, predictions_count: rows.length })
}