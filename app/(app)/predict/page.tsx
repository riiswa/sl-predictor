import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import PredictClient from './PredictClient'

export default async function PredictPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Get open competition
    const { data: comp } = await supabase
        .from('competitions')
        .select('id, name, flag, country, date_start, prediction_deadline, status, scoring_config')
        .eq('status', 'open')
        .order('date_start', { ascending: true })
        .limit(1)
        .single()

    // Get categories with athletes
    const { data: categories } = comp ? await supabase
        .from('categories')
        .select(`
      id, name, gender, weight_class, display_order,
      athletes ( id, first_name, last_name, nationality, pr_muscle_up, pr_pullup, pr_dip, pr_squat )
    `)
        .eq('competition_id', comp.id)
        .order('display_order') : { data: null }

    // Check if user already submitted for this competition
    const { count: existingCount } = comp ? await supabase
        .from('predictions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('competition_id', comp.id) : { count: 0 }

    const alreadySubmitted = (existingCount ?? 0) > 0

    // Get existing season predictions
    const { data: seasonPreds } = await supabase
        .from('season_predictions')
        .select('gender, athlete_id, athletes(first_name, last_name)')
        .eq('user_id', user.id)
        .eq('season', 2026)

    // All athletes across all competitions for Strongest Streetlifter
    const { data: allAthletes } = await supabase
        .from('athletes')
        .select('id, first_name, last_name, nationality, category_id, competition_id, categories(gender), competitions(name)')

    const seasonSubmitted = (seasonPreds ?? []).map((p: any) => ({
        gender: p.gender as 'men' | 'women',
        name: `${p.athletes?.first_name} ${p.athletes?.last_name}`,
    }))

    const menAthletes = (allAthletes ?? [])
        .filter((a: any) => a.categories?.gender === 'men')
        .map((a: any) => ({
            id: a.id,
            first_name: a.first_name,
            last_name: a.last_name,
            nationality: a.nationality,
            competition_name: a.competitions?.name ?? '',
        }))

    const womenAthletes = (allAthletes ?? [])
        .filter((a: any) => a.categories?.gender === 'women')
        .map((a: any) => ({
            id: a.id,
            first_name: a.first_name,
            last_name: a.last_name,
            nationality: a.nationality,
            competition_name: a.competitions?.name ?? '',
        }))

    if (!comp) {
        return (
            <div>
                <PageHeader tag="Season 2026" title="PREDICT" subtitle="No competition open right now" />
                <div className="max-w-7xl mx-auto px-6 py-20 text-center">
                    <p className="font-bebas text-3xl tracking-wide text-gray-muted/40 mb-3">NO OPEN COMPETITION</p>
                    <p className="text-gray-muted/40 text-sm font-condensed tracking-wide">
                        Check back when the next competition opens for predictions.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div>
            <PageHeader
                tag={`${comp.flag ?? ''} ${comp.country} — Predict`}
                title={comp.name}
                subtitle={`Competition: ${new Date(comp.date_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`}
            />
            <div className="max-w-5xl mx-auto px-6 py-8">
                <PredictClient
                    comp={comp}
                    categories={categories ?? []}
                    alreadySubmitted={alreadySubmitted}
                    seasonSubmitted={seasonSubmitted}
                    menAthletes={menAthletes}
                    womenAthletes={womenAthletes}
                />
            </div>
        </div>
    )
}