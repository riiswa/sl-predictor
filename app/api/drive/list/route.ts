import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listDriveFiles } from '@/lib/google-drive'

export async function GET() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const driveFiles = await listDriveFiles()

        const { data: dbFiles } = await supabase.from('drive_files').select('*')
        const dbMap: Record<string, any> = {}
        for (const f of dbFiles ?? []) dbMap[f.drive_file_id] = f

        for (const file of driveFiles) {
            const existing      = dbMap[file.id]
            const driveModified = new Date(file.modifiedTime)

            if (!existing) {
                await supabase.from('drive_files').insert({
                    drive_file_id: file.id,
                    file_name:     file.name,
                    mime_type:     file.mimeType,
                    modified_time: file.modifiedTime,
                    sync_status:   'new',
                    has_results:   false,
                })
            } else {
                const lastSynced = existing.last_synced_at ? new Date(existing.last_synced_at) : null
                if (!lastSynced || driveModified > lastSynced) {
                    await supabase
                        .from('drive_files')
                        .update({
                            file_name:     file.name,
                            mime_type:     file.mimeType,
                            modified_time: file.modifiedTime,
                            sync_status:
                                existing.sync_status === 'synced' || existing.sync_status === 'results_pending'
                                    ? 'outdated'
                                    : existing.sync_status,
                        })
                        .eq('drive_file_id', file.id)
                }
            }
        }

        const { data: updatedFiles } = await supabase
            .from('drive_files')
            .select('*, competitions(name, status, results_visible)')
            .order('file_name')

        return NextResponse.json({ files: updatedFiles ?? [] })

    } catch (err: any) {
        console.error('Drive list error:', err)
        return NextResponse.json({ error: err.message ?? 'Failed to list Drive files' }, { status: 500 })
    }
}