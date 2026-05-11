import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import UserRow from './UserRow'

export default async function UsersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: users } = await supabase
        .from('predictor_standings')
        .select('id, username, country, role, total_points, season_rank')
        .order('total_points', { ascending: false })

    const admins = users?.filter(u => u.role === 'admin').length ?? 0

    return (
        <div>
            <PageHeader
                tag="Admin"
                title="USERS"
                subtitle="Manage user roles and view accounts"
            >
                <Link href="/admin">
                    <Button variant="ghost" size="md">← Dashboard</Button>
                </Link>
            </PageHeader>

            <div className="max-w-5xl mx-auto px-6 py-10">

                <div className="grid grid-cols-3 gap-px mb-8">
                    {[
                        { val: users?.length ?? 0, label: 'Total users',  color: 'text-white' },
                        { val: admins,             label: 'Admins',       color: 'text-accent' },
                        { val: (users?.length ?? 0) - admins, label: 'Regular users', color: 'text-gray-muted' },
                    ].map(s => (
                        <div key={s.label} className="bg-blue/8 border border-blue/20 px-4 sm:px-6 py-5">
                            <div className={`font-bebas text-4xl leading-none ${s.color}`}>{s.val}</div>
                            <div className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>

                <div className="border border-blue/20 overflow-hidden md:overflow-visible overflow-x-auto">
                    <div className="hidden md:grid grid-cols-[1fr_80px_100px_120px_140px] gap-4 px-5 py-3 border-b border-blue/20">
                        {['Username', 'Country', 'Points', 'Role', 'Actions'].map(h => (
                            <div key={h} className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted">{h}</div>
                        ))}
                    </div>
                    {users?.map(u => (
                        <UserRow key={u.id} user={u} currentUserId={user!.id} />
                    ))}
                </div>

            </div>
        </div>
    )
}
