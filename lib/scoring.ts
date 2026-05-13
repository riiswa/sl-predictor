import { createClient } from '@/lib/supabase/server'

interface ScoringConfig {
    podium: { points_exact: number; points_partial: number; positions: number }
    p4p:    { points_exact: number; points_partial: number; positions: number }
}

// FinaRep RIS formula (2026 constants)
// f(x) = A + (K - A) / (1 + Q * e^(-B*(x-v)))  ≈ expected total of an average elite athlete at bodyweight x
// RIS  = (athlete_total / f(x)) * 100

const RIS_CONSTANTS = {
    men: {
        A: 335.5625,
        K: 556.1103380806655,
        Q: 0.4973075488457353,
        v: 76.74125992622565,
        B: 0.10289374204365953,
    },
    women: {
        A: 189.0625,
        K: 281.8317115772956,
        Q: 0.004337919108356886,
        v: 69.83492229989282,
        B: 0.28812554082125424,
    },
}

function expectedEliteTotal(bodyweight: number, gender: 'men' | 'women'): number {
    const { A, K, Q, v, B } = RIS_CONSTANTS[gender]
    return A + (K - A) / (1 + Q * Math.exp(-B * (bodyweight - v)))
}

export function computeRIS(
    muscle_up: number | null,
    pullup:    number | null,
    dip:       number | null,
    squat:     number | null,
    bodyweight: number | null,
    gender: 'men' | 'women',
): { ris_score: number | null; dnf: boolean; missing_data: boolean } {
    const lifts = [muscle_up, pullup, dip, squat]
    const allNull = lifts.every(l => l === null)

    // Missing data if all lifts are null
    if (allNull) return { ris_score: null, dnf: false, missing_data: true }

    // DNF if any lift is missing (partial result = did not complete)
    const anyNull = lifts.some(l => l === null)
    if (anyNull) return { ris_score: null, dnf: true, missing_data: false }

    // Missing bodyweight — has lifts but can't compute RIS yet
    if (!bodyweight || bodyweight <= 0) {
        return { ris_score: null, dnf: false, missing_data: true }
    }

    const total    = muscle_up! + pullup! + dip! + squat!
    const expected = expectedEliteTotal(bodyweight, gender)
    const ris      = (total / expected) * 100

    return { ris_score: Math.round(ris * 100) / 100, dnf: false, missing_data: false }
}

