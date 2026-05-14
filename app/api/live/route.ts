import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('live_sessions')
        .select('is_active, sheet_id, label')
        .single()
    return NextResponse.json(data ?? { is_active: false, sheet_id: null, label: null })
}

export async function POST(req: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { is_active, sheet_id, label } = await req.json()

    const { error } = await supabase
        .from('live_sessions')
        .upsert({ id: true, is_active, sheet_id: sheet_id || null, label: label || null, updated_at: new Date().toISOString() })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
