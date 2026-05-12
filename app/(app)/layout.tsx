import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/ui/NavBar'
import DeadlineBanner from '@/components/ui/DeadlineBanner'
import Toaster from '@/components/ui/Toaster'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const [{ data: profile }, { data: openComp }] = await Promise.all([
        supabase.from('profiles').select('username, total_points, season_rank, role').eq('id', user.id).single(),
        supabase.from('competitions').select('name, prediction_deadline').eq('status', 'open').limit(1).single(),
    ])

    return (
        <div className="min-h-screen bg-dark flex flex-col">
            <header className="sticky top-0 z-50">
                <NavBar profile={profile} />
                {openComp && (
                    <DeadlineBanner deadline={openComp.prediction_deadline} compName={openComp.name} />
                )}
            </header>
            <main id="main-content" className="flex-1">{children}</main>
            <Toaster />
        </div>
    )
}