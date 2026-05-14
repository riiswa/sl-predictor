import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/ui/NavBar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const [{ data: profile }, { data: liveSession }] = await Promise.all([
        supabase.from('profiles').select('username, total_points, season_rank, role').eq('id', user.id).single(),
        supabase.from('live_sessions').select('is_active').single(),
    ])

    if (profile?.role !== 'admin') redirect('/ranking')

    return (
        <div className="min-h-screen bg-dark">
            <NavBar profile={profile} isLive={liveSession?.is_active ?? false} />
            <main>{children}</main>
        </div>
    )
}