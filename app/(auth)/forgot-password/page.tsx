import Link from 'next/link'
import AuthCard from '@/components/ui/AuthCard'
import ForgotPasswordForm from './ForgotPasswordForm'

export default function ForgotPasswordPage() {
    return (
        <AuthCard
            tag="Account recovery"
            title="Forgot password"
            footer={
                <p className="text-center text-sm text-gray-muted">
                    Remember it?{' '}
                    <Link href="/login" className="text-white hover:text-accent transition-colors">
                        Sign in
                    </Link>
                </p>
            }
        >
            <ForgotPasswordForm />
        </AuthCard>
    )
}
