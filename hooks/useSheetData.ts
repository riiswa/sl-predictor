'use client'

import { useState, useEffect } from 'react'

const POLL_MS = 10_000

export interface Attempt { kg: number; ok: boolean }
export interface Athlete {
    name: string
    bw:   number
    mu:   (Attempt | null)[]
    pu:   (Attempt | null)[]
    di:   (Attempt | null)[]
    sq:   (Attempt | null)[]
}

function parseCSVLine(line: string): string[] {
    const out: string[] = []
    let cur = '', inQ = false
    for (const ch of line) {
        if (ch === '"')            { inQ = !inQ }
        else if (ch === ',' && !inQ) { out.push(cur.trim()); cur = '' }
        else                       { cur += ch }
    }
    out.push(cur.trim())
    return out
}

function parseAttempt(cell: string): Attempt | null {
    if (!cell) return null
    const s = cell.trim()
    if (!s) return null
    const lower = s.toLowerCase()
    const ok     = lower.endsWith('v')
    const failed = lower.endsWith('n')
    if (!ok && !failed) return null
    const kg = parseFloat(s.replace(',', '.'))
    if (isNaN(kg) || kg <= 0) return null
    return { kg, ok }
}

function parseSheet(text: string): Athlete[] {
    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) throw new Error('Empty sheet')
    const athletes: Athlete[] = []
    for (let i = 1; i < lines.length; i++) {
        const c = parseCSVLine(lines[i])
        const name = (c[0] || '').trim()
        if (!name) continue
        const bw = parseFloat((c[1] || '').replace(',', '.')) || 0
        athletes.push({
            name, bw,
            mu: [parseAttempt(c[2]),  parseAttempt(c[3]),  parseAttempt(c[4])],
            pu: [parseAttempt(c[5]),  parseAttempt(c[6]),  parseAttempt(c[7])],
            di: [parseAttempt(c[8]),  parseAttempt(c[9]),  parseAttempt(c[10])],
            sq: [parseAttempt(c[11]), parseAttempt(c[12]), parseAttempt(c[13])],
        })
    }
    if (!athletes.length) throw new Error('No athletes found')
    return athletes
}

export function useSheetData(sheetId: string | null) {
    const [athletes, setAthletes] = useState<Athlete[] | null>(null)
    const [status,   setStatus]   = useState<'loading' | 'live' | 'error'>('loading')
    const [error,    setError]    = useState<string | null>(null)

    useEffect(() => {
        if (!sheetId) return
        let cancelled = false
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`

        async function fetchData() {
            try {
                const res = await fetch(`${url}&t=${Date.now()}`, { cache: 'no-store' })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const text = await res.text()
                if (cancelled) return
                const parsed = parseSheet(text)
                setAthletes(parsed)
                setStatus('live')
                setError(null)
            } catch (e: any) {
                if (cancelled) return
                setError(e.message)
                setStatus('error')
            }
        }

        fetchData()
        const id = setInterval(fetchData, POLL_MS)
        return () => { cancelled = true; clearInterval(id) }
    }, [sheetId])

    return { athletes, status, error }
}
