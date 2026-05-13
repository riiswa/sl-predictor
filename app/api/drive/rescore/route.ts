import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateCompetitionScores } from '@/lib/scoring'

export async function POST(req: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { competition_id } = await req.json()
    if (!competition_id) return NextResponse.json({ error: 'Missing competition_id' }, { status: 400 })

    try {
        const { data: comp } = await supabase
            .from('competitions')
            .select('id, results_visible')
            .eq('id', competition_id)
            .single()

        if (!comp) return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
        if (!comp.results_visible) return NextResponse.json({ error: 'Results must be revealed to rescore' }, { status: 400 })

        // Re-calculate scores with current config (this creates a new scoring run)
        const { updated, scoring_run_id } = await calculateCompetitionScores(competition_id, user.id)

        return NextResponse.json({
            success:           true,
            predictions_scored: updated,
            scoring_run_id,
            competition_id,
        })

    } catch (err: any) {
        console.error('Rescore error:', err)
        return NextResponse.json({ error: err.message ?? 'Rescore failed' }, { status: 500 })
    }
}
