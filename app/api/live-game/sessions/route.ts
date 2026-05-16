import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { competition_id, category_id } = await req.json()
    if (!competition_id || !category_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const admin = createAdminClient()

    // Close any existing active session
    await admin.from('live_game_sessions').update({ status: 'completed' }).eq('status', 'active')

    const { data: session, error } = await admin
        .from('live_game_sessions')
        .insert({ competition_id, category_id, status: 'active' })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(session)
}
