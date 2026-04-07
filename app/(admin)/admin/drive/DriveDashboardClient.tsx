'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import DriveFileCard from '@/components/admin/DriveFileCard'

interface Props {
    initialFiles: any[]
}

export default function DriveDashboardClient({ initialFiles }: Props) {
    const router = useRouter()
    const [files,     setFiles]     = useState(initialFiles)
    const [loading,   setLoading]   = useState(false)
    const [error,     setError]     = useState<string | null>(null)
    const [lastCheck, setLastCheck] = useState<string | null>(null)

    useEffect(() => { fetchFiles() }, [])

    async function fetchFiles() {
        setLoading(true)
        setError(null)
        const res  = await fetch('/api/drive/list')
        const data = await res.json()
        if (!res.ok) {
            setError(data.error ?? 'Failed to load files')
        } else {
            setFiles(data.files)
            setLastCheck(new Date().toLocaleTimeString('en-GB'))
        }
        setLoading(false)
    }

    async function handleRefresh() {
        await fetchFiles()
        router.refresh()
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6 border border-blue/20 px-5 py-3 bg-blue/5">
                <div>
                    <p className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted">
                        Google Drive folder sync
                    </p>
                    {lastCheck && (
                        <p className="text-gray-muted/40 text-xs mt-0.5">Last checked: {lastCheck}</p>
                    )}
                    {loading && !lastCheck && (
                        <p className="text-gray-muted/40 text-xs mt-0.5">Loading...</p>
                    )}
                </div>
                <Button onClick={handleRefresh} loading={loading} size="sm" variant="ghost">
                    ↻ Check Drive for new files
                </Button>
            </div>

            {error && (
                <div className="border border-accent/30 bg-accent/8 px-4 py-3 mb-6">
                    <p className="text-accent text-sm font-condensed">{error}</p>
                </div>
            )}

            {loading && files.length === 0 ? (
                <div className="border border-blue/20 px-6 py-20 text-center">
                    <p className="font-bebas text-2xl tracking-wide text-gray-muted/40 animate-pulse">
                        SCANNING DRIVE...
                    </p>
                </div>
            ) : files.length === 0 ? (
                <div className="border border-blue/20 px-6 py-20 text-center">
                    <p className="font-bebas text-3xl tracking-wide text-gray-muted/40 mb-3">NO FILES DETECTED</p>
                    <p className="text-gray-muted/40 text-sm font-condensed tracking-wide mb-6">
                        Add a CSV file to your Drive folder then click refresh.
                    </p>
                    <Button onClick={handleRefresh} loading={loading} size="md">
                        ↻ Scan Drive folder
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {files.map(file => (
                        <DriveFileCard key={file.id} file={file} />
                    ))}
                </div>
            )}

            <div className="mt-10 border border-blue/10 p-6">
                <p className="font-condensed text-xs tracking-[4px] uppercase text-gray-muted mb-4">How it works</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { step: '01', label: 'Add CSV to Drive',    desc: 'Drop your competition CSV into the shared Drive folder.' },
                        { step: '02', label: 'Check for new files', desc: 'Page auto-scans on load. Click refresh to check manually.' },
                        { step: '03', label: 'Sync',                desc: 'Click Sync to create the competition, categories and athletes in DB.' },
                        { step: '04', label: 'Reveal results',      desc: 'After the comp, update the CSV with results, re-sync, then Reveal.' },
                    ].map(s => (
                        <div key={s.step} className="flex flex-col gap-2">
                            <div className="font-bebas text-3xl text-blue-light/40">{s.step}</div>
                            <p className="font-condensed text-sm font-semibold text-white">{s.label}</p>
                            <p className="text-xs text-gray-muted/60 leading-relaxed">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}