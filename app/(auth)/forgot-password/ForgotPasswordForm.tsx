'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function ForgotPasswordForm() {
    const supabase = createClient()

    const [email,   setEmail]   = useState('')
    const [loading, setLoading] = useState(false)
    const [sent,    setSent]    = useState(false)
    const [error,   setError]   = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        setSent(true)
    }

    if (sent) {
        return (
            <div className="flex flex-col gap-4">
                <div className="border border-blue/30 bg-blue/8 px-4 py-4">
                    <p className="text-white text-sm font-condensed tracking-wide">
                        Check your inbox — we sent a reset link to <span className="text-accent">{email}</span>.
                    </p>
                    <p className="text-gray-muted/50 text-xs font-condensed mt-1">
                        The link expires in 1 hour.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
            />

            {error && (
                <div className="border border-accent/30 bg-accent/8 px-4 py-3">
                    <p className="text-accent text-sm font-condensed tracking-wide">{error}</p>
                </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
                Send reset link →
            </Button>
        </form>
    )
}
