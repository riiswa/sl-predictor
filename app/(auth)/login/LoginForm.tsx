'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function LoginForm() {
    const router       = useRouter()
    const searchParams = useSearchParams()
    const redirectTo   = searchParams.get('redirect') ?? '/ranking'

    const [email,    setEmail]    = useState('')
    const [password, setPassword] = useState('')
    const [error,    setError]    = useState<string | null>(null)
    const [loading,  setLoading]  = useState(false)
    const supabase    = createClient()

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
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
            />
            <div className="flex flex-col gap-2">
                <Input
                    label="Password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                />
                <div className="flex justify-end">
                    <Link href="/forgot-password" className="text-xs text-gray-muted hover:text-white hover:underline font-condensed tracking-wide transition-colors">
                        Forgot password?
                    </Link>
                </div>
            </div>

            {error && (
                <div className="border border-accent/30 bg-accent/8 px-4 py-3">
                    <p className="text-accent text-sm font-condensed tracking-wide">{error}</p>
                </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
                Sign in →
            </Button>
        </form>
    )
}