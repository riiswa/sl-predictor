import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import LiveLoadingGate from '@/components/live/LiveLoadingGate'

export const revalidate = 0

export default async function LivePage() {
    const supabase = await createClient()
    const { data: session } = await supabase
        .from('live_sessions')
        .select('is_active, sheet_id, label')
        .single()

    return (
        <div className="min-h-screen bg-dark flex flex-col">

            {/* Minimal header */}
            <header className="border-b border-blue/20 px-6 py-4 flex items-center justify-between">
                <Link href="/ranking" className="flex items-center gap-2">
                    <Image src="/logo.png" alt="SL Predictor" width={32} height={32} />
                    <span className="font-bebas text-lg tracking-[4px] uppercase text-white">PREDICTOR</span>
                </Link>
                {session?.is_active && (
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                        </span>
                        <span className="font-condensed text-xs tracking-[3px] uppercase text-accent">Live</span>
                    </div>
                )}
            </header>

            <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
                {!session?.is_active || !session?.sheet_id ? (
                    <div className="border border-blue/20 px-6 py-24 text-center">
                        <p className="font-bebas text-4xl text-gray-muted/30 tracking-wide mb-3">NO LIVE COMPETITION</p>
                        <p className="font-condensed text-sm text-gray-muted/40">
                            Check back during a competition — results update automatically every 10 seconds.
                        </p>
                        <Link href="/ranking" className="mt-6 inline-block font-condensed text-xs tracking-[3px] uppercase text-gray-muted hover:text-white transition-colors">
                            ← Back to ranking
                        </Link>
                    </div>
                ) : (
                    <LiveLoadingGate sheetId={session.sheet_id} label={session.label} />
                )}
            </main>
        </div>
    )
}
