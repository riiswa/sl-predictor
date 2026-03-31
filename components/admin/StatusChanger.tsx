'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

const STATUSES = [
    { value: 'upcoming',   label: 'Upcoming',    desc: 'Not yet open for predictions' },
    { value: 'open',       label: 'Open',        desc: 'Predictions are open' },
    { value: 'closed',     label: 'Closed',      desc: 'Deadline passed, awaiting results' },
    { value: 'results_in', label: 'Results in',  desc: 'Scores calculated, ranking updated' },
] as const

type Status = typeof STATUSES[number]['value']

export default function StatusChanger({ compId, currentStatus }: { compId: string, currentStatus: string }) {
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    async function changeStatus(newStatus: Status) {
        if (newStatus === currentStatus) return
        setLoading(true)
        setError(null)

        const { error } = await supabase
            .from('competitions')
            .update({ status: newStatus })
            .eq('id', compId)

        if (error) {
            setError(error.message)
        } else {
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                    <button
                        key={s.value}
                        onClick={() => changeStatus(s.value)}
                        disabled={loading}
                        className={`font-condensed text-sm tracking-[1px] uppercase px-5 py-2.5 border transition-all disabled:opacity-50 ${
                            s.value === currentStatus
                                ? 'bg-blue border-blue-light text-white cursor-default'
                                : 'bg-transparent border-blue/30 text-gray-muted hover:text-white hover:border-blue-light cursor-pointer'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>
            <p className="text-gray-muted/40 text-xs font-condensed tracking-wide">
                {STATUSES.find(s => s.value === currentStatus)?.desc}
            </p>
            {error && <p className="text-accent text-xs font-condensed">{error}</p>}
        </div>
    )
}