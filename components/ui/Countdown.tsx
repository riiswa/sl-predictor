'use client'

import { useEffect, useState } from 'react'

export default function Countdown({ deadline }: { deadline: string }) {
    const [timeLeft, setTimeLeft] = useState('')
    const [urgent,   setUrgent]   = useState(false)

    useEffect(() => {
        function calc() {
            const diff = new Date(deadline).getTime() - Date.now()
            if (diff <= 0) {
                setTimeLeft('CLOSED')
                return
            }
            const h = Math.floor(diff / 3600000)
            const m = Math.floor((diff % 3600000) / 60000)
            const s = Math.floor((diff % 60000) / 1000)
            setUrgent(diff < 3600000) // red if under 1 hour
            setTimeLeft(
                h > 0
                    ? `${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`
                    : `${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`
            )
        }
        calc()
        const id = setInterval(calc, 1000)
        return () => clearInterval(id)
    }, [deadline])

    return (
        <div className="text-right">
            <p className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted">Deadline</p>
            <p className={`font-bebas text-2xl tracking-wide leading-none mt-0.5 ${
                timeLeft === 'CLOSED' ? 'text-gray-muted' :
                    urgent ? 'text-accent' : 'text-yellow-400'
            }`}>
                {timeLeft || '—'}
            </p>
        </div>
    )
}