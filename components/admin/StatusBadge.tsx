const STATUS_CONFIG = {
    upcoming:   { label: 'Upcoming',   color: 'text-yellow-400 bg-yellow-400/8 border-yellow-400/30' },
    open:       { label: 'Open',       color: 'text-green-400  bg-green-400/8  border-green-400/30'  },
    closed:     { label: 'Closed',     color: 'text-gray-muted bg-blue/5       border-blue/30'        },
    results_in: { label: 'Results in', color: 'text-blue-light bg-blue/5       border-blue/30'  },
    cancelled:  { label: 'Cancelled',  color: 'text-accent     bg-accent/8     border-accent/30'      },
} as const

type Status = keyof typeof STATUS_CONFIG

export default function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as Status] ?? STATUS_CONFIG.upcoming
    return (
        <span className={`font-condensed text-xs tracking-[3px] uppercase px-3 py-1 border ${cfg.color}`}>
      {cfg.label}
    </span>
    )
}