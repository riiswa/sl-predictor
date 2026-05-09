'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function DeleteCompButton({ compId, compName }: { compId: string; compName: string }) {
    const router = useRouter()
    const [showModal, setShowModal] = useState(false)
    const [loading,   setLoading]   = useState(false)
    const [error,     setError]     = useState<string | null>(null)
    const [confirm,   setConfirm]   = useState('')

    async function handleDelete() {
        setLoading(true)
        setError(null)

        const res  = await fetch(`/api/admin/competitions/${compId}`, { method: 'DELETE' })
        const data = await res.json()

        if (!res.ok) {
            setError(data.error ?? 'Delete failed')
            setLoading(false)
            return
        }

        router.push('/admin')
        router.refresh()
    }

    const confirmed = confirm.trim().toLowerCase() === compName.trim().toLowerCase()

    return (
        <>
            <Button variant="danger" size="sm" onClick={() => setShowModal(true)}>
                Delete Competition
            </Button>

            {showModal && (
                <div className="fixed inset-0 bg-dark/85 backdrop-blur-sm z-50 flex items-center justify-center px-4">
                    <div className="bg-dark border border-accent/40 p-8 max-w-md w-full">
                        <p className="font-bebas text-3xl tracking-wide text-accent mb-1">Delete Competition</p>
                        <p className="text-gray-muted text-sm mb-6">
                            This will permanently delete <span className="text-white font-semibold">{compName}</span> and all associated data — categories, athletes, results, and predictions. This cannot be undone.
                        </p>

                        <div className="border border-accent/20 bg-accent/5 px-4 py-3 mb-5">
                            <p className="text-accent text-xs font-condensed tracking-wide mb-3">
                                ⚠ The Drive file will be unlinked but not deleted — it will appear as "New" in Drive Sync again.
                            </p>
                            <p className="text-gray-muted text-xs font-condensed mb-2">
                                Type <span className="text-white font-semibold">{compName}</span> to confirm:
                            </p>
                            <input
                                type="text"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder={compName}
                                className="w-full bg-dark/60 border border-blue/30 text-white px-3 py-2 text-sm font-condensed focus:outline-none focus:border-accent/60 transition-colors"
                            />
                        </div>

                        {error && (
                            <p className="text-accent text-xs font-condensed mb-4 border border-accent/20 bg-accent/5 px-3 py-2">{error}</p>
                        )}

                        <div className="flex gap-3">
                            <Button variant="ghost" size="md" onClick={() => { setShowModal(false); setConfirm('') }} className="flex-1">
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                size="md"
                                onClick={handleDelete}
                                loading={loading}
                                disabled={!confirmed}
                                className="flex-1"
                            >
                                Delete →
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}