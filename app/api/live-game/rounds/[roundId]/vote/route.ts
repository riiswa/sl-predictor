import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ roundId: string }> }
) {
    const { roundId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { vote } = await req.json()
    if (!['YES', 'NO'].includes(vote)) return NextResponse.json({ error: 'Invalid vote' }, { status: 400 })

    // Verify round is still open
    const { data: round } = await supabase
        .from('live_game_rounds')
        .select('state')
        .eq('id', roundId)
        .single()

    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    if (round.state !== 'open') return NextResponse.json({ error: 'Voting is closed' }, { status: 400 })

    const { error } = await supabase
        .from('live_game_votes')
        .insert({ round_id: roundId, user_id: user.id, vote, submitted_at: new Date().toISOString() })

    if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'Already voted' }, { status: 400 })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
