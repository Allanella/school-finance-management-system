'use server'

import { createHash, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSchoolContext } from '@/lib/school/context'
import { formText, isIsoDate, isUuid, positiveWholeAmount } from '@/lib/school/form-data'

function financeRedirect(path: string, status: string): never {
  redirect(`${path}?status=${status}`)
}

const financeRoles = ['owner', 'admin', 'bursar', 'accountant']

export async function createInvoice(formData: FormData) {
  const { supabase, school, user, role, activeTerm } = await getSchoolContext()
  if (!['owner', 'admin', 'bursar'].includes(role)) financeRedirect('/fees', 'failed')

  const studentId = formText(formData, 'student_id')
  const description = formText(formData, 'description')
  const amount = positiveWholeAmount(formText(formData, 'amount_ugx'))
  const dueOn = formText(formData, 'due_on')
  const invoiceNumber = formText(formData, 'invoice_number')

  if (
    !isUuid(studentId) || !amount || description.length < 1 || description.length > 240 ||
    (dueOn && !isIsoDate(dueOn)) || !/^INV-[A-Z0-9-]{6,64}$/i.test(invoiceNumber)
  ) {
    financeRedirect('/fees', 'invalid')
  }

  const { error } = await supabase.from('fee_invoices').insert({
    school_id: school.id,
    student_id: studentId,
    invoice_number: invoiceNumber,
    description,
    amount_due_ugx: amount,
    academic_year_id: activeTerm?.academicYearId ?? null,
    term_id: activeTerm?.id ?? null,
    fee_structure_id: null,
    line_items: [],
    due_on: dueOn || null,
    status: 'issued',
    created_by: user.id,
  })

  if (error) financeRedirect('/fees', error.code === '23505' ? 'duplicate' : 'failed')
  revalidatePath('/fees')
  revalidatePath('/dashboard')
  financeRedirect('/fees', 'invoice_added')
}

export async function recordPayment(formData: FormData) {
  const { supabase, school, role } = await getSchoolContext()
  if (!financeRoles.includes(role)) financeRedirect('/payments', 'failed')

  const studentId = formText(formData, 'student_id')
  const invoiceId = formText(formData, 'invoice_id')
  const amount = positiveWholeAmount(formText(formData, 'amount_ugx'))
  const method = formText(formData, 'method')
  const reference = formText(formData, 'reference_number')
  const requestKey = formText(formData, 'idempotency_key')
  const allowedMethods = ['mobile_money', 'bank_transfer', 'cash', 'card', 'other']

  if (
    !isUuid(studentId) || (invoiceId && !isUuid(invoiceId)) || !amount ||
    !allowedMethods.includes(method) || reference.length > 120 ||
    !isUuid(requestKey)
  ) {
    financeRedirect('/payments', 'invalid')
  }

  const { error } = await supabase.rpc('record_school_payment', {
    target_school_id: school.id,
    target_student_id: studentId,
    target_invoice_id: invoiceId || null,
    amount_ugx: amount,
    payment_method: method,
    reference: reference || null,
    request_key: requestKey || randomUUID(),
  })

  if (error) financeRedirect('/payments', error.code === '23505' ? 'duplicate' : 'failed')
  revalidatePath('/payments')
  revalidatePath('/fees')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
  financeRedirect('/payments', 'payment_added')
}

export async function addExpense(formData: FormData) {
  const { supabase, school, user, role } = await getSchoolContext()
  if (!financeRoles.includes(role)) financeRedirect('/expenses', 'failed')

  const category = formText(formData, 'category')
  const description = formText(formData, 'description')
  const amount = positiveWholeAmount(formText(formData, 'amount_ugx'))
  const incurredOn = formText(formData, 'incurred_on')

  if (
    category.length < 1 || category.length > 80 || description.length < 1 || description.length > 240 ||
    !amount || (incurredOn && !isIsoDate(incurredOn))
  ) {
    financeRedirect('/expenses', 'invalid')
  }

  const { error } = await supabase.from('expenses').insert({
    school_id: school.id,
    category,
    description,
    amount_ugx: amount,
    incurred_on: incurredOn || undefined,
    recorded_by: user.id,
  })

  if (error) financeRedirect('/expenses', 'failed')
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
  financeRedirect('/expenses', 'expense_added')
}

type FinanceLineItem = { name: string; amount_ugx: number }

const expenseCategories = ['Staff', 'Utilities', 'Learning materials', 'Transport', 'Maintenance', 'Meals', 'Other']

