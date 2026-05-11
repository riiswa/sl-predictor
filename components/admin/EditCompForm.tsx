'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const FLAGS: Record<string, string> = {
    NL: '🇳🇱', IT: '🇮🇹', FR: '🇫🇷', DE: '🇩🇪',
    GB: '🇬🇧', CZ: '🇨🇿', RS: '🇷🇸', PT: '🇵🇹',
    SI: '🇸🇮', SM: '🇸🇲', BE: '🇧🇪', ES: '🇪🇸',
}

interface ScoringConfig {
    podium: { points_exact: number; points_partial: number; positions: number }
    p4p:    { points_exact: number; points_partial: number; positions: number }
}

interface Props {
    comp: {
        id:                  string
        name:                string
        country:             string
        flag:                string | null
        organizer:           string | null
        date_start:          string
        date_end:            string | null
        prediction_deadline: string
        scoring_config:      ScoringConfig | null
    }
}

export default function EditCompForm({ comp }: Props) {
    const router   = useRouter()
    const supabase = createClient()

    const [open,    setOpen]    = useState(false)
    const [loading, setLoading] = useState(false)
    const [saved,   setSaved]   = useState(false)
    const [error,   setError]   = useState<string | null>(null)

    // Metadata fields
    const [name,     setName]     = useState(comp.name)
    const [country,  setCountry]  = useState(comp.country)
    const [flag,     setFlag]     = useState(comp.flag ?? '')
    const [org,      setOrg]      = useState(comp.organizer ?? '')
    const [start,    setStart]    = useState(comp.date_start?.slice(0, 10) ?? '')
    const [end,      setEnd]      = useState(comp.date_end?.slice(0, 10) ?? '')
    const [deadline, setDeadline] = useState(
        comp.prediction_deadline ? comp.prediction_deadline.slice(0, 16) : ''
    )

    // Scoring config fields
    const sc = comp.scoring_config
    const [podiumExact,   setPodiumExact]   = useState(sc?.podium.points_exact   ?? 10)
    const [podiumPartial, setPodiumPartial] = useState(sc?.podium.points_partial ?? 5)
    const [podiumPos,     setPodiumPos]     = useState(sc?.podium.positions       ?? 3)
    const [p4pExact,      setP4pExact]      = useState(sc?.p4p.points_exact      ?? 20)
    const [p4pPartial,    setP4pPartial]    = useState(sc?.p4p.points_partial    ?? 10)
    const [p4pPos,        setP4pPos]        = useState(sc?.p4p.positions          ?? 3)

    function handleCountryChange(val: string) {
        setCountry(val)
        if (FLAGS[val.toUpperCase()]) setFlag(FLAGS[val.toUpperCase()])
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSaved(false)

        const { error } = await supabase
            .from('competitions')
            .update({
                name,
                country,
                flag:                flag || null,
                organizer:           org  || null,
                date_start:          start,
                date_end:            end  || null,
                prediction_deadline: deadline,
                scoring_config: {
                    podium: { points_exact: podiumExact, points_partial: podiumPartial, positions: podiumPos },
                    p4p:    { points_exact: p4pExact,    points_partial: p4pPartial,    positions: p4pPos    },
                },
            })
            .eq('id', comp.id)

        setLoading(false)
        if (error) { setError(error.message); return }
        setSaved(true)
        router.refresh()
    }

    return (
        <div className="border border-blue/20">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-blue/5 transition-colors"
            >
                <p className="font-condensed text-xs tracking-[4px] uppercase text-accent">
                    Edit Competition
                </p>
                <span className="text-gray-muted/50 text-sm">{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <form onSubmit={handleSave} className="px-6 pb-6 flex flex-col gap-6 border-t border-blue/10 pt-5">

                    {/* Metadata */}
                    <div className="flex flex-col gap-4">
                        <p className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted">Details</p>
                        <Input label="Name" required value={name} onChange={e => setName(e.target.value)} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                                label="Country code"
                                value={country}
                                maxLength={3}
                                onChange={e => handleCountryChange(e.target.value.toUpperCase())}
                                placeholder="NL"
                            />
                            <Input label="Flag" value={flag} onChange={e => setFlag(e.target.value)} placeholder="🇳🇱" />
                        </div>
                        <Input label="Organizer" value={org} onChange={e => setOrg(e.target.value)} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input label="Start date" type="date" required value={start} onChange={e => setStart(e.target.value)} />
                            <Input label="End date"   type="date"         value={end}   onChange={e => setEnd(e.target.value)} />
                        </div>
                        <Input
                            label="Prediction deadline"
                            type="datetime-local"
                            required
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                        />
                    </div>

                    {/* Scoring config */}
                    <div className="flex flex-col gap-4 border-t border-blue/10 pt-5">
                        <p className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted">Scoring Config</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px">
                            <div className="bg-dark/40 border border-blue/10 px-4 py-4 flex flex-col gap-3">
                                <p className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted/60">Podium</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <Input label="Exact pts"   type="number" min={0} value={podiumExact}   onChange={e => setPodiumExact(+e.target.value)} />
                                    <Input label="Partial pts" type="number" min={0} value={podiumPartial} onChange={e => setPodiumPartial(+e.target.value)} />
                                    <Input label="Positions"   type="number" min={1} value={podiumPos}     onChange={e => setPodiumPos(+e.target.value)} />
                                </div>
                            </div>
                            <div className="bg-dark/40 border border-blue/10 px-4 py-4 flex flex-col gap-3">
                                <p className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted/60">P4P (RIS)</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <Input label="Exact pts"   type="number" min={0} value={p4pExact}   onChange={e => setP4pExact(+e.target.value)} />
                                    <Input label="Partial pts" type="number" min={0} value={p4pPartial} onChange={e => setP4pPartial(+e.target.value)} />
                                    <Input label="Positions"   type="number" min={1} value={p4pPos}     onChange={e => setP4pPos(+e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="border border-accent/30 bg-accent/8 px-4 py-3">
                            <p className="text-accent text-sm font-condensed">{error}</p>
                        </div>
                    )}
                    {saved && (
                        <div className="border border-green-400/30 bg-green-400/8 px-4 py-3">
                            <p className="text-green-400 text-sm font-condensed">Saved.</p>
                        </div>
                    )}

                    <div>
                        <Button type="submit" size="md" loading={loading}>Save changes →</Button>
                    </div>
                </form>
            )}
        </div>
    )
}
