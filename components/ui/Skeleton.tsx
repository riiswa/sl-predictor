export function SkeletonBlock({ className = '' }: { className?: string }) {
    return <div className={`bg-blue/10 animate-pulse ${className}`} />
}

export function SkeletonText({ className = '' }: { className?: string }) {
    return <div className={`h-3 bg-blue/10 animate-pulse rounded-sm ${className}`} />
}

export function SkeletonRow() {
    return (
        <div className="flex items-center gap-4 px-5 py-4 border-b border-blue/8">
            <SkeletonBlock className="w-8 h-6" />
            <SkeletonBlock className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
                <SkeletonText className="w-32" />
                <SkeletonText className="w-20 opacity-50" />
            </div>
            <SkeletonText className="w-16" />
            <SkeletonText className="w-10" />
        </div>
    )
}

export function SkeletonCard() {
    return (
        <div className="border border-blue/20 p-6 flex flex-col gap-4">
            <SkeletonText className="w-24" />
            <SkeletonText className="w-48" />
            <SkeletonText className="w-full opacity-50" />
        </div>
    )
}