function parseFinanceLineItems(raw: string, allowZero: boolean): FinanceLineItem[] | null {
  if (!raw || raw.length > 20_000) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 20) return null

  const names = new Set<string>()
  const items: FinanceLineItem[] = []
  for (const value of parsed) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const item = value as { name?: unknown; amount_ugx?: unknown }
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    const amountText = typeof item.amount_ugx === 'string' || typeof item.amount_ugx === 'number' ? String(item.amount_ugx) : ''
    if (!name || name.length > 100 || !/^\d+$/.test(amountText)) return null
    const amount = Number(amountText)
    if (!Number.isSafeInteger(amount) || amount < (allowZero ? 0 : 1)) return null
    const normalizedName = name.normalize('NFKC').toLocaleLowerCase()
    if (names.has(normalizedName)) return null
    names.add(normalizedName)
    items.push({ name, amount_ugx: amount })
  }
  const total = items.reduce((sum, item) => sum + item.amount_ugx, 0)
  return Number.isSafeInteger(total) && total > 0 ? items : null
}

export async function createFeeStructure(formData: FormData) {
  const { supabase, school, user, role } = await getSchoolContext()
  if (!['owner', 'admin', 'bursar'].includes(role)) financeRedirect('/fees', 'failed')

  const educationLevelId = formText(formData, 'education_level_id')
  const name = formText(formData, 'name')
  const studentType = formText(formData, 'student_type')
  const items = parseFinanceLineItems(formText(formData, 'items_json'), true)
  if (!isUuid(educationLevelId) || !name || name.length > 120 || !['day', 'boarding', 'other'].includes(studentType) || !items) {
    financeRedirect('/fees', 'invalid')
  }

  const { data: level } = await supabase
    .from('education_levels')
    .select('id')
    .eq('id', educationLevelId)
    .eq('school_id', school.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!level) financeRedirect('/fees', 'invalid')

  const { data: structure, error: structureError } = await supabase
    .from('fee_structures')
    .insert({
      school_id: school.id,
      education_level_id: educationLevelId,
      name,
      student_type: studentType,
      is_active: false,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (structureError || !structure) {
    financeRedirect('/fees', structureError?.code === '23505' ? 'duplicate' : 'failed')
  }

  const { error: itemsError } = await supabase.from('fee_structure_items').insert(
    items.map((item, index) => ({
      school_id: school.id,
      fee_structure_id: structure.id,
      name: item.name,
      amount_ugx: item.amount_ugx,
      sort_order: index,
    })),
  )

  if (itemsError) {
    if (role === 'owner' || role === 'admin') {
      await supabase.from('fee_structures').delete().eq('id', structure.id).eq('school_id', school.id)
    }
    financeRedirect('/fees', 'structure_partial')
  }

  const { data: activated, error: activationError } = await supabase
    .from('fee_structures')
    .update({ is_active: true })
    .eq('id', structure.id)
    .eq('school_id', school.id)
    .select('id')
    .maybeSingle()

  if (activationError || !activated) financeRedirect('/fees', 'structure_partial')
  revalidatePath('/fees')
  financeRedirect('/fees', 'fee_structure_added')
}

export async function deleteIncompleteFeeStructure(formData: FormData) {
  const { supabase, school, role } = await getSchoolContext()
  if (!['owner', 'admin'].includes(role)) financeRedirect('/fees', 'failed')
  const structureId = formText(formData, 'fee_structure_id')
  if (!isUuid(structureId)) financeRedirect('/fees', 'invalid')

  const { error } = await supabase
    .from('fee_structures')
    .delete()
    .eq('id', structureId)
    .eq('school_id', school.id)
    .eq('is_active', false)
  if (error) financeRedirect('/fees', 'failed')
  revalidatePath('/fees')
  financeRedirect('/fees', 'saved')
}

export async function generateClassInvoices(formData: FormData) {
  const { supabase, school, user, role, activeTerm } = await getSchoolContext()
  if (!['owner', 'admin', 'bursar'].includes(role)) financeRedirect('/fees', 'failed')
  if (!activeTerm) financeRedirect('/fees', 'no_active_term')

  const structureId = formText(formData, 'fee_structure_id')
  const classId = formText(formData, 'class_id')
  const dueOn = formText(formData, 'due_on')
  if (!isUuid(structureId) || !isUuid(classId) || !isIsoDate(dueOn)) financeRedirect('/fees', 'invalid')

  const [structureResult, classResult] = await Promise.all([
    supabase.from('fee_structures').select('id, education_level_id, name, student_type').eq('id', structureId).eq('school_id', school.id).eq('is_active', true).maybeSingle(),
    supabase.from('classes').select('id, education_level_id').eq('id', classId).eq('school_id', school.id).maybeSingle(),
  ])
  const structure = structureResult.data
  const schoolClass = classResult.data
  if (!structure || !schoolClass) financeRedirect('/fees', 'invalid')
  if (structure.education_level_id !== schoolClass.education_level_id) financeRedirect('/fees', 'structure_class_mismatch')

  const [itemsResult, studentsResult] = await Promise.all([
    supabase.from('fee_structure_items').select('id, name, amount_ugx, sort_order').eq('fee_structure_id', structure.id).eq('school_id', school.id).order('sort_order'),
    supabase.from('students').select('id').eq('school_id', school.id).eq('class_id', schoolClass.id).eq('student_type', structure.student_type).eq('status', 'active').limit(1001),
  ])
  if (itemsResult.error || studentsResult.error) financeRedirect('/fees', 'failed')
  const items = itemsResult.data ?? []
  const students = studentsResult.data ?? []
  if (!items.length || !items.some((item) => item.amount_ugx > 0)) financeRedirect('/fees', 'structure_partial')
  if (!students.length) financeRedirect('/fees', 'no_students')
  if (students.length > 1000) financeRedirect('/fees', 'too_many_students')

  const studentIds = students.map((student) => student.id)
  const { data: existingInvoices, error: existingError } = await supabase
    .from('fee_invoices')
    .select('student_id')
    .eq('school_id', school.id)
    .eq('term_id', activeTerm.id)
    .eq('fee_structure_id', structure.id)
    .in('student_id', studentIds)
  if (existingError) financeRedirect('/fees', 'failed')

  const alreadyInvoiced = new Set((existingInvoices ?? []).map((invoice) => invoice.student_id))
  const invoiceItems = items.map((item) => ({ name: item.name, amount_ugx: item.amount_ugx }))
  const total = invoiceItems.reduce((sum, item) => sum + item.amount_ugx, 0)
  if (!Number.isSafeInteger(total) || total <= 0) financeRedirect('/fees', 'invalid')

  const rows = students
    .filter((student) => !alreadyInvoiced.has(student.id))
    .map((student) => ({
      school_id: school.id,
      student_id: student.id,
      academic_year_id: activeTerm.academicYearId,
      term_id: activeTerm.id,
      fee_structure_id: structure.id,
      invoice_number: `INV-${createHash('sha256').update(`${school.id}:${activeTerm.id}:${structure.id}:${student.id}`).digest('hex').slice(0, 32).toUpperCase()}`,
      description: `${structure.name} · ${activeTerm.label}`.slice(0, 240),
      line_items: invoiceItems,
      amount_due_ugx: total,
      due_on: dueOn,
      status: 'issued',
      created_by: user.id,
    }))

  if (!rows.length) financeRedirect('/fees', 'all_invoiced')
  if (rows.length > 1000) financeRedirect('/fees', 'too_many_students')

  const { error: insertError } = await supabase.from('fee_invoices').insert(rows)
  if (insertError) financeRedirect('/fees', insertError.code === '23505' ? 'duplicate' : 'failed')

  revalidatePath('/fees')
  revalidatePath('/payments')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
  financeRedirect('/fees', 'invoices_generated')
}

export async function submitExpenseRequisition(formData: FormData) {
  const { supabase, school, user } = await getSchoolContext()
  const vendor = formText(formData, 'vendor')
  const category = formText(formData, 'category')
  const notes = formText(formData, 'notes')
  const items = parseFinanceLineItems(formText(formData, 'items_json'), false)
  const categories = expenseCategories

  if (!vendor || vendor.length > 160 || !categories.includes(category) || notes.length > 500 || !items) {
    financeRedirect('/expenses', 'invalid')
  }
  const amount = items.reduce((sum, item) => sum + item.amount_ugx, 0)
  if (!Number.isSafeInteger(amount) || amount <= 0) financeRedirect('/expenses', 'invalid')

  const { error } = await supabase.from('expense_requisitions').insert({
    school_id: school.id,
    requested_by: user.id,
    vendor,
    category,
    items,
    amount_ugx: amount,
    notes: notes || null,
    status: 'pending',
  })
  if (error) financeRedirect('/expenses', 'failed')
  revalidatePath('/expenses')
  financeRedirect('/expenses', 'requisition_submitted')
}

export async function reviewExpenseRequisition(formData: FormData) {
  const { supabase, school, user, role } = await getSchoolContext()
  if (!financeRoles.includes(role)) financeRedirect('/expenses', 'failed')
  const requisitionId = formText(formData, 'requisition_id')
  const decision = formText(formData, 'decision')
  if (!isUuid(requisitionId) || !['approved', 'rejected'].includes(decision)) financeRedirect('/expenses', 'invalid')

  const { data: reviewed, error } = await supabase
    .from('expense_requisitions')
    .update({ status: decision, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', requisitionId)
    .eq('school_id', school.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) financeRedirect('/expenses', 'failed')
  if (!reviewed) financeRedirect('/expenses', 'requisition_conflict')
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
  financeRedirect('/expenses', decision === 'approved' ? 'requisition_approved' : 'requisition_rejected')
}
