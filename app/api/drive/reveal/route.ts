import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateCompetitionScores } from '@/lib/scoring'

export async function POST(req: NextRequest) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { competition_id } = await req.json()
    if (!competition_id) return NextResponse.json({ error: 'Missing competition_id' }, { status: 400 })

    try {
        // 1. Check competition exists and has results
        const { data: comp } = await supabase
            .from('competitions')
            .select('id, name, results_visible, drive_file_id')
            .eq('id', competition_id)
            .single()

        if (!comp) return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
        if (comp.results_visible) return NextResponse.json({ error: 'Results already revealed' }, { status: 400 })

        // 2. Calculate scores
        const { updated } = await calculateCompetitionScores(competition_id)

        // 3. Reveal results + update status
        await supabase
            .from('competitions')
            .update({ results_visible: true, status: 'results_in' })
            .eq('id', competition_id)

        // 4. Update drive_files sync_status
        if (comp.drive_file_id) {
            await supabase
                .from('drive_files')
                .update({ sync_status: 'synced' })
                .eq('drive_file_id', comp.drive_file_id)
        }

        return NextResponse.json({
            success:      true,
            predictions_scored: updated,
            competition:  comp.name,
        })

    } catch (err: any) {
        console.error('Reveal error:', err)
        return NextResponse.json({ error: err.message ?? 'Reveal failed' }, { status: 500 })
    }
}