export async function calculateCompetitionScores(
    competitionId: string,
    scoredBy?: string,
): Promise<{ updated: number; warnings: string[]; scoring_run_id: string }> {
    const supabase = await createClient()

    const { data: comp } = await supabase
        .from('competitions')
        .select('scoring_config')
        .eq('id', competitionId)
        .single()

    if (!comp) throw new Error('Competition not found')
    const config: ScoringConfig = comp.scoring_config

    const { data: results } = await supabase
        .from('results')
        .select('*')
        .eq('competition_id', competitionId)

    if (!results || results.length === 0) throw new Error('No results found')

    const { data: predictions } = await supabase
        .from('predictions')
        .select('*')
        .eq('competition_id', competitionId)

    if (!predictions || predictions.length === 0) return { updated: 0, warnings: [], scoring_run_id: '' }

    // Get category genders
    const { data: categories } = await supabase
        .from('categories')
        .select('id, gender')
        .eq('competition_id', competitionId)

    const catGender: Record<string, string> = {}
    for (const c of categories ?? []) catGender[c.id] = c.gender

    // Build P4P RIS rankings per gender
    const p4pMen = results
        .filter(r => catGender[r.category_id] === 'men' && !r.dnf && r.ris_score !== null)
        .sort((a, b) => b.ris_score - a.ris_score)

    const p4pWomen = results
        .filter(r => catGender[r.category_id] === 'women' && !r.dnf && r.ris_score !== null)
        .sort((a, b) => b.ris_score - a.ris_score)

    const p4pMenRank:   Record<string, number> = {}
    const p4pWomenRank: Record<string, number> = {}
    p4pMen.forEach((r, i)   => { p4pMenRank[r.athlete_id]   = i + 1 })
    p4pWomen.forEach((r, i) => { p4pWomenRank[r.athlete_id] = i + 1 })

    // Result lookup by athlete
    const resultByAthlete: Record<string, any> = {}
    for (const r of results) resultByAthlete[r.athlete_id] = r

    // Score each prediction
    const updates: {
        id: string
        points_earned: number
        is_exact: boolean | null
        is_partial: boolean | null
    }[] = []

    const warnings: string[] = []

    for (const pred of predictions) {
        const result = resultByAthlete[pred.athlete_id]

        if (!result) {
            updates.push({ id: pred.id, points_earned: 0, is_exact: false, is_partial: false })
            continue
        }

        if (result.dnf || result.disqualified) {
            updates.push({ id: pred.id, points_earned: 0, is_exact: false, is_partial: false })
            continue
        }

        if (result.category_changed) {
            updates.push({ id: pred.id, points_earned: 0, is_exact: null, is_partial: null })
            continue
        }

        if (result.missing_data) {
            warnings.push(`Athlete ${pred.athlete_id} has missing bodyweight — RIS not computed`)
            updates.push({ id: pred.id, points_earned: 0, is_exact: null, is_partial: null })
            continue
        }

        if (pred.module === 'podium') {
            const actualRank = result.rank_in_category
            const isExact    = actualRank === pred.position
            const isPartial  = !isExact && actualRank !== null && actualRank <= config.podium.positions
            updates.push({
                id:            pred.id,
                points_earned: isExact ? config.podium.points_exact : isPartial ? config.podium.points_partial : 0,
                is_exact:      isExact,
                is_partial:    isPartial,
            })
        } else if (pred.module === 'p4p_men') {
            const actualRank = p4pMenRank[pred.athlete_id] ?? null
            const isExact    = actualRank === pred.position
            const isPartial  = !isExact && actualRank !== null && actualRank <= config.p4p.positions
            updates.push({
                id:            pred.id,
                points_earned: isExact ? config.p4p.points_exact : isPartial ? config.p4p.points_partial : 0,
                is_exact:      isExact,
                is_partial:    isPartial,
            })
        } else if (pred.module === 'p4p_women') {
            const actualRank = p4pWomenRank[pred.athlete_id] ?? null
            const isExact    = actualRank === pred.position
            const isPartial  = !isExact && actualRank !== null && actualRank <= config.p4p.positions
            updates.push({
                id:            pred.id,
                points_earned: isExact ? config.p4p.points_exact : isPartial ? config.p4p.points_partial : 0,
                is_exact:      isExact,
                is_partial:    isPartial,
            })
        } else {
            warnings.push(`Invalid prediction module: ${pred.module}`)
            updates.push({ id: pred.id, points_earned: 0, is_exact: null, is_partial: null })
        }
    }

    // Batch update predictions
    for (const u of updates) {
        await supabase
            .from('predictions')
            .update({ points_earned: u.points_earned, is_exact: u.is_exact, is_partial: u.is_partial })
            .eq('id', u.id)
    }

    // Generate scoring_run_id (UUID format)
    const scoringRunId = crypto.randomUUID()

    // Mark any existing active scores for this competition as inactive
    await supabase
        .from('competition_scores')
        .update({ is_active: false })
        .eq('competition_id', competitionId)
        .eq('is_active', true)

    // Insert new competition scores with scoring_run_id
    const predMap = new Map(predictions.map(p => [p.id, p]))
    const userPoints: Record<string, number> = {}
    for (const u of updates) {
        const pred = predMap.get(u.id)
        if (pred) {
            userPoints[pred.user_id] = (userPoints[pred.user_id] ?? 0) + u.points_earned
        }
    }

    const ledgerRows = Object.entries(userPoints).map(([userId, pts]) => ({
        user_id:                    userId,
        competition_id:             competitionId,
        scoring_run_id:             scoringRunId,
        points:                     pts,
        is_active:                  true,
        scoring_config_snapshot:    config,
        scored_by:                  scoredBy,
        scored_at:                  new Date().toISOString(),
    }))

    if (ledgerRows.length > 0) {
        await supabase
            .from('competition_scores')
            .insert(ledgerRows)
    }

    return { updated: updates.length, warnings, scoring_run_id: scoringRunId }
}