'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import EmptyState from '@/components/ui/EmptyState'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Session {
    id: string
    competition_id: string
    category_id: string
    status: string
    competitions: { id: string; name: string; flag: string | null }
    categories: { id: string; gender: string; weight_class: string }
}
interface Athlete { id: string; first_name: string; last_name: string; nationality: string | null }
interface Round {
    id: string; session_id: string; athlete_id: string
    movement: Movement; attempt: 1 | 2 | 3; weight_kg: number | null
    state: 'open' | 'closed' | 'revealed'; result: 'YES' | 'NO' | 'DNF' | null
    opened_at: string; closed_at: string | null; revealed_at: string | null
}
interface Score { user_id: string; total_points: number; profiles: { username: string } | null }

type Movement = 'muscle_up' | 'pullup' | 'dip' | 'squat'

interface Props {
    userId: string; isAdmin: boolean
    initialSession: Session | null; initialAthletes: Athlete[]
    initialRounds: Round[]; initialScores: Score[]
    initialMyVotes: Record<string, string>
    competitions: Array<{ id: string; name: string; flag: string | null }>
    compCategories: Record<string, Array<{ id: string; gender: string; weight_class: string }>>
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MOVEMENTS: Movement[] = ['muscle_up', 'pullup', 'dip', 'squat']
const MOVEMENT_LABELS: Record<Movement, string> = { muscle_up: 'Muscle-Up', pullup: 'Pull-Up', dip: 'Dip', squat: 'Squat' }
const MOVEMENT_SHORT:  Record<Movement, string> = { muscle_up: 'MU', pullup: 'PU', dip: 'DIP', squat: 'SQ' }
const ATTEMPT_PTS = [1, 2, 4]

// ── Main component ────────────────────────────────────────────────────────────

export default function LiveGameClient({
    userId, isAdmin,
    initialSession, initialAthletes, initialRounds, initialScores, initialMyVotes,
    competitions, compCategories,
}: Props) {
    const supabase = createClient()

    // State
    const [session,   setSession]   = useState<Session | null>(initialSession)
    const [athletes,  setAthletes]  = useState<Athlete[]>(initialAthletes)
    const [rounds,    setRounds]    = useState<Round[]>(initialRounds)
    const [scores,    setScores]    = useState<Score[]>(initialScores)
    const [myVotes,   setMyVotes]   = useState<Record<string, string>>(initialMyVotes)

    // Admin setup
    const [setupComp, setSetupComp] = useState(competitions[0]?.id ?? '')
    const [setupCat,  setSetupCat]  = useState('')

    // Admin grid selection
    const [selected, setSelected] = useState<{ athleteId: string; movement: Movement; attempt: number } | null>(null)
    const [kg,       setKg]       = useState('')
    const [busy,     setBusy]     = useState(false)

    // Refs for realtime
    const sessionRef = useRef(session)
    sessionRef.current = session

    // ── Derived ───────────────────────────────────────────────────────────────

    const activeRound = rounds.find(r => r.state === 'open' || r.state === 'closed')
    const roundKey    = (athleteId: string, mv: Movement, att: number) => `${athleteId}:${mv}:${att}`
    const roundsMap   = new Map(rounds.map(r => [roundKey(r.athlete_id, r.movement, r.attempt), r]))

    const myVoteOnActive = activeRound ? myVotes[activeRound.id] : undefined

    const availableCategories = compCategories[setupComp] ?? []

    // ── Fetch helpers ─────────────────────────────────────────────────────────

    const fetchScores = useCallback(async (sid: string) => {
        const { data } = await supabase
            .from('live_game_scores')
            .select('user_id, total_points, profiles(username)')
            .eq('session_id', sid)
            .order('total_points', { ascending: false })
        setScores(data ?? [])
    }, [])

    const fetchAthletes = useCallback(async (compId: string, catId: string) => {
        const { data } = await supabase
            .from('athletes')
            .select('id, first_name, last_name, nationality')
            .eq('competition_id', compId)
            .eq('category_id', catId)
            .order('last_name')
        setAthletes(data ?? [])
    }, [])

    // ── Realtime ──────────────────────────────────────────────────────────────

    useEffect(() => {
        const channel = supabase
            .channel('live-game-global')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_game_sessions' },
                async (payload) => {
                    if (payload.eventType === 'INSERT' && (payload.new as any).status === 'active') {
                        const { data: s } = await supabase
                            .from('live_game_sessions')
                            .select('id, competition_id, category_id, status, competitions(id, name, flag), categories(id, gender, weight_class)')
                            .eq('id', (payload.new as any).id)
                            .single()
                        if (s) {
                            setSession(s as unknown as Session)
                            setRounds([])
                            setScores([])
                            setMyVotes({})
                            fetchAthletes(s.competition_id, s.category_id)
                        }
                    } else if (payload.eventType === 'UPDATE' && (payload.new as any).status === 'completed') {
                        if ((payload.new as any).id === sessionRef.current?.id) {
                            setSession(null); setAthletes([]); setRounds([]); setScores([]); setMyVotes({})
                        }
                    }
                }
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_game_rounds' },
                (payload) => {
                    const cur = sessionRef.current
                    if (!cur) return
                    if (payload.eventType === 'INSERT') {
                        const r = payload.new as Round
                        if (r.session_id === cur.id) setRounds(prev => [...prev, r])
                    } else if (payload.eventType === 'UPDATE') {
                        const r = payload.new as Round
                        setRounds(prev => prev.map(x => x.id === r.id ? r : x))
                        if (r.state === 'revealed' && cur) fetchScores(cur.id)
                    }
                }
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_game_scores' },
                () => { if (sessionRef.current) fetchScores(sessionRef.current.id) }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [fetchScores, fetchAthletes])

    // ── API calls ─────────────────────────────────────────────────────────────

    async function createSession() {
        if (!setupComp || !setupCat) return
        setBusy(true)
        try {
            await fetch('/api/live-game/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ competition_id: setupComp, category_id: setupCat }),
            })
        } finally { setBusy(false) }
    }

    async function endSession() {
        if (!session) return
        setBusy(true)
        try {
            await fetch(`/api/live-game/sessions/${session.id}`, { method: 'PATCH' })
        } finally { setBusy(false) }
    }

    async function openRound() {
        if (!selected || !session) return
        const weight = parseFloat(kg)
        setBusy(true)
        try {
            const res = await fetch('/api/live-game/rounds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: session.id,
                    athlete_id: selected.athleteId,
                    movement:   selected.movement,
                    attempt:    selected.attempt,
                    weight_kg:  isNaN(weight) ? null : weight,
                }),
            })
            if (res.ok) { setSelected(null); setKg('') }
        } finally { setBusy(false) }
    }

    async function closeRound() {
        if (!activeRound) return
        setBusy(true)
        try {
            await fetch(`/api/live-game/rounds/${activeRound.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'close' }),
            })
        } finally { setBusy(false) }
    }

    async function revealRound(result: 'YES' | 'NO' | 'DNF') {
        if (!activeRound) return
        setBusy(true)
        try {
            await fetch(`/api/live-game/rounds/${activeRound.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reveal', result }),
            })
        } finally { setBusy(false) }
    }

    async function castVote(vote: 'YES' | 'NO') {
        if (!activeRound || activeRound.state !== 'open' || myVoteOnActive) return
        setBusy(true)
        try {
            const res = await fetch(`/api/live-game/rounds/${activeRound.id}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vote }),
            })
            if (res.ok) setMyVotes(prev => ({ ...prev, [activeRound.id]: vote }))
        } finally { setBusy(false) }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-8">

            {/* ── ADMIN: Session setup ── */}
            {isAdmin && !session && (
                <div className="border border-blue/30 bg-blue/5 p-6">
                    <p className="font-condensed text-xs tracking-[3px] uppercase text-accent mb-4">Admin · Start Live Session</p>
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex flex-col gap-1">
                            <label className="font-condensed text-xs text-gray-muted uppercase tracking-widest">Competition</label>
                            <select
                                value={setupComp}
                                onChange={e => { setSetupComp(e.target.value); setSetupCat('') }}
                                className="bg-dark border border-blue/40 text-white font-condensed text-sm px-3 py-2 min-w-[200px]"
                            >
                                {competitions.length === 0 && <option value="">No competitions</option>}
                                {competitions.map(c => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="font-condensed text-xs text-gray-muted uppercase tracking-widest">Category</label>
                            <select
                                value={setupCat}
                                onChange={e => setSetupCat(e.target.value)}
                                className="bg-dark border border-blue/40 text-white font-condensed text-sm px-3 py-2 min-w-[160px]"
                            >
                                <option value="">Select category</option>
                                {availableCategories.map((c: any) => (
                                    <option key={c.id} value={c.id}>
                                        {c.gender === 'men' ? '♂' : '♀'} {c.weight_class}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={createSession}
                            disabled={!setupComp || !setupCat || busy}
                            className="font-condensed text-xs tracking-[3px] uppercase px-6 py-2 bg-accent text-white disabled:opacity-40 hover:bg-accent/80 transition-colors"
                        >
                            Start Live Game
                        </button>
                    </div>
                </div>
            )}

            {/* ── ADMIN: Session header + action bar ── */}
            {isAdmin && session && (
                <div className="border border-accent/40 bg-accent/5 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="font-condensed text-xs tracking-[3px] uppercase text-accent">Live Session Active</p>
                        <p className="font-bebas text-xl text-white mt-0.5">
                            {(session.competitions as any)?.flag} {(session.competitions as any)?.name}
                            <span className="text-gray-muted text-base ml-3">
                                {(session.categories as any)?.gender === 'men' ? '♂' : '♀'} {(session.categories as any)?.weight_class}
                            </span>
                        </p>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                        {/* Action: Open selected cell */}
                        {selected && !activeRound && (
                            <button
                                onClick={openRound}
                                disabled={busy}
                                className="font-condensed text-xs tracking-[3px] uppercase px-5 py-2 bg-green-600 text-white hover:bg-green-500 disabled:opacity-40 transition-colors"
                            >
                                Open Vote
                            </button>
                        )}
                        {/* Action: Close active round */}
                        {activeRound?.state === 'open' && (
                            <button
                                onClick={closeRound}
                                disabled={busy}
                                className="font-condensed text-xs tracking-[3px] uppercase px-5 py-2 bg-yellow-600 text-white hover:bg-yellow-500 disabled:opacity-40 transition-colors"
                            >
                                Close Vote
                            </button>
                        )}
                        {/* End session */}
                        <button
                            onClick={endSession}
                            disabled={busy}
                            className="font-condensed text-xs tracking-[3px] uppercase px-5 py-2 border border-gray-muted/30 text-gray-muted hover:text-white hover:border-white/40 disabled:opacity-40 transition-colors"
                        >
                            End Session
                        </button>
                    </div>
                </div>
            )}

            {/* ── No session ── */}
            {!session && (
                <div className="border border-blue/30">
                    <EmptyState icon="📡" title="NO LIVE GAME" subtitle={isAdmin ? 'Start a session above to begin.' : 'No live game is running right now. Check back later!'} />
                </div>
            )}

            {/* ── Main content: Player card + Standings ── */}
            {session && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

                    {/* Player vote card */}
                    <PlayerCard
                        activeRound={activeRound ?? null}
                        myVote={myVoteOnActive}
                        athletes={athletes}
                        onVote={castVote}
                        busy={busy}
                    />

                    {/* Live standings */}
                    <Standings scores={scores} userId={userId} />
                </div>
            )}

            {/* ── ADMIN: Grid ── */}
            {isAdmin && session && athletes.length > 0 && (
                <AdminGrid
                    athletes={athletes}
                    roundsMap={roundsMap}
                    selected={selected}
                    kg={kg}
                    activeRound={activeRound ?? null}
                    busy={busy}
                    onSelect={(athleteId, movement, attempt) => {
                        if (activeRound) return
                        const key = roundKey(athleteId, movement, attempt)
                        const existing = roundsMap.get(key)
                        if (existing) return
                        setSelected(prev =>
                            prev?.athleteId === athleteId && prev.movement === movement && prev.attempt === attempt
                                ? null
                                : { athleteId, movement, attempt }
                        )
                        setKg('')
                    }}
                    onKgChange={setKg}
                    onReveal={revealRound}
                />
            )}
        </div>
    )
}

// ── Player Vote Card ──────────────────────────────────────────────────────────

function PlayerCard({ activeRound, myVote, athletes, onVote, busy }: {
    activeRound: Round | null
    myVote: string | undefined
    athletes: Athlete[]
    onVote: (v: 'YES' | 'NO') => void
    busy: boolean
}) {
    if (!activeRound) {
        return (
            <div className="border border-blue/30 flex items-center justify-center py-16">
                <div className="text-center">
                    <div className="font-bebas text-4xl text-gray-muted/30 mb-2">WAITING</div>
                    <p className="font-condensed text-sm text-gray-muted/50">Next attempt coming soon…</p>
                </div>
            </div>
        )
    }

    const athlete = athletes.find(a => a.id === activeRound.athlete_id)
    const pts     = ATTEMPT_PTS[activeRound.attempt - 1]
    const stateColor = activeRound.state === 'open' ? 'border-green-500/50' : activeRound.state === 'closed' ? 'border-yellow-500/50' : 'border-blue/30'

    const resultIcon: Record<string, string> = { YES: '✅', NO: '❌', DNF: '⚠️' }

    return (
        <div className={`border ${stateColor} bg-blue/5 p-6`}>
            {/* Status badge */}
            <div className="flex items-center justify-between mb-4">
                <span className={`font-condensed text-xs tracking-[3px] uppercase px-2 py-0.5 ${
                    activeRound.state === 'open'   ? 'bg-green-600/20 text-green-400' :
                    activeRound.state === 'closed' ? 'bg-yellow-600/20 text-yellow-400' :
                    'bg-blue/20 text-blue-light'
                }`}>
                    {activeRound.state === 'open' ? '🔴 VOTE OPEN' : activeRound.state === 'closed' ? '⏸ VOTE CLOSED' : '✓ REVEALED'}
                </span>
                <span className="font-condensed text-xs text-gray-muted">{pts} pt{pts > 1 ? 's' : ''}</span>
            </div>

            {/* Attempt info */}
            <div className="mb-6">
                <p className="font-bebas text-3xl text-white leading-none">{athlete?.first_name} {athlete?.last_name}</p>
                <p className="font-condensed text-sm text-gray-muted mt-1">
                    {MOVEMENT_LABELS[activeRound.movement]} · Essai {activeRound.attempt}
                    {activeRound.weight_kg && <span className="ml-2 text-white font-semibold">{activeRound.weight_kg} kg</span>}
                </p>
            </div>

            {/* OPEN: vote buttons */}
            {activeRound.state === 'open' && (
                <>
                    <p className="font-condensed text-sm text-gray-muted mb-4">La tentative sera-t-elle réussie ?</p>
                    {myVote ? (
                        <div className={`font-condensed text-sm px-4 py-3 border ${myVote === 'YES' ? 'border-green-500/40 bg-green-600/10 text-green-400' : 'border-red-500/40 bg-red-600/10 text-red-400'}`}>
                            Vote enregistré : <strong>{myVote === 'YES' ? '✅ OUI' : '❌ NON'}</strong>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button onClick={() => onVote('YES')} disabled={busy}
                                className="flex-1 font-condensed tracking-[3px] uppercase py-4 text-lg border-2 border-green-500 text-green-400 hover:bg-green-600/20 disabled:opacity-40 transition-colors">
                                ✅ OUI
                            </button>
                            <button onClick={() => onVote('NO')} disabled={busy}
                                className="flex-1 font-condensed tracking-[3px] uppercase py-4 text-lg border-2 border-red-500 text-red-400 hover:bg-red-600/20 disabled:opacity-40 transition-colors">
                                ❌ NON
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* CLOSED: waiting */}
            {activeRound.state === 'closed' && (
                <div className="space-y-3">
                    <p className="font-condensed text-sm text-yellow-400">Votes fermés — résultat imminent…</p>
                    {myVote && (
                        <div className="font-condensed text-sm text-gray-muted">
                            Votre vote : <strong className="text-white">{myVote === 'YES' ? '✅ OUI' : '❌ NON'}</strong>
                        </div>
                    )}
                </div>
            )}

            {/* REVEALED */}
            {activeRound.state === 'revealed' && activeRound.result && (
                <div className="space-y-3">
                    <div className="font-bebas text-3xl">
                        {resultIcon[activeRound.result]}{' '}
                        <span className={activeRound.result === 'YES' ? 'text-green-400' : activeRound.result === 'NO' ? 'text-red-400' : 'text-gray-muted'}>
                            {activeRound.result === 'YES' ? 'RÉUSSI' : activeRound.result === 'NO' ? 'RATÉ' : 'DNF'}
                        </span>
                    </div>
                    {myVote && (
                        <div className="font-condensed text-sm text-gray-muted">
                            Votre vote : <strong className="text-white">{myVote === 'YES' ? '✅ OUI' : '❌ NON'}</strong>
                            {' — '}
                            {myVote === activeRound.result
                                ? <span className="text-green-400">+{pts} point{pts > 1 ? 's' : ''} !</span>
                                : <span className="text-gray-muted/60">0 point</span>
                            }
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Live Standings ────────────────────────────────────────────────────────────

function Standings({ scores, userId }: { scores: Score[]; userId: string }) {
    return (
        <div className="border border-blue/30 bg-blue/5">
            <div className="px-4 py-3 border-b border-blue/20">
                <p className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted">Classement Live</p>
            </div>
            {scores.length === 0 ? (
                <div className="px-4 py-8 text-center">
                    <p className="font-condensed text-sm text-gray-muted/40">En attente des premiers points…</p>
                </div>
            ) : (
                <div>
                    {scores.map((s, i) => {
                        const isMe = s.user_id === userId
                        const rank = i + 1
                        const rankColor = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-orange-400' : 'text-gray-muted'
                        return (
                            <div key={s.user_id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-blue/20 last:border-0 ${isMe ? 'bg-blue/15 border-l-2 border-l-accent' : ''}`}>
                                <span className={`font-bebas text-xl w-6 text-right ${rankColor}`}>{rank}</span>
                                <span className={`font-condensed text-sm flex-1 truncate ${isMe ? 'text-white' : 'text-gray-muted'}`}>
                                    {(s.profiles as any)?.username ?? '—'}
                                    {isMe && <span className="text-accent text-xs ml-1">You</span>}
                                </span>
                                <span className="font-bebas text-xl text-yellow-400">{s.total_points}</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ── Admin Grid ────────────────────────────────────────────────────────────────

function AdminGrid({ athletes, roundsMap, selected, kg, activeRound, busy, onSelect, onKgChange, onReveal }: {
    athletes: Athlete[]
    roundsMap: Map<string, Round>
    selected: { athleteId: string; movement: Movement; attempt: number } | null
    kg: string
    activeRound: Round | null
    busy: boolean
    onSelect: (athleteId: string, movement: Movement, attempt: number) => void
    onKgChange: (v: string) => void
    onReveal: (result: 'YES' | 'NO' | 'DNF') => void
}) {
    const roundKey = (aId: string, mv: Movement, att: number) => `${aId}:${mv}:${att}`

    return (
        <div>
            <p className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted mb-3">Tableau de gestion — Admin</p>
            <div className="overflow-x-auto border border-blue/30">
                <table className="w-full border-collapse text-xs font-condensed" style={{ minWidth: 700 }}>
                    <thead>
                        <tr className="bg-blue/8 border-b border-blue/30">
                            <th className="text-left px-3 py-2 text-gray-muted uppercase tracking-widest font-normal sticky left-0 bg-darker z-10 border-r border-blue/30 min-w-[140px]">
                                Athlète
                            </th>
                            {MOVEMENTS.map(mv => (
                                [1, 2, 3].map(att => (
                                    <th key={`${mv}${att}`} className="px-2 py-2 text-center text-gray-muted uppercase tracking-widest font-normal border-l border-blue/20 min-w-[80px]">
                                        {MOVEMENT_SHORT[mv]}{att}
                                        <span className="block text-gray-muted/30 text-[10px] normal-case tracking-normal">+{ATTEMPT_PTS[att - 1]}pt</span>
                                    </th>
                                ))
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {athletes.map(athlete => (
                            <tr key={athlete.id} className="border-b border-blue/20 hover:bg-blue/5">
                                <td className="px-3 py-2 text-white sticky left-0 bg-darker border-r border-blue/30 z-10">
                                    <span className="font-semibold">{athlete.last_name}</span>
                                    <span className="text-gray-muted ml-1">{athlete.first_name}</span>
                                </td>
                                {MOVEMENTS.map(mv =>
                                    [1, 2, 3].map(att => {
                                        const key   = roundKey(athlete.id, mv, att)
                                        const round = roundsMap.get(key)
                                        const isSel = selected?.athleteId === athlete.id && selected.movement === mv && selected.attempt === att
                                        const isActiveClosed = round?.id === activeRound?.id && round?.state === 'closed'

                                        return (
                                            <td key={`${mv}${att}`} className="px-1 py-1 border-l border-blue/20 text-center">
                                                <GridCell
                                                    round={round ?? null}
                                                    isSelected={isSel}
                                                    kg={isSel ? kg : ''}
                                                    hasActiveRound={!!activeRound}
                                                    isActiveClosed={isActiveClosed}
                                                    busy={busy}
                                                    onClick={() => onSelect(athlete.id, mv, att)}
                                                    onKgChange={onKgChange}
                                                    onReveal={onReveal}
                                                />
                                            </td>
                                        )
                                    })
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ── Grid Cell ─────────────────────────────────────────────────────────────────

function GridCell({ round, isSelected, kg, hasActiveRound, isActiveClosed, busy, onClick, onKgChange, onReveal }: {
    round: Round | null
    isSelected: boolean
    kg: string
    hasActiveRound: boolean
    isActiveClosed: boolean
    busy: boolean
    onClick: () => void
    onKgChange: (v: string) => void
    onReveal: (r: 'YES' | 'NO' | 'DNF') => void
}) {
    // Revealed cell
    if (round?.state === 'revealed') {
        const colors: Record<string, string> = { YES: 'text-green-400 bg-green-900/20', NO: 'text-red-400 bg-red-900/20', DNF: 'text-gray-muted bg-blue/10' }
        const icons: Record<string, string>  = { YES: '✓', NO: '✗', DNF: 'DNF' }
        return (
            <div className={`rounded text-center py-1 px-1 font-bold text-xs ${colors[round.result ?? 'DNF']}`}>
                {icons[round.result ?? 'DNF']}
                {round.weight_kg && <div className="text-[10px] opacity-60">{round.weight_kg}kg</div>}
            </div>
        )
    }

    // Open cell
    if (round?.state === 'open') {
        return (
            <div className="bg-green-900/20 border border-green-500/40 rounded text-center py-1 px-1">
                <div className="text-green-400 font-bold text-[10px] animate-pulse">LIVE</div>
                {round.weight_kg && <div className="text-[10px] text-gray-muted">{round.weight_kg}kg</div>}
            </div>
        )
    }

    // Closed cell: show result buttons
    if (round?.state === 'closed' && isActiveClosed) {
        return (
            <div className="flex gap-0.5 justify-center">
                {(['YES', 'NO', 'DNF'] as const).map(r => (
                    <button key={r} onClick={() => onReveal(r)} disabled={busy}
                        className={`text-[9px] px-1.5 py-1 font-bold uppercase tracking-wide disabled:opacity-40 transition-colors ${
                            r === 'YES' ? 'bg-green-700 hover:bg-green-600 text-white' :
                            r === 'NO'  ? 'bg-red-700 hover:bg-red-600 text-white' :
                            'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                    >
                        {r}
                    </button>
                ))}
            </div>
        )
    }

    // Idle / selectable
    const canClick = !hasActiveRound && !round

    return (
        <div
            onClick={canClick ? onClick : undefined}
            className={`flex flex-col items-center gap-0.5 p-0.5 rounded transition-colors ${
                canClick ? 'cursor-pointer hover:bg-blue/20' : 'cursor-default opacity-40'
            } ${isSelected ? 'bg-blue/20 ring-1 ring-accent/60' : ''}`}
        >
            <div className={`w-3 h-3 rounded-full border flex-shrink-0 ${isSelected ? 'border-accent bg-accent/40' : 'border-gray-muted/40'}`} />
            {isSelected && (
                <input
                    type="number"
                    value={kg}
                    onChange={e => onKgChange(e.target.value)}
                    placeholder="kg"
                    onClick={e => e.stopPropagation()}
                    className="w-full bg-dark border border-blue/40 text-white text-[10px] px-1 py-0.5 text-center"
                />
            )}
        </div>
    )
}
