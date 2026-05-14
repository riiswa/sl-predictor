'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { PHASES } from '@/components/live/phases'
import type { Athlete, Attempt } from './useSheetData'

// ─── Canvas constants ──────────────────────────────────────────────────────────
const PAD_L = 12, PAD_R = 12
const AXIS_Y = 180
const NUM_Y_BASE = AXIS_Y + 18
const LABEL_Y = AXIS_Y + 42
const H = AXIS_Y + 80
const GRAD_PX = 36
const LEFT_PX = PAD_L + 25
const FADE_RANGE = 20
const NAME_BASE_Y = AXIS_Y - 16
const NAME_MIN_Y = AXIS_Y - 5
const NAME_ANGLE = -40 * Math.PI / 180
const NUM_ANGLE = -35 * Math.PI / 180
const NAME_LANE_H = 15
const NAME_MAX_LANES = 7
const NUM_X_FOOTPRINT = 20
const NUM_LANE_H = 12
const NUM_MAX_LANES = 4

function scaleX(v: number, W: number, mn: number, mx: number) {
    if (mx === mn) return PAD_L
    return PAD_L + (v - mn) / (mx - mn) * (W - PAD_L - PAD_R)
}
function clamp(x: number, W: number) { return Math.max(PAD_L + 2, Math.min(W - PAD_R - 2, x)) }
function pxToKg(px: number, W: number, mn: number, mx: number) { return mn + (px - PAD_L) / (W - PAD_L - PAD_R) * (mx - mn) }
function ease(t: number) { return -(Math.cos(Math.PI * t) - 1) / 2 }

