interface PageHeaderProps {
    tag: string
    title: string
    subtitle?: string
    children?: React.ReactNode  // slot for right-side actions (buttons etc.)
}

export default function PageHeader({ tag, title, subtitle, children }: PageHeaderProps) {
    return (
        <div className="border-b border-blue/30 bg-darker/50">
            <div className="max-w-7xl mx-auto px-6 py-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div>
                    <p className="section-tag mb-3">{tag}</p>
                    <h1 className="font-bebas text-3xl sm:text-5xl md:text-6xl tracking-wide leading-none">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-gray-muted text-sm mt-3 font-condensed tracking-wide">
                            {subtitle}
                        </p>
                    )}
                </div>
                {children && (
                    <div className="flex-shrink-0">{children}</div>
                )}
            </div>
        </div>
    )
}