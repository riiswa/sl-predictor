import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_CATEGORIES = [
    { gender: 'women', weight_class: '-52kg',  name: 'Women -52kg',  display_order: 1  },
    { gender: 'women', weight_class: '-57kg',  name: 'Women -57kg',  display_order: 2  },
    { gender: 'women', weight_class: '-63kg',  name: 'Women -63kg',  display_order: 3  },
    { gender: 'women', weight_class: '-70kg',  name: 'Women -70kg',  display_order: 4  },
    { gender: 'women', weight_class: '+70kg',  name: 'Women +70kg',  display_order: 5  },
    { gender: 'men',   weight_class: '-66kg',  name: 'Men -66kg',    display_order: 6  },
    { gender: 'men',   weight_class: '-73kg',  name: 'Men -73kg',    display_order: 7  },
    { gender: 'men',   weight_class: '-80kg',  name: 'Men -80kg',    display_order: 8  },
    { gender: 'men',   weight_class: '-87kg',  name: 'Men -87kg',    display_order: 9  },
    { gender: 'men',   weight_class: '-94kg',  name: 'Men -94kg',    display_order: 10 },
    { gender: 'men',   weight_class: '-101kg', name: 'Men -101kg',   display_order: 11 },
    { gender: 'men',   weight_class: '+101kg', name: 'Men +101kg',   display_order: 12 },
]

export async function POST(req: NextRequest) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get competition_id from form data
    const formData = await req.formData()
    const competitionId = formData.get('competition_id') as string

    if (!competitionId) {
        return NextResponse.json({ error: 'Missing competition_id' }, { status: 400 })
    }

    const { error } = await supabase.from('categories').insert(
        DEFAULT_CATEGORIES.map(cat => ({ ...cat, competition_id: competitionId }))
    )

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.redirect(new URL(`/admin/${competitionId}`, req.url))
}