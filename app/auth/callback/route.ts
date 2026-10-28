import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getSafeNextPath(value: string | null, origin: string) {
  if (!value) return '/dashboard'

  try {
    const destination = new URL(value, origin)
    return destination.origin === origin
      ? `${destination.pathname}${destination.search}${destination.hash}`
      : '/dashboard'
  } catch {
    return '/dashboard'
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextPath = getSafeNextPath(requestUrl.searchParams.get('next'), requestUrl.origin)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(nextPath, requestUrl.origin))
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback', requestUrl.origin))
}
