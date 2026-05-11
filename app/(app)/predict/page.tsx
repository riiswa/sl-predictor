import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import PredictClient from './PredictClient'
import ShareButton from '@/components/predict/ShareButton'

export default async function PredictPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: comps } = await supabase
        .from('competitions')
        .select('id, name, flag, country, date_start, prediction_deadline, status, scoring_config')
        .eq('status', 'open')
        .order('date_start', { ascending: true })

    if (!comps || comps.length === 0) {
        return (
            <div>
                <PageHeader tag="Season 2026" title="PREDICT" subtitle="No competition open right now" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
                    <p className="font-bebas text-3xl tracking-wide text-gray-muted/60 mb-3">NO OPEN COMPETITION</p>
                    <p className="text-gray-muted/50 text-sm font-condensed tracking-wide">
                        Check back when the next competition opens for predictions.
                    </p>
                </div>
            </div>
        )
    }

    // Load all data for all open competitions
    const competitionData = await Promise.all(
        comps.map(async (comp) => {
            const { data: categories } = await supabase
                .from('categories')
                .select('id, name, gender, weight_class, display_order, athletes ( id, first_name, last_name, nationality )')
                .eq('competition_id', comp.id)
                .order('display_order')

            const { data: existingPredictions } = await supabase
                .from('predictions')
                .select('id, module, position, athlete_id, category_id, submitted_at')
                .eq('user_id', user.id)
                .eq('competition_id', comp.id)

            return {
                comp,
                categories: categories ?? [],
                existingPredictions: existingPredictions ?? [],
                alreadySubmitted: (existingPredictions?.length ?? 0) > 0,
            }
        })
    )

    const firstComp = competitionData[0]

    return (
        <div>
            <PageHeader
                tag={`${firstComp.comp.flag ?? ''} ${firstComp.comp.country} — Predict`}
                title={firstComp.comp.name}
                subtitle={`Competition: ${new Date(firstComp.comp.date_start).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'long', year: 'numeric'
                })}`}
            >
                <ShareButton compName={firstComp.comp.name} />
            </PageHeader>
            <div className="max-w-5xl mx-auto px-6 py-8">
                <PredictClient
                    comp={firstComp.comp}
                    categories={firstComp.categories}
                    alreadySubmitted={firstComp.alreadySubmitted}
                    existingPredictions={firstComp.existingPredictions}
                    allComps={competitionData}
                />
            </div>
        </div>
    )
}