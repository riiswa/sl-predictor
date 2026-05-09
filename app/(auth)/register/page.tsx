import { Suspense } from 'react'
import Link from 'next/link'
import AuthCard from '@/components/ui/AuthCard'
import RegisterForm from './RegisterForm'

function RegisterFallback() {
    return (
        <div className="flex flex-col gap-5">
            <div className="h-16 bg-dark/40 rounded animate-pulse" />
            <div className="h-16 bg-dark/40 rounded animate-pulse" />
            <div className="h-16 bg-dark/40 rounded animate-pulse" />
            <div className="h-16 bg-dark/40 rounded animate-pulse" />
            <div className="h-16 bg-dark/40 rounded animate-pulse" />
            <div className="h-12 bg-accent/20 rounded animate-pulse" />
        </div>
    )
}

export default function RegisterPage() {
    return (
        <AuthCard
            tag="Registration"
            title={`Join the\nLeague`}
            footer={
                <div className="text-center">
                    <p className="text-sm text-gray-muted">
                        Already have an account?{' '}
                        <Link href="/login" className="text-white hover:text-accent transition-colors">
                            Sign in
                        </Link>
                    </p>
                    <p className="text-xs text-gray-muted/30 mt-3 font-condensed tracking-wide">
                        By registering, your predictions will be public in the leaderboard.
                    </p>
                </div>
            }
        >
            <Suspense fallback={<RegisterFallback />}>
                <RegisterForm />
            </Suspense>
        </AuthCard>
    )
}