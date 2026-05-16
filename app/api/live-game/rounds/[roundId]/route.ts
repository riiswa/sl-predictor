import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ATTEMPT_POINTS = [1, 2, 4]

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ roundId: string }> }
) {
    const { roundId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { action, result } = await req.json()
    const admin = createAdminClient()

    if (action === 'close') {
        const { error } = await admin
            .from('live_game_rounds')
            .update({ state: 'closed', closed_at: new Date().toISOString() })
            .eq('id', roundId)
            .eq('state', 'open')

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    }

    if (action === 'reveal') {
        if (!result || !['YES', 'NO', 'DNF'].includes(result)) {
            return NextResponse.json({ error: 'Invalid result' }, { status: 400 })
        }

        const { data: round } = await admin
            .from('live_game_rounds')
            .select('attempt, session_id')
            .eq('id', roundId)
            .single()

        if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

        // Update round state first (triggers realtime)
        const { error: roundError } = await admin
            .from('live_game_rounds')
            .update({ state: 'revealed', result, revealed_at: new Date().toISOString() })
            .eq('id', roundId)

        if (roundError) return NextResponse.json({ error: roundError.message }, { status: 500 })

        // Award points if not DNF
        if (result !== 'DNF') {
            const points = ATTEMPT_POINTS[round.attempt - 1]

            const { data: votes } = await admin
                .from('live_game_votes')
                .select('user_id, vote')
                .eq('round_id', roundId)
                .eq('vote', result)

            const winners = (votes ?? []).map(v => v.user_id)

            if (winners.length > 0) {
                // Fetch current scores for winners
                const { data: current } = await admin
                    .from('live_game_scores')
                    .select('user_id, total_points')
                    .eq('session_id', round.session_id)
                    .in('user_id', winners)

                const currentMap = new Map((current ?? []).map(s => [s.user_id, s.total_points]))

                const upsertRows = winners.map(uid => ({
                    session_id:   round.session_id,
                    user_id:      uid,
                    total_points: (currentMap.get(uid) ?? 0) + points,
                    updated_at:   new Date().toISOString(),
                }))

                await admin
                    .from('live_game_scores')
                    .upsert(upsertRows, { onConflict: 'session_id,user_id' })
            }
        }

        return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
