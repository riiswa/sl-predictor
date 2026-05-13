'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { toast } from '@/lib/toast'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border border-blue/20 p-6 flex flex-col gap-5">
            <p className="font-condensed text-xs tracking-[4px] uppercase text-accent">{title}</p>
            {children}
        </div>
    )
}


export default function AccountSettings({ email, username }: { email: string; username: string }) {
    const router   = useRouter()
    const supabase = createClient()

    // — Change username —
    const [newUsername, setNewUsername] = useState('')
    const [unLoading,   setUnLoading]   = useState(false)

    async function handleChangeUsername(e: React.FormEvent) {
        e.preventDefault()
        const trimmed = newUsername.trim()
        if (trimmed.length < 3) { toast('Username must be at least 3 characters.', 'error'); return }
        setUnLoading(true)

        const { data: existing } = await supabase
            .from('profiles').select('id').eq('username', trimmed).maybeSingle()
        if (existing) { toast('Username already taken.', 'error'); setUnLoading(false); return }

        const { error } = await supabase.auth.getUser().then(({ data: { user } }) =>
            supabase.from('profiles').update({ username: trimmed }).eq('id', user!.id)
        )
        setUnLoading(false)
        if (error) { toast(error.message, 'error'); return }
        toast('Username updated.')
        setNewUsername('')
        router.refresh()
    }

    // — Delete account —
    const [deleteConfirm, setDeleteConfirm] = useState('')
    const [delLoading,    setDelLoading]    = useState(false)
    const [delError,      setDelError]      = useState<string | null>(null)

    async function handleDeleteAccount() {
        setDelLoading(true)
        setDelError(null)
        const res  = await fetch('/api/auth/delete-account', { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) { setDelError(data.error ?? 'Deletion failed'); setDelLoading(false); return }
        await supabase.auth.signOut()
        router.push('/')
    }

    const deleteConfirmed = deleteConfirm.trim().toLowerCase() === 'delete my account'

    return (
        <div className="flex flex-col gap-4">

            {/* Account info */}
            <Section title="Account Info">
                <div className="flex flex-col gap-2 -mt-2">
                    <p className="text-gray-muted/50 text-xs font-condensed tracking-wide">
                        Email: <span className="text-gray-muted">{email}</span>
                    </p>
                    <p className="text-gray-muted/30 text-xs font-condensed">
                        To change your email or password, use the forgot password link on the login page.
                    </p>
                </div>
            </Section>

            {/* Change username */}
            <Section title="Change Username">
                <p className="text-gray-muted/50 text-xs font-condensed tracking-wide -mt-2">
                    Current: <span className="text-gray-muted">{username}</span>
                </p>
                <form onSubmit={handleChangeUsername} className="flex flex-col gap-4">
                    <Input
                        label="New username"
                        type="text"
                        required
                        minLength={3}
                        maxLength={20}
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        placeholder="NewUsername"
                    />
                    <div>
                        <Button type="submit" size="md" loading={unLoading}>
                            Update username →
                        </Button>
                    </div>
                </form>
            </Section>

            {/* Delete account */}
            <Section title="Delete Account">
                <p className="text-gray-muted/50 text-sm font-condensed -mt-2">
                    This permanently deletes your account and all your predictions. This cannot be undone.
                </p>
                <div className="flex flex-col gap-3">
                    <Input
                        label='Type "delete my account" to confirm'
                        type="text"
                        value={deleteConfirm}
                        onChange={e => setDeleteConfirm(e.target.value)}
                        placeholder="delete my account"
                    />
                    {delError && <p className="text-xs font-condensed text-accent">{delError}</p>}
                    <div>
                        <Button
                            variant="danger"
                            size="md"
                            onClick={handleDeleteAccount}
                            loading={delLoading}
                            disabled={!deleteConfirmed}
                        >
                            Delete my account →
                        </Button>
                    </div>
                </div>
            </Section>

        </div>
    )
}
