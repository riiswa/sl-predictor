import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/admin/StatusBadge'

export default async function AdminPage() {
    const supabase = await createClient()

    const { data: competitions } = await supabase
        .from('competitions')
        .select('id, name, flag, country, date_start, date_end, prediction_deadline, status, organizer')
        .order('date_start', { ascending: true })

    const { data: driveFiles } = await supabase
        .from('drive_files')
        .select('sync_status')

    const needsAttention = driveFiles?.filter(
        f => f.sync_status === 'new' || f.sync_status === 'outdated' || f.sync_status === 'results_pending'
    ).length ?? 0

    const counts = {
        upcoming: competitions?.filter(c => c.status === 'upcoming').length ?? 0,
        open:     competitions?.filter(c => c.status === 'open').length ?? 0,
        closed:   competitions?.filter(c => c.status === 'closed').length ?? 0,
        done:     competitions?.filter(c => c.status === 'results_in').length ?? 0,
    }

    return (
        <div>
            <PageHeader
                tag="Admin"
                title="DASHBOARD"
                subtitle="Manage competitions, rosters and results"
            >
                <div className="flex gap-2">
                    <Link href="/admin/users">
                        <Button variant="ghost" size="md">Users</Button>
                    </Link>
                    <Link href="/admin/drive">
                        <Button size="md">
                            Drive Sync {needsAttention > 0 && `(${needsAttention})`}
                        </Button>
                    </Link>
                </div>
            </PageHeader>

            <div className="max-w-7xl mx-auto px-6 py-10">

                {/* Drive alert if files need attention */}
                {needsAttention > 0 && (
                    <div className="border border-yellow-400/20 bg-yellow-400/5 px-5 py-4 mb-8 flex items-center justify-between">
                        <p className="font-condensed text-sm text-yellow-400 tracking-wide">
                            ⚠ {needsAttention} Drive file{needsAttention > 1 ? 's' : ''} need{needsAttention === 1 ? 's' : ''} attention
                        </p>
                        <Link href="/admin/drive">
                            <Button size="sm" variant="ghost">Go to Drive Sync →</Button>
                        </Link>
                    </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-px mb-10">
                    {[
                        { val: competitions?.length ?? 0, label: 'Total',       color: 'text-white' },
                        { val: counts.open,               label: 'Open',        color: 'text-green-400' },
                        { val: counts.upcoming,           label: 'Upcoming',    color: 'text-yellow-400' },
                        { val: counts.done,               label: 'Results in',  color: 'text-blue-light' },
                    ].map(s => (
                        <div key={s.label} className="bg-blue/8 border border-blue/20 px-6 py-5">
                            <div className={`font-bebas text-4xl leading-none ${s.color}`}>{s.val}</div>
                            <div className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Competition list */}
                {!competitions || competitions.length === 0 ? (
                    <div className="border border-blue/20 px-6 py-20 text-center">
                        <p className="font-bebas text-3xl tracking-wide text-gray-muted/40 mb-3">NO COMPETITIONS YET</p>
                        <p className="text-gray-muted/40 text-sm font-condensed tracking-wide mb-6">
                            Add a CSV file to your Drive folder and sync it to create your first competition.
                        </p>
                        <Link href="/admin/drive">
                            <Button size="md">Go to Drive Sync →</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="border border-blue/20">
                        {/* Desktop header */}
                        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 px-5 py-3 border-b border-blue/20">
                            {['Competition', 'Date', 'Deadline', 'Status', 'Actions'].map(h => (
                                <div key={h} className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted">{h}</div>
                            ))}
                        </div>

                        {competitions.map((comp, i) => (
                            <div
                                key={comp.id}
                                className={`transition-colors hover:bg-blue/8 ${i < competitions.length - 1 ? 'border-b border-blue/10' : ''}`}
                            >
                                {/* Desktop row */}
                                <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 px-5 py-4 items-center">
                                    <div>
                                        <div className="font-condensed font-semibold text-white flex items-center gap-2">
                                            {comp.flag && <span>{comp.flag}</span>}
                                            {comp.name}
                                        </div>
                                        <div className="text-gray-muted text-xs mt-0.5">{comp.organizer}</div>
                                    </div>
                                    <div className="font-condensed text-sm text-gray-muted">
                                        {new Date(comp.date_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        {comp.date_end && comp.date_end !== comp.date_start && (
                                            <span> → {new Date(comp.date_end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                        )}
                                    </div>
                                    <div className="font-condensed text-sm text-gray-muted">
                                        {new Date(comp.prediction_deadline).toLocaleDateString('en-GB', {
                                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </div>
                                    <div><StatusBadge status={comp.status} /></div>
                                    <div>
                                        <Link href={`/admin/${comp.id}`}>
                                            <Button variant="ghost" size="sm">Manage</Button>
                                        </Link>
                                    </div>
                                </div>

                                {/* Mobile card */}
                                <div className="md:hidden px-4 py-4 flex flex-col gap-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="font-condensed font-semibold text-white flex items-center gap-2">
                                                {comp.flag && <span>{comp.flag}</span>}
                                                {comp.name}
                                            </div>
                                            <div className="text-gray-muted text-xs mt-0.5">{comp.organizer}</div>
                                        </div>
                                        <StatusBadge status={comp.status} />
                                    </div>
                                    <div className="mt-1">
                                        <Link href={`/admin/${comp.id}`}>
                                            <Button variant="ghost" size="sm" className="w-full">Manage</Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}