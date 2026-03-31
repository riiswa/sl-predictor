import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/ui/NavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('username, total_points, season_rank, role')
        .eq('id', user.id)
        .single()

    return (
        <div className="min-h-screen bg-dark">
            <NavBar profile={profile} />
            <main>{children}</main>
        </div>
    )
}