'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function msUntil(deadline: string) {
    return new Date(deadline).getTime() - Date.now()
}

function formatCountdown(ms: number) {
    if (ms <= 0) return null
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    if (h >= 1) return `${h}h ${m}m`
    return `${m}m`
}

export default function DeadlineBanner({ deadline, compName }: { deadline: string; compName: string }) {
    const [ms, setMs] = useState(() => msUntil(deadline))

    useEffect(() => {
        const id = setInterval(() => setMs(msUntil(deadline)), 30000)
        return () => clearInterval(id)
    }, [deadline])

    // Only show when within 24h and not yet passed
    if (ms <= 0 || ms > 24 * 3600 * 1000) return null

    const label = formatCountdown(ms)

    return (
        <div className="bg-accent/10 border-b border-accent/30 px-4 py-2 flex items-center justify-between gap-4">
            <p className="font-condensed text-xs tracking-wide text-accent">
                ⏰ Predictions for <span className="text-white font-semibold">{compName}</span> close in{' '}
                <span className="font-semibold">{label}</span>
            </p>
            <Link
                href="/predict"
                className="font-condensed text-xs tracking-[2px] uppercase text-accent hover:text-white transition-colors flex-shrink-0"
            >
                Submit now →
            </Link>
        </div>
    )
}
