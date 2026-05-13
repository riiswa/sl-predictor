'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteCategoryButton({ catId }: { catId: string }) {
    const router   = useRouter()
    const supabase = createClient()
    const [confirming, setConfirming] = useState(false)

    async function handleDelete() {
        await supabase.from('categories').delete().eq('id', catId)
        router.refresh()
    }

    if (confirming) {
        return (
            <div className="flex items-center gap-1">
                <button
                    onClick={handleDelete}
                    className="font-condensed text-xs tracking-[2px] uppercase text-accent hover:text-white transition-colors px-2 py-1 border border-accent/30 hover:bg-accent"
                >
                    Confirm
                </button>
                <button
                    onClick={() => setConfirming(false)}
                    className="font-condensed text-xs tracking-[2px] uppercase text-gray-muted hover:text-white transition-colors px-2 py-1"
                >
                    ✕
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={() => setConfirming(true)}
            className="font-condensed text-xs tracking-[2px] uppercase text-accent/60 hover:text-accent transition-colors px-2 py-1 border border-transparent hover:border-accent/30"
        >
            Remove
        </button>
    )
}
