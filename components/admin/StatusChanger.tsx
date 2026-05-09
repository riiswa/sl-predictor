'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STATUSES = [
    { value: 'upcoming',   label: 'Upcoming', desc: 'Not yet open for predictions' },
    { value: 'open',       label: 'Open',     desc: 'Predictions are open' },
    { value: 'closed',     label: 'Closed',   desc: 'Deadline passed, awaiting results' },
] as const

type Status = typeof STATUSES[number]['value']

// Which statuses can each status transition to
const ALLOWED: Record<string, Status[]> = {
    upcoming:   ['open'],
    open:       ['upcoming', 'closed'],
    closed:     ['open'],
    results_in: [],
}

export default function StatusChanger({ compId, currentStatus }: { compId: string; currentStatus: string }) {
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState<string | null>(null)
    const router   = useRouter()
    const supabase = createClient()

    const allowed = ALLOWED[currentStatus] ?? []

    async function changeStatus(newStatus: Status) {
        if (!allowed.includes(newStatus)) return
        setLoading(true)
        setError(null)

        const { error } = await supabase
            .from('competitions')
            .update({ status: newStatus })
            .eq('id', compId)

        if (error) { setError(error.message) } else { router.refresh() }
        setLoading(false)
    }

    if (currentStatus === 'results_in') {
        return (
            <p className="text-gray-muted/40 text-xs font-condensed tracking-wide">
                Results have been revealed. Use the Un-reveal button below to reset and re-score.
            </p>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => {
                    const isCurrent  = s.value === currentStatus
                    const isAllowed  = allowed.includes(s.value)
                    return (
                        <button
                            key={s.value}
                            onClick={() => changeStatus(s.value)}
                            disabled={loading || isCurrent || !isAllowed}
                            className={`font-condensed text-sm tracking-[1px] uppercase px-5 py-2.5 border transition-all ${
                                isCurrent
                                    ? 'bg-blue border-blue-light text-white cursor-default'
                                    : isAllowed
                                        ? 'bg-transparent border-blue/30 text-gray-muted hover:text-white hover:border-blue-light cursor-pointer disabled:opacity-50'
                                        : 'bg-transparent border-blue/10 text-gray-muted/20 cursor-not-allowed'
                            }`}
                        >
                            {s.label}
                        </button>
                    )
                })}
            </div>
            <p className="text-gray-muted/40 text-xs font-condensed tracking-wide">
                {STATUSES.find(s => s.value === currentStatus)?.desc}
            </p>
            {error && <p className="text-accent text-xs font-condensed">{error}</p>}
        </div>
    )
}
