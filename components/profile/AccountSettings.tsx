'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border border-blue/20 p-6 flex flex-col gap-5">
            <p className="font-condensed text-xs tracking-[4px] uppercase text-accent">{title}</p>
            {children}
        </div>
    )
}

function Feedback({ msg, isError }: { msg: string; isError?: boolean }) {
    return (
        <div className={`border px-4 py-3 ${isError ? 'border-accent/30 bg-accent/8' : 'border-blue/30 bg-blue/8'}`}>
            <p className={`text-sm font-condensed tracking-wide ${isError ? 'text-accent' : 'text-white'}`}>{msg}</p>
        </div>
    )
}

export default function AccountSettings({ email }: { email: string }) {
    const router   = useRouter()
    const supabase = createClient()

    // — Change password —
    const [newPassword,    setNewPassword]    = useState('')
    const [pwLoading,      setPwLoading]      = useState(false)
    const [pwFeedback,     setPwFeedback]     = useState<{ msg: string; isError: boolean } | null>(null)

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault()
        if (newPassword.length < 8) { setPwFeedback({ msg: 'Password must be at least 8 characters.', isError: true }); return }
        setPwLoading(true)
        setPwFeedback(null)
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        setPwLoading(false)
        if (error) { setPwFeedback({ msg: error.message, isError: true }); return }
        setPwFeedback({ msg: 'Password updated.', isError: false })
        setNewPassword('')
    }

    // — Change email —
    const [newEmail,   setNewEmail]   = useState('')
    const [emlLoading, setEmlLoading] = useState(false)
    const [emlFeedback,setEmlFeedback]= useState<{ msg: string; isError: boolean } | null>(null)

    async function handleChangeEmail(e: React.FormEvent) {
        e.preventDefault()
        setEmlLoading(true)
        setEmlFeedback(null)
        const { error } = await supabase.auth.updateUser({ email: newEmail })
        setEmlLoading(false)
        if (error) { setEmlFeedback({ msg: error.message, isError: true }); return }
        setEmlFeedback({ msg: `Confirmation sent to ${newEmail}. Check your inbox.`, isError: false })
        setNewEmail('')
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

            {/* Change password */}
            <Section title="Change Password">
                <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                    <Input
                        label="New password"
                        hint="(min. 8 characters)"
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                    {pwFeedback && <Feedback msg={pwFeedback.msg} isError={pwFeedback.isError} />}
                    <div>
                        <Button type="submit" size="md" loading={pwLoading}>
                            Update password →
                        </Button>
                    </div>
                </form>
            </Section>

            {/* Change email */}
            <Section title="Change Email">
                <p className="text-gray-muted/50 text-xs font-condensed tracking-wide -mt-2">
                    Current: <span className="text-gray-muted">{email}</span>
                </p>
                <form onSubmit={handleChangeEmail} className="flex flex-col gap-4">
                    <Input
                        label="New email"
                        type="email"
                        required
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="new@email.com"
                    />
                    {emlFeedback && <Feedback msg={emlFeedback.msg} isError={emlFeedback.isError} />}
                    <div>
                        <Button type="submit" size="md" loading={emlLoading}>
                            Update email →
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
                    {delError && <Feedback msg={delError} isError />}
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
