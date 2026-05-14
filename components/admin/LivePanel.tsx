'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface LiveSession {
    is_active: boolean
    sheet_id:  string | null
    label:     string | null
}

export default function LivePanel({ initial }: { initial: LiveSession }) {
    const [isActive, setIsActive] = useState(initial.is_active)
    const [sheetId,  setSheetId]  = useState(initial.sheet_id ?? '')
    const [label,    setLabel]    = useState(initial.label ?? '')
    const [loading,  setLoading]  = useState(false)
    const [saved,    setSaved]    = useState(false)
    const [error,    setError]    = useState<string | null>(null)

    async function handleSave(active: boolean) {
        setLoading(true)
        setSaved(false)
        setError(null)

        const res = await fetch('/api/live', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ is_active: active, sheet_id: sheetId, label }),
        })

        const json = await res.json()
        setLoading(false)

        if (!res.ok) { setError(json.error ?? 'Failed to save'); return }
        setIsActive(active)
        setSaved(true)
    }

    return (
        <div className="border border-blue/30 mb-10">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-blue/20">
                <div className="flex items-center gap-3">
                    {isActive && (
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                        </span>
                    )}
                    <p className="font-condensed text-sm tracking-[4px] uppercase text-accent">
                        Live Session
                    </p>
                </div>
                <div className={`font-condensed text-xs tracking-[3px] uppercase px-3 py-1 border ${
                    isActive
                        ? 'border-accent/40 bg-accent/8 text-accent'
                        : 'border-blue/20 text-gray-muted'
                }`}>
                    {isActive ? 'Active' : 'Inactive'}
                </div>
            </div>

            {/* Form */}
            <div className="px-6 py-5 flex flex-col gap-4">
                <Input
                    label="Google Sheet ID"
                    value={sheetId}
                    onChange={e => setSheetId(e.target.value)}
                    placeholder="193evkNro4LifVxkEStE3gFH0t8p96F4EG9WOrYktUgI"
                />
                <p className="font-condensed text-xs text-gray-muted/50 -mt-2">
                    Found in the Google Sheets URL: /spreadsheets/d/<strong className="text-gray-muted">ID</strong>/edit
                    — The sheet must be shared publicly (Anyone with the link → Viewer)
                </p>
                <Input
                    label="Label (optional)"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder="e.g. 2026 French Championship — Men -75kg"
                />

                {error && (
                    <div className="border border-accent/30 bg-accent/8 px-4 py-3">
                        <p className="font-condensed text-sm text-accent">{error}</p>
                    </div>
                )}
                {saved && (
                    <div className="border border-green-400/30 bg-green-400/8 px-4 py-3">
                        <p className="font-condensed text-sm text-green-400">Saved.</p>
                    </div>
                )}

                <div className="flex gap-3 flex-wrap">
                    <Button
                        type="button"
                        size="md"
                        loading={loading}
                        onClick={() => handleSave(true)}
                        disabled={!sheetId.trim()}
                    >
                        Go Live →
                    </Button>
                    {isActive && (
                        <Button
                            type="button"
                            size="md"
                            variant="ghost"
                            loading={loading}
                            onClick={() => handleSave(false)}
                        >
                            Stop Live
                        </Button>
                    )}
                    {!isActive && sheetId.trim() && (
                        <Button
                            type="button"
                            size="md"
                            variant="ghost"
                            loading={loading}
                            onClick={() => handleSave(false)}
                        >
                            Save (keep inactive)
                        </Button>
                    )}
                </div>

                <p className="font-condensed text-xs text-gray-muted/40 tracking-wide">
                    Live page: <span className="text-gray-muted">/live</span> — publicly accessible, no login required
                </p>
            </div>
        </div>
    )
}
