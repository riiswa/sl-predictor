import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import CompForm from '@/components/admin/CompForm'

export default function NewCompetitionPage() {
    return (
        <div>
            <PageHeader
                tag="Admin — New"
                title="NEW COMPETITION"
                subtitle="Fill in the details — you can edit everything later"
            >
                <Link href="/admin">
                    <Button variant="ghost" size="md">← Back</Button>
                </Link>
            </PageHeader>

            <div className="max-w-3xl mx-auto px-6 py-10">
                <CompForm />
            </div>
        </div>
    )
}