'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formText, isUuid } from '@/lib/school/form-data'

export async function switchSchool(formData: FormData) {
  const schoolId = formText(formData, 'school_id')
  if (!isUuid(schoolId)) redirect('/dashboard')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('school_memberships')
    .select('school_id')
    .eq('user_id', user.id)
    .eq('school_id', schoolId)
    .maybeSingle()
  if (!membership) redirect('/dashboard')

  const cookieStore = await cookies()
  cookieStore.set('active_school_id', schoolId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
