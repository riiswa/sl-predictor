import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { competition_id } = await req.json()
    if (!competition_id) return NextResponse.json({ error: 'Missing competition_id' }, { status: 400 })

    const { data: comp } = await supabase
        .from('competitions').select('id, results_visible').eq('id', competition_id).single()

    if (!comp) return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    if (!comp.results_visible) return NextResponse.json({ error: 'Results are not revealed yet' }, { status: 400 })

    // 1. Reset predictions scores for this competition
    const { error: predError } = await supabase
        .from('predictions')
        .update({ points_earned: null, is_exact: null, is_partial: null })
        .eq('competition_id', competition_id)

    if (predError) return NextResponse.json({ error: `Failed to reset predictions: ${predError.message}` }, { status: 500 })

    // 2. Mark ledger rows as inactive instead of deleting (non-destructive)
    const { error: ledgerError } = await supabase
        .from('competition_scores')
        .update({ is_active: false })
        .eq('competition_id', competition_id)
        .eq('is_active', true)

    if (ledgerError) return NextResponse.json({ error: `Failed to deactivate scores: ${ledgerError.message}` }, { status: 500 })

    // 3. Reset competition flags
    const { error: compError } = await supabase
        .from('competitions')
        .update({ results_visible: false, status: 'closed' })
        .eq('id', competition_id)

    if (compError) return NextResponse.json({ error: `Failed to update competition: ${compError.message}` }, { status: 500 })

    return NextResponse.json({ success: true })
}
