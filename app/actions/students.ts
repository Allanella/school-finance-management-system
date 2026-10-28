'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSchoolContext } from '@/lib/school/context'
import { formText, isUuid } from '@/lib/school/form-data'

function studentsRedirect(status: string): never {
  redirect(`/students?status=${status}`)
}

export async function addStudent(formData: FormData) {
  const { supabase, school } = await getSchoolContext()
  const admissionNumber = formText(formData, 'admission_number')
  const firstName = formText(formData, 'first_name')
  const lastName = formText(formData, 'last_name')
  const classId = formText(formData, 'class_id')
  const studentType = formText(formData, 'student_type') || 'day'
  const guardianName = formText(formData, 'guardian_name')
  const guardianPhone = formText(formData, 'guardian_phone')

  if (
    admissionNumber.length < 1 || admissionNumber.length > 64 ||
    firstName.length < 1 || firstName.length > 80 ||
    lastName.length < 1 || lastName.length > 80 ||
    (classId && !isUuid(classId)) ||
    !['day', 'boarding', 'other'].includes(studentType) ||
    guardianName.length > 120 || guardianPhone.length > 32
  ) {
    studentsRedirect('invalid')
  }

  const { error } = await supabase.from('students').insert({
    school_id: school.id,
    class_id: classId || null,
    admission_number: admissionNumber,
    first_name: firstName,
    last_name: lastName,
    student_type: studentType,
    guardian_name: guardianName || null,
    guardian_phone: guardianPhone || null,
  })

  if (error) studentsRedirect(error.code === '23505' ? 'duplicate' : 'failed')

  revalidatePath('/students')
  revalidatePath('/dashboard')
  studentsRedirect('student_added')
}
