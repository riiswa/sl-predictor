import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ compId: string }> }
) {
    const { compId } = await params
    const supabase   = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: comp } = await supabase
        .from('competitions').select('id, name, drive_file_id').eq('id', compId).single()
    if (!comp) return NextResponse.json({ error: 'Competition not found' }, { status: 404 })

    // Delete in order (respecting foreign key constraints)
    await supabase.from('predictions') .delete().eq('competition_id', compId)
    await supabase.from('results')     .delete().eq('competition_id', compId)
    await supabase.from('athletes')    .delete().eq('competition_id', compId)
    await supabase.from('categories')  .delete().eq('competition_id', compId)

    // Unlink drive file (don't delete the file record, just unlink)
    if (comp.drive_file_id) {
        await supabase
            .from('drive_files')
            .update({ competition_id: null, sync_status: 'new', has_results: false, last_synced_at: null })
            .eq('drive_file_id', comp.drive_file_id)
    }

    await supabase.from('competitions').delete().eq('id', compId)

    return NextResponse.json({ success: true, deleted: comp.name })
}