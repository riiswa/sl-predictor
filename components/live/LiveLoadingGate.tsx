'use client'

import { useSheetData } from '@/hooks/useSheetData'
import LiveWidget from './LiveWidget'

export default function LiveLoadingGate({ sheetId, label }: { sheetId: string; label?: string | null }) {
    const { athletes, status, error } = useSheetData(sheetId)

    if (status === 'loading') {
        return (
            <div className="border border-blue/20 px-6 py-16 flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
                <p className="font-condensed text-sm text-gray-muted tracking-[3px] uppercase">
                    Connecting to live feed…
                </p>
            </div>
        )
    }

    if (status === 'error' || !athletes) {
        return (
            <div className="border border-accent/20 bg-accent/5 px-6 py-10 text-center">
                <p className="font-bebas text-2xl text-accent tracking-wide mb-2">CONNECTION ERROR</p>
                <p className="font-condensed text-sm text-gray-muted">{error ?? 'Unable to load live data'}</p>
                <p className="font-condensed text-xs text-gray-muted/50 mt-2">
                    Make sure the Google Sheet is shared publicly (Anyone with the link → Viewer)
                </p>
            </div>
        )
    }

    return (
        <div>
            {label && (
                <p className="font-condensed text-xs tracking-[4px] uppercase text-gray-muted/50 mb-3">
                    {label}
                </p>
            )}
            <LiveWidget athletes={athletes} />
        </div>
    )
}
