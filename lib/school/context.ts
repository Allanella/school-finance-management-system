import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database.types'
import { createClient } from '@/lib/supabase/server'

export type SchoolOption = { id: string; name: string; role: string }
export type ActiveTerm = {
  id: string
  name: string
  starts_on: string
  ends_on: string
  academicYearId: string
  academicYearName: string | null
  label: string
}

export type SchoolContext = {
  supabase: SupabaseClient<Database>
  user: User
  school: Tables<'schools'>
  role: string
  schools: SchoolOption[]
  activeTerm: ActiveTerm | null
}

export const getSchoolContext = cache(async (): Promise<SchoolContext> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: memberships, error: membershipError } = await supabase
    .from('school_memberships')
    .select('school_id, role, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (membershipError || !memberships?.length) redirect('/login?error=workspace')

  const cookieStore = await cookies()
  const requestedSchoolId = cookieStore.get('active_school_id')?.value
  const activeMembership = memberships.find((membership) => membership.school_id === requestedSchoolId) ?? memberships[0]
  const schoolIds = memberships.map((membership) => membership.school_id)

  const [{ data: school, error: schoolError }, schoolsResult] = await Promise.all([
    supabase
      .from('schools')
      .select('id, name, school_type, country_code, currency_code, created_by, created_at')
      .eq('id', activeMembership.school_id)
      .single(),
    supabase.from('schools').select('id, name').in('id', schoolIds),
  ])

  if (schoolError || !school) redirect('/login?error=workspace')

  const schoolNames = new Map((schoolsResult.data ?? []).map((item) => [item.id, item.name]))
  const schools = memberships
    .map((membership) => ({
      id: membership.school_id,
      name: schoolNames.get(membership.school_id) ?? 'School workspace',
      role: membership.role,
    }))
    .filter((option, index, all) => all.findIndex((item) => item.id === option.id) === index)

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const { data: term } = await supabase
    .from('school_terms')
    .select('id, name, starts_on, ends_on, academic_year_id')
    .eq('school_id', school.id)
    .lte('starts_on', today)
    .gte('ends_on', today)
    .order('starts_on', { ascending: false })
    .limit(1)
    .maybeSingle()

  let activeTerm: ActiveTerm | null = null
  if (term) {
    const { data: academicYear } = await supabase
      .from('academic_years')
      .select('name')
      .eq('id', term.academic_year_id)
      .eq('school_id', school.id)
      .maybeSingle()
    activeTerm = {
      id: term.id,
      name: term.name,
      starts_on: term.starts_on,
      ends_on: term.ends_on,
      academicYearId: term.academic_year_id,
      academicYearName: academicYear?.name ?? null,
      label: academicYear?.name ? `${term.name} · ${academicYear.name}` : term.name,
    }
  }

  return { supabase, user, school, role: activeMembership.role, schools, activeTerm }
})
