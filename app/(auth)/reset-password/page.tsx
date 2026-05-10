import AuthCard from '@/components/ui/AuthCard'
import ResetPasswordForm from './ResetPasswordForm'

export default function ResetPasswordPage() {
    return (
        <AuthCard
            tag="Account recovery"
            title="New password"
        >
            <ResetPasswordForm />
        </AuthCard>
    )
}
