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
    const [timeout,  setTimeout]  = useState(false)

    useEffect(() => {
        // Listen for auth state changes (PASSWORD_RECOVERY event)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setReady(true)
            }
        })

        // Also check if user already has a valid session (from clicking reset link)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setReady(true)
        })

        // If recovery link doesn't load within 10 seconds, show error
        const timer = setTimeout(() => {
            setReady(prev => {
                if (!prev) setTimeout(true)
                return prev
            })
        }, 10000)

        return () => {
            subscription.unsubscribe()
            clearTimeout(timer)
        }
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
        if (timeout) {
            return (
                <div className="flex flex-col gap-4">
                    <div className="border border-accent/30 bg-accent/8 px-4 py-4">
                        <p className="text-accent text-sm font-condensed tracking-wide">
                            Reset link invalid or expired
                        </p>
                        <p className="text-gray-muted/60 text-xs font-condensed mt-2">
                            Links expire after 1 hour. Request a new reset link to try again.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/forgot-password')}
                        className="px-4 py-2 text-sm font-condensed text-center border border-blue/30 hover:bg-blue/10 transition-colors text-white rounded"
                    >
                        Request new link
                    </button>
                </div>
            )
        }

        return (
            <div className="flex flex-col gap-3">
                <div className="h-1 w-full bg-blue/20 overflow-hidden">
                    <div className="h-full w-1/2 bg-accent animate-pulse" />
                </div>
                <p className="text-gray-muted text-sm font-condensed tracking-wide">
                    Verifying your reset link... (click the link in your email)
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
