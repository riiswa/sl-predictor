import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import DriveDashboardClient from './DriveDashboardClient'

export default async function DrivePage() {
    const supabase = await createClient()

    const { data: driveFiles } = await supabase
        .from('drive_files')
        .select('*, competitions(name, status, results_visible)')
        .order('file_name')

    const counts = {
        total:           driveFiles?.length ?? 0,
        new:             driveFiles?.filter(f => f.sync_status === 'new').length ?? 0,
        outdated:        driveFiles?.filter(f => f.sync_status === 'outdated').length ?? 0,
        results_pending: driveFiles?.filter(f => f.sync_status === 'results_pending').length ?? 0,
        synced:          driveFiles?.filter(f => f.sync_status === 'synced').length ?? 0,
    }

    return (
        <div>
            <PageHeader
                tag="Admin — Drive"
                title="DRIVE SYNC"
                subtitle="Manage competition data from Google Drive CSV files"
            >
                <Link href="/admin">
                    <Button variant="ghost" size="md">← Dashboard</Button>
                </Link>
            </PageHeader>

            <div className="max-w-7xl mx-auto px-6 py-10">

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px mb-8">
                    {[
                        { val: counts.total,           label: 'Total files',      color: 'text-white' },
                        { val: counts.new + counts.outdated, label: 'Need sync', color: 'text-yellow-400' },
                        { val: counts.results_pending, label: 'Results pending',  color: 'text-orange-400' },
                        { val: counts.synced,          label: 'Up to date',       color: 'text-green-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-blue/8 border border-blue/20 px-6 py-5">
                            <div className={`font-bebas text-4xl leading-none ${s.color}`}>{s.val}</div>
                            <div className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>

                <DriveDashboardClient initialFiles={driveFiles ?? []} />
            </div>
        </div>
    )
}