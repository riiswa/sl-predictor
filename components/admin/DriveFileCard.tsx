'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

interface DriveFile {
    id:             string
    drive_file_id:  string
    file_name:      string
    modified_time:  string | null
    last_synced_at: string | null
    sync_status:    string
    has_results:    boolean
    competition_id: string | null
    competitions?: {
        name:            string
        status:          string
        results_visible: boolean
    } | null
}

interface CompMetadata {
    name:                string
    country:             string
    flag:                string
    organizer:           string
    date_start:          string
    date_end:            string
    prediction_deadline: string
}

interface SyncResult {
    athletes_count:   number
    categories_count: number
    has_results:      boolean
    missing_data:     number
    warnings:         string[]
}

const FLAGS: Record<string, string> = {
    NL: '🇳🇱', IT: '🇮🇹', FR: '🇫🇷', DE: '🇩🇪',
    GB: '🇬🇧', CZ: '🇨🇿', RS: '🇷🇸', PT: '🇵🇹',
    SI: '🇸🇮', SM: '🇸🇲', BE: '🇧🇪', ES: '🇪🇸',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    new:             { label: 'New',             color: 'text-blue-light border-blue-light/30 bg-blue/10',       dot: 'bg-blue-light'  },
    synced:          { label: 'Synced',          color: 'text-green-400 border-green-400/30 bg-green-400/8',    dot: 'bg-green-400'   },
    outdated:        { label: 'Outdated',        color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/8', dot: 'bg-yellow-400'  },
    results_pending: { label: 'Results pending', color: 'text-orange-400 border-orange-400/30 bg-orange-400/8', dot: 'bg-orange-400'  },
}

export default function DriveFileCard({ file }: { file: DriveFile }) {
    const router = useRouter()

    const [showModal,    setShowModal]    = useState(false)
    const [showWarnings, setShowWarnings] = useState(false)
    const [syncing,      setSyncing]      = useState(false)
    const [error,        setError]        = useState<string | null>(null)
    const [syncResult,   setSyncResult]   = useState<SyncResult | null>(null)

    const isNew = !file.competition_id
    const cfg   = STATUS_CONFIG[file.sync_status] ?? STATUS_CONFIG.new

    const [meta, setMeta] = useState<CompMetadata>({
        name:                file.file_name.replace(/\.(csv|xlsx)$/i, '').replace(/_/g, ' '),
        country:             '',
        flag:                '',
        organizer:           '',
        date_start:          '',
        date_end:            '',
        prediction_deadline: '',
    })

    function setMetaField(key: keyof CompMetadata, value: string) {
        setMeta(prev => {
            const next = { ...prev, [key]: value }
            if (key === 'country') next.flag = FLAGS[value.toUpperCase()] ?? ''
            return next
        })
    }

    async function handleSync() {
        setSyncing(true)
        setError(null)
        setSyncResult(null)

        const res  = await fetch('/api/drive/sync', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                drive_file_id: file.drive_file_id,
                metadata:      isNew ? meta : undefined,
            }),
        })
        const data = await res.json()

        if (!res.ok) {
            setError(data.error ?? 'Sync failed')
        } else {
            setSyncResult(data)
            setShowModal(false)
            router.refresh()
        }
        setSyncing(false)
    }

