'use client'

import { useEffect, useState } from 'react'
import type { ToastType } from '@/lib/toast'

interface ToastItem { id: number; msg: string; type: ToastType }

export default function Toaster() {
    const [toasts, setToasts] = useState<ToastItem[]>([])

    useEffect(() => {
        let counter = 0
        function handler(e: Event) {
            const { msg, type } = (e as CustomEvent).detail as { msg: string; type: ToastType }
            const id = counter++
            setToasts(prev => [...prev, { id, msg, type }])
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
        }
        window.addEventListener('app:toast', handler)
        return () => window.removeEventListener('app:toast', handler)
    }, [])

    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`flex items-center gap-3 px-4 py-3 border font-condensed text-sm tracking-wide shadow-lg animate-fade-up ${
                        t.type === 'error'
                            ? 'bg-dark border-accent/40 text-accent'
                            : 'bg-dark border-green-400/40 text-green-400'
                    }`}
                >
                    <span>{t.type === 'error' ? '✕' : '✓'}</span>
                    <span>{t.msg}</span>
                </div>
            ))}
        </div>
    )
}
