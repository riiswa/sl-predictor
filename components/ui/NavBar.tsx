'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { avatarColor } from '@/lib/avatar'

interface Profile {
    username: string
    total_points: number
    season_rank: number | null
    role: string
}

function Avatar({ username, size = 'w-8 h-8' }: { username: string; size?: string }) {
    const bg = avatarColor(username)
    return (
        <div
            className={`${size} rounded-full flex items-center justify-center font-bebas text-sm flex-shrink-0 border border-white/20`}
            style={{ backgroundColor: bg }}
        >
            {username.charAt(0).toUpperCase()}
        </div>
    )
}

export default function NavBar({ profile, isLive = false }: { profile: Profile | null; isLive?: boolean }) {
    const pathname = usePathname()
    const router   = useRouter()
    const supabase = createClient()
    const [menuOpen, setMenuOpen] = useState(false)

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const links = [
        { href: '/ranking', label: 'Ranking' },
        { href: '/predict', label: 'Predict' },
        ...(isLive ? [{ href: '/live', label: 'Live', isLive: true }] : []),
        { href: '/profile', label: 'Profile' },
    ]

    const allLinks = [
        ...links,
        ...(profile?.role === 'admin' ? [{ href: '/admin', label: 'Admin', isAdmin: true }] : []),
    ]

    return (
        <nav className="sticky top-0 z-50 border-b border-blue/30 bg-dark/95 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14">

                {/* Logo */}
                <Link href="/ranking" className="flex-shrink-0 flex items-center gap-2 group" onClick={() => setMenuOpen(false)}>
                    <img src="/logo.png" alt="SL Predictor" className="h-8 w-8" />
                    <span className="font-bebas text-lg tracking-[4px] uppercase text-white group-hover:text-off-white transition-colors">
                        PREDICTOR
                    </span>
                </Link>

                {/* Desktop nav links */}
                <div className="hidden sm:flex items-center flex-1 ml-6">
                    {links.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`font-condensed text-xs tracking-[2px] uppercase px-5 h-14 flex items-center gap-2 border-b-2 transition-colors ${'isLive' in link && link.isLive
                                ? 'text-accent border-accent'
                                : pathname.startsWith(link.href)
                                    ? 'text-white border-accent'
                                    : 'text-gray-muted border-transparent hover:text-off-white'
                            }`}
                        >
                            {'isLive' in link && link.isLive && (
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
                                </span>
                            )}
                            {link.label}
                        </Link>
                    ))}
                    {profile?.role === 'admin' && (
                        <Link
                            href="/admin"
                            className={`font-condensed text-xs tracking-[2px] uppercase px-5 h-14 flex items-center border-b-2 transition-colors ${
                                pathname.startsWith('/admin')
                                    ? 'text-accent border-accent'
                                    : 'text-accent/50 border-transparent hover:text-accent'
                            }`}
                        >
                            Admin
                        </Link>
                    )}
                </div>

                {/* Desktop right — avatar + username + points */}
                <div className="hidden sm:flex items-center gap-3 ml-auto flex-shrink-0">
                    {profile && (
                        <>
                            <Avatar username={profile.username} />
                            <div className="text-right">
                                <p className="font-condensed text-xs text-white tracking-wide leading-none">{profile.username}</p>
                                <p className="font-condensed text-xs text-yellow-400 tracking-wide mt-0.5">
                                    {profile.total_points.toLocaleString()} pts
                                    <span className="text-gray-muted ml-2">{profile.season_rank ? `#${profile.season_rank}` : '—'}</span>
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted hover:text-accent transition-colors ml-1"
                            >
                                Logout
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile right */}
                <div className="flex sm:hidden items-center gap-3 ml-auto">
                    {profile && <Avatar username={profile.username} size="w-8 h-8" />}
                    <button
                        onClick={() => setMenuOpen(prev => !prev)}
                        className="flex flex-col justify-center items-center w-10 h-10 gap-1.5"
                        aria-label="Toggle menu"
                    >
                        <span className={`block h-0.5 w-5 bg-gray-muted transition-all duration-200 origin-center ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                        <span className={`block h-0.5 w-5 bg-gray-muted transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                        <span className={`block h-0.5 w-5 bg-gray-muted transition-all duration-200 origin-center ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div className="sm:hidden border-t border-blue/30 bg-dark/98">
                    {profile && (
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-blue/20">
                            <Avatar username={profile.username} />
                            <div>
                                <p className="font-condensed text-xs text-white tracking-wide leading-none">{profile.username}</p>
                                <p className="font-condensed text-xs text-yellow-400 tracking-wide mt-0.5">
                                    {profile.total_points.toLocaleString()} pts
                                    <span className="text-gray-muted ml-2">{profile.season_rank ? `#${profile.season_rank}` : 'Unranked'}</span>
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col py-1">
                        {allLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                className={`font-condensed text-xs tracking-[2px] uppercase px-4 py-3.5 border-l-2 transition-colors ${'isAdmin' in link && link.isAdmin
                                    ? pathname.startsWith('/admin') ? 'text-accent border-accent bg-accent/5' : 'text-accent/60 border-transparent hover:text-accent hover:border-accent/50'
                                    : pathname.startsWith(link.href) ? 'text-white border-accent bg-white/5' : 'text-gray-muted border-transparent hover:text-off-white hover:border-blue/50'
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <button
                            onClick={() => { setMenuOpen(false); handleLogout() }}
                            className="font-condensed text-xs tracking-[2px] uppercase px-4 py-3.5 text-left border-l-2 border-transparent text-gray-muted hover:text-accent hover:border-accent/50 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    )
}