return (
        <>
            <div className={`border transition-colors ${
                file.sync_status === 'outdated' || file.sync_status === 'results_pending'
                    ? 'border-yellow-400/20' : 'border-blue/20'
            }`}>
                <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} />
                            <div>
                                <p className="font-condensed font-semibold text-white text-base leading-tight">
                                    {file.file_name.replace(/\.(csv|xlsx)$/i, '')}
                                </p>
                                {file.competitions && (
                                    <p className="text-xs text-gray-muted mt-0.5">→ {file.competitions.name}</p>
                                )}
                            </div>
                        </div>
                        <span className={`font-condensed text-xs tracking-[2px] uppercase px-3 py-1 border flex-shrink-0 ${cfg.color}`}>
                            {cfg.label}
                        </span>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-condensed">
                        <div>
                            <p className="text-gray-muted/50 tracking-[2px] uppercase mb-0.5">Modified</p>
                            <p className="text-gray-muted">
                                {file.modified_time
                                    ? new Date(file.modified_time).toLocaleDateString('en-GB', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-muted/50 tracking-[2px] uppercase mb-0.5">Last synced</p>
                            <p className="text-gray-muted">
                                {file.last_synced_at
                                    ? new Date(file.last_synced_at).toLocaleDateString('en-GB', {
                                        day: '2-digit', month: 'short',
                                        hour: '2-digit', minute: '2-digit',
                                    })
                                    : 'Never'}
                            </p>
                        </div>
                        {file.has_results && (
                            <div>
                                <p className="text-gray-muted/50 tracking-[2px] uppercase mb-0.5">Results</p>
                                <p className={file.competitions?.results_visible ? 'text-green-400' : 'text-orange-400'}>
                                    {file.competitions?.results_visible ? '✓ Visible' : '⏸ Hidden'}
                                </p>
                            </div>
                        )}
                        {file.competition_id && (
                            <div>
                                <p className="text-gray-muted/50 tracking-[2px] uppercase mb-0.5">Status</p>
                                <p className="text-gray-muted">{file.competitions?.status ?? '—'}</p>
                            </div>
                        )}
                    </div>

                    {/* Sync result feedback */}
                    {syncResult && (
                        <div className="mb-3 border border-green-400/20 bg-green-400/5 px-3 py-2">
                            <p className="text-green-400 text-xs font-condensed">
                                ✓ {syncResult.athletes_count} athletes · {syncResult.categories_count} categories
                                {syncResult.has_results && ' · Results computed'}
                            </p>
                            {syncResult.missing_data > 0 && (
                                <div className="mt-2">
                                    <p className="text-yellow-400 text-xs font-condensed">
                                        ⚠ {syncResult.missing_data} athlete{syncResult.missing_data > 1 ? 's' : ''} missing bodyweight — RIS not computed
                                    </p>
                                    {syncResult.warnings.length > 0 && (
                                        <button
                                            onClick={() => setShowWarnings(w => !w)}
                                            className="text-gray-muted/50 text-xs font-condensed hover:text-gray-muted mt-1 transition-colors"
                                        >
                                            {showWarnings ? '▲ Hide details' : '▼ Show details'}
                                        </button>
                                    )}
                                    {showWarnings && (
                                        <div className="mt-2 flex flex-col gap-0.5">
                                            {syncResult.warnings.map((w, i) => (
                                                <p key={i} className="text-yellow-400/60 text-xs font-condensed">· {w}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <p className="text-accent text-xs font-condensed mb-3 border border-accent/20 bg-accent/5 px-3 py-2">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={() => isNew ? setShowModal(true) : handleSync()}
                            loading={syncing}
                            size="sm"
                            variant={file.sync_status === 'outdated' ? 'primary' : 'ghost'}
                        >
                            {file.sync_status === 'new'      ? 'Sync & Create' :
                                file.sync_status === 'outdated' ? 'Re-sync' : 'Sync'}
                        </Button>

                        {file.competition_id && (
                            <Link href={`/admin/${file.competition_id}`}>
                                <Button variant="ghost" size="sm">Manage →</Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal — new competition metadata */}
            {showModal && (
                <Modal onClose={() => setShowModal(false)} borderColor="border-blue-light/30">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="section-tag mb-1">New Competition</p>
                                <h2 className="font-bebas text-3xl tracking-wide">Competition Details</h2>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-muted hover:text-white transition-colors text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-gray-muted text-xs font-condensed tracking-wide mb-6 border border-blue/10 bg-blue/5 px-3 py-2">
                            File: <span className="text-white">{file.file_name}</span>
                            <br />Categories and athletes will be auto-detected from the file.
                        </p>

                        <div className="flex flex-col gap-4">
                            <Input
                                label="Competition name"
                                required
                                value={meta.name}
                                onChange={e => setMetaField('name', e.target.value)}
                                placeholder="Dutch Streetlifting Nationals 26"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Country code"
                                    required
                                    value={meta.country}
                                    onChange={e => setMetaField('country', e.target.value)}
                                    placeholder="NL"
                                    maxLength={3}
                                />
                                <Input
                                    label="Flag (auto-filled)"
                                    value={meta.flag}
                                    onChange={e => setMetaField('flag', e.target.value)}
                                    placeholder="🇳🇱"
                                />
                            </div>
                            <Input
                                label="Organizer"
                                value={meta.organizer}
                                onChange={e => setMetaField('organizer', e.target.value)}
                                placeholder="DSN"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Start date"
                                    type="date"
                                    required
                                    value={meta.date_start}
                                    onChange={e => setMetaField('date_start', e.target.value)}
                                />
                                <Input
                                    label="End date"
                                    type="date"
                                    value={meta.date_end}
                                    onChange={e => setMetaField('date_end', e.target.value)}
                                />
                            </div>
                            <Input
                                label="Prediction deadline"
                                hint="(1h before first heat)"
                                type="datetime-local"
                                required
                                value={meta.prediction_deadline}
                                onChange={e => setMetaField('prediction_deadline', e.target.value)}
                            />
                        </div>

                        {error && (
                            <div className="border border-accent/30 bg-accent/8 px-4 py-3 mt-4">
                                <p className="text-accent text-sm font-condensed">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 mt-6">
                            <Button variant="ghost" size="md" onClick={() => setShowModal(false)} className="flex-1">
                                Cancel
                            </Button>
                            <Button
                                size="md"
                                onClick={handleSync}
                                loading={syncing}
                                className="flex-1"
                                disabled={!meta.name || !meta.country || !meta.date_start || !meta.prediction_deadline}
                            >
                                Create & Sync →
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    )
}