'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function UnrevealButton({ compId }: { compId: string }) {
    const router  = useRouter()
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState<string | null>(null)

    async function handleUnreveal() {
        setLoading(true)
        setError(null)

        const res  = await fetch('/api/drive/unreveal', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ competition_id: compId }),
        })
        const data = await res.json()

        if (!res.ok) { setError(data.error ?? 'Un-reveal failed'); setLoading(false); return }
        router.refresh()
    }

    return (
        <div>
            <Button variant="danger" size="md" onClick={handleUnreveal} loading={loading}>
                Un-reveal & Reset Scores
            </Button>
            {error && <p className="text-accent text-xs font-condensed mt-2">{error}</p>}
        </div>
    )
}
