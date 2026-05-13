'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { toast } from '@/lib/toast'

interface ShareRankingButtonProps {
    username: string
    rank: number | null
    points: number
    accuracy: number | null
    country: string | null
}

export default function ShareRankingButton({ username, rank, points, accuracy, country }: ShareRankingButtonProps) {
    const [loading, setLoading] = useState(false)

    async function generateAndShare() {
        setLoading(true)
        try {
            const canvas = document.createElement('canvas')
            canvas.width = 1080
            canvas.height = 1920

            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas context failed')

            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, 1920)
            gradient.addColorStop(0, '#040030')
            gradient.addColorStop(1, '#05003d')
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, 1080, 1920)

            // Decorative accent bar
            ctx.fillStyle = '#ff3c00'
            ctx.fillRect(0, 0, 1080, 8)

            // Header
            ctx.font = 'bold 72px "Bebas Neue", sans-serif'
            ctx.fillStyle = '#ffffff'
            ctx.textAlign = 'center'
            ctx.fillText('SL PREDICTOR', 540, 200)

            ctx.font = '28px Roboto'
            ctx.fillStyle = '#d5d0f0'
            ctx.fillText('Season 2026 Ranking', 540, 260)

            // Username
            ctx.font = 'bold 56px Roboto'
            ctx.fillStyle = '#ffffff'
            ctx.fillText(username, 540, 400)

            // Country
            if (country) {
                ctx.font = '24px Roboto'
                ctx.fillStyle = '#b0aad8'
                ctx.fillText(country, 540, 460)
            }

            // Stats boxes
            const boxY = 600
            const boxHeight = 280
            const boxSpacing = 20

            const stats = [
                { label: 'RANK', value: rank ? `#${rank}` : '—', color: '#ffffff' },
                { label: 'POINTS', value: points.toLocaleString(), color: '#fbbf24' },
                { label: 'ACCURACY', value: accuracy !== null ? `${accuracy}%` : '—', color: '#4a2cff' },
            ]

            const boxWidth = (1080 - 2 * 60 - 2 * boxSpacing) / 3

            stats.forEach((stat, i) => {
                const boxX = 60 + i * (boxWidth + boxSpacing)

                // Box background
                ctx.fillStyle = 'rgba(24, 0, 173, 0.15)'
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight)

                // Box border
                ctx.strokeStyle = 'rgba(24, 0, 173, 0.3)'
                ctx.lineWidth = 2
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)

                // Stat label
                ctx.font = '20px "Roboto Condensed"'
                ctx.fillStyle = '#8880cc'
                ctx.textAlign = 'center'
                ctx.fillText(stat.label, boxX + boxWidth / 2, boxY + 60)

                // Stat value
                ctx.font = 'bold 52px "Bebas Neue"'
                ctx.fillStyle = stat.color
                ctx.fillText(stat.value, boxX + boxWidth / 2, boxY + 180)
            })

            // Footer
            ctx.font = '24px Roboto'
            ctx.fillStyle = '#d5d0f0'
            ctx.textAlign = 'center'
            ctx.fillText('Make your predictions on SL Predictor', 540, 1800)

            ctx.font = 'italic 20px Roboto'
            ctx.fillStyle = '#8880cc'
            ctx.fillText('sl-predictor.com', 540, 1870)

            // Convert canvas to blob
            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error('Canvas to blob conversion failed')

                // Check if Web Share API is available
                if (navigator.share) {
                    try {
                        const file = new File([blob], 'sl-ranking.png', { type: 'image/png' })
                        await navigator.share({
                            files: [file],
                            title: `SL Predictor - ${username}`,
                            text: `Check out my ranking: #${rank} with ${points} points! 🏆`,
                        })
                        toast('Shared successfully!')
                    } catch (err: any) {
                        if (err.name !== 'AbortError') {
                            toast('Share cancelled', 'info')
                        }
                    }
                } else {
                    // Fallback: download or copy
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `sl-ranking-${username}.png`
                    a.click()
                    URL.revokeObjectURL(url)
                    toast('Image downloaded! Share it on your socials 📸')
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
        <Button
            onClick={generateAndShare}
            loading={loading}
            size="md"
            className="w-full sm:w-auto"
        >
            📸 Share Ranking
        </Button>
    )
}
