import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, FilePlus2, ReceiptText, UsersRound, Wallet } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { RevenueExpenseChart, type MonthlyFinancePoint } from '@/components/dashboard/revenue-expense-chart'
import { ReceiptButton } from '@/components/payments/receipt-button'
import { Panel, PageHeading } from '@/components/school/page-heading'
import { getSchoolContext } from '@/lib/school/context'
import { formatCurrency } from '@/lib/school/format-currency'
import { getSchoolTypeLabel } from '@/lib/school/types'

function sumAmounts(rows: Array<{ amount_ugx: number }> | null | undefined) {
  return (rows ?? []).reduce((total, row) => total + row.amount_ugx, 0)
}

export default async function DashboardPage() {
  const { supabase, school, user, role, activeTerm } = await getSchoolContext()
  const now = new Date()
  const startOfSixMonthWindow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1))
  const chartStart = startOfSixMonthWindow.toISOString()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const monthKey = monthStart.slice(0, 7)
  const trendMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1))
    return {
      key: date.toISOString().slice(0, 7),
      label: new Intl.DateTimeFormat('en-UG', { month: 'short', timeZone: 'UTC' }).format(date),
    }
  })

  const [summaryResult, studentsResult, classesResult, recentPaymentsResult, trendPaymentsResult, trendExpensesResult] = await Promise.all([
    supabase.rpc('get_school_finance_summary', { target_school_id: school.id }),
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
    supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
    supabase
      .from('payments')
      .select('id, student_id, invoice_id, amount_ugx, method, received_at, reference_number')
      .eq('school_id', school.id)
      .order('received_at', { ascending: false })
      .limit(6),
    supabase.from('payments').select('amount_ugx, received_at').eq('school_id', school.id).gte('received_at', chartStart).limit(5000),
    supabase.from('expenses').select('amount_ugx, incurred_on').eq('school_id', school.id).gte('incurred_on', chartStart.slice(0, 10)).limit(5000),
  ])

  const summary = summaryResult.data?.[0] ?? { collections_ugx: 0, expenses_ugx: 0, outstanding_ugx: 0 }
  const canViewFinance = ['owner', 'admin', 'bursar', 'accountant'].includes(role)
  const recentPayments = recentPaymentsResult.data ?? []
  const studentIds = [...new Set(recentPayments.map((payment) => payment.student_id))]
  const invoiceIds = [...new Set(recentPayments.map((payment) => payment.invoice_id).filter((id): id is string => Boolean(id)))]
  const [paymentStudentsResult, invoiceResult, termPaymentsResult, termExpensesResult] = await Promise.all([
    studentIds.length
      ? supabase.from('students').select('id, first_name, last_name, admission_number').eq('school_id', school.id).in('id', studentIds)
      : Promise.resolve({ data: [], error: null }),
    invoiceIds.length
      ? supabase.from('fee_invoices').select('id, invoice_number').eq('school_id', school.id).in('id', invoiceIds)
      : Promise.resolve({ data: [], error: null }),
    activeTerm
      ? supabase.from('payments').select('amount_ugx').eq('school_id', school.id).gte('received_at', `${activeTerm.starts_on}T00:00:00.000Z`).limit(5000)
      : Promise.resolve({ data: [], error: null }),
    activeTerm
      ? supabase.from('expenses').select('amount_ugx').eq('school_id', school.id).gte('incurred_on', activeTerm.starts_on).limit(5000)
      : Promise.resolve({ data: [], error: null }),
  ])
  const studentsById = new Map((paymentStudentsResult.data ?? []).map((student) => [student.id, {
    name: `${student.first_name} ${student.last_name}`,
    admissionNumber: student.admission_number,
  }]))
  const invoiceNumbers = new Map((invoiceResult.data ?? []).map((invoice) => [invoice.id, invoice.invoice_number]))
  const collectionTotals = new Map<string, number>()
  const expenseTotals = new Map<string, number>()
  for (const payment of trendPaymentsResult.data ?? []) {
    const key = payment.received_at.slice(0, 7)
    collectionTotals.set(key, (collectionTotals.get(key) ?? 0) + payment.amount_ugx)
  }
  for (const expense of trendExpensesResult.data ?? []) {
    const key = expense.incurred_on.slice(0, 7)
    expenseTotals.set(key, (expenseTotals.get(key) ?? 0) + expense.amount_ugx)
  }
  const chartData: MonthlyFinancePoint[] = trendMonths.map(({ key, label }) => ({
    month: label,
    collections: collectionTotals.get(key) ?? 0,
    expenses: expenseTotals.get(key) ?? 0,
  }))
  const monthlyExpenses = expenseTotals.get(monthKey) ?? 0
  const collections = activeTerm ? sumAmounts(termPaymentsResult.data) : summary.collections_ugx
  const termExpenses = activeTerm ? sumAmounts(termExpensesResult.data) : summary.expenses_ugx
  const netRevenue = collections - termExpenses
  const currency = (amount: number | null | undefined) => formatCurrency(amount, school.currency_code, school.country_code)

  return (
    <div className="space-y-6">
      <PageHeading
        title={`Good day${user.email ? `, ${user.email.split('@')[0]}` : ''}`}
        description={`${school.name} · ${getSchoolTypeLabel(school.school_type)} · ${activeTerm?.label ?? 'Academic term not set'}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/payments" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"><CircleDollarSign aria-hidden="true" className="size-4" /> Record payment</Link>
            <Link href="/fees" className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"><FilePlus2 aria-hidden="true" className="size-4" /> Generate invoices</Link>
            <Link href="/expenses" className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"><Wallet aria-hidden="true" className="size-4" /> Log expense</Link>
          </div>
        }
      />

      <section aria-label="School finance overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total collections" value={canViewFinance ? currency(collections) : 'Restricted'} supporting={activeTerm ? `${activeTerm.name} to date` : 'Recorded to date'} icon={CircleDollarSign} />
        <StatCard label="Outstanding arrears" value={canViewFinance ? currency(summary.outstanding_ugx) : 'Restricted'} supporting="Remaining invoice balances" icon={ReceiptText} />
        <StatCard label="Monthly expenses" value={canViewFinance ? currency(monthlyExpenses) : 'Restricted'} supporting="Current calendar month" icon={Wallet} />
        <StatCard label="Net revenue" value={canViewFinance ? currency(netRevenue) : 'Restricted'} supporting={activeTerm ? 'Term collections less expenses' : 'Collections less expenses'} icon={ArrowDownRight} />
      </section>

      <Panel title="Collections vs expenses" description="Monthly totals for the last six months, in the school’s currency.">
        {canViewFinance ? <RevenueExpenseChart data={chartData} /> : <p className="py-8 text-center text-sm text-muted-foreground">Financial charts are available to authorized finance roles.</p>}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Recent transactions"
          description="Payments recorded for this school."
          action={<Link href="/payments" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Payment register <ArrowUpRight aria-hidden="true" className="size-3.5" /></Link>}
        >
          {!canViewFinance ? (
            <p className="text-sm text-muted-foreground">Finance activity is limited to authorized school roles.</p>
          ) : recentPayments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th scope="col" className="pb-3 font-medium">Student</th>
                    <th scope="col" className="pb-3 font-medium">Admission no.</th>
                    <th scope="col" className="pb-3 font-medium">Payment method</th>
                    <th scope="col" className="pb-3 text-right font-medium">Amount</th>
                    <th scope="col" className="pb-3 text-center font-medium">Status</th>
                    <th scope="col" className="pb-3 text-right font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((payment) => {
                    const student = studentsById.get(payment.student_id) ?? { name: 'Student', admissionNumber: '—' }
                    return (
                      <tr key={payment.id} className="border-b border-border/70 last:border-0">
                        <td className="py-3 pr-3 font-medium">{student.name}</td>
                        <td className="py-3 pr-3 text-muted-foreground">{student.admissionNumber}</td>
                        <td className="py-3 pr-3 capitalize text-muted-foreground">{payment.method.replaceAll('_', ' ')}</td>
                        <td className="py-3 text-right font-medium">{currency(payment.amount_ugx)}</td>
                        <td className="py-3 text-center"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Recorded</span></td>
                        <td className="py-3 text-right"><ReceiptButton payment={{ ...payment, invoice_number: payment.invoice_id ? invoiceNumbers.get(payment.invoice_id) ?? null : null }} school={school} student={student} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm font-medium">No payments recorded yet</p>
              <p className="mt-1 text-xs text-muted-foreground">New collections will appear here after the bursar records them.</p>
            </div>
          )}
        </Panel>

        <Panel title="School snapshot" description="Current enrolment and workflow shortcuts.">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Students</p><p className="mt-1 text-xl font-semibold">{studentsResult.count ?? 0}</p></div>
            <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Class streams</p><p className="mt-1 text-xl font-semibold">{classesResult.count ?? 0}</p></div>
          </div>
          <div className="grid gap-2">
            <Link href="/students" className="flex min-h-11 items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">Register a student <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" /></Link>
            <Link href="/classes" className="flex min-h-11 items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">Set up classes and levels <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" /></Link>
            <Link href="/reports" className="flex min-h-11 items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">Review finance reports <ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" /></Link>
          </div>
        </Panel>
      </div>
    </div>
  )
}
