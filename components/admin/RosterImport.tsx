'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

interface Category {
    id: string
    name: string
    gender: string
    weight_class: string
}

interface ParsedAthlete {
    first_name:  string
    last_name:   string
    nationality: string
    category:    string   // matches category name or weight_class
    pr_muscle_up?: number
    pr_pullup?:    number
    pr_dip?:       number
    pr_squat?:     number
}

export default function RosterImport({ compId, categories }: { compId: string, categories: Category[] }) {
    const router   = useRouter()
    const supabase = createClient()
    const fileRef  = useRef<HTMLInputElement>(null)

    const [parsed,  setParsed]  = useState<ParsedAthlete[]>([])
    const [loading, setLoading] = useState(false)
    const [error,   setError]   = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    function parseCSV(text: string): ParsedAthlete[] {
        const lines = text.trim().split('\n')
        if (lines.length < 2) return []
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
            const row: Record<string, string> = {}
            headers.forEach((h, i) => row[h] = values[i] ?? '')
            return {
                first_name:  row.first_name  || row.firstname  || row.prenom || '',
                last_name:   row.last_name   || row.lastname   || row.nom    || '',
                nationality: row.nationality || row.nat         || row.country || '',
                category:    row.category    || row.cat         || row.weight_class || '',
                pr_muscle_up: row.pr_muscle_up ? parseFloat(row.pr_muscle_up) : undefined,
                pr_pullup:    row.pr_pullup    ? parseFloat(row.pr_pullup)    : undefined,
                pr_dip:       row.pr_dip       ? parseFloat(row.pr_dip)       : undefined,
                pr_squat:     row.pr_squat     ? parseFloat(row.pr_squat)     : undefined,
            }
        }).filter(a => a.first_name && a.last_name)
    }

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setError(null)
        setSuccess(null)

        const reader = new FileReader()
        reader.onload = ev => {
            const text = ev.target?.result as string
            const athletes = parseCSV(text)
            if (athletes.length === 0) {
                setError('Could not parse CSV. Check the format below.')
                return
            }
            setParsed(athletes)
        }
        reader.readAsText(file)
    }

    function matchCategory(categoryStr: string): string | null {
        if (!categoryStr) return null
        const lower = categoryStr.toLowerCase()
        return categories.find(c =>
            c.name.toLowerCase() === lower ||
            c.weight_class.toLowerCase() === lower ||
            c.name.toLowerCase().includes(lower) ||
            lower.includes(c.weight_class.toLowerCase())
        )?.id ?? null
    }

    async function handleImport() {
        if (parsed.length === 0 || categories.length === 0) return
        setLoading(true)
        setError(null)

        const toInsert = parsed.map(a => ({
            competition_id: compId,
            category_id:    matchCategory(a.category),
            first_name:     a.first_name,
            last_name:      a.last_name,
            nationality:    a.nationality.toUpperCase(),
            pr_muscle_up:   a.pr_muscle_up ?? null,
            pr_pullup:      a.pr_pullup    ?? null,
            pr_dip:         a.pr_dip       ?? null,
            pr_squat:       a.pr_squat     ?? null,
        }))

        const { error } = await supabase.from('athletes').insert(toInsert)

        if (error) {
            setError(error.message)
        } else {
            setSuccess(`${toInsert.length} athletes imported successfully.`)
            setParsed([])
            if (fileRef.current) fileRef.current.value = ''
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <div className="flex flex-col gap-4">

            {/* Upload area */}
            <div className="flex items-center gap-4">
                <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFile}
                    className="hidden"
                    id="roster-upload"
                />
                <label
                    htmlFor="roster-upload"
                    className="font-condensed text-sm tracking-[2px] uppercase px-6 py-2.5 border border-blue/30 text-gray-muted hover:text-white hover:border-blue-light cursor-pointer transition-colors"
                >
                    Choose CSV file
                </label>
                {parsed.length > 0 && (
                    <span className="text-green-400 font-condensed text-sm">
            {parsed.length} athletes ready to import
          </span>
                )}
            </div>

            {/* CSV format hint */}
            <div className="bg-darker/60 border border-blue/10 px-4 py-3">
                <p className="font-condensed text-xs tracking-[3px] uppercase text-gray-muted mb-2">Expected CSV format</p>
                <code className="text-xs text-gray-muted/60 block">
                    first_name,last_name,nationality,category,pr_muscle_up,pr_pullup,pr_dip,pr_squat
                    <br />
                    Daan,Verhoeven,NL,-75kg,42,68,55,140
                    <br />
                    Sophie,de Vries,NL,-52kg,18,22,20,85
                </code>
                <p className="text-gray-muted/30 text-xs mt-2">
                    category must match exactly: {categories.map(c => c.weight_class).join(' · ')}
                </p>
            </div>

            {/* Preview */}
            {parsed.length > 0 && (
                <div className="border border-blue/20">
                    <div className="grid grid-cols-[1fr_1fr_80px_1fr] gap-3 px-4 py-2 border-b border-blue/10">
                        {['First', 'Last', 'Nat', 'Category'].map(h => (
                            <div key={h} className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted">{h}</div>
                        ))}
                    </div>
                    {parsed.slice(0, 8).map((a, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_80px_1fr] gap-3 px-4 py-2.5 border-b border-blue/5">
                            <div className="font-condensed text-sm text-white">{a.first_name}</div>
                            <div className="font-condensed text-sm text-white">{a.last_name}</div>
                            <div className="font-condensed text-sm text-gray-muted">{a.nationality}</div>
                            <div className={`font-condensed text-xs ${matchCategory(a.category) ? 'text-green-400' : 'text-accent'}`}>
                                {a.category || '— no category'}
                            </div>
                        </div>
                    ))}
                    {parsed.length > 8 && (
                        <div className="px-4 py-2 text-gray-muted/40 text-xs font-condensed text-center">
                            +{parsed.length - 8} more
                        </div>
                    )}
                </div>
            )}

            {error   && <p className="text-accent text-sm font-condensed border border-accent/20 bg-accent/8 px-4 py-3">{error}</p>}
            {success && <p className="text-green-400 text-sm font-condensed border border-green-400/20 bg-green-400/8 px-4 py-3">{success}</p>}

            {parsed.length > 0 && (
                <Button onClick={handleImport} loading={loading} size="md">
                    Import {parsed.length} athletes →
                </Button>
            )}
        </div>
    )
}