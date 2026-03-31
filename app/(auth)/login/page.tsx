'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthCard from '@/components/ui/AuthCard'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function LoginPage() {
    const router       = useRouter()
    const searchParams = useSearchParams()
    const redirectTo   = searchParams.get('redirect') ?? '/ranking'
    const supabase     = createClient()

    const [email,    setEmail]    = useState('')
    const [password, setPassword] = useState('')
    const [error,    setError]    = useState<string | null>(null)
    const [loading,  setLoading]  = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            setError('Incorrect email or password.')
            setLoading(false)
            return
        }

        router.push(redirectTo)
        router.refresh()
    }

    return (
        <AuthCard
            tag="Sign in"
            title="Welcome back"
            footer={
                <p className="text-center text-sm text-gray-muted">
                    No account yet?{' '}
                    <Link href="/register" className="text-white hover:text-accent transition-colors">
                        Register
                    </Link>
                </p>
            }
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <Input
                    label="Email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                />
                <Input
                    label="Password"
                    type="password"
                    required
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
                    Sign in →
                </Button>
            </form>
        </AuthCard>
    )
}