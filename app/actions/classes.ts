'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSchoolContext } from '@/lib/school/context'
import { formText, isUuid } from '@/lib/school/form-data'
import { educationStages } from '@/lib/school/types'

function classesRedirect(status: string): never {
  redirect(`/classes?status=${status}`)
}

export async function addEducationLevel(formData: FormData) {
  const { supabase, school, role } = await getSchoolContext()
  if (!['owner', 'admin'].includes(role)) classesRedirect('failed')

  const name = formText(formData, 'name')
  const stage = formText(formData, 'stage') || 'custom'
  const sequenceIndex = Number(formText(formData, 'sequence_index') || 0)

  if (
    name.length < 1 || name.length > 64 ||
    !educationStages.includes(stage as (typeof educationStages)[number]) ||
    !Number.isInteger(sequenceIndex) || sequenceIndex < 0 || sequenceIndex > 999
  ) {
    classesRedirect('invalid')
  }

  const { error } = await supabase.from('education_levels').insert({
    school_id: school.id,
    name,
    stage,
    sequence_index: sequenceIndex,
  })

  if (error) classesRedirect(error.code === '23505' ? 'duplicate' : 'failed')
  revalidatePath('/classes')
  revalidatePath('/settings')
  classesRedirect('level_added')
}

export async function addClass(formData: FormData) {
  const { supabase, school, role } = await getSchoolContext()
  if (!['owner', 'admin'].includes(role)) classesRedirect('failed')

  const educationLevelId = formText(formData, 'education_level_id')
  const streamName = formText(formData, 'stream_name') || 'A'

  if (!isUuid(educationLevelId) || streamName.length < 1 || streamName.length > 32) {
    classesRedirect('invalid')
  }

  const { error } = await supabase.from('classes').insert({
    school_id: school.id,
    education_level_id: educationLevelId,
    stream_name: streamName,
  })

  if (error) classesRedirect(error.code === '23505' ? 'duplicate' : 'failed')
  revalidatePath('/classes')
  revalidatePath('/students')
  revalidatePath('/dashboard')
  classesRedirect('class_added')
}
