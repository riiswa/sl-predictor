import type { Metadata, Viewport } from 'next'
import { Roboto, Roboto_Condensed } from 'next/font/google'
import './globals.css'

const roboto = Roboto({
    subsets: ['latin'],
    weight: ['300', '400', '500', '700'],
    variable: '--font-roboto',
})

const robotoCondensed = Roboto_Condensed({
    subsets: ['latin'],
    weight: ['300', '400', '700'],
    variable: '--font-roboto-condensed',
})

export const metadata: Metadata = {
    title: 'SL Predictor — European Streetlifting League 2026',
    description: "La plateforme de pronostics de la communauté Streetlifting européenne.",
    keywords: ['streetlifting', 'predictions', 'european league', 'calisthenics', 'strength sport'],
    authors: [{ name: 'SL Predictor' }],
    openGraph: {
        title: 'SL Predictor — European Streetlifting League 2026',
        description: "La plateforme de pronostics de la communauté Streetlifting européenne.",
        url: 'https://streetliftingmax.com',
        siteName: 'SL Predictor',
        locale: 'fr_FR',
        type: 'website',
        images: [{
            url: 'https://streetliftingmax.com/og-image.png',
            width: 1200,
            height: 630,
            alt: 'SL Predictor',
        }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'SL Predictor — European Streetlifting League 2026',
        description: "La plateforme de pronostics de la communauté Streetlifting européenne.",
        images: ['https://streetliftingmax.com/og-image.png'],
    },
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr" className={`${roboto.variable} ${robotoCondensed.variable}`}>
        <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
                href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
                rel="stylesheet"
            />
        </head>
        <body className="bg-dark text-white antialiased">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:block focus:fixed focus:top-0 focus:left-0 focus:z-[9999] focus:bg-accent focus:text-dark focus:px-4 focus:py-2 focus:font-bold">
                Skip to main content
            </a>
            {children}
        </body>
        </html>
    )
}