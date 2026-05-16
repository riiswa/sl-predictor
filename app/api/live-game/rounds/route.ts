import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { session_id, athlete_id, movement, attempt, weight_kg } = await req.json()
    if (!session_id || !athlete_id || !movement || !attempt) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Ensure no other round is already open or closed
    const { data: existing } = await admin
        .from('live_game_rounds')
        .select('id, state')
        .eq('session_id', session_id)
        .in('state', ['open', 'closed'])
        .limit(1)
        .maybeSingle()

    if (existing) return NextResponse.json({ error: 'A round is already active' }, { status: 400 })

    const { data: round, error } = await admin
        .from('live_game_rounds')
        .insert({ session_id, athlete_id, movement, attempt, weight_kg, state: 'open', opened_at: new Date().toISOString() })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(round)
}
