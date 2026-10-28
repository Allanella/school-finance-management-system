import { FormFeedback } from '@/components/forms/feedback'
import { PaymentDesk } from '@/components/payments/payment-desk'
import { FinanceAccessNotice } from '@/components/school/finance-access'
import { PageHeading } from '@/components/school/page-heading'
import { getSchoolContext } from '@/lib/school/context'

const financeRoles = ['owner', 'admin', 'bursar', 'accountant']
const PAGE_SIZE = 500
const MAX_ROWS = 50_000

type PageResult<T> = { data: T[] | null; error: unknown }

async function loadAllPages<T>(loadPage: (from: number, to: number) => Promise<PageResult<T>>): Promise<T[] | null> {
  const rows: T[] = []
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await loadPage(from, from + PAGE_SIZE - 1)
    if (error || !data) return null
    rows.push(...data)
    if (data.length < PAGE_SIZE) return rows
  }
  return null
}

type StudentRow = { id: string; first_name: string; last_name: string; admission_number: string; class_id: string | null }
type InvoiceRow = { id: string; student_id: string; invoice_number: string; description: string; amount_due_ugx: number; due_on: string | null; created_at: string }
type PaymentRow = { id: string; student_id: string; invoice_id: string | null; amount_ugx: number; method: string; reference_number: string | null; received_at: string }

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [{ supabase, school, user, role }, params] = await Promise.all([getSchoolContext(), searchParams])

  if (!financeRoles.includes(role)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading title="Payments" description="Record collections and keep student account balances up to date." />
        <FinanceAccessNotice />
      </div>
    )
  }

  const [students, classesResult, invoices, allPayments] = await Promise.all([
    loadAllPages<StudentRow>(async (from, to) => supabase.from('students').select('id, first_name, last_name, admission_number, class_id').eq('school_id', school.id).eq('status', 'active').order('last_name').order('id').range(from, to)),
    supabase.from('classes').select('id, stream_name').eq('school_id', school.id).order('stream_name'),
    loadAllPages<InvoiceRow>(async (from, to) => supabase.from('fee_invoices').select('id, student_id, invoice_number, description, amount_due_ugx, due_on, created_at').eq('school_id', school.id).order('created_at', { ascending: false }).order('id').range(from, to)),
    loadAllPages<PaymentRow>(async (from, to) => supabase.from('payments').select('id, student_id, invoice_id, amount_ugx, method, reference_number, received_at').eq('school_id', school.id).order('received_at', { ascending: false }).order('id').range(from, to)),
  ])

  if (!students || !invoices || !allPayments || classesResult.error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading title="Payments" description="Record collections and keep student account balances up to date." />
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">Payment data could not be loaded completely. Refresh the page before recording or reconciling payments.</p>
        <FormFeedback code={params.status} />
      </div>
    )
  }

  const invoicePaidById = new Map<string, number>()
  const paidByStudent = new Map<string, number>()
  const invoicesByStudent = new Map<string, InvoiceRow[]>()
  const invoiceNumbers = new Map(invoices.map((invoice) => [invoice.id, invoice.invoice_number]))

  for (const invoice of invoices) invoicesByStudent.set(invoice.student_id, [...(invoicesByStudent.get(invoice.student_id) ?? []), invoice])
  for (const payment of allPayments) {
    paidByStudent.set(payment.student_id, (paidByStudent.get(payment.student_id) ?? 0) + payment.amount_ugx)
    if (payment.invoice_id) invoicePaidById.set(payment.invoice_id, (invoicePaidById.get(payment.invoice_id) ?? 0) + payment.amount_ugx)
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const accountBalances = students.map((student) => {
    const studentInvoices = invoicesByStudent.get(student.id) ?? []
    const due = studentInvoices.reduce((sum, invoice) => sum + invoice.amount_due_ugx, 0)
    const hasOverdue = studentInvoices.some((invoice) => invoice.due_on !== null && invoice.due_on < today && Math.max(invoice.amount_due_ugx - (invoicePaidById.get(invoice.id) ?? 0), 0) > 0)
    const paid = paidByStudent.get(student.id) ?? 0
    return {
      student_id: student.id,
      due,
      paid,
      balance: Math.max(due - paid, 0),
      credit: Math.max(paid - due, 0),
      hasOverdue,
      hasInvoices: studentInvoices.length > 0,
    }
  })

  const openInvoices = invoices.filter((invoice) => Math.max(invoice.amount_due_ugx - (invoicePaidById.get(invoice.id) ?? 0), 0) > 0)
  const openInvoicePayments = Object.fromEntries(openInvoices.map((invoice) => [invoice.id, invoicePaidById.get(invoice.id) ?? 0]))
  const recentPayments = allPayments.slice(0, 100).map((payment) => ({
    ...payment,
    invoice_number: payment.invoice_id ? invoiceNumbers.get(payment.invoice_id) ?? null : null,
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Payments" description="Record collections, manage offline payment sync, and review student account balances." />
      <FormFeedback code={params.status} />
      <PaymentDesk
        students={students}
        classes={classesResult.data ?? []}
        invoices={openInvoices}
        invoicePayments={openInvoicePayments}
        accountBalances={accountBalances}
        payments={recentPayments}
        school={{ id: school.id, name: school.name, currency_code: school.currency_code, country_code: school.country_code }}
        userId={user.id}
      />
    </div>
  )
}
