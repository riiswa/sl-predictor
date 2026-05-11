const STYLES = {
    1: { text: 'text-yellow-400' },
    2: { text: 'text-gray-300' },
    3: { text: 'text-orange-400' },
} as const

interface MedalProps {
    position: 1 | 2 | 3
    size?: 'sm' | 'md' | 'lg'
}

export default function Medal({ position, size = 'sm' }: MedalProps) {
    const s = STYLES[position]
    const dim = size === 'lg' ? 'text-6xl' : size === 'md' ? 'text-3xl' : 'text-xl'
    return (
        <span className={`font-bebas leading-none ${dim} ${s.text}`}>
            {position}
        </span>
    )
}

export function RankDisplay({ rank }: { rank: number }) {
    if (rank <= 3) return <Medal position={rank as 1 | 2 | 3} size="lg" />
    return <span className="font-bebas text-4xl text-gray-muted leading-none">{rank}</span>
}
