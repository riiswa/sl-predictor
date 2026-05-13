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

const INTERVAL = 3500

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

    // Always render 3 slots: on mobile only 2 are shown via CSS
    const slots = [
        SPONSORS[index % count],
        SPONSORS[(index + 1) % count],
        SPONSORS[(index + 2) % count],
    ]

    return (
        <div
            className="mb-8"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <p className="font-condensed text-xs tracking-[4px] uppercase text-gray-muted/50 mb-3">
                Partners
            </p>

            <div className="flex items-center gap-3">
                <button
                    onClick={prev}
                    aria-label="Previous sponsor"
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center border border-blue/20 text-gray-muted hover:text-white hover:border-blue/40 transition-colors text-lg leading-none"
                >
                    ‹
                </button>

                {/* 2 cols on mobile, 3 on sm+ */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {slots.map((s, i) => (
                        <div key={i} className={i === 2 ? 'hidden sm:block' : ''}>
                            <SponsorCard sponsor={s} />
                        </div>
                    ))}
                </div>

                <button
                    onClick={next}
                    aria-label="Next sponsor"
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center border border-blue/20 text-gray-muted hover:text-white hover:border-blue/40 transition-colors text-lg leading-none"
                >
                    ›
                </button>
            </div>

            {/* Indicator dots */}
            <div className="flex justify-center gap-1.5 mt-3">
                {SPONSORS.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setIndex(i)}
                        aria-label={`Sponsor ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === index ? 'w-4 bg-accent' : 'w-1.5 bg-blue/30 hover:bg-blue/50'
                        }`}
                    />
                ))}
            </div>
        </div>
    )
}

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
    const card = (
        <div className="border border-blue/20 bg-blue/5 hover:bg-blue/10 hover:border-blue/40 transition-all px-4 py-4 flex items-center justify-center h-20">
            <div className="relative w-full h-full">
                <Image
                    src={sponsor.image}
                    alt={sponsor.name}
                    fill
                    className="object-contain opacity-80 hover:opacity-100 transition-opacity"
                    sizes="(max-width: 640px) 40vw, 25vw"
                />
            </div>
        </div>
    )

    if (sponsor.url) {
        return (
            <a href={sponsor.url} target="_blank" rel="noopener noreferrer" className="block">
                {card}
            </a>
        )
    }
    return card
}
