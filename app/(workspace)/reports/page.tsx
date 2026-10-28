import { CircleDollarSign, ReceiptText, TrendingUp, Wallet } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { FinanceAccessNotice } from '@/components/school/finance-access'
import { Panel, PageHeading } from '@/components/school/page-heading'
import { getSchoolContext } from '@/lib/school/context'
import { formatCurrency } from '@/lib/school/format-currency'

const financeRoles = ['owner', 'admin', 'bursar', 'accountant']

export default async function ReportsPage() {
  const { supabase, school, role } = await getSchoolContext()

  if (!financeRoles.includes(role)) {
    return (
      <div className="space-y-6">
        <PageHeading title="Reports" description="Review collections, expenses, and outstanding fees." />
        <FinanceAccessNotice />
      </div>
    )
  }

  const { data } = await supabase.rpc('get_school_finance_summary', { target_school_id: school.id })
  const summary = data?.[0] ?? { collections_ugx: 0, expenses_ugx: 0, outstanding_ugx: 0 }
  const netCash = summary.collections_ugx - summary.expenses_ugx
  const currency = (amount: number) => formatCurrency(amount, school.currency_code, school.country_code)

  return (
    <div className="space-y-6">
      <PageHeading title="Reports" description="A school-scoped summary of collections, spending, and open balances." />
      <section aria-label="Financial summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collections" value={currency(summary.collections_ugx)} supporting="Payments recorded to date" icon={CircleDollarSign} />
        <StatCard label="Expenses" value={currency(summary.expenses_ugx)} supporting="Operational spending recorded" icon={Wallet} />
        <StatCard label="Net cash movement" value={currency(netCash)} supporting="Collections less expenses" icon={TrendingUp} />
        <StatCard label="Outstanding fees" value={currency(summary.outstanding_ugx)} supporting="Remaining invoice balances" icon={ReceiptText} />
      </section>

      <Panel title="How to read this report" description="All values use the school’s configured currency.">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-4">
            <dt className="text-sm font-medium">Collections</dt>
            <dd className="mt-1 text-xs leading-5 text-muted-foreground">Payments recorded through the school payment register. Invoice allocations reduce the outstanding balance.</dd>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <dt className="text-sm font-medium">Expenses</dt>
            <dd className="mt-1 text-xs leading-5 text-muted-foreground">Operational expenses entered by authorized finance staff.</dd>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <dt className="text-sm font-medium">Outstanding fees</dt>
            <dd className="mt-1 text-xs leading-5 text-muted-foreground">Amounts due on issued invoices, less payments allocated to those invoices.</dd>
          </div>
        </dl>
      </Panel>
    </div>
  )
}
