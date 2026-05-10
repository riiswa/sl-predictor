import { SkeletonBlock, SkeletonRow, SkeletonText } from '@/components/ui/Skeleton'

export default function AppLoading() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-8 animate-pulse">
            {/* Page header */}
            <div className="flex flex-col gap-3 py-8 border-b border-blue/20">
                <SkeletonText className="w-24" />
                <SkeletonBlock className="h-12 w-64" />
                <SkeletonText className="w-48 opacity-50" />
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-blue/8 border border-blue/20 px-6 py-5 flex flex-col gap-3">
                        <SkeletonBlock className="h-10 w-16" />
                        <SkeletonText className="w-20" />
                    </div>
                ))}
            </div>
            {/* Content rows */}
            <div className="border border-blue/20">
                {[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
        </div>
    )
}
