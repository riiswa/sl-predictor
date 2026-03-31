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

const DEFAULT_SCORING = {
    podium: { points_exact: 10, points_partial: 5, positions: 3 },
    p4p:    { points_exact: 20, points_partial: 10, positions: 3 },
}

const DEFAULT_CATEGORIES = [
    { gender: 'women', weight_class: '-52kg',  name: 'Women -52kg',  display_order: 1  },
    { gender: 'women', weight_class: '-57kg',  name: 'Women -57kg',  display_order: 2  },
    { gender: 'women', weight_class: '-63kg',  name: 'Women -63kg',  display_order: 3  },
    { gender: 'women', weight_class: '-70kg',  name: 'Women -70kg',  display_order: 4  },
    { gender: 'women', weight_class: '+70kg',  name: 'Women +70kg',  display_order: 5  },
    { gender: 'men',   weight_class: '-66kg',  name: 'Men -66kg',    display_order: 6  },
    { gender: 'men',   weight_class: '-73kg',  name: 'Men -73kg',    display_order: 7  },
    { gender: 'men',   weight_class: '-80kg',  name: 'Men -80kg',    display_order: 8  },
    { gender: 'men',   weight_class: '-87kg',  name: 'Men -87kg',    display_order: 9  },
    { gender: 'men',   weight_class: '-94kg',  name: 'Men -94kg',    display_order: 10 },
    { gender: 'men',   weight_class: '-101kg', name: 'Men -101kg',   display_order: 11 },
    { gender: 'men',   weight_class: '+101kg', name: 'Men +101kg',   display_order: 12 },
]

export default function CompForm() {
    const router   = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState<string | null>(null)

    const [form, setForm] = useState({
        name:                 '',
        country:              '',
        flag:                 '',
        organizer:            '',
        date_start:           '',
        date_end:             '',
        prediction_deadline:  '',
        google_sheet_id:      '',
        google_sheet_tab:     '',
    })

    function set(key: keyof typeof form, value: string) {
        setForm(prev => {
            const next = { ...prev, [key]: value }
            // Auto-fill flag when country changes
            if (key === 'country') next.flag = FLAGS[value.toUpperCase()] ?? ''
            return next
        })
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (!form.prediction_deadline) {
            setError('Prediction deadline is required.')
            setLoading(false)
            return
        }

        const { data, error } = await supabase
            .from('competitions')
            .insert({
                name:                form.name.trim(),
                country:             form.country.trim(),
                flag:                form.flag.trim(),
                organizer:           form.organizer.trim(),
                date_start:          form.date_start,
                date_end:            form.date_end || form.date_start,
                prediction_deadline: form.prediction_deadline,
                google_sheet_id:     form.google_sheet_id.trim() || null,
                google_sheet_tab:    form.google_sheet_tab.trim() || null,
                status:              'upcoming',
                scoring_config:      DEFAULT_SCORING,
            })
            .select('id')
            .single()

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        await supabase.from('categories').insert(
            DEFAULT_CATEGORIES.map(cat => ({ ...cat, competition_id: data.id }))
        )

        router.push(`/admin/${data.id}`)
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            {/* Section — Basic info */}
            <div className="border border-blue/20 p-6 flex flex-col gap-5">
                <p className="font-condensed text-xs tracking-[4px] uppercase text-accent">Basic Info</p>

                <Input
                    label="Competition name"
                    required
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Dutch Streetlifting Nationals 26"
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Country code"
                        required
                        value={form.country}
                        onChange={e => set('country', e.target.value)}
                        placeholder="NL"
                        maxLength={3}
                    />
                    <Input
                        label="Flag emoji (auto-filled)"
                        value={form.flag}
                        onChange={e => set('flag', e.target.value)}
                        placeholder="🇳🇱"
                    />
                </div>

                <Input
                    label="Organizer"
                    value={form.organizer}
                    onChange={e => set('organizer', e.target.value)}
                    placeholder="DSN"
                />
            </div>

            {/* Section — Dates */}
            <div className="border border-blue/20 p-6 flex flex-col gap-5">
                <p className="font-condensed text-xs tracking-[4px] uppercase text-accent">Dates</p>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Start date"
                        type="date"
                        required
                        value={form.date_start}
                        onChange={e => set('date_start', e.target.value)}
                    />
                    <Input
                        label="End date"
                        type="date"
                        value={form.date_end}
                        onChange={e => set('date_end', e.target.value)}
                    />
                </div>

                <Input
                    label="Prediction deadline"
                    hint="(closes 1h before first heat)"
                    type="datetime-local"
                    required
                    value={form.prediction_deadline}
                    onChange={e => set('prediction_deadline', e.target.value)}
                />
            </div>

            {/* Section — Google Sheets */}
            <div className="border border-blue/20 p-6 flex flex-col gap-5">
                <p className="font-condensed text-xs tracking-[4px] uppercase text-accent">Google Sheets — Results</p>
                <p className="text-gray-muted/50 text-xs font-condensed tracking-wide -mt-2">
                    Optional now — can be added later once results are ready.
                </p>

                <Input
                    label="Sheet ID"
                    hint="(from the URL: /spreadsheets/d/SHEET_ID/)"
                    value={form.google_sheet_id}
                    onChange={e => set('google_sheet_id', e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUq..."
                />

                <Input
                    label="Tab name"
                    hint="(default tab if results are on one sheet)"
                    value={form.google_sheet_tab}
                    onChange={e => set('google_sheet_tab', e.target.value)}
                    placeholder="Results"
                />
            </div>

            {/* Scoring preview */}
            <div className="border border-blue/10 p-5 bg-blue/5">
                <p className="font-condensed text-xs tracking-[4px] uppercase text-gray-muted mb-3">Default scoring</p>
                <div className="flex gap-8 text-sm font-condensed">
                    <span className="text-gray-muted">Podium exact: <span className="text-green-400">10 pts</span></span>
                    <span className="text-gray-muted">Podium partial: <span className="text-yellow-400">5 pts</span></span>
                    <span className="text-gray-muted">P4P exact: <span className="text-green-400">20 pts</span></span>
                    <span className="text-gray-muted">P4P partial: <span className="text-yellow-400">10 pts</span></span>
                </div>
                <p className="text-gray-muted/30 text-xs mt-2">Editable in Supabase after creation.</p>
            </div>

            {error && (
                <div className="border border-accent/30 bg-accent/8 px-4 py-3">
                    <p className="text-accent text-sm font-condensed tracking-wide">{error}</p>
                </div>
            )}

            <Button type="submit" size="lg" loading={loading}>
                Create Competition →
            </Button>
        </form>
    )
}