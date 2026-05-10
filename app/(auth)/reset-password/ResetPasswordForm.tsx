'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function ResetPasswordForm() {
    const router   = useRouter()
    const supabase = createClient()

    const [ready,    setReady]    = useState(false)
    const [password, setPassword] = useState('')
    const [loading,  setLoading]  = useState(false)
    const [done,     setDone]     = useState(false)
    const [error,    setError]    = useState<string | null>(null)

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') setReady(true)
        })
        return () => subscription.unsubscribe()
    }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (password.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        setDone(true)
        setTimeout(() => router.push('/login'), 2500)
    }

    if (!ready) {
        return (
            <div className="flex flex-col gap-3">
                <div className="h-1 w-full bg-blue/20 overflow-hidden">
                    <div className="h-full w-1/2 bg-accent animate-pulse" />
                </div>
                <p className="text-gray-muted text-sm font-condensed tracking-wide">
                    Verifying your reset link...
                </p>
            </div>
        )
    }

    if (done) {
        return (
            <div className="border border-blue/30 bg-blue/8 px-4 py-4">
                <p className="text-white text-sm font-condensed tracking-wide">
                    Password updated. Redirecting to sign in...
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
                label="New password"
                hint="(min. 8 characters)"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
            />

            {error && (
                <div className="border border-accent/30 bg-accent/8 px-4 py-3">
                    <p className="text-accent text-sm font-condensed tracking-wide">{error}</p>
                </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
                Set new password →
            </Button>
        </form>
    )
}
