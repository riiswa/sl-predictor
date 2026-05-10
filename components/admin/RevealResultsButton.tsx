'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function RevealResultsButton({ compId }: { compId: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState<string | null>(null)

    async function handleReveal() {
        setLoading(true)
        setError(null)

        const res  = await fetch('/api/drive/reveal', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ competition_id: compId }),
        })
        const data = await res.json()

        if (!res.ok) {
            setError(data.error ?? 'Reveal failed')
            setLoading(false)
            return
        }

        router.refresh()
    }

    return (
        <div>
            <Button variant="primary" size="md" onClick={handleReveal} loading={loading}>
                Reveal Results & Score Predictions
            </Button>
            {error && (
                <p className="text-accent text-xs font-condensed mt-2">{error}</p>
            )}
        </div>
    )
}
