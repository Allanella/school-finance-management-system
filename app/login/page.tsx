import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'
import { createClient } from '@/lib/supabase/server'

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  const params = await searchParams
  return <AuthForm initialError={params.error} />
}
