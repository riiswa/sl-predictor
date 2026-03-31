const STATUS_CONFIG = {
    upcoming:   { label: 'Upcoming',   color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
    open:       { label: 'Open',       color: 'text-green-400  bg-green-400/10  border-green-400/20'  },
    closed:     { label: 'Closed',     color: 'text-gray-muted bg-blue/10       border-blue/20'        },
    results_in: { label: 'Results in', color: 'text-blue-light bg-blue/20       border-blue-light/20'  },
    cancelled:  { label: 'Cancelled',  color: 'text-accent     bg-accent/10     border-accent/20'      },
} as const

type Status = keyof typeof STATUS_CONFIG

export default function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as Status] ?? STATUS_CONFIG.upcoming
    return (
        <span className={`font-condensed text-xs tracking-[2px] uppercase px-3 py-1 border ${cfg.color}`}>
      {cfg.label}
    </span>
    )
}