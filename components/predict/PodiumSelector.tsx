'use client'

import { useState } from 'react'

interface Athlete {
    id: string
    first_name: string
    last_name: string
    nationality: string
    pr_muscle_up: number | null
    pr_pullup: number | null
    pr_dip: number | null
    pr_squat: number | null
}

interface Category {
    id: string
    name: string
    gender: string
    weight_class: string
    display_order: number
    athletes: Athlete[]
}

interface PodiumPick {
    position: 1 | 2 | 3
    athlete_id: string
    athlete_name: string
}

export type PodiumSelections = Record<string, PodiumPick[]> // category_id → picks

interface Props {
    categories: Category[]
    onChange: (selections: PodiumSelections) => void
    locked?: boolean
}

const MEDALS = ['🥇', '🥈', '🥉']
const POSITIONS: Array<1 | 2 | 3> = [1, 2, 3]

export default function PodiumSelector({ categories, onChange, locked = false }: Props) {
    const [selections, setSelections] = useState<PodiumSelections>({})

    function pick(catId: string, position: 1 | 2 | 3, athlete: Athlete) {
        if (locked) return

        const catPicks = [...(selections[catId] ?? [])]
        const filtered = catPicks.filter(p => p.athlete_id !== athlete.id && p.position !== position)

        const next = {
            ...selections,
            [catId]: [...filtered, {
                position,
                athlete_id:   athlete.id,
                athlete_name: `${athlete.first_name} ${athlete.last_name}`,
            }].sort((a, b) => a.position - b.position),
        }

        setSelections(next)
        onChange(next)
    }

    function getPickForPosition(catId: string, position: 1 | 2 | 3): PodiumPick | undefined {
        return selections[catId]?.find(p => p.position === position)
    }

    function isAthleteUsed(catId: string, athleteId: string): boolean {
        return selections[catId]?.some(p => p.athlete_id === athleteId) ?? false
    }

    function completedCount() {
        return categories.filter(cat =>
            (selections[cat.id]?.length ?? 0) === 3
        ).length
    }

    const women = categories.filter(c => c.gender === 'women').sort((a,b) => a.display_order - b.display_order)
    const men   = categories.filter(c => c.gender === 'men').sort((a,b) => a.display_order - b.display_order)

    return (
        <div className="flex flex-col gap-2">

            {/* Progress */}
            <div className="flex items-center justify-between mb-4">
                <p className="font-condensed text-xs tracking-[4px] uppercase text-gray-muted">
                    {completedCount()} / {categories.length} categories complete
                </p>
                <div className="flex-1 mx-6 h-px bg-blue/20 relative">
                    <div
                        className="absolute inset-y-0 left-0 bg-accent transition-all duration-300"
                        style={{ width: `${(completedCount() / categories.length) * 100}%` }}
                    />
                </div>
                <p className="font-condensed text-xs tracking-[2px] text-accent">
                    {Math.round((completedCount() / categories.length) * 100)}%
                </p>
            </div>

            {/* Women */}
            <div className="mb-2">
                <div className="font-condensed text-xs tracking-[4px] uppercase text-pink-400/60 mb-3 flex items-center gap-3">
                    <span>Women</span>
                    <div className="flex-1 h-px bg-pink-400/10" />
                </div>
                {women.map(cat => (
                    <CategoryBlock
                        key={cat.id}
                        cat={cat}
                        positions={POSITIONS}
                        medals={MEDALS}
                        getPickForPosition={getPickForPosition}
                        isAthleteUsed={isAthleteUsed}
                        pick={pick}
                        locked={locked}
                        complete={(selections[cat.id]?.length ?? 0) === 3}
                    />
                ))}
            </div>

            {/* Men */}
            <div>
                <div className="font-condensed text-xs tracking-[4px] uppercase text-blue-light/60 mb-3 flex items-center gap-3">
                    <span>Men</span>
                    <div className="flex-1 h-px bg-blue-light/10" />
                </div>
                {men.map(cat => (
                    <CategoryBlock
                        key={cat.id}
                        cat={cat}
                        positions={POSITIONS}
                        medals={MEDALS}
                        getPickForPosition={getPickForPosition}
                        isAthleteUsed={isAthleteUsed}
                        pick={pick}
                        locked={locked}
                        complete={(selections[cat.id]?.length ?? 0) === 3}
                    />
                ))}
            </div>
        </div>
    )
}

