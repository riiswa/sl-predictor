import Link from 'next/link'

interface AuthCardProps {
    tag: string
    title: string
    children: React.ReactNode
    footer?: React.ReactNode
}

export default function AuthCard({ tag, title, children, footer }: AuthCardProps) {
    return (
        <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-12 relative">

            {/* Animated grid */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(24,0,173,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(24,0,173,0.12) 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                    animation: 'gridShift 20s linear infinite',
                }}
            />

            {/* Glow top right */}
            <div
                className="fixed pointer-events-none"
                style={{
                    width: '600px', height: '600px',
                    background: 'radial-gradient(circle, rgba(24,0,173,0.4) 0%, transparent 70%)',
                    top: '-200px', right: '-100px',
                    borderRadius: '50%',
                    animation: 'pulse-glow 6s ease-in-out infinite alternate',
                }}
            />

            <div className="relative z-10 w-full max-w-md animate-fade-up">

                {/* Logo */}
                <Link href="/" className="block text-center mb-10">
                    <div className="flex items-center justify-center gap-3">
                        <img src="/logo.png" alt="SL" className="h-10 w-10" />
                        <span className="font-bebas text-2xl tracking-[6px] uppercase text-white">PREDICTOR</span>
                    </div>
                    <p className="text-gray-muted text-xs tracking-[3px] uppercase mt-1 font-condensed">
                        Season 2026
                    </p>
                </Link>

                {/* Card */}
                <div className="border border-blue/30 bg-blue/8 p-8 backdrop-blur-sm">
                    <p className="section-tag mb-3">{tag}</p>
                    <h1 className="font-bebas text-5xl tracking-wide uppercase leading-none mb-8">
                        {title}
                    </h1>
                    {children}
                </div>

                {footer && (
                    <div className="mt-4">{footer}</div>
                )}
            </div>
        </div>
    )
}