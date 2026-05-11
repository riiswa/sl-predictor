'use client'

import { useState } from 'react'
import Medal from '@/components/ui/Medal'

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
    initialSelections?: P4PSelections
}

const POS_LABEL = ['1st', '2nd', '3rd']
const POSITIONS: Array<1 | 2 | 3> = [1, 2, 3]

export default function P4PSelector({ menAthletes, womenAthletes, onChange, locked = false, initialSelections }: Props) {
    const [selections, setSelections] = useState<P4PSelections>({
        men:   initialSelections?.men   ?? [],
        women: initialSelections?.women ?? [],
    })
    const [search, setSearch] = useState({ men: '', women: '' })

    function pick(gender: 'men' | 'women', position: 1 | 2 | 3, athlete: Athlete) {
        if (locked) return
        const picks    = [...(selections[gender] ?? [])]
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

    function getPickForPosition(gender: 'men' | 'women', position: 1 | 2 | 3) {
        return (selections[gender] ?? []).find(p => p.position === position)
    }

    function getAthletePosition(gender: 'men' | 'women', athleteId: string): 1 | 2 | 3 | null {
        return (selections[gender] ?? []).find(p => p.athlete_id === athleteId)?.position ?? null
    }

    function isComplete(gender: 'men' | 'women') { return (selections[gender]?.length ?? 0) === 3 }

    function filtered(gender: 'men' | 'women') {
        const q        = search[gender].toLowerCase()
        const athletes = gender === 'men' ? menAthletes : womenAthletes
        if (!q) return athletes
        return athletes.filter(a =>
            `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) ||
            a.nationality.toLowerCase().includes(q) ||
            a.category_name.toLowerCase().includes(q)
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['men', 'women'] as const).map(gender => {
                const color    = gender === 'men' ? 'text-blue-light' : 'text-pink-400'
                const label    = gender === 'men' ? 'Men — Top 3 RIS' : 'Women — Top 3 RIS'
                const complete = isComplete(gender)

                return (
                    <div key={gender} className={`border flex flex-col transition-colors ${complete ? 'border-blue/40' : 'border-blue/25'}`}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-blue/10">
                            <span className={`font-bebas text-lg tracking-wide ${color}`}>{label}</span>
                            {complete && <span className="font-condensed text-xs tracking-[1px] uppercase text-green-400">✓ Done</span>}
                        </div>

                        {/* Podium slots */}
                        <div className="grid grid-cols-3 gap-px border-b border-blue/10">
                            {POSITIONS.map(pos => {
                                const picked = getPickForPosition(gender, pos)
                                return (
                                    <div key={pos} className={`px-3 py-2.5 ${picked ? 'bg-blue/12' : 'bg-darker/30'}`}>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <Medal position={pos} />
                                            <span className="font-condensed text-xs text-gray-muted/70 tracking-[1px]">{POS_LABEL[pos - 1]}</span>
                                        </div>
                                        {picked
                                            ? <p className="font-condensed text-xs font-semibold text-white leading-tight truncate">{picked.athlete_name}</p>
                                            : <p className="text-xs text-gray-muted/50 italic font-condensed">—</p>
                                        }
                                    </div>
                                )
                            })}
                        </div>

                        {/* Search */}
                        {!locked && (
                            <div className="px-3 py-2 border-b border-blue/10">
                                <input
                                    type="text"
                                    placeholder="Search athlete..."
                                    value={search[gender]}
                                    onChange={e => setSearch(s => ({ ...s, [gender]: e.target.value }))}
                                    className="w-full bg-transparent text-xs font-condensed text-white placeholder:text-gray-muted/30 focus:outline-none tracking-wide"
                                />
                            </div>
                        )}

                        {/* Athlete list */}
                        {!locked && (
                            <div className="flex flex-col overflow-y-auto" style={{ maxHeight: '280px' }}>
                                {filtered(gender).map(athlete => {
                                    const pos        = getAthletePosition(gender, athlete.id)
                                    const isSelected = pos !== null
                                    return (
                                        <div
                                            key={athlete.id}
                                            className={`flex items-center justify-between px-3 py-2.5 border-b border-blue/5 last:border-0 transition-colors ${isSelected ? 'bg-blue/15' : 'hover:bg-blue/8'}`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {pos !== null && <Medal position={pos} />}
                                                <div className="min-w-0">
                                                    <p className="font-condensed text-sm font-semibold text-white truncate">{athlete.first_name} {athlete.last_name}</p>
                                                    <p className="text-xs text-gray-muted/60 truncate">{athlete.category_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0 ml-2">
                                                {POSITIONS.map(p => {
                                                    const slotOwner  = getPickForPosition(gender, p)
                                                    const isThisPick = slotOwner?.athlete_id === athlete.id
                                                    const slotTaken  = slotOwner && !isThisPick
                                                    return (
                                                        <button
                                                            key={p}
                                                            onClick={() => pick(gender, p, athlete)}
                                                            className={`w-7 h-7 text-xs border transition-all ${
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
                                {filtered(gender).length === 0 && (
                                    <p className="px-4 py-6 text-center text-gray-muted/60 text-xs font-condensed">No athletes match</p>
                                )}
                            </div>
                        )}

                        {/* Locked state — show current picks */}
                        {locked && (selections[gender]?.length ?? 0) > 0 && (
                            <div className="flex flex-col gap-px p-px">
                                {(selections[gender] ?? []).sort((a, b) => a.position - b.position).map(pick => (
                                    <div key={pick.athlete_id} className="flex items-center gap-2.5 px-4 py-2.5 bg-dark/40">
                                        <Medal position={pick.position} />
                                        <p className="font-condensed text-sm text-white">{pick.athlete_name}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}