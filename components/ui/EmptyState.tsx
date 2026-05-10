interface EmptyStateProps {
    icon?: string
    title: string
    subtitle?: string
    action?: React.ReactNode
}

export default function EmptyState({ icon = '—', title, subtitle, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="font-bebas text-6xl text-blue-light/40 mb-4 leading-none">{icon}</div>
            <p className="font-bebas text-2xl tracking-wide text-gray-muted/60 mb-2">{title}</p>
            {subtitle && (
                <p className="text-gray-muted/50 text-sm font-condensed tracking-wide max-w-xs">{subtitle}</p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    )
}
