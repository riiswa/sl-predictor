export function avatarColor(username: string): string {
    // Generate hash from username
    let hash = 0
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash)
    }

    // Convert hash to hue (0-360°) for continuous color spectrum
    const hue = Math.abs(hash) % 360

    // Use consistent saturation and lightness for readability on dark background
    // High saturation (70%) for vibrant colors, medium lightness (50%) for contrast
    return `hsl(${hue}, 70%, 50%)`
}
