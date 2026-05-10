'use client'

import { useState } from 'react'
import { avatarColor } from '@/lib/avatar'
import EmptyState from '@/components/ui/EmptyState'
import { RankDisplay } from '@/components/ui/Medal'

interface Profile {
    id: string
    username: string
    total_points: number
    season_rank: number | null
    country: string | null
    total_predictions: number
    correct_predictions: number
}

interface Result {
    id: string
    rank_in_category: number | null
    ris_score: number | null
    muscle_up: number | null
    pullup: number | null
    dip: number | null
    squat: number | null
    dnf: boolean
    disqualified: boolean
    missing_data: boolean
    athletes: { id: string; first_name: string; last_name: string; nationality: string; bodyweight: number | null } | null
    categories: { id: string; name: string; gender: string; weight_class: string; competition_id: string } | null
    competitions: { id: string; name: string; flag: string | null; country: string } | null
}

interface Comp { id: string; name: string; flag: string | null }

interface Props {
    currentUserId: string
    currentProfile: Profile | null
    allProfiles: Profile[]
    results: Result[]
    visibleComps: Comp[]
}

const TABS = [
    { id: 'predictors', label: 'Predictors',   desc: 'Season leaderboard' },
    { id: 'athletes',   label: 'Athletes RIS', desc: 'Competition rankings' },
] as const

type Tab = typeof TABS[number]['id']

