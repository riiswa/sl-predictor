'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteCategoryButton({ catId }: { catId: string }) {
    const router   = useRouter()
    const supabase = createClient()

    async function handleDelete() {
        const ok = confirm('Delete this category? Athletes in it will also be deleted.')
        if (!ok) return

        await supabase.from('categories').delete().eq('id', catId)
        router.refresh()
    }

    return (
        <button
            onClick={handleDelete}
            className="font-condensed text-xs tracking-[1px] uppercase text-accent/50 hover:text-accent transition-colors px-2 py-1 border border-transparent hover:border-accent/30"
        >
            Remove
        </button>
    )
}