function formatName(fullName: string) {
    const parts = fullName.trim().split(/\s*\/\s*|\s+/)
    if (parts.length < 2) return parts[0] || fullName
    return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

interface LiveState {
    totals:         number[]
    pointPhase:     number[]
    phaseIdx:       number
    frozenGrads:    FrozenGrad[]
    currentKgLeft:  number
    leaderTotal:    number
}

interface FrozenGrad {
    kgLeft:      number
    kgGrad:      number
    kgGradFinal: number
    color:       string
    textColor:   string
    name:        string
}

interface ChangeEvent {
    ath:     number
    ph:      typeof PHASES[number]
    essai:   number
    attempt: Attempt
}

function computeLiveState(aths: Athlete[]): LiveState {
    const best = aths.map(() => Object.fromEntries(PHASES.map(ph => [ph.key, 0])))
    const hasAny = aths.map(() => PHASES.map(() => false))

    aths.forEach((ath, i) => {
        PHASES.forEach((ph, pi) => {
            ;(ath[ph.key as keyof Athlete] as (Attempt | null)[]).forEach(att => {
                if (att !== null) {
                    hasAny[i][pi] = true
                    if (att.ok && att.kg > best[i][ph.key]) best[i][ph.key] = att.kg
                }
            })
        })
    })

    let phaseIdx = 0
    PHASES.forEach((_, pi) => { if (hasAny.some(h => h[pi])) phaseIdx = pi })

    const totals = aths.map((_, i) => PHASES.reduce((acc, ph) => acc + best[i][ph.key], 0))

    const pointPhase = aths.map((_, i) => {
        let pp = -1
        PHASES.forEach((_, pi) => { if (hasAny[i][pi]) pp = pi })
        return pp
    })

    const frozenGrads: FrozenGrad[] = []
    for (let pi = 0; pi < phaseIdx; pi++) {
        const ph = PHASES[pi]
        const totalsUpTo = aths.map((_, i) => PHASES.slice(0, pi + 1).reduce((acc, p) => acc + best[i][p.key], 0))
        const active = totalsUpTo.filter(t => t > 0)
        if (!active.length) continue
        const totalsUpToPrev = pi > 0
            ? aths.map((_, i) => PHASES.slice(0, pi).reduce((acc, p) => acc + best[i][p.key], 0))
            : aths.map(() => 0)
        const prevActive = totalsUpToPrev.filter(t => t > 0)
        const kgLeft = prevActive.length ? Math.min(...prevActive) : 0
        const kgGrad = Math.max(...active)
        frozenGrads.push({ kgLeft, kgGrad, kgGradFinal: kgGrad, color: ph.color, textColor: ph.textColor, name: ph.name })
    }

    const totalsBeforeCur = phaseIdx > 0
        ? aths.map((_, i) => PHASES.slice(0, phaseIdx).reduce((acc, p) => acc + best[i][p.key], 0))
        : aths.map(() => 0)
    const prevActive = totalsBeforeCur.filter(t => t > 0)
    const currentKgLeft = prevActive.length ? Math.min(...prevActive) : 0
    const leaderTotal = totals.length ? Math.max(...totals) : 0

    return { totals, pointPhase, phaseIdx, frozenGrads, currentKgLeft, leaderTotal }
}

function detectLatestEntry(prevAths: Athlete[] | null, newAths: Athlete[]): ChangeEvent | null {
    let result: ChangeEvent | null = null
    newAths.forEach((newAth, i) => {
        const prevAth = prevAths?.[i]
        PHASES.forEach(ph => {
            ;(newAth[ph.key as keyof Athlete] as (Attempt | null)[]).forEach((att, e) => {
                if (att === null) return
                const prevAtt = (prevAth?.[ph.key as keyof Athlete] as (Attempt | null)[] | undefined)?.[e]
                if (!prevAth || !prevAtt || prevAtt.kg !== att.kg || prevAtt.ok !== att.ok) {
                    result = { ath: i, ph, essai: e, attempt: att }
                }
            })
        })
    })
    return result
}

interface CanvasState {
    phaseIdx: number; leaderTotal: number
    totals: number[]; pointPhase: number[]
    displayX: number[]; gradX: number
    animating: boolean
    axisMinAnim: number; axisMaxAnim: number
    frozenGrads: FrozenGrad[]
    currentKgLeft: number; currentHasStarted: boolean
    nameYStart: number[]; nameYTarget: number[]
    numAngleStart: number[]; numAngleTarget: number[]
    numYStart: number[]; numYTarget: number[]
    needsLineTarget: boolean[]; numNeedsLineTarget: boolean[]
    lastPassedAth: number; lastAttemptFailed: boolean
    shakeAth: number; shakeOffset: number
    currentW: number
    prevAthletes: Athlete[] | null
}

export default function useCompetition(athletes: Athlete[] | null) {
    const N = athletes?.length ?? 0

    const [uiAnimating, setUiAnimating] = useState(false)
    const [uiLog,       setUiLog]       = useState('')

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapRef   = useRef<HTMLDivElement>(null)

    const s = useRef<CanvasState>({
        phaseIdx: 0, leaderTotal: 0,
        totals: [], pointPhase: [],
        displayX: [], gradX: PAD_L,
        animating: false,
        axisMinAnim: 0, axisMaxAnim: 1,
        frozenGrads: [],
        currentKgLeft: 0, currentHasStarted: false,
        nameYStart: [], nameYTarget: [],
        numAngleStart: [], numAngleTarget: [],
        numYStart: [], numYTarget: [],
        needsLineTarget: [], numNeedsLineTarget: [],
        lastPassedAth: -1, lastAttemptFailed: false,
        shakeAth: -1, shakeOffset: 0,
        currentW: 0,
        prevAthletes: null,
    })

    const getCtx = () => {
        const canvas = canvasRef.current
        return canvas ? canvas.getContext('2d') : null
    }

    function getPointColor(i: number) {
        const { totals, pointPhase } = s.current
        if (totals[i] === 0 || pointPhase[i] < 0) return 'rgba(255,255,255,0.18)'
        return PHASES[pointPhase[i]].color
    }

    function computeBounds(minKg: number, leaderKg: number, W: number) {
        const usable = W - PAD_L - PAD_R
        const xMin = LEFT_PX - PAD_L, xMax = W - PAD_R - GRAD_PX - 10 - PAD_L
        if (xMax <= xMin || leaderKg <= minKg) return { mn: minKg - 2, mx: leaderKg + 5 }
        const fMin = xMin / usable, fMax = xMax / usable
        const range = (leaderKg - minKg) / (fMax - fMin)
        const mn = minKg - fMin * range
        return { mn, mx: mn + range }
    }

    function buildGroups() {
        const { totals } = s.current
        const map: Record<string, { total: number; members: number[] }> = {}
        for (let i = 0; i < N; i++) {
            if (totals[i] === 0) continue
            const key = totals[i].toFixed(2)
            if (!map[key]) map[key] = { total: totals[i], members: [] }
            map[key].members.push(i)
        }
        if (athletes) Object.values(map).forEach(g => g.members.sort((a, b) => athletes[a].bw - athletes[b].bw))
        return Object.values(map).sort((a, b) => a.total - b.total)
    }

    function computeLabels(xs: number[]) {
        const nameY        = new Array(N).fill(NAME_BASE_Y)
        const numAngle     = new Array(N).fill(0)
        const numY         = new Array(N).fill(NUM_Y_BASE)
        const needsLine    = new Array(N).fill(false)
        const numNeedsLine = new Array(N).fill(false)
        const groups = buildGroups()
        const sortedGroups = groups.slice().sort((a, b) => xs[a.members[0]] - xs[b.members[0]])

        const nameLane = new Array(sortedGroups.length).fill(0)
        for (let gi = sortedGroups.length - 2; gi >= 0; gi--) {
            const rg = sortedGroups[gi + 1]
            const footprint = rg.members.length > 2 ? 53 : 45
            const dx = xs[rg.members[0]] - xs[sortedGroups[gi].members[0]]
            if (dx < footprint) nameLane[gi] = nameLane[gi + 1] + rg.members.length
        }
        sortedGroups.forEach((g, gi) => {
            const l = Math.min(nameLane[gi], NAME_MAX_LANES - 1)
            if (nameLane[gi] > 0) g.members.forEach(mi => { needsLine[mi] = true })
            g.members.forEach((mi, idx) => {
                nameY[mi] = Math.max(8, NAME_BASE_Y - l * NAME_LANE_H - idx * NAME_LANE_H)
            })
        })

        const numLane = new Array(sortedGroups.length).fill(0)
        for (let gi = 1; gi < sortedGroups.length; gi++) {
            const dx = xs[sortedGroups[gi].members[0]] - xs[sortedGroups[gi - 1].members[0]]
            if (dx < NUM_X_FOOTPRINT) numLane[gi] = numLane[gi - 1] + 1
        }
        sortedGroups.forEach((g, gi) => {
            const l = Math.min(numLane[gi], NUM_MAX_LANES - 1)
            if (numLane[gi] > 0) g.members.forEach(mi => { numNeedsLine[mi] = true })
            g.members.forEach(mi => { numY[mi] = NUM_Y_BASE + l * NUM_LANE_H })
        })
        for (let gi = 1; gi < sortedGroups.length; gi++) {
            if (numLane[gi] > 0) {
                sortedGroups[gi].members.forEach(mi => { numAngle[mi] = NUM_ANGLE })
                sortedGroups[gi - 1].members.forEach(mi => { numAngle[mi] = NUM_ANGLE })
            }
        }

        return { nameY, numAngle, numY, needsLine, numNeedsLine }
    }

    function getFrozenGradX(fg: FrozenGrad, W: number, mn: number, mx: number) {
        const kg = fg.kgGradFinal !== undefined ? fg.kgGradFinal : fg.kgGrad
        let xR = clamp(Math.round(scaleX(kg, W, mn, mx)), W)
        const { displayX, totals } = s.current
        const GAP = 10
        let maxLeftDot = -1, minRightDot = W + 1
        for (let i = 0; i < N; i++) {
            if (totals[i] <= 0) continue
            const dx = displayX[i]
            if (dx <= xR + 2) maxLeftDot = Math.max(maxLeftDot, dx)
            else               minRightDot = Math.min(minRightDot, dx)
        }
        if (maxLeftDot  >= 0) xR = Math.max(xR, maxLeftDot  + GAP)
        if (minRightDot <= W) xR = Math.min(xR, minRightDot - GAP)
        return clamp(xR, W)
    }

    function computeCurrentLabelOpacity(W: number) {
        const { currentHasStarted, lastPassedAth, displayX, gradX } = s.current
        if (!currentHasStarted || lastPassedAth < 0) return currentHasStarted ? 1 : 0
        const lastPx = displayX[lastPassedAth]
        const gx = clamp(Math.round(gradX), W)
        if (lastPx <= gx) return 1
        return Math.max(0, 1 - (lastPx - gx) / FADE_RANGE)
    }

    function computeFrozenLabelOpacity(fg: FrozenGrad, W: number) {
        const { totals, displayX, axisMinAnim, axisMaxAnim } = s.current
        const xR = getFrozenGradX(fg, W, axisMinAnim, axisMaxAnim)
        const active = [...Array(N).keys()].filter(i => totals[i] > 0)
        if (!active.length) return 1
        const leftmostPx = Math.min(...active.map(i => displayX[i]))
        if (leftmostPx <= xR) return 1
        return Math.max(0, 1 - (leftmostPx - xR) / FADE_RANGE)
    }

    const drawFrame = useCallback((W: number, ep?: number) => {
        const ctx = getCtx()
        if (!ctx) return
        const { axisMinAnim: mn, axisMaxAnim: mx, frozenGrads, currentHasStarted,
                phaseIdx, currentKgLeft, gradX, displayX, totals,
                nameYStart, nameYTarget, numAngleStart, numAngleTarget, numYStart, numYTarget,
                needsLineTarget, numNeedsLineTarget,
                lastPassedAth, lastAttemptFailed, shakeAth, shakeOffset } = s.current

        ctx.clearRect(0, 0, W, H)

        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(PAD_L, AXIS_Y); ctx.lineTo(W - PAD_R, AXIS_Y); ctx.stroke()

        frozenGrads.forEach(fg => {
            const xL = clamp(Math.round(scaleX(fg.kgLeft, W, mn, mx)), W)
            const xR = getFrozenGradX(fg, W, mn, mx)
            ctx.fillStyle = fg.color + '18'; ctx.fillRect(xL, AXIS_Y - 2, Math.max(0, xR - xL), 4)
            ctx.strokeStyle = fg.color; ctx.lineWidth = 2.5
            ctx.beginPath(); ctx.moveTo(xR, AXIS_Y - 12); ctx.lineTo(xR, AXIS_Y + 12); ctx.stroke()
            const op = computeFrozenLabelOpacity(fg, W)
            if (op > 0.01) {
                ctx.save(); ctx.globalAlpha = op
                ctx.fillStyle = fg.color; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'
                ctx.fillText(fg.name, (xL + xR) / 2, LABEL_Y)
                ctx.restore()
            }
        })

        if (currentHasStarted) {
            const ph = PHASES[phaseIdx]
            const xL = clamp(Math.round(scaleX(currentKgLeft, W, mn, mx)), W)
            const xR = clamp(Math.round(gradX), W)
            ctx.fillStyle = ph.color + '18'; ctx.fillRect(xL, AXIS_Y - 2, Math.max(0, xR - xL), 4)
            ctx.strokeStyle = ph.color; ctx.lineWidth = 2.5
            ctx.beginPath(); ctx.moveTo(xR, AXIS_Y - 12); ctx.lineTo(xR, AXIS_Y + 12); ctx.stroke()
            const labelOp = computeCurrentLabelOpacity(W)
            if (labelOp > 0.01) {
                ctx.save(); ctx.globalAlpha = labelOp
                ctx.fillStyle = ph.textColor; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'
                ctx.fillText(ph.name, (xL + xR) / 2, LABEL_Y)
                ctx.restore()
            }
        }

        const groups = buildGroups()
        const allActive = [...Array(N).keys()].filter(i => totals[i] > 0)

        const ranked = [...allActive].sort((a, b) =>
            totals[b] !== totals[a] ? totals[b] - totals[a] : athletes![a].bw - athletes![b].bw
        )
        const rankMap: Record<number, number> = {}
        ranked.forEach((i, idx) => {
            const prev = ranked[idx - 1]
            const tied = idx > 0 && totals[i] === totals[prev] && athletes![i].bw === athletes![prev].bw
            rankMap[i] = tied ? rankMap[prev] : idx + 1
        })
        function podiumStroke(i: number) {
            const rk = rankMap[i]
            if (rk === 1) return { color: '#FFD700', width: 2.5 }
            if (rk === 2) return { color: '#C0C0C0', width: 2.5 }
            if (rk === 3) return { color: '#CD7F32', width: 2.5 }
            return { color: '#050042', width: 2 }
        }

        const t = ep !== undefined ? ep : 1
        const liveNumAngle = numAngleStart.map((sa, i) => sa + (numAngleTarget[i] - sa) * t)
        const curNameY = new Array(N).fill(NAME_BASE_Y)
        for (let i = 0; i < N; i++) curNameY[i] = Math.min(nameYStart[i] + (nameYTarget[i] - nameYStart[i]) * t, NAME_MIN_Y)
        const curNumY = numYStart.map((sy, i) => sy + (numYTarget[i] - sy) * t)

        allActive.forEach(i => {
            if (!needsLineTarget[i]) return
            if (curNameY[i] >= NAME_BASE_Y - NAME_LANE_H * 0.5) return
            const cx = displayX[i]
            ctx.save()
            ctx.strokeStyle = getPointColor(i); ctx.globalAlpha = 0.32
            ctx.lineWidth = 1; ctx.setLineDash([2, 3])
            ctx.beginPath(); ctx.moveTo(cx, AXIS_Y - 8); ctx.lineTo(cx, curNameY[i] + 3); ctx.stroke()
            ctx.restore()
        })

        const seenLine = new Set<string>()
        allActive.forEach(i => {
            if (!numNeedsLineTarget[i]) return
            if (curNumY[i] <= NUM_Y_BASE + NUM_LANE_H * 0.5) return
            const tkey = totals[i].toFixed(2)
            if (seenLine.has(tkey)) return
            seenLine.add(tkey)
            const cx = displayX[i]
            ctx.save()
            ctx.strokeStyle = getPointColor(i); ctx.globalAlpha = 0.32
            ctx.lineWidth = 1; ctx.setLineDash([2, 3])
            ctx.beginPath(); ctx.moveTo(cx, AXIS_Y + 8); ctx.lineTo(cx, curNumY[i] - 4); ctx.stroke()
            ctx.restore()
        })

        allActive.forEach(i => {
            const cx = displayX[i]
            const { color: strokeColor, width: strokeWidth } = podiumStroke(i)
            ctx.beginPath(); ctx.arc(cx, AXIS_Y, 6, 0, Math.PI * 2)
            ctx.fillStyle = getPointColor(i); ctx.fill()
            ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth; ctx.stroke()
        })

        allActive.forEach(i => {
            const rk = rankMap[i]
            const cx = displayX[i]
            const isFailed = i === lastPassedAth && lastAttemptFailed
            const isShaking = i === shakeAth
            const nameColor = isFailed ? '#e8392a'
                : rk === 1 ? '#FFD700' : rk === 2 ? '#C0C0C0' : rk === 3 ? '#CD7F32'
                : 'rgba(255,255,255,0.42)'
            ctx.save()
            ctx.translate(cx + (isShaking ? shakeOffset : 0), curNameY[i])
            ctx.rotate(NAME_ANGLE)
            ctx.font = (isFailed || rk <= 3 ? '700 ' : '') + '11px sans-serif'
            ctx.fillStyle = nameColor; ctx.textAlign = 'left'
            ctx.fillText(formatName(athletes![i].name), 0, 0)
            ctx.restore()
        })

        const seenNum = new Set<string>()
        allActive.forEach(i => {
            const tkey = totals[i].toFixed(2)
            if (seenNum.has(tkey)) return
            const myGroup = groups.find(g => g.members.includes(i))
            if (!myGroup || myGroup.members[0] !== i) return
            seenNum.add(tkey)
            const cx = displayX[i]
            const angle = liveNumAngle[i]
            const label = totals[i] % 1 === 0 ? String(totals[i]) : totals[i].toFixed(2).replace(/\.?0+$/, '')
            ctx.save()
            const rk = rankMap[i]
            const numColor = rk === 1 ? '#FFD700' : rk === 2 ? '#C0C0C0' : rk === 3 ? '#CD7F32' : getPointColor(i)
            ctx.font = (rk <= 3 ? '600 ' : '') + '10px sans-serif'; ctx.fillStyle = numColor
            const ny = curNumY[i]
            if (angle !== 0) {
                ctx.translate(cx, ny); ctx.rotate(angle); ctx.textAlign = 'right'; ctx.fillText(label, 0, 0)
            } else {
                ctx.textAlign = 'center'; ctx.fillText(label, cx, ny)
            }
            ctx.restore()
        })
    }, [athletes, N])

    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current
        const wrap   = wrapRef.current
        if (!canvas || !wrap) return 0
        const DPR = window.devicePixelRatio || 1
        const W = wrap.offsetWidth || 900
        canvas.width  = W * DPR
        canvas.height = H * DPR
        canvas.style.height = H + 'px'
        const ctx = canvas.getContext('2d')!
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.scale(DPR, DPR)
        return W
    }, [])

    const animateTo = useCallback((targetXs: number[], targetMn: number, targetMx: number, targetGradX: number, W: number, dur: number, cb?: () => void) => {
        const st = s.current
        st.animating = true
        setUiAnimating(true)

        const { nameY: tNameY, numAngle: tNumAngle, numY: tNumY, needsLine: tNL, numNeedsLine: tNNL } = computeLabels(targetXs)
        for (let i = 0; i < N; i++) {
            st.nameYStart[i]    = st.nameYTarget[i]
            st.numAngleStart[i] = st.numAngleTarget[i]
            st.numYStart[i]     = st.numYTarget[i]
        }
        st.nameYTarget       = tNameY.map(y => Math.min(y, NAME_MIN_Y))
        st.numAngleTarget    = [...tNumAngle]
        st.numYTarget        = [...tNumY]
        st.needsLineTarget   = [...tNL]
        st.numNeedsLineTarget = [...tNNL]

        const sXs = [...st.displayX]
        const sMn = st.axisMinAnim, sMx = st.axisMaxAnim, sGX = st.gradX
        const tGX = clamp(targetGradX, W)
        const t0 = performance.now()

        function frame(now: number) {
            const p = Math.min((now - t0) / dur, 1), ep = ease(p)
            for (let i = 0; i < N; i++) st.displayX[i] = sXs[i] + (targetXs[i] - sXs[i]) * ep
            st.axisMinAnim = sMn + (targetMn - sMn) * ep
            st.axisMaxAnim = sMx + (targetMx - sMx) * ep
            st.gradX = sGX + (tGX - sGX) * ep
            drawFrame(W, ep)
            if (p < 1) {
                requestAnimationFrame(frame)
            } else {
                st.axisMinAnim = targetMn; st.axisMaxAnim = targetMx; st.gradX = tGX
                st.currentW = W
                for (let i = 0; i < N; i++) {
                    st.nameYStart[i]    = st.nameYTarget[i]
                    st.numAngleStart[i] = st.numAngleTarget[i]
                    st.numYStart[i]     = st.numYTarget[i]
                }
                st.animating = false
                setUiAnimating(false)
                if (cb) cb()
            }
        }
        requestAnimationFrame(frame)
    }, [N, drawFrame])

    function startShake(ath: number, W: number) {
        const st = s.current
        st.shakeAth = ath
        const t0 = performance.now()
        const DUR = 700, AMP = 5, FREQ = 40
        function frame(now: number) {
            const elapsed = now - t0
            const p = Math.min(elapsed / DUR, 1)
            st.shakeOffset = AMP * Math.sin(FREQ * elapsed / 1000) * (1 - p)
            drawFrame(W, 1)
            if (p < 1) requestAnimationFrame(frame)
            else { st.shakeOffset = 0; st.shakeAth = -1; drawFrame(W, 1) }
        }
        requestAnimationFrame(frame)
    }

    const recomputePositions = useCallback((W: number) => {
        const st = s.current
        if (st.currentW <= 0) return
        const gradKg = pxToKg(st.gradX, st.currentW, st.axisMinAnim, st.axisMaxAnim)
        st.gradX = clamp(scaleX(gradKg, W, st.axisMinAnim, st.axisMaxAnim), W)
        st.displayX = st.totals.map(t =>
            t > 0 ? clamp(scaleX(t, W, st.axisMinAnim, st.axisMaxAnim), W) : PAD_L + 2
        )
        st.currentW = W
        const { nameY, numAngle, numY, needsLine, numNeedsLine } = computeLabels(st.displayX)
        const snappedY = nameY.map(y => Math.min(y, NAME_MIN_Y))
        st.nameYStart    = snappedY; st.nameYTarget    = [...snappedY]
        st.numAngleStart = [...numAngle]; st.numAngleTarget = [...numAngle]
        st.numYStart     = [...numY];    st.numYTarget     = [...numY]
        st.needsLineTarget    = [...needsLine]
        st.numNeedsLineTarget = [...numNeedsLine]
    }, [N])

    useEffect(() => {
        function onResize() {
            if (!s.current.animating) {
                const W = setupCanvas()
                recomputePositions(W)
                drawFrame(W, 1)
            }
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [setupCanvas, drawFrame, recomputePositions])

    useEffect(() => {
        if (!athletes || athletes.length === 0) return

        const st = s.current
        const isFirstLoad = st.prevAthletes === null || st.prevAthletes.length !== athletes.length

        const { totals, pointPhase, phaseIdx, frozenGrads, currentKgLeft, leaderTotal } = computeLiveState(athletes)

        const change = isFirstLoad ? null : detectLatestEntry(st.prevAthletes, athletes)

        st.totals        = totals
        st.pointPhase    = pointPhase
        st.phaseIdx      = phaseIdx
        st.frozenGrads   = frozenGrads
        st.currentKgLeft = currentKgLeft
        st.leaderTotal   = leaderTotal
        st.currentHasStarted = totals.some(t => t > 0)

        if (change) {
            st.lastPassedAth     = change.ath
            st.lastAttemptFailed = !change.attempt.ok
            const { ath, ph, essai, attempt } = change
            const ok = attempt.ok
            const label = totals[ath] > 0 ? totals[ath].toFixed(2).replace(/\.?0+$/, '') : '0'
            setUiLog(
                `${ph.name} — attempt ${essai + 1} — <strong>${formatName(athletes[ath].name)}</strong> &nbsp;${attempt.kg} kg &nbsp;<span style="color:${ok ? '#1D9E75' : '#D85A30'};font-weight:500">${ok ? '✓' : '✗ failed'}</span> &nbsp;→ total ${label} kg`
            )
        }

        const at = totals.filter(t => t > 0)

        if (isFirstLoad) {
            st.nameYStart    = new Array(N).fill(NAME_BASE_Y)
            st.nameYTarget   = new Array(N).fill(NAME_BASE_Y)
            st.numAngleStart  = new Array(N).fill(0)
            st.numAngleTarget = new Array(N).fill(0)
            st.numYStart      = new Array(N).fill(NUM_Y_BASE)
            st.numYTarget     = new Array(N).fill(NUM_Y_BASE)
            st.needsLineTarget    = new Array(N).fill(false)
            st.numNeedsLineTarget = new Array(N).fill(false)
            st.lastPassedAth = -1; st.lastAttemptFailed = false
            st.shakeAth = -1; st.shakeOffset = 0

            const W = setupCanvas()
            st.currentW = W

            if (at.length === 0) {
                st.axisMinAnim = 0; st.axisMaxAnim = 50
                st.displayX = athletes.map(() => PAD_L + 2)
                st.gradX = PAD_L
            } else {
                const { mn, mx } = computeBounds(Math.min(...at), leaderTotal, W)
                st.axisMinAnim = mn; st.axisMaxAnim = mx
                st.displayX = totals.map(t => t > 0 ? clamp(scaleX(t, W, mn, mx), W) : PAD_L + 2)
                st.gradX = Math.min(clamp(scaleX(leaderTotal, W, mn, mx), W) + 10, W - PAD_R - 2)
                const { nameY, numAngle, numY, needsLine, numNeedsLine } = computeLabels(st.displayX)
                const snappedY = nameY.map(y => Math.min(y, NAME_MIN_Y))
                st.nameYStart    = snappedY; st.nameYTarget    = [...snappedY]
                st.numAngleStart = [...numAngle]; st.numAngleTarget = [...numAngle]
                st.numYStart     = [...numY];    st.numYTarget     = [...numY]
                st.needsLineTarget    = [...needsLine]
                st.numNeedsLineTarget = [...numNeedsLine]
            }
            drawFrame(W, 1)
        } else if (at.length > 0 && !st.animating) {
            const W = st.currentW > 0 ? st.currentW : setupCanvas()
            if (st.currentW <= 0) st.currentW = W
            const { mn, mx } = computeBounds(Math.min(...at), leaderTotal, W)
            const targetXs = totals.map(t => t > 0 ? clamp(scaleX(t, W, mn, mx), W) : PAD_L + 2)
            const leaderPx = clamp(scaleX(leaderTotal, W, mn, mx), W)
            const targetGradX = Math.min(leaderPx + 10, W - PAD_R - 2)
            animateTo(targetXs, mn, mx, targetGradX, W, 500,
                change && !change.attempt.ok ? () => startShake(change.ath, W) : undefined)
        }

        st.prevAthletes = athletes
    }, [athletes])

    return { canvasRef, wrapRef, uiAnimating, uiLog }
}
