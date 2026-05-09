'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Countdown from '@/components/ui/Countdown'
import Button from '@/components/ui/Button'
import PodiumSelector, { type PodiumSelections } from '@/components/predict/PodiumSelector'
import P4PSelector, { type P4PSelections } from '@/components/predict/P4PSelector'

interface ExistingPrediction {
    id: string
    module: string
    position: 1 | 2 | 3
    athlete_id: string
    category_id: string | null
    submitted_at: string
}

interface Props {
    comp: {
        id: string
        name: string
        prediction_deadline: string
        scoring_config: any
    }
    categories: any[]
    alreadySubmitted: boolean
    existingPredictions: ExistingPrediction[]
}

const TABS = [
    { id: 'podium', label: 'The Podium', emoji: '🏆', desc: 'Top 3 per weight category' },
    { id: 'p4p',    label: 'P4P',        emoji: '⚡', desc: 'Best RIS score overall' },
] as const

type Tab = typeof TABS[number]['id']

// Rebuild PodiumSelections from existing predictions
function buildPodiumSelections(preds: ExistingPrediction[], categories: any[]): PodiumSelections {
    const sel: PodiumSelections = {}
    for (const pred of preds.filter(p => p.module === 'podium')) {
        if (!pred.category_id) continue
        if (!sel[pred.category_id]) sel[pred.category_id] = []
        // Find athlete name
        const cat     = categories.find((c: any) => c.id === pred.category_id)
        const athlete = cat?.athletes?.find((a: any) => a.id === pred.athlete_id)
        if (!athlete) continue
        sel[pred.category_id].push({
            position:     pred.position,
            athlete_id:   pred.athlete_id,
            athlete_name: `${athlete.first_name} ${athlete.last_name}`,
        })
    }
    return sel
}

function buildP4PSelections(preds: ExistingPrediction[], categories: any[]): P4PSelections {
    const allAthletes = categories.flatMap((c: any) => c.athletes.map((a: any) => ({ ...a, gender: c.gender })))
    const sel: P4PSelections = { men: [], women: [] }

    for (const pred of preds.filter(p => p.module === 'p4p_men' || p.module === 'p4p_women')) {
        const gender  = pred.module === 'p4p_men' ? 'men' : 'women'
        const athlete = allAthletes.find((a: any) => a.id === pred.athlete_id)
        if (!athlete) continue
        sel[gender].push({
            position:     pred.position,
            athlete_id:   pred.athlete_id,
            athlete_name: `${athlete.first_name} ${athlete.last_name}`,
        })
    }
    return sel
}

const MEDALS = ['🥇', '🥈', '🥉']

