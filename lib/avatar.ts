const PALETTE = ['#3b82f6','#8b5cf6','#ec4899','#10b981','#f59e0b','#0ea5e9','#a855f7','#14b8a6']

export function avatarColor(username: string): string {
    let h = 0
    for (let i = 0; i < username.length; i++) h = username.charCodeAt(i) + ((h << 5) - h)
    return PALETTE[Math.abs(h) % PALETTE.length]
}
