'use client'

import useCompetition from '@/hooks/useCompetition'
import { PHASES } from './phases'
import type { Athlete } from '@/hooks/useSheetData'

export default function LiveWidget({ athletes }: { athletes: Athlete[] }) {
    const { canvasRef, wrapRef, uiLog } = useCompetition(athletes)

    return (
        <div className="border border-blue/30 bg-dark/60 backdrop-blur">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue/20">
                <div className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                    </span>
                    <p className="font-bebas text-xl tracking-[4px] text-white">LIVE TOTAL</p>
                </div>

                {/* Phase legend */}
                <div className="flex items-center gap-4">
                    {PHASES.map(ph => (
                        <div key={ph.key} className="hidden sm:flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ph.color }} />
                            <span className="font-condensed text-xs tracking-[2px] uppercase" style={{ color: ph.color }}>
                                {ph.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Canvas */}
            <div className="px-4 pt-4 pb-2" ref={wrapRef}>
                <canvas ref={canvasRef} className="w-full" />
            </div>

            {/* Live log */}
            {uiLog && (
                <div className="px-6 py-3 border-t border-blue/20 flex items-center gap-3">
                    <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
                    </span>
                    <p
                        className="font-condensed text-xs text-gray-muted tracking-wide"
                        dangerouslySetInnerHTML={{ __html: uiLog }}
                    />
                </div>
            )}

            <div className="px-6 py-2 border-t border-blue/10">
                <p className="font-condensed text-xs text-gray-muted/30 tracking-[2px]">
                    Updates every 10s · Powered by @DATALIFT_
                </p>
            </div>
        </div>
    )
}