function LockedRecap({
    podium, p4p, categories, canEdit, onEdit,
}: {
    podium:     PodiumSelections
    p4p:        P4PSelections
    categories: any[]
    canEdit:    boolean
    onEdit:     () => void
}) {
    const catsWithPicks = categories.filter((c: any) => (podium[c.id]?.length ?? 0) > 0)

    return (
        <div className="flex flex-col gap-4">
            <div className="border border-green-400/20 bg-green-400/5 px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <div>
                        <p className="font-condensed text-sm font-semibold text-green-400 tracking-wide">Your picks are locked in</p>
                        <p className="text-gray-muted text-xs mt-0.5">
                            {canEdit ? 'You can still modify until the deadline.' : 'Results will appear here after the competition.'}
                        </p>
                    </div>
                </div>
                {canEdit && (
                    <button
                        onClick={onEdit}
                        className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted hover:text-white transition-colors flex-shrink-0"
                    >
                        ✏ Modify
                    </button>
                )}
            </div>

            {/* Podium picks */}
            {catsWithPicks.length > 0 && (
                <div className="border border-blue/20 p-5 flex flex-col gap-4">
                    <p className="font-condensed text-xs tracking-[4px] uppercase text-accent">🏆 Podium Picks</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px">
                        {catsWithPicks.map((cat: any) => {
                            const picks = [...(podium[cat.id] ?? [])].sort((a, b) => a.position - b.position)
                            return (
                                <div key={cat.id} className="bg-dark/40 border border-blue/10 px-4 py-3">
                                    <p className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted mb-2">{cat.name}</p>
                                    <div className="flex flex-col gap-1.5">
                                        {picks.map(pick => (
                                            <div key={pick.position} className="flex items-center gap-2">
                                                <span className="text-sm w-5 flex-shrink-0">{MEDALS[pick.position - 1]}</span>
                                                <span className="font-condensed text-sm text-white">{pick.athlete_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* P4P picks */}
            {(p4p.men.length > 0 || p4p.women.length > 0) && (
                <div className="border border-blue/20 p-5 flex flex-col gap-4">
                    <p className="font-condensed text-xs tracking-[4px] uppercase text-accent">⚡ P4P Picks</p>
                    <div className="grid grid-cols-2 gap-px">
                        {(['men', 'women'] as const).map(gender => {
                            const picks = [...p4p[gender]].sort((a, b) => a.position - b.position)
                            if (picks.length === 0) return null
                            return (
                                <div key={gender} className="bg-dark/40 border border-blue/10 px-4 py-3">
                                    <p className={`font-condensed text-xs tracking-[2px] uppercase mb-2 ${gender === 'women' ? 'text-pink-400/60' : 'text-blue-light/60'}`}>
                                        {gender === 'men' ? 'Men' : 'Women'}
                                    </p>
                                    <div className="flex flex-col gap-1.5">
                                        {picks.map(pick => (
                                            <div key={pick.position} className="flex items-center gap-2">
                                                <span className="text-sm w-5 flex-shrink-0">{MEDALS[pick.position - 1]}</span>
                                                <span className="font-condensed text-sm text-white">{pick.athlete_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function PredictClient({ comp, categories, alreadySubmitted, existingPredictions }: Props) {
    const router = useRouter()

    const isDeadlinePassed = new Date() > new Date(comp.prediction_deadline)
    const canEdit          = alreadySubmitted && !isDeadlinePassed

    const [activeTab,  setActiveTab]  = useState<Tab>('podium')
    const [editMode,   setEditMode]   = useState(!alreadySubmitted)
    const [podium,     setPodium]     = useState<PodiumSelections>(() =>
        buildPodiumSelections(existingPredictions, categories)
    )
    const [p4p,        setP4P]        = useState<P4PSelections>(() =>
        buildP4PSelections(existingPredictions, categories)
    )
    const [loading,    setLoading]    = useState(false)
    const [error,      setError]      = useState<string | null>(null)
    const [submitted,  setSubmitted]  = useState(alreadySubmitted)
    const [showModal,  setShowModal]  = useState(false)
    const [showEditWarning, setShowEditWarning] = useState(false)

    const locked = !editMode || isDeadlinePassed

    const podiumFilled   = categories.filter(cat => (podium[cat.id]?.length ?? 0) === 3).length
    const podiumTotal    = categories.length
    const podiumComplete = podiumFilled === podiumTotal
    const p4pComplete    = p4p.men.length === 3 && p4p.women.length === 3
    const canSubmit      = podiumComplete && p4pComplete && !locked

    const menCats   = categories.filter((c: any) => c.gender === 'men')
    const womenCats = categories.filter((c: any) => c.gender === 'women')

    async function handleSubmit() {
        setLoading(true)
        setError(null)

        const method = submitted ? 'PUT' : 'POST'

        const res = await fetch('/api/predictions', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ competition_id: comp.id, podium, p4p }),
        })

        const data = await res.json()

        if (!res.ok) {
            setError(data.error ?? 'Something went wrong.')
            setLoading(false)
            setShowModal(false)
            return
        }

        setSubmitted(true)
        setEditMode(false)
        setShowModal(false)
        router.refresh()
        setLoading(false)
    }

    function handleEditClick() {
        setShowEditWarning(true)
    }

    function confirmEdit() {
        setEditMode(true)
        setShowEditWarning(false)
    }

    return (
        <div className="flex flex-col gap-5">

            {/* Status bar */}
            <div className="grid grid-cols-[1fr_auto] gap-4 border border-blue/20 px-5 py-4 bg-blue/5">
                {submitted && !editMode ? (
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                        <div>
                            <p className="font-condensed text-sm font-semibold text-green-400 tracking-wide">Predictions submitted</p>
                            <p className="text-gray-muted text-xs mt-0.5">
                                {canEdit ? 'Deadline not passed — you can still modify.' : 'Locked in. Results visible after the competition.'}
                            </p>
                        </div>
                    </div>
                ) : editMode && submitted ? (
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
                        <div>
                            <p className="font-condensed text-sm font-semibold text-yellow-400 tracking-wide">Editing predictions</p>
                            <p className="text-gray-muted text-xs mt-0.5">Submitting will update your picks and reset your tiebreaker timestamp.</p>
                        </div>
                    </div>
                ) : isDeadlinePassed ? (
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-gray-muted flex-shrink-0" />
                        <p className="font-condensed text-sm tracking-wide text-gray-muted">Deadline passed — predictions closed</p>
                    </div>
                ) : (
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted mb-1">Podium</p>
                            <div className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                    {categories.map((cat: any) => (
                                        <div key={cat.id} className={`h-1.5 w-3 transition-colors ${(podium[cat.id]?.length ?? 0) === 3 ? 'bg-accent' : 'bg-blue/30'}`} />
                                    ))}
                                </div>
                                <span className={`font-bebas text-lg leading-none ${podiumComplete ? 'text-accent' : 'text-gray-muted'}`}>
                                    {podiumFilled}/{podiumTotal}
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted mb-1">P4P</p>
                            <div className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className={`h-1.5 w-3 transition-colors ${i < p4p.men.length + p4p.women.length ? 'bg-accent' : 'bg-blue/30'}`} />
                                    ))}
                                </div>
                                <span className={`font-bebas text-lg leading-none ${p4pComplete ? 'text-accent' : 'text-gray-muted'}`}>
                                    {p4p.men.length + p4p.women.length}/6
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    {canEdit && !editMode && (
                        <Button onClick={handleEditClick} variant="ghost" size="sm">
                            ✏ Modify
                        </Button>
                    )}
                    <Countdown deadline={comp.prediction_deadline} />
                </div>
            </div>

            {/* Locked recap — shown when submitted and not in edit mode */}
            {submitted && !editMode && (
                <LockedRecap
                    podium={podium}
                    p4p={p4p}
                    categories={categories}
                    canEdit={canEdit}
                    onEdit={handleEditClick}
                />
            )}

            {/* Tabs + content — only shown when editing or not yet submitted */}
            {(!submitted || editMode) && <>
            <div className="flex gap-px">
                {TABS.map(tab => {
                    const isActive = activeTab === tab.id
                    const isDone   = tab.id === 'podium' ? podiumComplete : p4pComplete
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 px-5 py-3.5 text-left border transition-all relative ${
                                isActive ? 'bg-blue/15 border-blue-light text-white' : 'bg-transparent border-blue/20 text-gray-muted hover:text-white hover:border-blue/40'
                            }`}
                        >
                            {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-condensed text-sm font-semibold tracking-[1px] uppercase">{tab.emoji} {tab.label}</p>
                                    <p className="text-xs opacity-60 normal-case tracking-normal mt-0.5">{tab.desc}</p>
                                </div>
                                {isDone && !locked && <span className="text-green-400 text-base">✓</span>}
                            </div>
                        </button>
                    )
                })}
            </div>

            <div>
                {activeTab === 'podium' && (
                    <PodiumSelector categories={categories} onChange={setPodium} locked={locked} initialSelections={podium} />
                )}
                {activeTab === 'p4p' && (
                    <div className="flex flex-col gap-3">
                        <div className="border border-blue/10 bg-blue/5 px-4 py-3">
                            <p className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted mb-1">Scoring</p>
                            <p className="text-sm text-gray-muted/70">
                                Best RIS across all categories, men and women separately.
                                Exact = <span className="text-green-400 font-condensed">{comp.scoring_config?.p4p?.points_exact ?? 20} pts</span>
                                {' · '}
                                In top 3 wrong rank = <span className="text-yellow-400 font-condensed">{comp.scoring_config?.p4p?.points_partial ?? 10} pts</span>
                            </p>
                        </div>
                        <P4PSelector
                            menAthletes={menCats.flatMap((c: any) => c.athletes.map((a: any) => ({ ...a, category_name: c.name })))}
                            womenAthletes={womenCats.flatMap((c: any) => c.athletes.map((a: any) => ({ ...a, category_name: c.name })))}
                            onChange={setP4P}
                            locked={locked}
                            initialSelections={p4p}
                        />
                    </div>
                )}
            </div>

            </> }

            {error && (
                <div className="border border-accent/30 bg-accent/8 px-4 py-3">
                    <p className="text-accent text-sm font-condensed tracking-wide">{error}</p>
                </div>
            )}

            {/* Submit row */}
            {!locked && (
                <div className="border-t border-blue/20 pt-5 flex items-center justify-between gap-4">
                    <div>
                        {canSubmit ? (
                            <p className="text-green-400 text-xs font-condensed tracking-wide">✓ All picks completed — ready to {submitted ? 'update' : 'submit'}</p>
                        ) : !podiumComplete ? (
                            <p className="text-gray-muted text-xs font-condensed">Complete podium picks ({podiumFilled}/{podiumTotal} categories)</p>
                        ) : (
                            <p className="text-yellow-400 text-xs font-condensed">Complete P4P picks ({p4p.men.length + p4p.women.length}/6)</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {editMode && submitted && (
                            <Button variant="ghost" size="md" onClick={() => { setEditMode(false) }}>
                                Cancel
                            </Button>
                        )}
                        <Button onClick={() => setShowModal(true)} disabled={!canSubmit} size="lg">
                            {submitted ? 'Update Predictions →' : 'Submit →'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Edit warning modal */}
            {showEditWarning && (
                <div className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
                    <div className="bg-dark border border-yellow-400/30 p-8 max-w-md w-full">
                        <p className="font-bebas text-3xl tracking-wide mb-2 text-yellow-400">Modify Predictions?</p>
                        <p className="text-gray-muted text-sm mb-4">
                            You can change your picks before the deadline. Keep in mind:
                        </p>
                        <ul className="flex flex-col gap-2 mb-6 text-sm font-condensed text-gray-muted border border-blue/20 bg-blue/5 p-4">
                            <li>· Your new submission time will be used as tiebreaker</li>
                            <li>· If two players have the same score, earlier submission wins</li>
                            <li>· Modifying late may cost you in a tie situation</li>
                        </ul>
                        <div className="flex gap-3">
                            <Button variant="ghost" size="md" onClick={() => setShowEditWarning(false)} className="flex-1">Cancel</Button>
                            <Button size="md" onClick={confirmEdit} className="flex-1">Modify anyway →</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm submit modal */}
            {showModal && (
                <div className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
                    <div className="bg-dark border border-blue-light/30 p-8 max-w-md w-full">
                        <p className="font-bebas text-4xl tracking-wide mb-1">
                            {submitted ? 'Update Predictions' : 'Confirm Submission'}
                        </p>
                        <p className="text-gray-muted text-sm mb-6">
                            {submitted
                                ? 'This will replace your current predictions and update your tiebreaker timestamp.'
                                : 'Once submitted, you can still modify your picks until the deadline.'}
                        </p>
                        <div className="flex flex-col gap-2 mb-6 border border-blue/20 bg-blue/5 p-4">
                            <div className="flex justify-between font-condensed text-sm">
                                <span className="text-gray-muted">Podium picks</span>
                                <span className={podiumComplete ? 'text-green-400' : 'text-accent'}>{podiumFilled}/{podiumTotal} categories</span>
                            </div>
                            <div className="flex justify-between font-condensed text-sm">
                                <span className="text-gray-muted">P4P picks</span>
                                <span className={p4pComplete ? 'text-green-400' : 'text-accent'}>{p4p.men.length}/3 men · {p4p.women.length}/3 women</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" size="md" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                            <Button size="md" onClick={handleSubmit} loading={loading} className="flex-1">
                                {submitted ? 'Update →' : 'Confirm →'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}