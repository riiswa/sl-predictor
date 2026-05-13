import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import AccountSettings from '@/components/profile/AccountSettings'
import Medal from '@/components/ui/Medal'

interface Athlete {
    id: string
    first_name: string
    last_name: string
    nationality: string | null
}

interface Category {
    id: string
    gender: string
    weight_class: string
}

interface Competition {
    id: string
    name: string
    flag: string | null
    status: string
    results_visible: boolean
    date_start: string
}

interface Prediction {
    id: string
    module: string
    position: number
    points_earned: number | null
    is_exact: boolean | null
    is_partial: boolean | null
    submitted_at: string
    competitions: Competition | null
    athletes: Athlete | null
    categories: Category | null
}

interface CompEntry {
    comp: Competition
    predictions: Prediction[]
    points: number
    exact: number
    partial: number
    total: number
}

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('predictor_standings')
        .select('id, username, country, total_points, season_rank, total_predictions, correct_predictions, role')
        .eq('id', user.id)
        .single()

    const { data: predictions } = await supabase
        .from('predictions')
        .select(`
            id, module, position, points_earned, is_exact, is_partial, submitted_at,
            competitions ( id, name, flag, status, results_visible, date_start ),
            athletes ( id, first_name, last_name, nationality ),
            categories ( id, gender, weight_class )
        `)
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false }) as { data: Prediction[] | null }

    const byComp: Record<string, CompEntry> = {}

    for (const pred of predictions ?? []) {
        if (!pred.competitions?.id) continue
        const compId = pred.competitions.id

        if (!byComp[compId]) {
            byComp[compId] = {
                comp: pred.competitions,
                predictions: [],
                points: 0,
                exact: 0,
                partial: 0,
                total: 0
            }
        }
        byComp[compId].predictions.push(pred)
        byComp[compId].total++
        if (pred.points_earned) byComp[compId].points += pred.points_earned
        if (pred.is_exact) byComp[compId].exact++
        if (pred.is_partial) byComp[compId].partial++
    }

    const compEntries = Object.values(byComp).sort(
        (a, b) => new Date(b.comp.date_start).getTime() - new Date(a.comp.date_start).getTime()
    )

    const accuracy     = profile && profile.total_predictions > 0
        ? Math.round((profile.correct_predictions / profile.total_predictions) * 100)
        : null
    const totalExact   = compEntries.reduce((s, c) => s + c.exact, 0)
    const totalPartial = compEntries.reduce((s, c) => s + c.partial, 0)
    const totalMissed  = compEntries.reduce((s, c) => s + (c.total - c.exact - c.partial), 0)
    const totalPreds   = totalExact + totalPartial + totalMissed

    return (
        <div>
            <PageHeader
                tag="Season 2026"
                title={profile?.username ?? 'Profile'}
                subtitle={`${profile?.country ?? ''} · Season 2026`}
            />

            <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px">
                    {[
                        { val: profile?.total_points?.toLocaleString() ?? '0', label: 'Points',   color: 'text-yellow-400', sub: 'season total' },
                        { val: profile?.season_rank ? `#${profile.season_rank}` : '—', label: 'Rank', color: 'text-white', sub: 'global' },
                        { val: profile?.total_predictions?.toString() ?? '0',   label: 'Picks',   color: 'text-white',      sub: 'submitted' },
                        { val: accuracy !== null ? `${accuracy}%` : '—',        label: 'Accuracy',color: 'text-blue-light', sub: 'exact + partial' },
                    ].map(s => (
                        <div key={s.label} className="bg-blue/8 border border-blue/30 px-4 sm:px-6 py-6 relative group overflow-hidden shadow-lg shadow-blue/10 transition-all duration-300 hover:shadow-xl hover:shadow-blue/20 rounded-sm">
                            <div className="absolute bottom-0 left-0 w-full h-px bg-blue-light/20 group-hover:bg-accent/50 transition-colors duration-300" />
                            <div className={`font-bebas text-4xl leading-none ${s.color}`}>{s.val}</div>
                            <div className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted mt-2">{s.label}</div>
                            <div className="font-condensed text-xs text-gray-muted/50 mt-1">{s.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Accuracy breakdown bar */}
                {totalPreds > 0 && (
                    <div className="border border-blue/30 p-6 shadow-lg shadow-blue/10 rounded-sm">
                        <p className="font-condensed text-xs tracking-[4px] uppercase text-accent mb-5">Season Breakdown</p>
                        <div className="flex flex-col gap-4">
                            <div className="flex h-2 gap-px overflow-hidden">
                                {totalExact > 0 && (
                                    <div className="bg-green-400" style={{ width: `${(totalExact / totalPreds) * 100}%` }} />
                                )}
                                {totalPartial > 0 && (
                                    <div className="bg-yellow-400" style={{ width: `${(totalPartial / totalPreds) * 100}%` }} />
                                )}
                                {totalMissed > 0 && (
                                    <div className="bg-blue/20" style={{ width: `${(totalMissed / totalPreds) * 100}%` }} />
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-px">
                                {[
                                    { count: totalExact,   label: 'Exact',   color: 'text-green-400',  dot: 'bg-green-400',  pts: '10/20 pts' },
                                    { count: totalPartial, label: 'Partial',  color: 'text-yellow-400', dot: 'bg-yellow-400', pts: '5/10 pts'  },
                                    { count: totalMissed,  label: 'Missed',   color: 'text-gray-muted', dot: 'bg-blue/20',    pts: '0 pts'     },
                                ].map(s => (
                                    <div key={s.label} className="bg-dark/40 border border-blue/10 px-4 py-3 flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                                        <div>
                                            <p className={`font-bebas text-2xl leading-none ${s.color}`}>{s.count}</p>
                                            <p className="font-condensed text-xs text-gray-muted tracking-wide">{s.label}</p>
                                            <p className="font-condensed text-xs text-gray-muted/50">{s.pts}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* History */}
                {/* Account settings */}
                <div className="flex flex-col gap-4">
                    <p className="font-condensed text-xs tracking-[4px] uppercase text-accent">Account Settings</p>
                    <AccountSettings email={user.email ?? ''} username={profile?.username ?? ''} />
                </div>

                {compEntries.length === 0 ? (
                    <div className="border border-blue/30 px-6 py-20 text-center">
                        <p className="font-bebas text-3xl tracking-wide text-gray-muted/60 mb-2">NO PREDICTIONS YET</p>
                        <p className="text-gray-muted/50 text-sm font-condensed">Submit your first predictions when a competition opens.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <p className="font-condensed text-xs tracking-[4px] uppercase text-accent">Prediction History</p>
                        {compEntries.map(({ comp, predictions: preds, points, exact, partial, total }) => {
                            const hasResults  = comp.results_visible
                            const missed      = total - exact - partial
                            const podiumPreds = preds.filter((p) => p.module === 'podium')
                            const p4pMen      = preds.filter((p) => p.module === 'p4p_men')
                            const p4pWomen    = preds.filter((p) => p.module === 'p4p_women')

                            return (
                                <div key={comp.id} className="border border-blue/30 overflow-hidden shadow-lg shadow-blue/10 rounded-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue/20">
                                    <div className="flex items-center justify-between px-5 py-4 bg-blue/5 border-b border-blue/10">
                                        <div>
                                            <p className="font-condensed font-semibold text-white flex items-center gap-2">
                                                {comp.flag && <span>{comp.flag}</span>}
                                                {comp.name}
                                            </p>
                                            <p className="text-gray-muted text-xs mt-0.5 font-condensed">
                                                {new Date(comp.date_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                        {hasResults ? (
                                            <div className="text-right">
                                                <p className={`font-bebas text-3xl leading-none ${points > 0 ? 'text-yellow-400' : 'text-gray-muted'}`}>
                                                    +{points} pts
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 justify-end">
                                                    {exact > 0   && <span className="font-condensed text-xs text-green-400">{exact} exact</span>}
                                                    {partial > 0 && <span className="font-condensed text-xs text-yellow-400">{partial} partial</span>}
                                                    {missed > 0  && <span className="font-condensed text-xs text-gray-muted/60">{missed} missed</span>}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="font-condensed text-xs tracking-[2px] uppercase text-yellow-400 border border-yellow-400/30 bg-yellow-400/8 px-3 py-1">
                                                Awaiting results
                                            </span>
                                        )}
                                    </div>

                                    <div className="p-5 flex flex-col gap-5">
                                        {podiumPreds.length > 0 && (
                                            <div>
                                                <p className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted/70 mb-2">Podium</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px">
                                                    {podiumPreds
                                                        .sort((a, b) => {
                                                            const catA = a.categories ? `${a.categories.gender} ${a.categories.weight_class}` : ''
                                                            const catB = b.categories ? `${b.categories.gender} ${b.categories.weight_class}` : ''
                                                            const cat = catA.localeCompare(catB)
                                                            return cat !== 0 ? cat : a.position - b.position
                                                        })
                                                        .map((pred) => <PredRow key={pred.id} pred={pred} hasResults={hasResults} />)
                                                    }
                                                </div>
                                            </div>
                                        )}
                                        {p4pMen.length > 0 && (
                                            <div>
                                                <p className="font-condensed text-xs tracking-[3px] uppercase text-blue-light/80 mb-2">P4P Men</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px">
                                                    {p4pMen.sort((a, b) => a.position - b.position).map((pred) => (
                                                        <PredRow key={pred.id} pred={pred} hasResults={hasResults} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {p4pWomen.length > 0 && (
                                            <div>
                                                <p className="font-condensed text-xs tracking-[3px] uppercase text-pink-400/80 mb-2">P4P Women</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px">
                                                    {p4pWomen.sort((a, b) => a.position - b.position).map((pred) => (
                                                        <PredRow key={pred.id} pred={pred} hasResults={hasResults} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}


function PredRow({ pred, hasResults }: { pred: Prediction; hasResults: boolean }) {
    let borderColor = 'border-blue/10'
    let bgColor     = 'bg-dark/40'
    let badge       = null

    if (hasResults) {
        if (pred.is_exact) {
            borderColor = 'border-green-400/25'
            bgColor     = 'bg-green-400/5'
            badge = (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="font-condensed text-xs text-green-400 font-semibold">+{pred.points_earned}</span>
                </div>
            )
        } else if (pred.is_partial) {
            borderColor = 'border-yellow-400/25'
            bgColor     = 'bg-yellow-400/5'
            badge = (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="font-condensed text-xs text-yellow-400 font-semibold">+{pred.points_earned}</span>
                </div>
            )
        } else if (pred.is_exact === false && pred.is_partial === false) {
            badge = (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-muted/20" />
                    <span className="font-condensed text-xs text-gray-muted/50">0 pts</span>
                </div>
            )
        } else {
            badge = <span className="font-condensed text-xs text-gray-muted/50 flex-shrink-0">—</span>
        }
    }

    return (
        <div className={`flex items-center justify-between px-3 py-2.5 border ${borderColor} ${bgColor}`}>
            <div className="flex items-center gap-2 min-w-0">
                <Medal position={pred.position as 1|2|3} />
                <div className="min-w-0">
                    {pred.module === 'podium' && pred.categories && (
                        <p className="font-condensed text-xs text-gray-muted/60 tracking-[1px] uppercase truncate leading-tight">{pred.categories.gender === 'men' ? 'Men' : 'Women'} {pred.categories.weight_class}</p>
                    )}
                    <p className="font-condensed text-sm font-semibold text-white truncate leading-tight">
                        {pred.athletes?.first_name} {pred.athletes?.last_name}
                    </p>
                </div>
            </div>
            {badge && <div className="ml-3">{badge}</div>}
        </div>
    )
}