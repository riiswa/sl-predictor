'use client'

import { useState } from 'react'

interface Athlete {
    id: string
    first_name: string
    last_name: string
    nationality: string
    category_name: string
}

export interface P4PPick {
    position: 1 | 2 | 3
    athlete_id: string
    athlete_name: string
}

export interface P4PSelections {
    men:   P4PPick[]
    women: P4PPick[]
}

interface Props {
    menAthletes:   Athlete[]
    womenAthletes: Athlete[]
    onChange: (selections: P4PSelections) => void
    locked?: boolean
}

const MEDALS  = ['🥇', '🥈', '🥉']
const POSITIONS: Array<1 | 2 | 3> = [1, 2, 3]

export default function P4PSelector({ menAthletes, womenAthletes, onChange, locked = false }: Props) {
    const [selections, setSelections] = useState<P4PSelections>({ men: [], women: [] })

    function pick(gender: 'men' | 'women', position: 1 | 2 | 3, athlete: Athlete) {
        if (locked) return

        const picks   = [...selections[gender]]
        const filtered = picks.filter(p => p.athlete_id !== athlete.id && p.position !== position)

        const next: P4PSelections = {
            ...selections,
            [gender]: [...filtered, {
                position,
                athlete_id:   athlete.id,
                athlete_name: `${athlete.first_name} ${athlete.last_name}`,
            }].sort((a, b) => a.position - b.position),
        }

        setSelections(next)
        onChange(next)
    }

    function getPickForPosition(gender: 'men' | 'women', position: 1 | 2 | 3): P4PPick | undefined {
        return selections[gender].find(p => p.position === position)
    }

    function isAthleteUsed(gender: 'men' | 'women', athleteId: string): boolean {
        return selections[gender].some(p => p.athlete_id === athleteId)
    }

    function isComplete(gender: 'men' | 'women') {
        return selections[gender].length === 3
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['men', 'women'] as const).map(gender => {
                const athletes = gender === 'men' ? menAthletes : womenAthletes
                const color    = gender === 'men' ? 'text-blue-light' : 'text-pink-400'
                const label    = gender === 'men' ? 'Men — Top 3 RIS' : 'Women — Top 3 RIS'

                return (
                    <div key={gender} className={`border transition-colors ${isComplete(gender) ? 'border-blue/30' : 'border-blue/15'}`}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-blue/10">
                            <span className={`font-bebas text-lg tracking-wide ${color}`}>{label}</span>
                            {isComplete(gender) && (
                                <span className="font-condensed text-xs tracking-[2px] uppercase text-green-400 bg-green-400/10 px-2 py-0.5">
                  ✓ Done
                </span>
                            )}
                        </div>

                        {/* Podium slots */}
                        <div className="grid grid-cols-3 gap-px border-b border-blue/10">
                            {POSITIONS.map(pos => {
                                const picked = getPickForPosition(gender, pos)
                                return (
                                    <div key={pos} className={`px-3 py-3 ${picked ? 'bg-blue/15' : 'bg-dark/40'}`}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-sm">{MEDALS[pos-1]}</span>
                                            <span className="font-condensed text-xs text-gray-muted tracking-[1px]">
                        {pos === 1 ? '1st' : pos === 2 ? '2nd' : '3rd'}
                      </span>
                                        </div>
                                        {picked
                                            ? <p className="font-condensed text-xs font-semibold text-white leading-tight">{picked.athlete_name}</p>
                                            : <p className="font-condensed text-xs text-gray-muted/30 italic">—</p>
                                        }
                                    </div>
                                )
                            })}
                        </div>

                        {/* Athletes list */}
                        {!locked && (
                            <div className="p-3 flex flex-col gap-1 max-h-72 overflow-y-auto">
                                {athletes.map(athlete => {
                                    const used = isAthleteUsed(gender, athlete.id)
                                    return (
                                        <div
                                            key={athlete.id}
                                            className={`flex items-center justify-between px-3 py-2.5 border border-blue/10 transition-colors ${
                                                used ? 'bg-blue/15' : 'hover:bg-blue/8'
                                            }`}
                                        >
                                            <div>
                                                <p className="font-condensed text-sm font-semibold text-white">
                                                    {athlete.first_name} {athlete.last_name}
                                                </p>
                                                <p className="text-xs text-gray-muted">
                                                    {athlete.nationality} · {athlete.category_name}
                                                </p>
                                            </div>
                                            <div className="flex gap-1">
                                                {POSITIONS.map(pos => {
                                                    const slotTaken  = getPickForPosition(gender, pos)
                                                    const isThisPick = slotTaken?.athlete_id === athlete.id
                                                    return (
                                                        <button
                                                            key={pos}
                                                            onClick={() => pick(gender, pos, athlete)}
                                                            className={`w-8 h-8 font-condensed text-xs border transition-all ${
                                                                isThisPick
                                                                    ? 'bg-accent border-accent text-white'
                                                                    : 'border-blue/20 text-gray-muted hover:border-blue-light hover:text-white'
                                                            }`}
                                                        >
                                                            {MEDALS[pos-1]}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}