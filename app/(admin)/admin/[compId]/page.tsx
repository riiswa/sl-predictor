import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/admin/StatusBadge'
import StatusChanger from '@/components/admin/StatusChanger'
import DeleteCategoryButton from '@/components/admin/DeleteCategoryButton'

export default async function ManageCompPage({ params }: { params: Promise<{ compId: string }> }) {
    const { compId } = await params
    const supabase   = await createClient()

    const { data: comp } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', compId)
        .single()

    if (!comp) notFound()

    const { data: categories } = await supabase
        .from('categories')
        .select('id, name, gender, weight_class, display_order')
        .eq('competition_id', compId)
        .order('display_order')

    const { data: athletes } = await supabase
        .from('athletes')
        .select('id, first_name, last_name, nationality, category_id')
        .eq('competition_id', compId)
        .order('last_name')

    const { count: predictionsCount } = await supabase
        .from('predictions')
        .select('id', { count: 'exact', head: true })
        .eq('competition_id', compId)

    return (
        <div>
            <PageHeader
                tag={`Admin — ${comp.flag ?? ''} ${comp.country}`}
                title={comp.name}
                subtitle={`${new Date(comp.date_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} · ${comp.organizer ?? ''}`}
            >
                <div className="flex gap-2">
                    <Link href="/admin/drive">
                        <Button variant="ghost" size="md">Drive Sync</Button>
                    </Link>
                    <Link href="/admin">
                        <Button variant="ghost" size="md">← Back</Button>
                    </Link>
                </div>
            </PageHeader>

            <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-8">

                {/* Status + quick stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px">
                    {[
                        { val: <StatusBadge status={comp.status} />, label: 'Status' },
                        { val: categories?.length ?? 0,             label: 'Categories' },
                        { val: athletes?.length ?? 0,               label: 'Athletes' },
                        { val: predictionsCount ?? 0,               label: 'Predictions submitted' },
                    ].map((s, i) => (
                        <div key={i} className="bg-blue/8 border border-blue/20 px-6 py-5">
                            <div className="font-bebas text-3xl leading-none text-white mb-1">{s.val}</div>
                            <div className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Status changer */}
                <div className="border border-blue/20 p-6">
                    <p className="font-condensed text-xs tracking-[4px] uppercase text-accent mb-5">Change Status</p>
                    <StatusChanger compId={compId} currentStatus={comp.status} />
                </div>

                {/* Scoring config */}
                <div className="border border-blue/20 p-6">
                    <p className="font-condensed text-xs tracking-[4px] uppercase text-accent mb-4">Scoring Config</p>
                    <div className="grid grid-cols-2 gap-px">
                        <div className="bg-dark/60 px-5 py-4 border border-blue/10">
                            <p className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted mb-3">The Podium</p>
                            <div className="flex gap-6">
                                <div>
                                    <div className="font-bebas text-2xl text-green-400">{comp.scoring_config?.podium?.points_exact ?? 10}</div>
                                    <div className="text-xs text-gray-muted font-condensed tracking-wide">Exact rank</div>
                                </div>
                                <div>
                                    <div className="font-bebas text-2xl text-yellow-400">{comp.scoring_config?.podium?.points_partial ?? 5}</div>
                                    <div className="text-xs text-gray-muted font-condensed tracking-wide">Partial</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-dark/60 px-5 py-4 border border-blue/10">
                            <p className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted mb-3">P4P (RIS)</p>
                            <div className="flex gap-6">
                                <div>
                                    <div className="font-bebas text-2xl text-green-400">{comp.scoring_config?.p4p?.points_exact ?? 20}</div>
                                    <div className="text-xs text-gray-muted font-condensed tracking-wide">Exact rank</div>
                                </div>
                                <div>
                                    <div className="font-bebas text-2xl text-yellow-400">{comp.scoring_config?.p4p?.points_partial ?? 10}</div>
                                    <div className="text-xs text-gray-muted font-condensed tracking-wide">Partial</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p className="text-gray-muted/40 text-xs font-condensed mt-3">
                        To change scoring, edit the <code className="text-gray-muted">scoring_config</code> JSON directly in Supabase → competitions table.
                    </p>
                </div>

                {/* Categories */}
                <div className="border border-blue/20 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <p className="font-condensed text-xs tracking-[4px] uppercase text-accent">
                            Categories ({categories?.length ?? 0})
                        </p>
                    </div>

                    {!categories || categories.length === 0 ? (
                        <div className="py-4">
                            <p className="text-gray-muted/40 text-sm font-condensed tracking-wide mb-3">
                                No categories yet.
                            </p>
                            <p className="text-gray-muted/30 text-xs font-condensed">
                                Categories are auto-detected from the roster file.{' '}
                                <Link href="/admin/drive" className="text-blue-light hover:text-white transition-colors">
                                    Go to Drive Sync →
                                </Link>
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-px">
                            {categories.map(cat => (
                                <div key={cat.id} className="bg-dark/60 border border-blue/10 px-4 py-3 flex items-center justify-between">
                                    <div>
                                        <div className="font-condensed font-semibold text-sm text-white">{cat.name}</div>
                                        <div className="text-xs text-gray-muted">
                                            {athletes?.filter(a => a.category_id === cat.id).length ?? 0} athletes
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`font-condensed text-xs px-2 py-0.5 ${
                                            cat.gender === 'women' ? 'text-pink-400 bg-pink-400/10' : 'text-blue-light bg-blue/20'
                                        }`}>
                                            {cat.gender === 'women' ? 'W' : 'M'}
                                        </div>
                                        <DeleteCategoryButton catId={cat.id} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Athletes */}
                <div className="border border-blue/20 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <p className="font-condensed text-xs tracking-[4px] uppercase text-accent">
                            Athletes ({athletes?.length ?? 0})
                        </p>
                        <Link href="/admin/drive">
                            <Button variant="ghost" size="sm">Update via Drive →</Button>
                        </Link>
                    </div>

                    {!athletes || athletes.length === 0 ? (
                        <div>
                            <p className="text-gray-muted/40 text-sm font-condensed tracking-wide mb-2">
                                No athletes yet.
                            </p>
                            <p className="text-gray-muted/30 text-xs font-condensed">
                                Upload a roster file in{' '}
                                <Link href="/admin/drive" className="text-blue-light hover:text-white transition-colors">
                                    Drive Sync
                                </Link>{' '}
                                to import athletes automatically.
                            </p>
                        </div>
                    ) : (
                        <div className="border border-blue/10">
                            <div className="grid grid-cols-[1fr_1fr_80px_1fr] gap-3 px-4 py-2 border-b border-blue/10">
                                {['First name', 'Last name', 'Nat.', 'Category'].map(h => (
                                    <div key={h} className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted">{h}</div>
                                ))}
                            </div>
                            {athletes.slice(0, 20).map(a => (
                                <div key={a.id} className="grid grid-cols-[1fr_1fr_80px_1fr] gap-3 px-4 py-3 border-b border-blue/5 hover:bg-blue/5">
                                    <div className="font-condensed text-sm text-white">{a.first_name}</div>
                                    <div className="font-condensed text-sm text-white">{a.last_name}</div>
                                    <div className="font-condensed text-sm text-gray-muted">{a.nationality}</div>
                                    <div className="font-condensed text-xs text-gray-muted">
                                        {categories?.find(c => c.id === a.category_id)?.name ?? '—'}
                                    </div>
                                </div>
                            ))}
                            {athletes.length > 20 && (
                                <div className="px-4 py-3 text-center text-gray-muted/40 text-xs font-condensed">
                                    +{athletes.length - 20} more athletes
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}