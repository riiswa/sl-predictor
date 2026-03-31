'use client'

import { useState } from 'react'

interface Athlete {
    id: string
    first_name: string
    last_name: string
    nationality: string
    competition_name: string
}

export interface StrongestSelections {
    men_athlete_id:   string | null
    women_athlete_id: string | null
}

interface Props {
    menAthletes:   Athlete[]
    womenAthletes: Athlete[]
    onChange: (s: StrongestSelections) => void
    locked?: boolean
    alreadySubmitted?: { gender: 'men' | 'women', name: string }[]
}

export default function StrongestSelector({ menAthletes, womenAthletes, onChange, locked = false, alreadySubmitted = [] }: Props) {
    const [selections, setSelections] = useState<StrongestSelections>({
        men_athlete_id:   null,
        women_athlete_id: null,
    })

    function pick(gender: 'men' | 'women', athleteId: string) {
        if (locked) return
        const next: StrongestSelections = {
            ...selections,
            [gender === 'men' ? 'men_athlete_id' : 'women_athlete_id']: athleteId,
        }
        setSelections(next)
        onChange(next)
    }

    const submittedMen   = alreadySubmitted.find(s => s.gender === 'men')
    const submittedWomen = alreadySubmitted.find(s => s.gender === 'women')

    return (
        <div className="border border-yellow-400/20 bg-yellow-400/3">
            {/* Header */}
            <div className="px-5 py-4 border-b border-yellow-400/10 flex items-center justify-between">
                <div>
                    <p className="font-condensed text-xs tracking-[4px] uppercase text-yellow-400 mb-1">
                        👑 The Strongest Streetlifter
                    </p>
                    <p className="text-gray-muted text-xs">
                        Who will finish with the highest RIS score of the entire season?
                        This is a one-time pick — closes on a fixed date.
                    </p>
                </div>
                {(submittedMen && submittedWomen) && (
                    <span className="font-condensed text-xs tracking-[2px] uppercase text-green-400 bg-green-400/10 px-3 py-1 flex-shrink-0 ml-4">
            ✓ Submitted
          </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px">
                {(['men', 'women'] as const).map(gender => {
                    const athletes  = gender === 'men' ? menAthletes : womenAthletes
                    const submitted = gender === 'men' ? submittedMen : submittedWomen
                    const selectedId = gender === 'men' ? selections.men_athlete_id : selections.women_athlete_id
                    const color = gender === 'men' ? 'text-blue-light' : 'text-pink-400'

                    return (
                        <div key={gender} className="p-4">
                            <p className={`font-condensed text-xs tracking-[3px] uppercase mb-3 ${color}`}>
                                {gender === 'men' ? '♂ Season Champion — Men' : '♀ Season Champion — Women'}
                            </p>

                            {/* Already submitted */}
                            {submitted ? (
                                <div className="border border-yellow-400/30 bg-yellow-400/8 px-4 py-3">
                                    <p className="font-condensed text-xs tracking-[2px] uppercase text-yellow-400 mb-1">Your pick</p>
                                    <p className="font-condensed text-base font-semibold text-white">{submitted.name}</p>
                                    <p className="text-xs text-gray-muted mt-1">Already submitted — cannot be changed</p>
                                </div>
                            ) : locked ? (
                                <p className="text-gray-muted/40 text-sm font-condensed">Picks are locked.</p>
                            ) : (
                                <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                                    {athletes.map(athlete => {
                                        const isSelected = selectedId === athlete.id
                                        return (
                                            <button
                                                key={athlete.id}
                                                onClick={() => pick(gender, athlete.id)}
                                                className={`flex items-center justify-between px-3 py-2.5 border text-left transition-all ${
                                                    isSelected
                                                        ? 'border-yellow-400/50 bg-yellow-400/10'
                                                        : 'border-blue/10 hover:border-blue/30 hover:bg-blue/8'
                                                }`}
                                            >
                                                <div>
                                                    <p className="font-condensed text-sm font-semibold text-white">
                                                        {athlete.first_name} {athlete.last_name}
                                                    </p>
                                                    <p className="text-xs text-gray-muted">
                                                        {athlete.nationality} · {athlete.competition_name}
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <span className="text-yellow-400 text-base flex-shrink-0 ml-2">👑</span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}