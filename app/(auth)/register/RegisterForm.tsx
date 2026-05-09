'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const COUNTRIES = [
    { code: 'FR', label: '🇫🇷 France' },
    { code: 'NL', label: '🇳🇱 Netherlands' },
    { code: 'IT', label: '🇮🇹 Italy' },
    { code: 'DE', label: '🇩🇪 Germany' },
    { code: 'GB', label: '🇬🇧 UK / Ireland' },
    { code: 'CZ', label: '🇨🇿 Czechia' },
    { code: 'RS', label: '🇷🇸 Serbia' },
    { code: 'PT', label: '🇵🇹 Portugal' },
    { code: 'SI', label: '🇸🇮 Slovenia' },
    { code: 'SM', label: '🇸🇲 San Marino' },
    { code: 'OTHER', label: '🌍 Other' },
]

export default function RegisterForm() {
    const router   = useRouter()
    const supabase = createClient()

    const [username, setUsername] = useState('')
    const [email,    setEmail]    = useState('')
    const [password, setPassword] = useState('')
    const [country,  setCountry]  = useState('')
    const [error,    setError]    = useState<string | null>(null)
    const [loading,  setLoading]  = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password.length < 8) {
            setError('Password must be at least 8 characters.')
            setLoading(false)
            return
        }

        // Check username availability
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username.trim())
            .maybeSingle()

        if (existing) {
            setError('This username is already taken.')
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username: username.trim(), country },
            },
        })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        router.push('/ranking')
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
                label="Username"
                type="text"
                required
                minLength={3}
                maxLength={20}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="YourUsername"
            />

            {/* Country select */}
            <div className="flex flex-col gap-2">
                <label className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted">
                    Country
                </label>
                <select
                    required
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="bg-dark/60 border border-blue/30 text-white px-4 py-3 text-sm focus:outline-none focus:border-blue-light transition-colors appearance-none"
                >
                    <option value="" disabled>Select your country</option>
                    {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                </select>
            </div>

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
                Join the League →
            </Button>
        </form>
    )
}