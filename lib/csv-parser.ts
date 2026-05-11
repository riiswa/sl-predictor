import * as XLSX from 'xlsx'

export interface CSVAthlete {
    first_name:  string
    last_name:   string
    nationality: string
    gender:      'men' | 'women'
    weight_class: string
    bodyweight:  number | null
    muscle_up:   number | null
    pullup:      number | null
    dip:         number | null
    squat:       number | null
    instagram_id: string | null
}

export interface ParsedRoster {
    athletes:   CSVAthlete[]
    hasResults: boolean
    categories: { gender: 'men' | 'women'; weight_class: string; name: string; display_order: number }[]
    warnings:   string[]
}

function parseNum(val: any): { value: number | null; warning?: string } {
    if (val === null || val === undefined || val === '') return { value: null }

    const str = String(val).trim().toUpperCase()

    // Check for special keywords indicating no lift
    const dnfKeywords = ['DNF', 'DIS', 'DNS', 'DNA', 'N/A', 'NA', '—', '-', 'X']
    if (dnfKeywords.includes(str)) {
        return { value: null }
    }

    const n = parseFloat(str)

    // Treat 0 as DNF (no lift completed)
    if (n === 0) {
        return { value: null }
    }

    // Invalid number
    if (isNaN(n)) {
        return { value: null, warning: `Invalid lift value: "${String(val).trim()}"` }
    }

    // Out of valid range
    if (n < 0 || n > 1000) {
        return { value: null, warning: `Lift value out of valid range: ${n}` }
    }

    return { value: n }
}

function parseGender(val: any): 'men' | 'women' {
    const v = String(val ?? '').trim().toLowerCase()
    if (v === 'women' || v === 'female' || v === 'f' || v === 'femme' || v === 'w') return 'women'
    return 'men'
}

export const WEIGHT_CLASS_ORDER: Record<string, number> = {
    '-52kg': 1, '-57kg': 2, '-63kg': 3, '-70kg': 4, '+70kg': 5,
    '-66kg': 6, '-73kg': 7, '-80kg': 8, '-87kg': 9,
    '-94kg': 10, '-101kg': 11, '+101kg': 12,
}

function normalizeHeader(h: string): string {
    return String(h).trim().toLowerCase().replace(/\s+/g, '_')
}

function rowsToAthletes(rows: Record<string, any>[]): { athletes: CSVAthlete[], hasResults: boolean, warnings: string[] } {
    const athletes: CSVAthlete[] = []
    const warnings: string[] = []
    let hasResults = false

    for (const row of rows) {
        const firstName = (row.first_name || row.firstname || row.prenom || '').toString().trim()
        const lastName  = (row.last_name  || row.lastname  || row.nom   || '').toString().trim()
        const athleteName = `${firstName} ${lastName}`.trim()
        if (!firstName && !lastName) continue

        const muscle_upResult = parseNum(row.muscle_up)
        const pullupResult    = parseNum(row.pullup)
        const dipResult       = parseNum(row.dip)
        const squatResult     = parseNum(row.squat)
        const bodyweightResult = parseNum(row.bodyweight)

        const muscle_up = muscle_upResult.value
        const pullup    = pullupResult.value
        const dip       = dipResult.value
        const squat     = squatResult.value
        const bodyweight = bodyweightResult.value

        // Collect warnings
        if (muscle_upResult.warning) warnings.push(`${athleteName}: ${muscle_upResult.warning}`)
        if (pullupResult.warning) warnings.push(`${athleteName}: ${pullupResult.warning}`)
        if (dipResult.warning) warnings.push(`${athleteName}: ${dipResult.warning}`)
        if (squatResult.warning) warnings.push(`${athleteName}: ${squatResult.warning}`)
        if (bodyweightResult.warning) warnings.push(`${athleteName}: ${bodyweightResult.warning}`)

        // Has results if at least one lift is filled
        if (muscle_up !== null || pullup !== null || dip !== null || squat !== null) {
            hasResults = true
        }

        const instaId = String(row.instagram_id || row.instagram || row.instagram_handle || '').trim() || null

        athletes.push({
            first_name:   firstName,
            last_name:    lastName,
            nationality:  String(row.nationality || row.nat || row.country || '').toUpperCase().trim(),
            gender:       parseGender(row.gender || row.genre || ''),
            weight_class: String(row.weight_class || row.category || row.cat || '').trim(),
            bodyweight,
            muscle_up,
            pullup,
            dip,
            squat,
            instagram_id: instaId,
        })
    }

    return { athletes, hasResults, warnings }
}

function detectCategories(athletes: CSVAthlete[]) {
    const seen = new Set<string>()
    const categories: ParsedRoster['categories'] = []

    for (const a of athletes) {
        const key = `${a.gender}_${a.weight_class}`
        if (seen.has(key)) continue
        seen.add(key)
        categories.push({
            gender:        a.gender,
            weight_class:  a.weight_class,
            name:          `${a.gender === 'women' ? 'Women' : 'Men'} ${a.weight_class}`,
            display_order: WEIGHT_CLASS_ORDER[a.weight_class] ?? 99,
        })
    }

    return categories.sort((a, b) => a.display_order - b.display_order)
}

export function parseRosterCSV(text: string): ParsedRoster {
    const lines = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .filter(l => l.trim())

    if (lines.length < 2) throw new Error('CSV must have a header row and at least one athlete')

    const headers = lines[0].split(',').map(normalizeHeader)
    const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const row: Record<string, any> = {}
        headers.forEach((h, i) => { row[h] = values[i] ?? '' })
        return row
    })

    const { athletes, hasResults, warnings } = rowsToAthletes(rows)
    return { athletes, hasResults, categories: detectCategories(athletes), warnings }
}

export function parseRosterXLSX(buffer: Buffer): ParsedRoster {
    const workbook  = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw new Error('XLSX file has no sheets')

    const sheet   = workbook.Sheets[sheetName]
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

    if (rawRows.length < 2) throw new Error('File must have a header row and at least one athlete')

    const headers = (rawRows[0] as any[]).map(h => normalizeHeader(String(h ?? '')))
    const rows = rawRows.slice(1).map(row => {
        const obj: Record<string, any> = {}
        headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
        return obj
    })

    const { athletes, hasResults, warnings } = rowsToAthletes(rows)
    return { athletes, hasResults, categories: detectCategories(athletes), warnings }
}

export function parseRoster(data: string | Buffer, filename: string): ParsedRoster {
    const ext = filename.toLowerCase().split('.').pop()
    if (ext === 'xlsx' || ext === 'xls') {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as string)
        return parseRosterXLSX(buffer)
    }
    return parseRosterCSV(typeof data === 'string' ? data : data.toString())
}