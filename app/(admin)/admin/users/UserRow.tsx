'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

interface User {
    id:           string
    username:     string
    country:      string | null
    role:         string
    total_points: number
    season_rank:  number | null
}

export default function UserRow({ user, currentUserId }: { user: User; currentUserId: string }) {
    const router    = useRouter()
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState<string | null>(null)
    const isSelf    = user.id === currentUserId
    const isAdmin   = user.role === 'admin'

    async function toggleRole() {
        setLoading(true)
        setError(null)
        const res  = await fetch(`/api/admin/users/${user.id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ role: isAdmin ? 'user' : 'admin' }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Failed'); setLoading(false); return }
        router.refresh()
    }

    return (
        <div className="grid grid-cols-[1fr_80px_100px_120px_140px] gap-4 px-5 py-3 border-b border-blue/5 hover:bg-blue/5 items-center">
            <div>
                <p className="font-condensed font-semibold text-white text-sm">
                    {user.username}
                    {isSelf && <span className="ml-2 text-xs text-gray-muted/40">(you)</span>}
                </p>
                {error && <p className="text-accent text-xs font-condensed mt-0.5">{error}</p>}
            </div>
            <div className="font-condensed text-sm text-gray-muted">{user.country ?? '—'}</div>
            <div className="font-condensed text-sm text-yellow-400">{user.total_points.toLocaleString()} pts</div>
            <div>
                <span className={`font-condensed text-xs tracking-[2px] uppercase px-3 py-1 border ${
                    isAdmin
                        ? 'text-accent border-accent/30 bg-accent/8'
                        : 'text-gray-muted border-blue/20 bg-blue/5'
                }`}>
                    {user.role}
                </span>
            </div>
            <div>
                {!isSelf && (
                    <Button
                        variant={isAdmin ? 'danger' : 'ghost'}
                        size="sm"
                        loading={loading}
                        onClick={toggleRole}
                    >
                        {isAdmin ? 'Remove admin' : 'Make admin'}
                    </Button>
                )}
            </div>
        </div>
    )
}
