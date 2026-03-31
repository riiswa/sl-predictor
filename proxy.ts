import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/pari', '/profil', '/ranking']
const ADMIN_ROUTES     = ['/admin']
const AUTH_ROUTES      = ['/login', '/register']

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const path = request.nextUrl.pathname

    // Redirige les non-connectés vers /login
    const needsAuth = PROTECTED_ROUTES.some(r => path.startsWith(r)) ||
        ADMIN_ROUTES.some(r => path.startsWith(r))
    if (needsAuth && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirect', path)
        return NextResponse.redirect(url)
    }

    // Redirige les connectés hors des pages auth
    if (AUTH_ROUTES.some(r => path.startsWith(r)) && user) {
        const url = request.nextUrl.clone()
        url.pathname = '/ranking'
        return NextResponse.redirect(url)
    }

    // Vérifie le rôle admin
    if (ADMIN_ROUTES.some(r => path.startsWith(r)) && user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = '/ranking'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}