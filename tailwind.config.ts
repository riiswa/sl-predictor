import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                dark:         '#05003d',
                darker:       '#040030',
                blue:         '#1800ad',
                'blue-light': '#2a10d4',
                'blue-dark':  '#10008a',
                accent:       '#ff3c00',
                'off-white':  '#f0eeff',
                'gray-muted': '#b0aad8',
            },
            fontFamily: {
                sans:      ['var(--font-roboto)', 'sans-serif'],
                condensed: ['var(--font-roboto-condensed)', 'sans-serif'],
                bebas:     ['"Bebas Neue"', 'sans-serif'],
            },
            backgroundImage: {
                'grid-blue': `
          linear-gradient(rgba(24,0,173,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(24,0,173,0.1) 1px, transparent 1px)
        `,
            },
            backgroundSize: {
                'grid': '48px 48px',
            },
        },
    },
    plugins: [],
}

export default config