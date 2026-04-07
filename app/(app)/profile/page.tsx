import PageHeader from '@/components/ui/PageHeader'

export default function ProfilePage() {
    return (
        <div>
            <PageHeader
                tag="Season 2026"
                title="PROFILE"
                subtitle="Your stats, history and predictions — coming in Phase 5"
            />
            <div className="max-w-7xl mx-auto px-6 py-20 text-center">
                <p className="font-bebas text-3xl tracking-wide text-gray-muted/40 mb-3">
                    COMING SOON
                </p>
                <p className="text-gray-muted/30 text-sm font-condensed tracking-wide">
                    Full profile with prediction history and accuracy stats will be available in Phase 5.
                </p>
            </div>
        </div>
    )
}