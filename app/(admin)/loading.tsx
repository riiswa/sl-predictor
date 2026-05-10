import { SkeletonBlock, SkeletonCard, SkeletonText } from '@/components/ui/Skeleton'

export default function AdminLoading() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-8">
            <div className="flex flex-col gap-3 py-8 border-b border-blue/20">
                <SkeletonText className="w-20" />
                <SkeletonBlock className="h-12 w-56" />
            </div>
            <div className="grid grid-cols-4 gap-px">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-blue/8 border border-blue/20 px-6 py-5 flex flex-col gap-3">
                        <SkeletonBlock className="h-10 w-12" />
                        <SkeletonText className="w-16" />
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
        </div>
    )
}