function CategoryBlock({
                           cat, positions, medals, getPickForPosition, isAthleteUsed, pick, locked, complete
                       }: {
    cat: Category
    positions: Array<1 | 2 | 3>
    medals: string[]
    getPickForPosition: (catId: string, position: 1 | 2 | 3) => PodiumPick | undefined
    isAthleteUsed: (catId: string, athleteId: string) => boolean
    pick: (catId: string, position: 1 | 2 | 3, athlete: Athlete) => void
    locked: boolean
    complete: boolean
}) {
    const [open, setOpen] = useState(true)

    return (
        <div className={`border mb-2 transition-colors ${complete ? 'border-blue/30' : 'border-blue/15'}`}>
            {/* Category header */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-blue/5 transition-colors"
            >
                <div className="flex items-center gap-3">
          <span className={`font-bebas text-lg tracking-wide ${
              cat.gender === 'women' ? 'text-pink-400' : 'text-blue-light'
          }`}>
            {cat.name}
          </span>
                    <span className="text-gray-muted text-xs font-condensed">
            {cat.athletes.length} athletes
          </span>
                </div>
                <div className="flex items-center gap-3">
                    {complete && (
                        <span className="font-condensed text-xs tracking-[2px] uppercase text-green-400 bg-green-400/10 px-2 py-0.5">
              ✓ Done
            </span>
                    )}
                    <span className="text-gray-muted text-xs">{open ? '▲' : '▼'}</span>
                </div>
            </button>

            {open && (
                <div className="border-t border-blue/10 p-4">
                    {/* Podium slots */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {positions.map(pos => {
                            const picked = getPickForPosition(cat.id, pos)
                            return (
                                <div
                                    key={pos}
                                    className={`border px-3 py-2.5 min-h-[60px] flex flex-col justify-center ${
                                        picked
                                            ? 'border-blue-light/40 bg-blue/15'
                                            : 'border-blue/10 bg-dark/40'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-base">{medals[pos - 1]}</span>
                                        <span className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted">
                      {pos === 1 ? '1st' : pos === 2 ? '2nd' : '3rd'}
                    </span>
                                    </div>
                                    {picked ? (
                                        <p className="font-condensed text-sm font-semibold text-white leading-tight">
                                            {picked.athlete_name}
                                        </p>
                                    ) : (
                                        <p className="font-condensed text-xs text-gray-muted/40 italic">Not selected</p>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Athletes grid */}
                    {!locked && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px">
                            {cat.athletes.map(athlete => {
                                const used = isAthleteUsed(cat.id, athlete.id)
                                return (
                                    <div
                                        key={athlete.id}
                                        className={`border border-blue/10 px-4 py-3 ${used ? 'bg-blue/15' : 'bg-dark/40 hover:bg-blue/8'} transition-colors`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="font-condensed font-semibold text-sm text-white">
                                                    {athlete.first_name} {athlete.last_name}
                                                </p>
                                                <p className="text-xs text-gray-muted">{athlete.nationality}</p>
                                            </div>
                                            {used && (
                                                <span className="font-condensed text-xs text-blue-light">
                          {positions.map(p => {
                              const pk = getPickForPosition(cat.id, p)
                              return pk?.athlete_id === athlete.id ? medals[p-1] : null
                          })}
                        </span>
                                            )}
                                        </div>
                                        {/* Position buttons */}
                                        <div className="flex gap-1.5">
                                            {positions.map(pos => {
                                                const slotTaken = getPickForPosition(cat.id, pos)
                                                const isThisPick = slotTaken?.athlete_id === athlete.id
                                                return (
                                                    <button
                                                        key={pos}
                                                        onClick={() => pick(cat.id, pos, athlete)}
                                                        className={`flex-1 font-condensed text-xs tracking-[1px] py-1.5 border transition-all ${
                                                            isThisPick
                                                                ? 'bg-accent border-accent text-white'
                                                                : slotTaken && !isThisPick
                                                                    ? 'border-blue/20 text-gray-muted/30 cursor-pointer hover:border-blue/40 hover:text-gray-muted'
                                                                    : 'border-blue/20 text-gray-muted hover:border-blue-light hover:text-white cursor-pointer'
                                                        }`}
                                                    >
                                                        {medals[pos-1]}
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
            )}
        </div>
    )
}