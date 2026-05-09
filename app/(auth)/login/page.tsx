import { Suspense } from 'react'
import Link from 'next/link'
import AuthCard from '@/components/ui/AuthCard'
import LoginForm from './LoginForm'

function LoginFallback() {
    return (
        <div className="flex flex-col gap-5">
            <div className="h-16 bg-dark/40 rounded animate-pulse" />
            <div className="h-16 bg-dark/40 rounded animate-pulse" />
            <div className="h-12 bg-accent/20 rounded animate-pulse" />
        </div>
    )
}

export default function LoginPage() {
    return (
        <AuthCard
            tag="Sign in"
            title="Welcome back"
            footer={
                <p className="text-center text-sm text-gray-muted">
                    No account yet?{' '}
                    <Link href="/register" className="text-white hover:text-accent transition-colors">
                        Register
                    </Link>
                </p>
            }
        >
            <Suspense fallback={<LoginFallback />}>
                <LoginForm />
            </Suspense>
        </AuthCard>
    )
}