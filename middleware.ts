import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_HOME = {
  gp: '/gp',
  lp: '/lp',
  submit: '/',
} as const

type Role = keyof typeof ROLE_HOME

// Which role owns which path. Everything else under a role's prefix belongs to it.
function roleForPath(pathname: string): Role {
  if (pathname === '/gp' || pathname.startsWith('/gp/')) return 'gp'
  if (pathname === '/lp' || pathname.startsWith('/lp/')) return 'lp'
  return 'submit'
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser revalidates the token with Supabase rather than trusting the cookie.
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/login'

  if (!user) {
    if (isLoginPage) return response
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    if (pathname !== '/') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Role comes from the profiles table, not from user_metadata, which the user
  // could edit themselves. One query per navigation is acceptable at pilot size.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as Role | undefined

  // Authenticated but no role assigned: nothing is safe to show them.
  if (!role || !(role in ROLE_HOME)) {
    if (isLoginPage) return response
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  const home = ROLE_HOME[role]

  // A signed-in user never sees the login page.
  if (isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = home
    url.search = ''
    return NextResponse.redirect(url)
  }

  // The user never chooses a view: anything outside their role sends them home.
  if (roleForPath(pathname) !== role) {
    const url = request.nextUrl.clone()
    url.pathname = home
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Everything except Next internals, the API, and static/PWA assets.
    '/((?!_next/static|_next/image|api/|favicon.ico|manifest.*\\.json|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf)$).*)',
  ],
}
