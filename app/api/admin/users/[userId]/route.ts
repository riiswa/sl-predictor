import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    const supabase = await createClient()
    const { userId } = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (userId === user.id) return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })

    const { role } = await req.json()
    if (!['admin', 'user'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

    const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
