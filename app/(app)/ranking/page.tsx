import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import RankingTabs from './RankingTabs'

export default async function RankingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: currentProfile } = await supabase
        .from('predictor_standings')
        .select('id, username, total_points, season_rank, country, total_predictions, correct_predictions')
        .eq('id', user!.id)
        .single()

    // Full predictor leaderboard (sort by points, then by predictions to show active users first)
    const { data: allProfiles } = await supabase
        .from('predictor_standings')
        .select('id, username, total_points, season_rank, country, total_predictions, correct_predictions')
        .order('total_points', { ascending: false })
        .order('total_predictions', { ascending: false })

    // Visible competitions list for filter
    const { data: visibleComps } = await supabase
        .from('competitions')
        .select('id, name, flag')
        .eq('results_visible', true)
        .order('date_start', { ascending: false })

    const visibleCompIds = (visibleComps ?? []).map(c => c.id)

    // RIS results — only from visible competitions
    const { data: results } = visibleCompIds.length === 0 ? { data: [] } : await supabase
        .from('results')
        .select(`
            id, competition_id, rank_in_category, ris_score, muscle_up, pullup, dip, squat, dnf, disqualified, missing_data,
            athletes ( id, first_name, last_name, nationality, bodyweight ),
            categories ( id, gender, weight_class )
        `)
        .in('competition_id', visibleCompIds)
        .not('ris_score', 'is', null)
        .order('ris_score', { ascending: false })

    return (
        <div>
            <PageHeader
                tag="Season 2026"
                title="RANKING"
                subtitle="Predictors leaderboard · Athletes RIS rankings"
            />
            <div className="max-w-7xl mx-auto px-6 py-8">
                <RankingTabs
                    currentUserId={user!.id}
                    currentProfile={currentProfile}
                    allProfiles={allProfiles ?? []}
                    results={results ?? []}
                    visibleComps={visibleComps ?? []}
                />
            </div>
        </div>
    )
}
