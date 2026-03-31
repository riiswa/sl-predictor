import type { Metadata } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'

const barlow = Barlow({
    subsets: ['latin'],
    weight: ['300', '400', '500'],
    variable: '--font-barlow',
})

const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['300', '400', '600', '700'],
    variable: '--font-barlow-condensed',
})

export const metadata: Metadata = {
    title: 'SL Predictor — European Streetlifting League 2026',
    description: "La plateforme de pronostics de la communauté Streetlifting européenne.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr" className={`${barlow.variable} ${barlowCondensed.variable}`}>
        <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
                href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
                rel="stylesheet"
            />
        </head>
        <body className="bg-dark text-white antialiased">
        {children}
        </body>
        </html>
    )
}