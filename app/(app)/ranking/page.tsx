import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'

export default async function RankingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: profile } = await supabase
        .from('profiles')
        .select('username, total_points, season_rank')
        .eq('id', user!.id)
        .single()

    return (
        <div>
            <PageHeader
                tag="Season 2026"
                title="RANKING"
                subtitle="Updated after each competition · Full leaderboard coming in Phase 5"
            />

            <div className="max-w-7xl mx-auto px-6 py-16">

                {/* Personal stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px mb-16">
                    {[
                        { val: profile?.total_points?.toLocaleString() ?? '0', key: 'Your Points' },
                        { val: profile?.season_rank ? `#${profile.season_rank}` : '—', key: 'Your Rank' },
                        { val: '0',   key: 'Competitions' },
                        { val: '—',   key: 'Accuracy' },
                    ].map(stat => (
                        <div key={stat.key} className="bg-blue/8 border border-blue/20 px-6 py-5 relative overflow-hidden group">
                            <div className="absolute bottom-0 left-0 w-full h-px bg-blue-light/40 group-hover:bg-accent/60 transition-colors" />
                            <div className="font-bebas text-4xl text-white leading-none">{stat.val}</div>
                            <div className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted mt-1">{stat.key}</div>
                        </div>
                    ))}
                </div>

                {/* Placeholder leaderboard */}
                <div className="border border-blue/20">
                    <div className="grid grid-cols-[48px_1fr_100px_80px] gap-3 px-5 py-3 border-b border-blue/20">
                        {['#', 'Player', 'Points', 'Accuracy'].map(h => (
                            <div key={h} className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted">{h}</div>
                        ))}
                    </div>

                    {/* Your row highlighted */}
                    <div className="grid grid-cols-[48px_1fr_100px_80px] gap-3 px-5 py-4 items-center bg-blue/15 border-l-2 border-accent">
                        <div className="font-bebas text-xl text-gray-muted">
                            {profile?.season_rank ?? '—'}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue border border-blue-light flex items-center justify-center font-bebas text-sm">
                                {profile?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-condensed font-semibold text-white">
                                    {profile?.username}
                                    <span className="text-accent text-xs ml-2 font-normal">You</span>
                                </div>
                            </div>
                        </div>
                        <div className="font-bebas text-2xl text-yellow-400">
                            {profile?.total_points?.toLocaleString() ?? '0'}
                        </div>
                        <div className="font-condensed text-sm text-gray-muted">—</div>
                    </div>

                    {/* Empty state */}
                    <div className="px-5 py-12 text-center border-t border-blue/10">
                        <p className="font-bebas text-2xl tracking-wide text-gray-muted/40 mb-2">
                            FULL LEADERBOARD — PHASE 5
                        </p>
                        <p className="text-gray-muted/30 text-sm font-condensed tracking-wide">
                            Rankings will populate after the first competition results are in.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}