export default function RankingTabs({ currentUserId, currentProfile, allProfiles, results, visibleComps }: Props) {
    const [tab,         setTab]         = useState<Tab>('predictors')
    const [compFilter,  setCompFilter]  = useState<string>(visibleComps[0]?.id ?? '')
    const [genderFilter, setGenderFilter] = useState<'all' | 'men' | 'women'>('all')

    const isInTop10 = allProfiles.slice(0, 10).some(p => p.id === currentUserId)

    // Filter RIS results
    const filteredResults = results.filter(r => {
        if (compFilter && r.competitions?.id !== compFilter) return false
        if (genderFilter !== 'all' && r.categories?.gender !== genderFilter) return false
        return true
    }).sort((a, b) => (b.ris_score ?? 0) - (a.ris_score ?? 0))

    return (
        <div>
            {/* Tabs */}
            <div className="flex gap-px mb-8">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 px-5 py-3.5 text-left border transition-all relative ${
                            tab === t.id
                                ? 'bg-blue/15 border-blue-light text-white'
                                : 'bg-transparent border-blue/30 text-gray-muted hover:text-white hover:border-blue/50'
                        }`}
                    >
                        {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                        <p className="font-condensed text-sm font-semibold tracking-[1px] uppercase">{t.label}</p>
                        <p className="text-xs opacity-60 normal-case tracking-normal mt-0.5">{t.desc}</p>
                    </button>
                ))}
            </div>

            {/* ── PREDICTORS TAB ── */}
            {tab === 'predictors' && (
                <div>
                    {/* Your stats */}
                    {currentProfile && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-px mb-8">
                            {[
                                { val: currentProfile.total_points.toLocaleString(), label: 'Your Points',  color: 'text-yellow-400' },
                                { val: currentProfile.season_rank ? `#${currentProfile.season_rank}` : '—', label: 'Your Rank', color: 'text-white' },
                                { val: currentProfile.total_predictions.toString(), label: 'Predictions', color: 'text-white' },
                                {
                                    val: currentProfile.total_predictions > 0
                                        ? `${Math.round((currentProfile.correct_predictions / currentProfile.total_predictions) * 100)}%`
                                        : '—',
                                    label: 'Accuracy', color: 'text-blue-light'
                                },
                            ].map(s => (
                                <div key={s.label} className="bg-blue/8 border border-blue/20 px-6 py-5 relative group overflow-hidden">
                                    <div className="absolute bottom-0 left-0 w-full h-px bg-blue-light/20 group-hover:bg-accent/40 transition-colors" />
                                    <div className={`font-bebas text-4xl leading-none ${s.color}`}>{s.val}</div>
                                    <div className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted mt-1">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Leaderboard table */}
                    <div className="border border-blue/30">
                        <div className="hidden md:grid grid-cols-[52px_1fr_80px_100px_80px_80px] gap-4 px-5 py-3 border-b border-blue/30">
                            {['#', 'Player', 'Country', 'Points', 'Picks', 'Accuracy'].map(h => (
                                <div key={h} className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted">{h}</div>
                            ))}
                        </div>

                        {allProfiles.length === 0 ? (
                            <EmptyState icon="—" title="NO SCORES YET" subtitle="Rankings populate after the first competition results are revealed." />
                        ) : (
                            <>
                                {allProfiles.slice(0, 10).map((p, i) => {
                                    const isMe   = p.id === currentUserId
                                    const rank   = p.season_rank ?? i + 1
                                    const acc    = p.total_predictions > 0
                                        ? `${Math.round((p.correct_predictions / p.total_predictions) * 100)}%`
                                        : '—'
                                    const isTop3 = rank <= 3
                                    const top3Bg = rank === 1 ? 'bg-yellow-400/5 border-l-2 border-l-yellow-400' : rank === 2 ? 'bg-gray-400/5 border-l-2 border-l-gray-400' : rank === 3 ? 'bg-orange-400/5 border-l-2 border-l-orange-400' : ''

                                    return (
                                        <div key={p.id} className={`grid grid-cols-[52px_1fr_80px_100px_80px_80px] gap-4 px-5 items-center border-b border-blue/8 last:border-0 transition-colors ${
                                            isMe ? 'bg-blue/15 border-l-2 border-l-accent' : isTop3 ? top3Bg : 'hover:bg-blue/5'
                                        } ${isTop3 ? 'py-5' : 'py-4'}`}>
                                            <div className={`font-bebas leading-none ${isTop3 ? 'text-3xl' : 'text-2xl'}`}>
                                                <RankDisplay rank={rank} />
                                            </div>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className={`rounded-full flex items-center justify-center font-bebas flex-shrink-0 border border-white/20 ${isTop3 ? 'w-9 h-9 text-base' : 'w-8 h-8 text-sm'} ${isMe ? 'ring-2 ring-accent' : ''}`}
                                                    style={{ backgroundColor: avatarColor(p.username) }}
                                                >
                                                    {p.username.charAt(0).toUpperCase()}
                                                </div>
                                                <p className={`font-condensed font-semibold text-white truncate ${isTop3 ? 'text-base' : 'text-sm'}`}>
                                                    {p.username}
                                                    {isMe && <span className="text-accent text-xs font-normal ml-2">You</span>}
                                                </p>
                                            </div>
                                            <div className="font-condensed text-sm text-gray-muted">{p.country ?? '—'}</div>
                                            <div className={`font-bebas text-white ${isTop3 ? 'text-3xl' : 'text-2xl'}`}>{p.total_points.toLocaleString()}</div>
                                            <div className="font-condensed text-sm text-gray-muted">{p.total_predictions}</div>
                                            <div className="font-condensed text-sm text-blue-light">{acc}</div>
                                        </div>
                                    )
                                })}

                                {/* User row if not in top 10 */}
                                {!isInTop10 && currentProfile && (
                                    <>
                                        <div className="px-5 py-2 border-b border-blue/8">
                                            <p className="font-condensed text-xs text-gray-muted/30 tracking-wide">···</p>
                                        </div>
                                        <div className="grid grid-cols-[52px_1fr_80px_100px_80px_80px] gap-4 px-5 py-4 items-center bg-blue/15 border-l-2 border-l-accent">
                                            <div className="font-bebas text-2xl text-gray-muted">{currentProfile.season_rank ?? '—'}</div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bebas text-sm ring-2 ring-accent border border-white/20" style={{ backgroundColor: avatarColor(currentProfile.username) }}>
                                                    {currentProfile.username.charAt(0).toUpperCase()}
                                                </div>
                                                <p className="font-condensed font-semibold text-sm text-white">
                                                    {currentProfile.username}
                                                    <span className="text-accent text-xs font-normal ml-2">You</span>
                                                </p>
                                            </div>
                                            <div className="font-condensed text-sm text-gray-muted">{currentProfile.country ?? '—'}</div>
                                            <div className="font-bebas text-2xl text-yellow-400">{currentProfile.total_points.toLocaleString()}</div>
                                            <div className="font-condensed text-sm text-gray-muted">{currentProfile.total_predictions}</div>
                                            <div className="font-condensed text-sm text-blue-light">
                                                {currentProfile.total_predictions > 0
                                                    ? `${Math.round((currentProfile.correct_predictions / currentProfile.total_predictions) * 100)}%`
                                                    : '—'}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── ATHLETES RIS TAB ── */}
            {tab === 'athletes' && (
                <div>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        {/* Competition filter */}
                        {visibleComps.length > 0 && (
                            <div className="flex gap-px">
                                {visibleComps.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setCompFilter(c.id)}
                                        className={`font-condensed text-xs tracking-[1px] uppercase px-4 py-2 border transition-colors ${
                                            compFilter === c.id
                                                ? 'bg-blue border-blue-light text-white'
                                                : 'border-blue/20 text-gray-muted hover:text-white hover:border-blue/40'
                                        }`}
                                    >
                                        {c.flag} {c.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Gender filter */}
                        <div className="flex gap-px">
                            {(['all', 'men', 'women'] as const).map(g => (
                                <button
                                    key={g}
                                    onClick={() => setGenderFilter(g)}
                                    className={`font-condensed text-xs tracking-[1px] uppercase px-4 py-2 border transition-colors ${
                                        genderFilter === g
                                            ? 'bg-blue border-blue-light text-white'
                                            : 'border-blue/20 text-gray-muted hover:text-white hover:border-blue/40'
                                    }`}
                                >
                                    {g === 'all' ? 'All' : g === 'men' ? '♂ Men' : '♀ Women'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {visibleComps.length === 0 ? (
                        <div className="border border-blue/30">
                            <EmptyState icon="—" title="NO RESULTS YET" subtitle="Results will appear here after a competition is revealed." />
                        </div>
                    ) : filteredResults.length === 0 ? (
                        <div className="border border-blue/30">
                            <EmptyState icon="—" title="NO RESULTS" subtitle="No results for this filter." />
                        </div>
                    ) : (
                        <div className="border border-blue/30">
                            <div className="hidden md:grid grid-cols-[52px_1fr_80px_120px_90px_200px] gap-3 px-5 py-3 border-b border-blue/30">
                                {['#', 'Athlete', 'Nat.', 'Category', 'RIS', 'Lifts'].map(h => (
                                    <div key={h} className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted">{h}</div>
                                ))}
                            </div>

                            {filteredResults.map((r, i) => {
                                const athlete = r.athletes
                                const cat     = r.categories
                                const rank    = r.rank_in_category ?? i + 1
                                const ris     = r.ris_score?.toFixed(2) ?? '—'
                                const lifts   = [r.muscle_up, r.pullup, r.dip, r.squat]
                                const liftLabels = ['MU', 'PU', 'DIP', 'SQ']
                                const rankColor =
                                    rank === 1 ? 'text-yellow-400' :
                                        rank === 2 ? 'text-gray-300' :
                                            rank === 3 ? 'text-orange-400' : 'text-gray-muted'

                                return (
                                    <div key={r.id} className="grid grid-cols-[52px_1fr_80px_120px_90px_200px] gap-3 px-5 py-3.5 items-center border-b border-blue/8 last:border-0 hover:bg-blue/5 transition-colors">
                                        <div className={`font-bebas text-xl ${rankColor}`}>
                                            <RankDisplay rank={rank} />
                                        </div>
                                        <div>
                                            <p className="font-condensed font-semibold text-sm text-white">
                                                {athlete?.first_name} {athlete?.last_name}
                                            </p>
                                            {r.dnf && <span className="text-xs font-condensed text-accent">DNF</span>}
                                            {r.missing_data && <span className="text-xs font-condensed text-yellow-400">⚠ Missing data</span>}
                                        </div>
                                        <div className="font-condensed text-sm text-gray-muted">{athlete?.nationality}</div>
                                        <div>
                                            <p className="font-condensed text-xs text-gray-muted">{cat?.name}</p>
                                        </div>
                                        <div className={`font-bebas text-xl ${rank <= 3 ? 'text-yellow-400' : 'text-white'}`}>{ris}</div>
                                        <div className="flex gap-2">
                                            {lifts.map((val, li) => (
                                                <div key={li} className="flex flex-col items-center">
                                                    <span className="font-condensed text-xs text-gray-muted/60 tracking-[1px]">{liftLabels[li]}</span>
                                                    <span className="font-condensed text-xs font-semibold text-white">{val ?? '—'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}