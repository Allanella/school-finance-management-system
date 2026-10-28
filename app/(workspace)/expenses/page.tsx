import { Wallet } from 'lucide-react'
import { addExpense, reviewExpenseRequisition, submitExpenseRequisition } from '@/app/actions/finance'
import { FormFeedback } from '@/components/forms/feedback'
import { LineItemsEditor } from '@/components/finance/line-items-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Panel, PageHeading } from '@/components/school/page-heading'
import { getSchoolContext } from '@/lib/school/context'
import { formatCurrency } from '@/lib/school/format-currency'

const financeRoles = ['owner', 'admin', 'bursar', 'accountant']
const categories = ['Staff', 'Utilities', 'Learning materials', 'Transport', 'Maintenance', 'Meals', 'Other']

type ExpensesPageProps = { searchParams: Promise<{ status?: string }> }
type DisplayItem = { name: string; amount_ugx: number }

function getDisplayItems(value: unknown): DisplayItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name : ''
    const amount = Number(record.amount_ugx)
    return name && Number.isSafeInteger(amount) && amount >= 0 ? [{ name, amount_ugx: amount }] : []
  })
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const [{ supabase, school, user, role }, params] = await Promise.all([getSchoolContext(), searchParams])
  const canManage = financeRoles.includes(role)
  const currency = (amount: number) => formatCurrency(amount, school.currency_code, school.country_code)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

  const { data: requisitionsData } = await supabase
    .from('expense_requisitions')
    .select('id, vendor, category, items, amount_ugx, status, notes, requested_by, reviewed_by, created_at, reviewed_at')
    .eq('school_id', school.id)
    .order('created_at', { ascending: false })
    .limit(100)
  const requisitions = requisitionsData ?? []

  let expenses: Array<{ id: string; category: string; description: string; amount_ugx: number; incurred_on: string; created_at: string }> = []
  if (canManage) {
    const { data } = await supabase
      .from('expenses')
      .select('id, category, description, amount_ugx, incurred_on, created_at')
      .eq('school_id', school.id)
      .order('incurred_on', { ascending: false })
      .limit(100)
    expenses = data ?? []
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Expenses" description="Submit and review spending requests alongside the actual expense ledger." />
      <FormFeedback code={params.status} />

      <Panel title="Request an expense" description="Requests are reviewed by the finance team. Approval does not post to the ledger until spending is incurred.">
        <form action={submitExpenseRequisition} className="flex flex-col gap-5">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="request-vendor">Vendor or payee</FieldLabel>
              <Input id="request-vendor" name="vendor" maxLength={160} required placeholder="Supplier or payee" />
            </Field>
            <Field>
              <FieldLabel htmlFor="request-category">Category</FieldLabel>
              <select id="request-category" name="category" defaultValue="Learning materials" required className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="request-notes">Notes (optional)</FieldLabel>
              <Input id="request-notes" name="notes" maxLength={500} placeholder="Purpose, timing, or supporting details" />
              <FieldDescription>Add one or more itemized amounts below; the total is recalculated on submission.</FieldDescription>
            </Field>
          </FieldGroup>
          <LineItemsEditor idPrefix="expense-request-item" itemLabel="Requested item" currencyCode={school.currency_code} countryCode={school.country_code} allowZeroAmounts={false} />
          <div className="flex justify-end border-t border-border pt-4"><Button type="submit">Submit requisition</Button></div>
        </form>
      </Panel>

      <Panel title={`Requisitions (${requisitions.length})`} description={canManage ? 'Review pending requests. Approved requests remain separate from the expense ledger until the expense is incurred.' : 'Your requests and review decisions appear here.'}>
        {requisitions.length ? (
          <ul className="flex flex-col gap-3">
            {requisitions.map((request) => {
              const items = getDisplayItems(request.items)
              const statusVariant = request.status === 'rejected' ? 'destructive' : request.status === 'approved' ? 'secondary' : 'outline'
              return (
                <li key={request.id} className="rounded-lg border border-border/80 p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-sm font-semibold">{request.vendor}</h3><Badge variant={statusVariant}>{request.status}</Badge></div>
                      <p className="mt-1 text-xs text-muted-foreground">{request.category} · {request.requested_by === user.id ? 'Requested by you' : 'Staff request'} · {new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium' }).format(new Date(request.created_at))}</p>
                      {request.notes ? <p className="mt-2 text-sm text-muted-foreground">{request.notes}</p> : null}
                    </div>
                    <p className="shrink-0 text-sm font-semibold">{currency(request.amount_ugx)}</p>
                  </div>
                  {items.length ? <ul className="mt-3 flex flex-col gap-1 border-t border-border/70 pt-3 text-xs sm:grid sm:grid-cols-2">{items.map((item, index) => <li key={`${request.id}-${index}`} className="flex min-w-0 items-center justify-between gap-2"><span className="truncate text-muted-foreground">{item.name}</span><span className="shrink-0">{currency(item.amount_ugx)}</span></li>)}</ul> : null}
                  {canManage && request.status === 'pending' ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border/70 pt-3">
                      <form action={reviewExpenseRequisition}>
                        <input type="hidden" name="requisition_id" value={request.id} />
                        <input type="hidden" name="decision" value="approved" />
                        <Button type="submit" size="sm">Approve</Button>
                      </form>
                      <form action={reviewExpenseRequisition}>
                        <input type="hidden" name="requisition_id" value={request.id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <Button type="submit" size="sm" variant="outline">Reject</Button>
                      </form>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No expense requisitions yet.</p>}
      </Panel>

      {canManage ? (
        <>
          <Panel title="Record an expense" description="Add actual spending to the school ledger once it has been incurred.">
            <form action={addExpense}>
              <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="category">Category</FieldLabel>
                  <select id="category" name="category" defaultValue="Staff" required className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="amount_ugx">Amount ({school.currency_code})</FieldLabel>
                  <Input id="amount_ugx" name="amount_ugx" type="number" inputMode="numeric" min="1" step="1" required placeholder="120000" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="incurred_on">Date incurred</FieldLabel>
                  <Input id="incurred_on" name="incurred_on" type="date" defaultValue={today} required />
                </Field>
                <Field className="sm:col-span-2 xl:col-span-4">
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Input id="description" name="description" required maxLength={240} placeholder="Describe the expense" />
                </Field>
              </FieldGroup>
              <div className="mt-5 flex justify-end border-t border-border pt-4"><Button type="submit" className="gap-2"><Wallet aria-hidden="true" data-icon="inline-start" /> Record expense</Button></div>
            </form>
          </Panel>

          <Panel title={`Recent expenses (${expenses.length})`} description="The latest 100 items in the actual expense register.">
            {expenses.length ? (
              <ul className="flex flex-col gap-2">
                {expenses.map((expense) => (
                  <li key={expense.id} className="flex flex-col gap-2 rounded-lg border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{expense.category}</Badge><span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${expense.incurred_on}T00:00:00Z`))}</span></div>
                      <p className="mt-2 break-words text-sm font-medium">{expense.description}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">{currency(expense.amount_ugx)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>}
          </Panel>
        </>
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">The expense ledger and approval controls are limited to the school finance team.</p>
      )}
    </div>
  )
}
