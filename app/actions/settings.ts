'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSchoolContext } from '@/lib/school/context'
import { getDefaultEducationLevels } from '@/lib/school/default-levels'
import { formText, isIsoDate, isUuid } from '@/lib/school/form-data'
import { schoolTypes, type SchoolType } from '@/lib/school/types'

function settingsRedirect(status: string): never {
  redirect(`/settings?status=${status}`)
}

function canManage(role: string) {
  return ['owner', 'admin'].includes(role)
}

export async function updateSchoolSettings(formData: FormData) {
  const { supabase, school, role } = await getSchoolContext()
  if (!canManage(role)) settingsRedirect('failed')

  const name = formText(formData, 'name')
  const schoolType = formText(formData, 'school_type') as SchoolType

  if (name.length < 2 || name.length > 160 || !schoolTypes.includes(schoolType)) {
    settingsRedirect('invalid')
  }

  const { error: updateError } = await supabase
    .from('schools')
    .update({ name, school_type: schoolType })
    .eq('id', school.id)

  if (updateError) settingsRedirect('failed')

  const defaults = getDefaultEducationLevels(schoolType)
  if (defaults.length) {
    const { error: levelsError } = await supabase.from('education_levels').upsert(
      defaults.map((level) => ({ school_id: school.id, ...level })),
      { onConflict: 'school_id,name', ignoreDuplicates: true },
    )
    if (levelsError) settingsRedirect('failed')
  }

  revalidatePath('/settings')
  revalidatePath('/classes')
  revalidatePath('/dashboard')
  settingsRedirect('saved')
}

export async function createAcademicYear(formData: FormData) {
  const { supabase, school, role } = await getSchoolContext()
  if (!canManage(role)) settingsRedirect('failed')

  const name = formText(formData, 'name')
  const startsOn = formText(formData, 'starts_on')
  const endsOn = formText(formData, 'ends_on')
  if (
    name.length < 1 || name.length > 64 || !isIsoDate(startsOn) || !isIsoDate(endsOn) ||
    endsOn < startsOn
  ) {
    settingsRedirect('invalid')
  }

  const { error } = await supabase.from('academic_years').insert({
    school_id: school.id,
    name,
    starts_on: startsOn,
    ends_on: endsOn,
  })
  if (error) settingsRedirect(error.code === '23505' ? 'duplicate' : 'failed')

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  settingsRedirect('year_added')
}

export async function createSchoolTerm(formData: FormData) {
  const { supabase, school, role } = await getSchoolContext()
  if (!canManage(role)) settingsRedirect('failed')

  const academicYearId = formText(formData, 'academic_year_id')
  const name = formText(formData, 'name')
  const startsOn = formText(formData, 'starts_on')
  const endsOn = formText(formData, 'ends_on')
  if (
    !isUuid(academicYearId) || name.length < 1 || name.length > 64 ||
    !isIsoDate(startsOn) || !isIsoDate(endsOn) || endsOn < startsOn
  ) {
    settingsRedirect('invalid')
  }

  const { data: academicYear } = await supabase
    .from('academic_years')
    .select('id, starts_on, ends_on')
    .eq('school_id', school.id)
    .eq('id', academicYearId)
    .maybeSingle()

  if (!academicYear || startsOn < academicYear.starts_on || endsOn > academicYear.ends_on) {
    settingsRedirect('invalid')
  }

  const { error } = await supabase.from('school_terms').insert({
    school_id: school.id,
    academic_year_id: academicYear.id,
    name,
    starts_on: startsOn,
    ends_on: endsOn,
  })
  if (error) settingsRedirect(error.code === '23505' ? 'duplicate' : 'failed')

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  settingsRedirect('term_added')
}
