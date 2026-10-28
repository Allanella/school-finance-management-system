import { randomUUID } from 'node:crypto'
import { FormFeedback } from '@/components/forms/feedback'
import { BulkInvoiceForm } from '@/components/fees/bulk-invoice-form'
import { FeeStructureForm } from '@/components/fees/fee-structure-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { createInvoice, deleteIncompleteFeeStructure } from '@/app/actions/finance'
import { FinanceAccessNotice } from '@/components/school/finance-access'
import { PageHeading, Panel } from '@/components/school/page-heading'
import { getSchoolContext } from '@/lib/school/context'
import { formatCurrency } from '@/lib/school/format-currency'

const financeRoles = ['owner', 'admin', 'bursar', 'accountant']
const manageRoles = ['owner', 'admin', 'bursar']

type FeesPageProps = { searchParams: Promise<{ status?: string }> }

export default async function FeesPage({ searchParams }: FeesPageProps) {
  const [{ supabase, school, role, activeTerm }, params] = await Promise.all([getSchoolContext(), searchParams])
  if (!financeRoles.includes(role)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading title="Fees & invoices" description="Manage fee schedules, term invoices, and student charges." />
        <FinanceAccessNotice />
      </div>
    )
  }

  const [levelsResult, classesResult, structuresResult, itemsResult, studentsResult, invoicesResult] = await Promise.all([
    supabase.from('education_levels').select('id, name, is_active, sequence_index').eq('school_id', school.id).order('sequence_index'),
    supabase.from('classes').select('id, education_level_id, stream_name').eq('school_id', school.id).order('stream_name'),
    supabase.from('fee_structures').select('id, education_level_id, name, student_type, is_active, created_at').eq('school_id', school.id).order('created_at', { ascending: false }),
    supabase.from('fee_structure_items').select('id, fee_structure_id, name, amount_ugx, sort_order').eq('school_id', school.id).order('sort_order'),
    supabase.from('students').select('id, first_name, last_name, admission_number, status').eq('school_id', school.id).order('last_name').limit(2000),
    supabase.from('fee_invoices').select('id, student_id, fee_structure_id, invoice_number, description, amount_due_ugx, due_on, status, created_at').eq('school_id', school.id).order('created_at', { ascending: false }).limit(100),
  ])

  const levels = levelsResult.data ?? []
  const classes = classesResult.data ?? []
  const structures = structuresResult.data ?? []
  const feeItems = itemsResult.data ?? []
  const students = studentsResult.data ?? []
  const activeStudents = students.filter((student) => student.status === 'active')
  const invoices = invoicesResult.data ?? []
  const canManage = manageRoles.includes(role)
  const levelNames = new Map(levels.map((level) => [level.id, level.name]))
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const itemsByStructure = new Map<string, typeof feeItems>()
  for (const item of feeItems) itemsByStructure.set(item.fee_structure_id, [...(itemsByStructure.get(item.fee_structure_id) ?? []), item])
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const defaultInvoiceNumber = `INV-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`
  const currency = (amount: number) => formatCurrency(amount, school.currency_code, school.country_code)

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Fees & invoices" description="Set fee schedules by level and student type, then issue invoices to a whole class." />
      <FormFeedback code={params.status} />

      {canManage ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Create a fee structure" description="Build a reusable schedule from tuition, meals, transport, and other items.">
            <FeeStructureForm levels={levels.filter((level) => level.is_active).map((level) => ({ id: level.id, name: level.name }))} currencyCode={school.currency_code} countryCode={school.country_code} />
          </Panel>
          <Panel title="Generate invoices for a class" description="Issues one itemized invoice to each eligible student in a selected class.">
            <BulkInvoiceForm
              structures={structures.filter((structure) => structure.is_active)}
              classes={classes}
              levelNames={levelNames}
              activeTerm={activeTerm ? { label: activeTerm.label, ends_on: activeTerm.ends_on } : null}
            />
          </Panel>
        </div>
      ) : null}

      <Panel title={`Fee structures (${structures.length})`} description="Schedules are scoped to this school and can be reused for each active term.">
        {structures.length ? (
          <ul className="flex flex-col gap-3">
            {structures.map((structure) => {
              const items = itemsByStructure.get(structure.id) ?? []
              const total = items.reduce((sum, item) => sum + item.amount_ugx, 0)
              return (
                <li key={structure.id} className="rounded-lg border border-border/80 p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold">{structure.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{levelNames.get(structure.education_level_id) ?? 'Education level'} · <span className="capitalize">{structure.student_type}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={structure.is_active ? 'secondary' : 'outline'}>{structure.is_active ? 'Active' : 'Incomplete'}</Badge>
                      <span className="text-sm font-semibold">{currency(total)}</span>
                    </div>
                  </div>
                  {items.length ? <ul className="mt-3 flex flex-col gap-1 border-t border-border/70 pt-3 text-xs text-muted-foreground sm:grid sm:grid-cols-2">{items.map((item) => <li key={item.id} className="flex min-w-0 items-center justify-between gap-2"><span className="truncate">{item.name}</span><span className="shrink-0 text-foreground">{currency(item.amount_ugx)}</span></li>)}</ul> : <p className="mt-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">No line items saved.</p>}
                  {!structure.is_active && (role === 'owner' || role === 'admin') ? (
                    <form action={deleteIncompleteFeeStructure} className="mt-3 flex justify-end">
                      <input type="hidden" name="fee_structure_id" value={structure.id} />
                      <Button type="submit" variant="outline" size="sm">Remove incomplete draft</Button>
                    </form>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No fee structures yet. Create a schedule for each education level and student type.</p>}
      </Panel>

      {canManage ? (
        <Panel title="Create a single invoice" description="Use this for an individual charge outside a class-wide fee schedule.">
          <form action={createInvoice} className="flex flex-col gap-4">
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="manual-invoice-student">Student</FieldLabel>
                <select id="manual-invoice-student" name="student_id" required disabled={!activeStudents.length} className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50">
                  <option value="">{activeStudents.length ? 'Select a student' : 'No active students'}</option>
                  {activeStudents.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name} · {student.admission_number}</option>)}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="manual-invoice-number">Invoice number</FieldLabel>
                <Input id="manual-invoice-number" name="invoice_number" defaultValue={defaultInvoiceNumber} maxLength={64} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="manual-invoice-amount">Amount ({school.currency_code})</FieldLabel>
                <Input id="manual-invoice-amount" name="amount_ugx" type="number" inputMode="numeric" min="1" step="1" required placeholder="250000" />
              </Field>
              <Field>
                <FieldLabel htmlFor="manual-invoice-due">Due date</FieldLabel>
                <Input id="manual-invoice-due" name="due_on" type="date" defaultValue={activeTerm?.ends_on ?? today} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="manual-invoice-description">Description</FieldLabel>
                <Input id="manual-invoice-description" name="description" maxLength={240} required placeholder="Tuition or other charge" />
              </Field>
            </FieldGroup>
            <div className="flex justify-end border-t border-border pt-4"><Button type="submit" disabled={!activeStudents.length}>Create invoice</Button></div>
          </form>
        </Panel>
      ) : null}

      <Panel title={`Recent invoices (${invoices.length})`} description="Latest 100 invoices for the active school.">
        {invoices.length ? (
          <ul className="flex flex-col gap-2">
            {invoices.map((invoice) => {
              const student = studentsById.get(invoice.student_id)
              return (
                <li key={invoice.id} className="flex flex-col gap-2 rounded-lg border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{invoice.invoice_number}</Badge><Badge variant={invoice.status === 'paid' ? 'secondary' : 'outline'}>{invoice.status}</Badge></div>
                    <p className="mt-2 truncate text-sm font-medium">{student ? `${student.first_name} ${student.last_name} · ${student.admission_number}` : 'Student account'}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{invoice.description}{invoice.due_on ? ` · Due ${invoice.due_on}` : ''}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{currency(invoice.amount_due_ugx)}</p>
                </li>
              )
            })}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No invoices created yet.</p>}
      </Panel>
    </div>
  )
}
