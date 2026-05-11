'use client'

import { useState } from 'react'
import Medal from '@/components/ui/Medal'

interface Athlete {
    id: string
    first_name: string
    last_name: string
    nationality: string
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

export type PodiumSelections = Record<string, PodiumPick[]>

interface Props {
    categories: Category[]
    onChange: (selections: PodiumSelections) => void
    locked?: boolean
    initialSelections?: PodiumSelections
}

const POS_LABEL = ['1st', '2nd', '3rd']
const POSITIONS: Array<1 | 2 | 3> = [1, 2, 3]

export default function PodiumSelector({ categories, onChange, locked = false, initialSelections }: Props) {
    const [selections, setSelections] = useState<PodiumSelections>(initialSelections ?? {})

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
        return (selections[catId] ?? []).find(p => p.position === position)
    }

    function isAthleteUsed(catId: string, athleteId: string): boolean {
        return (selections[catId] ?? []).some(p => p.athlete_id === athleteId)
    }

    function getAthletePosition(catId: string, athleteId: string): 1 | 2 | 3 | null {
        return (selections[catId] ?? []).find(p => p.athlete_id === athleteId)?.position ?? null
    }

    function isCatComplete(catId: string): boolean {
        return (selections[catId] ?? []).length === 3
    }

    function completedCount(): number {
        return categories.filter(cat => isCatComplete(cat.id)).length
    }

    const women = categories.filter(c => c.gender === 'women').sort((a, b) => a.display_order - b.display_order)
    const men   = categories.filter(c => c.gender === 'men').sort((a, b) => a.display_order - b.display_order)
    const total = categories.length
    const done  = completedCount()

    return (
        <div className="flex flex-col gap-4">

            {women.length > 0 && (
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="font-condensed text-xs tracking-[4px] uppercase text-pink-400/70">Women</span>
                        <div className="flex-1 h-px bg-pink-400/10" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {women.map(cat => (
                            <CategoryBlock
                                key={cat.id} cat={cat}
                                getPickForPosition={getPickForPosition}
                                isAthleteUsed={isAthleteUsed}
                                getAthletePosition={getAthletePosition}
                                pick={pick} locked={locked}
                                complete={isCatComplete(cat.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {men.length > 0 && (
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="font-condensed text-xs tracking-[4px] uppercase text-blue-light/70">Men</span>
                        <div className="flex-1 h-px bg-blue-light/10" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {men.map(cat => (
                            <CategoryBlock
                                key={cat.id} cat={cat}
                                getPickForPosition={getPickForPosition}
                                isAthleteUsed={isAthleteUsed}
                                getAthletePosition={getAthletePosition}
                                pick={pick} locked={locked}
                                complete={isCatComplete(cat.id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function CategoryBlock({ cat, getPickForPosition, isAthleteUsed, getAthletePosition, pick, locked, complete }: {
    cat: Category
    getPickForPosition: (catId: string, position: 1 | 2 | 3) => PodiumPick | undefined
    isAthleteUsed: (catId: string, athleteId: string) => boolean
    getAthletePosition: (catId: string, athleteId: string) => 1 | 2 | 3 | null
    pick: (catId: string, position: 1 | 2 | 3, athlete: Athlete) => void
    locked: boolean
    complete: boolean
}) {
    const [open, setOpen] = useState(true)

    return (
        <div className={`border transition-all ${complete ? 'border-blue/40 bg-blue/5' : 'border-blue/25'}`}>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className={`font-bebas text-lg tracking-wide ${cat.gender === 'women' ? 'text-pink-400' : 'text-blue-light'}`}>
                        {cat.name}
                    </span>
                    <span className="text-gray-muted/60 text-xs font-condensed">{cat.athletes.length} athletes</span>
                </div>
                <div className="flex items-center gap-2">
                    {complete
                        ? <span className="font-condensed text-xs tracking-[1px] uppercase text-green-400">✓ Done</span>
                        : <span className="font-condensed text-xs text-gray-muted/60">{open ? '▲' : '▼'}</span>
                    }
                </div>
            </button>

            {open && (
                <div className="border-t border-blue/10">
                    {/* Podium preview */}
                    <div className="grid grid-cols-3 gap-px border-b border-blue/10">
                        {POSITIONS.map(pos => {
                            const picked = getPickForPosition(cat.id, pos)
                            return (
                                <div key={pos} className={`px-3 py-2.5 ${picked ? 'bg-blue/12' : 'bg-darker/30'}`}>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <Medal position={pos} />
                                        <span className="font-condensed text-xs text-gray-muted/70 tracking-[1px]">{POS_LABEL[pos - 1]}</span>
                                    </div>
                                    {picked
                                        ? <p className="font-condensed text-sm font-semibold text-white leading-tight truncate">{picked.athlete_name}</p>
                                        : <p className="text-xs text-gray-muted/50 italic font-condensed">—</p>
                                    }
                                </div>
                            )
                        })}
                    </div>

                    {/* Athletes */}
                    {!locked && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px p-px">
                            {cat.athletes.map(athlete => {
                                const used = isAthleteUsed(cat.id, athlete.id)
                                const pos  = getAthletePosition(cat.id, athlete.id)
                                return (
                                    <div key={athlete.id} className={`flex items-center justify-between px-4 py-2.5 transition-colors ${used ? 'bg-blue/15' : 'bg-dark/60 hover:bg-blue/8'}`}>
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {pos !== null && <Medal position={pos} />}
                                            <div className="min-w-0">
                                                <p className="font-condensed font-semibold text-sm text-white truncate">{athlete.first_name} {athlete.last_name}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0 ml-2">
                                            {POSITIONS.map(p => {
                                                const slotOwner  = getPickForPosition(cat.id, p)
                                                const isThisPick = slotOwner?.athlete_id === athlete.id
                                                const slotTaken  = slotOwner && !isThisPick
                                                return (
                                                    <button
                                                        key={p}
                                                        onClick={() => pick(cat.id, p, athlete)}
                                                        className={`w-7 h-7 font-condensed text-xs border transition-all ${
                                                            isThisPick ? 'bg-accent border-accent text-white'
                                                                : slotTaken ? 'border-blue/10 text-gray-muted/20 hover:border-blue/30 hover:text-gray-muted/50'
                                                                    : 'border-blue/20 text-gray-muted hover:border-blue-light hover:text-white'
                                                        }`}
                                                    >
                                                        {p}
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