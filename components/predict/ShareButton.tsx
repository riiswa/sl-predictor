'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

export default function ShareButton({ compName }: { compName: string }) {
    const [copied, setCopied] = useState(false)

    async function handleShare() {
        const url = `${window.location.origin}/predict`
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Button variant="ghost" size="md" onClick={handleShare}>
            {copied ? '✓ Link copied!' : 'Share →'}
        </Button>
    )
}
