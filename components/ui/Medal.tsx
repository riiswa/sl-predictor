const STYLES = {
    1: { text: 'text-yellow-400', border: 'border-yellow-400/50', bg: 'bg-yellow-400/10' },
    2: { text: 'text-gray-300',   border: 'border-gray-400/40',   bg: 'bg-gray-400/8'    },
    3: { text: 'text-orange-400', border: 'border-orange-400/50', bg: 'bg-orange-400/10' },
} as const

interface MedalProps {
    position: 1 | 2 | 3
    size?: 'sm' | 'md'
}

export default function Medal({ position, size = 'sm' }: MedalProps) {
    const s   = STYLES[position]
    const dim = size === 'md' ? 'w-7 h-7 text-base' : 'w-5 h-5 text-xs'
    return (
        <span className={`font-bebas leading-none flex items-center justify-center flex-shrink-0 border ${dim} ${s.text} ${s.border} ${s.bg}`}>
            {position}
        </span>
    )
}

export function RankDisplay({ rank }: { rank: number }) {
    if (rank <= 3) return <Medal position={rank as 1 | 2 | 3} size="md" />
    return <span className="font-bebas text-xl text-gray-muted leading-none">{rank}</span>
}
