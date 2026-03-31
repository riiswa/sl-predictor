'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Countdown from '@/components/ui/Countdown'
import Button from '@/components/ui/Button'
import PodiumSelector, { type PodiumSelections } from '@/components/predict/PodiumSelector'
import P4PSelector, { type P4PSelections } from '@/components/predict/P4PSelector'
import StrongestSelector, { type StrongestSelections } from '@/components/predict/StrongestSelector'

interface Props {
    comp: {
        id: string
        name: string
        prediction_deadline: string
        scoring_config: any
    }
    categories: any[]
    alreadySubmitted: boolean
    seasonSubmitted: { gender: 'men' | 'women', name: string }[]
    menAthletes: any[]
    womenAthletes: any[]
}

const TABS = [
    { id: 'podium',    label: '🏆 The Podium',     desc: 'Top 3 per weight category' },
    { id: 'p4p',       label: '⚡ P4P',             desc: 'Top 3 RIS overall' },
    { id: 'strongest', label: '👑 Strongest',       desc: 'Season champion pick' },
] as const

type Tab = typeof TABS[number]['id']

export default function PredictClient({
                                          comp, categories, alreadySubmitted, seasonSubmitted, menAthletes, womenAthletes
                                      }: Props) {
    const router = useRouter()

    const [activeTab,  setActiveTab]  = useState<Tab>('podium')
    const [podium,     setPodium]     = useState<PodiumSelections>({})
    const [p4p,        setP4P]        = useState<P4PSelections>({ men: [], women: [] })
    const [strongest,  setStrongest]  = useState<StrongestSelections>({ men_athlete_id: null, women_athlete_id: null })
    const [loading,    setLoading]    = useState(false)
    const [error,      setError]      = useState<string | null>(null)
    const [submitted,  setSubmitted]  = useState(alreadySubmitted)
    const [showModal,  setShowModal]  = useState(false)

    const isDeadlinePassed = new Date() > new Date(comp.prediction_deadline)
    const locked = submitted || isDeadlinePassed

    // Completion checks
    const podiumComplete  = categories.every(cat => (podium[cat.id]?.length ?? 0) === 3)
    const p4pComplete     = p4p.men.length === 3 && p4p.women.length === 3
    const canSubmit       = podiumComplete && p4pComplete && !locked

    // Count podium selections
    const podiumFilled = categories.filter(cat => (podium[cat.id]?.length ?? 0) === 3).length

    async function handleSubmit() {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/predictions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                competition_id: comp.id,
                podium,
                p4p,
                strongest,
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            setError(data.error ?? 'Something went wrong.')
            setLoading(false)
            setShowModal(false)
            return
        }

        setSubmitted(true)
        setShowModal(false)
        router.refresh()
        setLoading(false)
    }

    const menCats   = categories.filter(c => c.gender === 'men')
    const womenCats = categories.filter(c => c.gender === 'women')

    return (
        <div className="flex flex-col gap-6">

            {/* Status bar */}
            <div className="flex items-center justify-between border border-blue/20 px-5 py-4 bg-blue/5">
                <div className="flex items-center gap-6">
                    {submitted ? (
                        <span className="font-condensed text-sm tracking-[2px] uppercase text-green-400 flex items-center gap-2">
              ✓ Predictions submitted
            </span>
                    ) : isDeadlinePassed ? (
                        <span className="font-condensed text-sm tracking-[2px] uppercase text-gray-muted">
              Deadline passed
            </span>
                    ) : (
                        <div className="flex items-center gap-6">
                            <div>
                                <p className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted">Podium</p>
                                <p className="font-bebas text-xl text-white">{podiumFilled}/{categories.length}</p>
                            </div>
                            <div>
                                <p className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted">P4P</p>
                                <p className="font-bebas text-xl text-white">{p4p.men.length + p4p.women.length}/6</p>
                            </div>
                        </div>
                    )}
                </div>
                <Countdown deadline={comp.prediction_deadline} />
            </div>

            {/* Already submitted message */}
            {submitted && (
                <div className="border border-green-400/20 bg-green-400/5 px-5 py-4">
                    <p className="font-condensed text-sm text-green-400 tracking-wide">
                        ✓ Your predictions have been submitted and locked in. Good luck!
                    </p>
                    <p className="text-gray-muted text-xs mt-1">Results will be revealed after the competition.</p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-px">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 px-4 py-3 font-condensed text-sm tracking-[1px] uppercase border transition-colors text-left ${
                            activeTab === tab.id
                                ? 'bg-blue border-blue-light text-white'
                                : 'bg-transparent border-blue/20 text-gray-muted hover:text-white hover:border-blue/40'
                        }`}
                    >
                        <span className="block">{tab.label}</span>
                        <span className="text-xs opacity-60 normal-case tracking-normal block mt-0.5">{tab.desc}</span>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div>
                {activeTab === 'podium' && (
                    <PodiumSelector
                        categories={categories}
                        onChange={setPodium}
                        locked={locked}
                    />
                )}

                {activeTab === 'p4p' && (
                    <div className="flex flex-col gap-4">
                        <div className="border border-blue/10 bg-blue/5 px-4 py-3">
                            <p className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted mb-1">How it works</p>
                            <p className="text-sm text-gray-muted/70">
                                Pick the 3 athletes with the best RIS score across ALL categories — separately for men and women.
                                Exact rank = <span className="text-green-400">{comp.scoring_config?.p4p?.points_exact ?? 20} pts</span>,
                                in top 3 but wrong rank = <span className="text-yellow-400">{comp.scoring_config?.p4p?.points_partial ?? 10} pts</span>.
                            </p>
                        </div>
                        <P4PSelector
                            menAthletes={menCats.flatMap((c: any) => c.athletes.map((a: any) => ({ ...a, category_name: c.name })))}
                            womenAthletes={womenCats.flatMap((c: any) => c.athletes.map((a: any) => ({ ...a, category_name: c.name })))}
                            onChange={setP4P}
                            locked={locked}
                        />
                    </div>
                )}

                {activeTab === 'strongest' && (
                    <div className="flex flex-col gap-4">
                        <div className="border border-yellow-400/10 bg-yellow-400/3 px-4 py-3">
                            <p className="font-condensed text-xs tracking-[3px] uppercase text-yellow-400/60 mb-1">Season bonus</p>
                            <p className="text-sm text-gray-muted/70">
                                This pick is for the entire season — not just this competition.
                                Finding the season's top RIS athlete earns you <span className="text-yellow-400">+100 bonus points</span> at the end of the season.
                                You can only submit this once.
                            </p>
                        </div>
                        <StrongestSelector
                            menAthletes={menAthletes}
                            womenAthletes={womenAthletes}
                            onChange={setStrongest}
                            locked={locked}
                            alreadySubmitted={seasonSubmitted}
                        />
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="border border-accent/30 bg-accent/8 px-4 py-3">
                    <p className="text-accent text-sm font-condensed tracking-wide">{error}</p>
                </div>
            )}

            {/* Submit button */}
            {!locked && (
                <div className="border-t border-blue/20 pt-6 flex items-center justify-between">
                    <div>
                        {!podiumComplete && (
                            <p className="text-gray-muted text-xs font-condensed tracking-wide">
                                Complete all podium picks to submit
                            </p>
                        )}
                        {podiumComplete && !p4pComplete && (
                            <p className="text-yellow-400 text-xs font-condensed tracking-wide">
                                Complete P4P picks to submit
                            </p>
                        )}
                        {canSubmit && (
                            <p className="text-green-400 text-xs font-condensed tracking-wide">
                                ✓ All required picks completed — ready to submit
                            </p>
                        )}
                    </div>
                    <Button
                        onClick={() => setShowModal(true)}
                        disabled={!canSubmit}
                        size="lg"
                    >
                        Submit Predictions →
                    </Button>
                </div>
            )}

            {/* Confirm modal */}
            {showModal && (
                <div className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
                    <div className="bg-dark border border-blue-light/30 p-8 max-w-md w-full">
                        <p className="font-bebas text-4xl tracking-wide mb-2">Confirm Submission</p>
                        <p className="text-gray-muted text-sm mb-6">
                            Once submitted you cannot change your predictions. Make sure you're happy with your picks.
                        </p>

                        <div className="flex flex-col gap-2 mb-6 border border-blue/20 p-4 bg-blue/5">
                            <div className="flex justify-between font-condensed text-sm">
                                <span className="text-gray-muted">Podium picks</span>
                                <span className={podiumComplete ? 'text-green-400' : 'text-accent'}>
                  {podiumFilled}/{categories.length} categories
                </span>
                            </div>
                            <div className="flex justify-between font-condensed text-sm">
                                <span className="text-gray-muted">P4P picks</span>
                                <span className={p4pComplete ? 'text-green-400' : 'text-accent'}>
                  {p4p.men.length}/3 men · {p4p.women.length}/3 women
                </span>
                            </div>
                            {(strongest.men_athlete_id || strongest.women_athlete_id) && (
                                <div className="flex justify-between font-condensed text-sm">
                                    <span className="text-gray-muted">Strongest Streetlifter</span>
                                    <span className="text-yellow-400">Included</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button variant="ghost" size="md" onClick={() => setShowModal(false)} className="flex-1">
                                Cancel
                            </Button>
                            <Button size="md" onClick={handleSubmit} loading={loading} className="flex-1">
                                Confirm →
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}