import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import LiveGameClient from './LiveGameClient'

export const dynamic = 'force-dynamic'

export default async function LivePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()

    const isAdmin = profile?.role === 'admin'

    // Active session with joins
    const { data: session } = await supabase
        .from('live_game_sessions')
        .select('id, competition_id, category_id, status, competitions(id, name, flag), categories(id, gender, weight_class)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    let athletes: any[] = []
    let rounds:   any[] = []
    let scores:   any[] = []
    let myVotes:  Record<string, string> = {}

    if (session) {
        const [aRes, rRes, sRes] = await Promise.all([
            supabase
                .from('athletes')
                .select('id, first_name, last_name, nationality')
                .eq('competition_id', session.competition_id)
                .eq('category_id', session.category_id)
                .order('last_name'),
            supabase
                .from('live_game_rounds')
                .select('*')
                .eq('session_id', session.id),
            supabase
                .from('live_game_scores')
                .select('user_id, total_points, profiles(username)')
                .eq('session_id', session.id)
                .order('total_points', { ascending: false }),
        ])

        athletes = aRes.data ?? []
        rounds   = rRes.data ?? []
        scores   = sRes.data ?? []

        if (rounds.length > 0) {
            const { data: vData } = await supabase
                .from('live_game_votes')
                .select('round_id, vote')
                .in('round_id', rounds.map((r: any) => r.id))
                .eq('user_id', user.id)
            for (const v of vData ?? []) myVotes[v.round_id] = v.vote
        }
    }

    // Admin: available competitions + their categories
    let competitions:  any[] = []
    let compCategories: Record<string, any[]> = {}

    if (isAdmin) {
        const { data: comps } = await supabase
            .from('competitions')
            .select('id, name, flag')
            .in('status', ['upcoming', 'open'])
            .order('date_start', { ascending: false })

        competitions = comps ?? []

        if (competitions.length > 0) {
            const { data: links } = await supabase
                .from('competitions_categories')
                .select('competition_id, category_id, categories(id, gender, weight_class)')
                .in('competition_id', competitions.map((c: any) => c.id))

            for (const link of links ?? []) {
                if (!compCategories[link.competition_id]) compCategories[link.competition_id] = []
                if (link.categories) compCategories[link.competition_id].push(link.categories)
            }
        }
    }

    return (
        <div>
            <PageHeader tag="Real-time" title="LIVE GAME" subtitle="Predict each attempt · vote YES or NO" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <LiveGameClient
                    userId={user.id}
                    isAdmin={isAdmin}
                    initialSession={session}
                    initialAthletes={athletes}
                    initialRounds={rounds}
                    initialScores={scores}
                    initialMyVotes={myVotes}
                    competitions={competitions}
                    compCategories={compCategories}
                />
            </div>
        </div>
    )
}
