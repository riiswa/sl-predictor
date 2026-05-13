'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'

interface Sponsor {
    name: string
    image: string
    url?: string
}

const SPONSORS: Sponsor[] = [
    { name: 'Altius',           image: '/sponsors/altius.png' },
    { name: 'King of Weighted', image: '/sponsors/king-of-weighted.png' },
    { name: 'Mergaux',          image: '/sponsors/mergaux.png' },
    { name: 'Tatakai',          image: '/sponsors/tatakai.png' },
]

const INTERVAL = 4000

export default function SponsorCarousel() {
    const [index,  setIndex]  = useState(0)
    const [paused, setPaused] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const count    = SPONSORS.length

    const next = useCallback(() => setIndex(i => (i + 1) % count), [count])
    const prev = useCallback(() => setIndex(i => (i - 1 + count) % count), [count])

    useEffect(() => {
        if (paused) return
        timerRef.current = setTimeout(next, INTERVAL)
        return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    }, [index, paused, next])

    const sponsor = SPONSORS[index]

    return (
        <div className="mb-12 -mx-6">
            <div
                className="relative h-[40vh] sm:h-[75vh] flex items-center justify-center overflow-hidden border-t border-b border-blue/20 bg-gradient-to-b from-blue/8 to-transparent"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
            >
                {/* Background image */}
                <div className="absolute inset-0 z-0">
                    <Image
                        key={sponsor.name}
                        src={sponsor.image}
                        alt={sponsor.name}
                        fill
                        className="object-cover opacity-100 transition-opacity duration-300"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />
                </div>

                {/* Navigation - left */}
                <button
                    onClick={prev}
                    aria-label="Previous sponsor"
                    className="absolute left-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center border border-white/20 hover:border-accent hover:bg-accent/10 text-white hover:text-accent transition-all text-2xl leading-none font-light"
                >
                    ‹
                </button>

                {/* Navigation - right */}
                <button
                    onClick={next}
                    aria-label="Next sponsor"
                    className="absolute right-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center border border-white/20 hover:border-accent hover:bg-accent/10 text-white hover:text-accent transition-all text-2xl leading-none font-light"
                >
                    ›
                </button>

                {/* Sponsor name overlay (bottom left) */}
                <div className="absolute bottom-8 left-8 z-10 max-w-md">
                    <p className="font-condensed text-sm tracking-[4px] uppercase text-gray-muted/70 mb-2">
                        Featured Partner
                    </p>
                    <h3 className="font-bebas text-3xl sm:text-5xl text-white tracking-wide">
                        {sponsor.name}
                    </h3>
                </div>

                {/* Indicator dots - centered at bottom */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                    {SPONSORS.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            aria-label={`Sponsor ${i + 1}`}
                            className={`rounded-full transition-all duration-300 ${
                                i === index
                                    ? 'w-3 h-3 bg-accent'
                                    : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
