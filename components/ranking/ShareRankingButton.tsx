'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { toast } from '@/lib/toast'
import { avatarColor } from '@/lib/avatar'

interface ShareRankingButtonProps {
    username: string
    rank: number | null
    points: number
    totalPredictions: number
    correctPredictions: number
    country: string | null
    totalParticipants?: number
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '255, 255, 255'
}

export default function ShareRankingButton({
    username, rank, points, totalPredictions, correctPredictions, country, totalParticipants,
}: ShareRankingButtonProps) {
    const [loading, setLoading] = useState(false)

    async function generateAndShare() {
        setLoading(true)
        try {
            // Wait for fonts and logo to be ready
            await document.fonts.ready

            const logo = new Image()
            logo.src = '/logo.png'
            await new Promise<void>((resolve, reject) => {
                logo.onload = () => resolve()
                logo.onerror = () => resolve() // don't block if logo fails
            })

            const W = 1080
            const H = 1920
            const canvas = document.createElement('canvas')
            canvas.width = W
            canvas.height = H
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas context failed')

            const accuracy = totalPredictions > 0
                ? Math.round((correctPredictions / totalPredictions) * 100)
                : null

            // ── Background ──────────────────────────────────────────
            const bg = ctx.createLinearGradient(0, 0, W * 0.3, H)
            bg.addColorStop(0, '#030026')
            bg.addColorStop(0.5, '#05003d')
            bg.addColorStop(1, '#040035')
            ctx.fillStyle = bg
            ctx.fillRect(0, 0, W, H)

            // Grid pattern
            ctx.strokeStyle = 'rgba(24, 0, 173, 0.12)'
            ctx.lineWidth = 1
            const gridSize = 80
            for (let x = 0; x < W; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
            }
            for (let y = 0; y < H; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
            }

            // Diagonal accent bleed (top-right)
            const diag = ctx.createLinearGradient(W * 0.4, 0, W, H * 0.35)
            diag.addColorStop(0, 'rgba(255, 60, 0, 0.0)')
            diag.addColorStop(0.5, 'rgba(255, 60, 0, 0.06)')
            diag.addColorStop(1, 'rgba(255, 60, 0, 0.0)')
            ctx.fillStyle = diag
            ctx.fillRect(0, 0, W, H)

            // ── Top accent bar ───────────────────────────────────────
            ctx.fillStyle = '#ff3c00'
            ctx.fillRect(0, 0, W, 10)

            // ── Logo section ─────────────────────────────────────────
            const PAD = 80

            // Logo image (top-right corner)
            const logoSize = 180
            const logoX = W - PAD - logoSize
            const logoY = 60
            if (logo.complete && logo.naturalWidth > 0) {
                // Circular clip for logo
                ctx.save()
                ctx.beginPath()
                ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
                ctx.clip()
                ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
                ctx.restore()

                // Logo ring
                ctx.strokeStyle = 'rgba(255, 60, 0, 0.6)'
                ctx.lineWidth = 3
                ctx.beginPath()
                ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 4, 0, Math.PI * 2)
                ctx.stroke()
            }

            // "SL" — large, white
            ctx.textAlign = 'left'
            ctx.font = '900 180px "Bebas Neue"'
            ctx.fillStyle = '#ffffff'
            ctx.fillText('SL', PAD, 260)

            // "PREDICTOR" — accent orange
            ctx.fillStyle = '#ff3c00'
            ctx.font = '900 120px "Bebas Neue"'
            ctx.fillText('PREDICTOR', PAD, 370)

            // Separator line under logo
            ctx.strokeStyle = 'rgba(255, 60, 0, 0.5)'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(PAD, 400)
            ctx.lineTo(W - PAD, 400)
            ctx.stroke()

            // Tagline
            ctx.font = '28px "Roboto Condensed"'
            ctx.fillStyle = 'rgba(213, 208, 240, 0.5)'
            ctx.textAlign = 'left'
            ctx.fillText('EUROPEAN STREETLIFTING LEAGUE · SEASON 2026', PAD, 450)

            // ── Avatar + Username ────────────────────────────────────
            const avatarY = 560
            const avatarR = 70
            const avatarX = PAD + avatarR

            // Avatar glow
            const glow = ctx.createRadialGradient(avatarX, avatarY, 0, avatarX, avatarY, avatarR + 20)
            glow.addColorStop(0, `rgba(${hexToRgb(avatarColor(username))}, 0.4)`)
            glow.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = glow
            ctx.fillRect(avatarX - avatarR - 20, avatarY - avatarR - 20, (avatarR + 20) * 2, (avatarR + 20) * 2)

            // Avatar circle
            ctx.beginPath()
            ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2)
            ctx.fillStyle = avatarColor(username)
            ctx.fill()

            // Avatar ring (accent)
            ctx.strokeStyle = '#ff3c00'
            ctx.lineWidth = 4
            ctx.beginPath()
            ctx.arc(avatarX, avatarY, avatarR + 6, 0, Math.PI * 2)
            ctx.stroke()

            // Avatar initials
            ctx.font = 'bold 64px "Bebas Neue"'
            ctx.fillStyle = '#ffffff'
            ctx.textAlign = 'center'
            ctx.fillText(username.charAt(0).toUpperCase(), avatarX, avatarY + 22)

            // Username
            ctx.font = 'bold 68px "Bebas Neue"'
            ctx.fillStyle = '#ffffff'
            ctx.textAlign = 'left'
            ctx.fillText(username.toUpperCase(), PAD + avatarR * 2 + 30, avatarY - 10)

            // Country
            if (country) {
                ctx.font = '30px "Roboto Condensed"'
                ctx.fillStyle = '#d5d0f0'
                ctx.fillText(country.toUpperCase(), PAD + avatarR * 2 + 34, avatarY + 40)
            }

            // ── Rank card ────────────────────────────────────────────
            const rankY = 720
            const rankH = 340

            drawRoundedRect(ctx, PAD, rankY, W - PAD * 2, rankH, 4)
            const rankBg = ctx.createLinearGradient(PAD, rankY, W - PAD, rankY + rankH)
            rankBg.addColorStop(0, 'rgba(24, 0, 173, 0.25)')
            rankBg.addColorStop(1, 'rgba(4, 0, 48, 0.4)')
            ctx.fillStyle = rankBg
            ctx.fill()
            ctx.strokeStyle = 'rgba(74, 44, 255, 0.4)'
            ctx.lineWidth = 2
            ctx.stroke()

            // Rank label
            ctx.font = '28px "Roboto Condensed"'
            ctx.fillStyle = 'rgba(213, 208, 240, 0.6)'
            ctx.textAlign = 'center'
            ctx.letterSpacing = '4px'
            ctx.fillText('YOUR GLOBAL RANK', W / 2, rankY + 70)

            // Rank number
            const rankText = rank ? `#${rank}` : '—'
            const rankColor = rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : rank === 3 ? '#f97316' : '#ffffff'
            ctx.font = '900 220px "Bebas Neue"'
            ctx.fillStyle = rankColor
            ctx.textAlign = 'center'
            ctx.fillText(rankText, W / 2, rankY + 280)

            // Top X% label
            if (rank && totalParticipants && totalParticipants > 1) {
                const pct = Math.round((rank / totalParticipants) * 100)
                ctx.font = '26px "Roboto Condensed"'
                ctx.fillStyle = 'rgba(213, 208, 240, 0.5)'
                ctx.fillText(`Top ${pct}% of ${totalParticipants} predictors`, W / 2, rankY + 330)
            }

            // ── Stats row ────────────────────────────────────────────
            const statsY = 1100
            const statsH = 200
            const statsGap = 20
            const statsW = (W - PAD * 2 - statsGap * 2) / 3

            const statItems = [
                { label: 'POINTS', value: points.toLocaleString(), color: '#fbbf24' },
                { label: 'ACCURACY', value: accuracy !== null ? `${accuracy}%` : '—', color: '#d5d0f0' },
                { label: 'PICKS', value: totalPredictions.toString(), color: '#d5d0f0' },
            ]

            statItems.forEach((stat, i) => {
                const sx = PAD + i * (statsW + statsGap)

                drawRoundedRect(ctx, sx, statsY, statsW, statsH, 4)
                ctx.fillStyle = 'rgba(24, 0, 173, 0.15)'
                ctx.fill()
                ctx.strokeStyle = 'rgba(74, 44, 255, 0.25)'
                ctx.lineWidth = 1.5
                ctx.stroke()

                ctx.font = '22px "Roboto Condensed"'
                ctx.fillStyle = 'rgba(176, 170, 216, 0.7)'
                ctx.textAlign = 'center'
                ctx.fillText(stat.label, sx + statsW / 2, statsY + 52)

                ctx.font = `bold 72px "Bebas Neue"`
                ctx.fillStyle = stat.color
                ctx.fillText(stat.value, sx + statsW / 2, statsY + 160)
            })

            // ── Prediction breakdown bar ─────────────────────────────
            if (totalPredictions > 0) {
                const barY = 1350
                const barLabelY = barY - 20

                ctx.font = '26px "Roboto Condensed"'
                ctx.fillStyle = 'rgba(213, 208, 240, 0.5)'
                ctx.textAlign = 'left'
                ctx.fillText('PREDICTION BREAKDOWN', PAD, barLabelY)

                const barH = 16
                const barW = W - PAD * 2
                const exactPct = correctPredictions / totalPredictions
                // We don't have partial separately, so show correct vs total
                const missedPct = 1 - exactPct

                // Background track
                drawRoundedRect(ctx, PAD, barY, barW, barH, barH / 2)
                ctx.fillStyle = 'rgba(24, 0, 173, 0.2)'
                ctx.fill()

                // Correct (green)
                if (exactPct > 0) {
                    drawRoundedRect(ctx, PAD, barY, barW * exactPct, barH, barH / 2)
                    ctx.fillStyle = '#4ade80'
                    ctx.fill()
                }

                // Legend
                const legendY = barY + 55
                ctx.font = '26px "Roboto Condensed"'
                ctx.textAlign = 'left'

                ctx.fillStyle = '#4ade80'
                ctx.fillRect(PAD, legendY - 16, 20, 20)
                ctx.fillStyle = '#d5d0f0'
                ctx.fillText(`${correctPredictions} correct`, PAD + 30, legendY)

                ctx.fillStyle = 'rgba(24, 0, 173, 0.4)'
                ctx.fillRect(PAD + 260, legendY - 16, 20, 20)
                ctx.fillStyle = 'rgba(176, 170, 216, 0.5)'
                ctx.fillText(`${totalPredictions - correctPredictions} missed`, PAD + 290, legendY)
            }

            // ── Divider ──────────────────────────────────────────────
            const divY = 1560
            ctx.strokeStyle = 'rgba(255, 60, 0, 0.3)'
            ctx.lineWidth = 1
            ctx.setLineDash([8, 6])
            ctx.beginPath()
            ctx.moveTo(PAD, divY)
            ctx.lineTo(W - PAD, divY)
            ctx.stroke()
            ctx.setLineDash([])

            // ── CTA Footer ───────────────────────────────────────────
            ctx.textAlign = 'center'

            ctx.font = 'italic bold 48px "Bebas Neue"'
            ctx.fillStyle = '#ffffff'
            ctx.fillText('Can you beat me?', W / 2, 1660)

            ctx.font = '30px "Roboto Condensed"'
            ctx.fillStyle = 'rgba(213, 208, 240, 0.6)'
            ctx.fillText('Make your predictions at', W / 2, 1730)

            ctx.font = 'bold 44px "Bebas Neue"'
            ctx.fillStyle = '#ff3c00'
            ctx.fillText('streetliftingmax.com', W / 2, 1800)

            // ── Bottom accent bar ────────────────────────────────────
            ctx.fillStyle = '#ff3c00'
            ctx.fillRect(0, H - 10, W, 10)

            // Convert canvas to blob and share
            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error('Blob generation failed')

                if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'x.png', { type: 'image/png' })] })) {
                    try {
                        const file = new File([blob], `sl-ranking-${username}.png`, { type: 'image/png' })
                        await navigator.share({
                            files: [file],
                            title: `${username} — SL Predictor`,
                            text: `I'm ranked #${rank ?? '?'} with ${points} pts on SL Predictor! Can you beat me? 🏆`,
                        })
                        toast('Shared!')
                    } catch (err: any) {
                        if (err.name !== 'AbortError') toast('Share cancelled.', 'info')
                    }
                } else {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `sl-ranking-${username}.png`
                    a.click()
                    URL.revokeObjectURL(url)
                    toast('Image downloaded — share it on your socials!')
                }
            }, 'image/png')

        } catch (err: any) {
            console.error('Share error:', err)
            toast('Failed to generate image', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button onClick={generateAndShare} loading={loading} size="md" variant="ghost">
            Share my ranking ↗
        </Button>
    )
}
