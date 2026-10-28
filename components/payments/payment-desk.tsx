'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CircleDollarSign, CloudUpload, Search, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { ReceiptButton } from '@/components/payments/receipt-button'
import { createClient } from '@/lib/supabase/client'
import { enqueuePayment, listQueuedPayments, removeQueuedPayment, type QueuedPayment } from '@/lib/offline/payment-queue'
import { formatCurrency } from '@/lib/school/format-currency'

type Student = { id: string; first_name: string; last_name: string; admission_number: string; class_id: string | null }
type SchoolClass = { id: string; stream_name: string }
type Invoice = { id: string; student_id: string; invoice_number: string; description: string; amount_due_ugx: number; due_on: string | null }
type Payment = { id: string; student_id: string; invoice_id: string | null; invoice_number: string | null; amount_ugx: number; method: string; reference_number: string | null; received_at: string }
type AccountBalance = { student_id: string; due: number; paid: number; balance: number; credit: number; hasOverdue: boolean; hasInvoices: boolean }
type School = { id: string; name: string; currency_code: string; country_code: string }

type PaymentDeskProps = {
  students: Student[]
  classes: SchoolClass[]
  invoices: Invoice[]
  invoicePayments: Record<string, number>
  accountBalances: AccountBalance[]
  payments: Payment[]
  school: School
  userId: string
}

const paymentMethods = [
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]
const paymentMethodLabels = Object.fromEntries(paymentMethods.map((method) => [method.value, method.label]))
type AccountStatus = 'all' | 'balance' | 'partial' | 'overdue' | 'paid' | 'credit' | 'none'

function isNetworkFailure(error: { message?: string; name?: string; status?: number } | null, online: boolean) {
  if (!online || error?.status === 0) return true
  const message = error?.message?.toLowerCase() ?? ''
  const name = error?.name?.toLowerCase() ?? ''
  return name.includes('fetch') || message.includes('failed to fetch') || message.includes('network') || message.includes('fetch failed') || message.includes('load failed')
}

export function PaymentDesk({ students, classes, invoices, invoicePayments, accountBalances, payments, school, userId }: PaymentDeskProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [online, setOnline] = useState(true)
  const [queue, setQueue] = useState<QueuedPayment[]>([])
  const [syncing, setSyncing] = useState(false)
  const syncingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [studentId, setStudentId] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('mobile_money')
  const [reference, setReference] = useState('')
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<AccountStatus>('all')
  const [today] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()))

  const currency = useCallback((amountUGX: number) => formatCurrency(amountUGX, school.currency_code, school.country_code), [school.country_code, school.currency_code])
  const studentsById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students])
  const classNames = useMemo(() => new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass.stream_name])), [classes])
  const invoicesByStudent = useMemo(() => {
    const map = new Map<string, Invoice[]>()
    for (const invoice of invoices) map.set(invoice.student_id, [...(map.get(invoice.student_id) ?? []), invoice])
    return map
  }, [invoices])
  const paidByInvoice = useMemo(() => new Map(Object.entries(invoicePayments)), [invoicePayments])
  const balancesByStudent = useMemo(() => new Map(accountBalances.map((account) => [account.student_id, account])), [accountBalances])
  const activeStudentInvoices = invoicesByStudent.get(studentId) ?? []
  const selectedInvoice = invoices.find((invoice) => invoice.id === invoiceId && invoice.student_id === studentId)
  const selectedInvoiceBalance = selectedInvoice ? Math.max(selectedInvoice.amount_due_ugx - (paidByInvoice.get(selectedInvoice.id) ?? 0), 0) : 0
  const paymentAmount = Number(amount)
  const balanceAfterPayment = selectedInvoice ? Math.max(selectedInvoiceBalance - (Number.isSafeInteger(paymentAmount) ? paymentAmount : 0), 0) : null

  const refreshQueue = useCallback(async () => {
    try {
      const allRecords = await listQueuedPayments()
      setQueue(allRecords.filter((record) => record.user_id === userId && record.school_id === school.id))
    } catch {
      setMessage({ tone: 'error', text: 'Offline payment storage is unavailable. Stay online to record payments.' })
    }
  }, [school.id, userId])

  useEffect(() => {
    let active = true
    void listQueuedPayments().then((allRecords) => {
      if (active) setQueue(allRecords.filter((record) => record.user_id === userId && record.school_id === school.id))
    }).catch(() => {
      if (active) setMessage({ tone: 'error', text: 'Offline payment storage is unavailable. Stay online to record payments.' })
    })
    return () => { active = false }
  }, [school.id, userId])

  const syncPendingPayments = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    setMessage(null)
    try {
      const allRecords = await listQueuedPayments()
      const pending = allRecords.filter((record) => record.user_id === userId && record.school_id === school.id)
      for (const record of pending) {
        const { error } = await supabase.rpc('record_school_payment', {
          target_school_id: record.school_id,
          target_student_id: record.student_id,
          target_invoice_id: record.invoice_id,
          amount_ugx: record.amount_ugx,
          payment_method: record.payment_method,
          reference: record.reference,
          request_key: record.request_key,
        })
        if (error) {
          setMessage({ tone: 'error', text: 'Some queued payments could not sync. They remain saved on this device.' })
          break
        }
        await removeQueuedPayment(record.request_key)
      }
      await refreshQueue()
      if (pending.length && (await listQueuedPayments()).filter((record) => record.user_id === userId && record.school_id === school.id).length === 0) {
        setMessage({ tone: 'success', text: 'All queued payments synced successfully.' })
        router.refresh()
      }
    } catch {
      setMessage({ tone: 'error', text: 'Sync paused. Queued payments remain saved on this device.' })
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [refreshQueue, router, school.id, supabase, userId])

  useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine)
    const onOnline = () => {
      updateStatus()
      void syncPendingPayments()
    }
    const onOffline = () => updateStatus()
    updateStatus()
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [syncPendingPayments])

  async function queuePayment(record: QueuedPayment) {
    await enqueuePayment(record)
    await refreshQueue()
    setMessage({ tone: 'info', text: 'Payment saved on this device. It will sync when your connection returns.' })
    setAmount('')
    setReference('')
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    const amountUGX = Number(amount)
    if (!studentId || !Number.isSafeInteger(amountUGX) || amountUGX <= 0) {
      setMessage({ tone: 'error', text: 'Select a student and enter a positive whole-number amount.' })
      return
    }
    if (invoiceId && (!selectedInvoice || amountUGX > selectedInvoiceBalance)) {
      setMessage({ tone: 'error', text: 'The selected invoice does not belong to this student or the payment exceeds its remaining balance.' })
      return
    }
    if (reference.trim().length > 120) {
      setMessage({ tone: 'error', text: 'Reference numbers must be 120 characters or fewer.' })
      return
    }

    const record: QueuedPayment = {
      request_key: crypto.randomUUID(),
      user_id: userId,
      school_id: school.id,
      student_id: studentId,
      invoice_id: invoiceId || null,
      amount_ugx: amountUGX,
      payment_method: method,
      reference: reference.trim() || null,
      queued_at: new Date().toISOString(),
    }

    if (!navigator.onLine) {
      try {
        await queuePayment(record)
      } catch {
        setMessage({ tone: 'error', text: 'Could not save this payment offline. Reconnect before recording it.' })
      }
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.rpc('record_school_payment', {
        target_school_id: record.school_id,
        target_student_id: record.student_id,
        target_invoice_id: record.invoice_id,
        amount_ugx: record.amount_ugx,
        payment_method: record.payment_method,
        reference: record.reference,
        request_key: record.request_key,
      })
      if (error) {
        if (isNetworkFailure(error, navigator.onLine)) {
          await queuePayment(record)
        } else {
          setMessage({ tone: 'error', text: 'Payment was not recorded. Check the selected invoice and your school access, then try again.' })
        }
        return
      }
      setMessage({ tone: 'success', text: 'Payment recorded successfully.' })
      setAmount('')
      setReference('')
      router.refresh()
    } catch {
      if (!navigator.onLine) {
        try {
          await queuePayment(record)
        } catch {
          setMessage({ tone: 'error', text: 'Could not save this payment offline. Reconnect before recording it.' })
        }
      } else {
        setMessage({ tone: 'error', text: 'Payment could not be confirmed. Check the payment register before retrying.' })
      }
    } finally {
      setSaving(false)
    }
  }

  const accounts = students.map((student) => {
    const balance = balancesByStudent.get(student.id) ?? { due: 0, paid: 0, balance: 0, credit: 0, hasOverdue: false, hasInvoices: false }
    const status = !balance.hasInvoices && balance.paid === 0 ? 'none' : balance.credit > 0 ? 'credit' : balance.balance === 0 ? 'paid' : balance.hasOverdue ? 'overdue' : balance.paid > 0 ? 'partial' : 'balance'
    return { student, ...balance, status }
  })
  const filteredAccounts = accounts.filter(({ student, status }) => {
    const normalizedSearch = search.trim().toLowerCase()
    const matchesSearch = !normalizedSearch || `${student.first_name} ${student.last_name} ${student.admission_number}`.toLowerCase().includes(normalizedSearch)
    const matchesClass = classFilter === 'all' || student.class_id === classFilter
    const matchesStatus = statusFilter === 'all' || status === statusFilter
    return matchesSearch && matchesClass && matchesStatus
  })
  const pendingTotal = queue.reduce((total, record) => total + record.amount_ugx, 0)

  return (
    <div className="flex flex-col gap-6">
      <section id="payment-form" className="scroll-mt-24 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="text-base font-semibold tracking-tight">Record a payment</h2><p className="mt-1 text-sm text-muted-foreground">Payments use a retry-safe request key and are scoped to the active school.</p></div>
          <Badge variant={online ? 'secondary' : 'outline'} className="h-6 gap-1.5 text-xs">
            {online ? <CircleDollarSign aria-hidden="true" data-icon="inline-start" /> : <WifiOff aria-hidden="true" data-icon="inline-start" />}
            {online ? 'Ready to record' : 'Offline queue available'}
          </Badge>
        </div>
        <form onSubmit={submitPayment}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="payment-student">Student</FieldLabel>
              <select id="payment-student" value={studentId} onChange={(event) => { setStudentId(event.target.value); setInvoiceId('') }} required disabled={!students.length} className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50">
                <option value="">{students.length ? 'Select a student' : 'Add a student first'}</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name} · {student.admission_number}</option>)}
              </select>
              {!students.length ? <FieldDescription>Register students before recording payments.</FieldDescription> : null}
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="payment-invoice">Invoice (optional)</FieldLabel>
              <select id="payment-invoice" value={invoiceId} onChange={(event) => {
                const nextInvoiceId = event.target.value
                setInvoiceId(nextInvoiceId)
                const nextInvoice = invoices.find((invoice) => invoice.id === nextInvoiceId)
                const remaining = nextInvoice ? Math.max(nextInvoice.amount_due_ugx - (paidByInvoice.get(nextInvoice.id) ?? 0), 0) : 0
                if (remaining > 0) setAmount(String(remaining))
              }} disabled={!studentId} className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50">
                <option value="">Unallocated payment</option>
                {activeStudentInvoices.map((invoice) => {
                  const remaining = Math.max(invoice.amount_due_ugx - (paidByInvoice.get(invoice.id) ?? 0), 0)
                  return <option key={invoice.id} value={invoice.id} disabled={remaining === 0}>{invoice.invoice_number} · balance {currency(remaining)}</option>
                })}
              </select>
              <FieldDescription>{selectedInvoice ? `Remaining before payment: ${currency(selectedInvoiceBalance)}${balanceAfterPayment !== null ? ` · after: ${currency(balanceAfterPayment)}` : ''}` : 'Choose an invoice only when the payment belongs to it.'}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="payment-amount">Amount ({school.currency_code})</FieldLabel>
              <Input id="payment-amount" type="number" inputMode="numeric" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} required placeholder="250000" className="h-10" />
            </Field>
            <Field>
              <FieldLabel htmlFor="payment-method">Payment method</FieldLabel>
              <select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value)} required className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {paymentMethods.map((paymentMethod) => <option key={paymentMethod.value} value={paymentMethod.value}>{paymentMethod.label}</option>)}
              </select>
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="payment-reference">Reference number</FieldLabel>
              <Input id="payment-reference" maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Mobile money or bank reference" className="h-10" />
            </Field>
          </FieldGroup>
          {message ? <p role={message.tone === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-lg px-3 py-2 text-sm ${message.tone === 'success' ? 'bg-emerald-50 text-emerald-800' : message.tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-amber-50 text-amber-900'}`}>{message.text}</p> : null}
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Offline entries are stored in a local IndexedDB queue scoped to your user and school, without student names.</p>
            <Button type="submit" disabled={!students.length || saving} className="min-h-10 gap-2 sm:min-w-40">
              <CircleDollarSign aria-hidden="true" data-icon="inline-start" /> {saving ? 'Saving…' : online ? 'Record payment' : 'Queue payment'}
            </Button>
          </div>
        </form>
      </section>

      {queue.length ? (
        <section aria-labelledby="queued-payments-title" className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="queued-payments-title" className="text-sm font-semibold text-amber-950">{queue.length} payment{queue.length === 1 ? '' : 's'} queued · {currency(pendingTotal)}</h2>
              <p className="mt-1 text-xs text-amber-900/80">Queued items sync when you return online. A receipt is available after each payment is confirmed.</p>
            </div>
            {online ? <Button type="button" variant="outline" disabled={syncing} onClick={() => void syncPendingPayments()} className="gap-2"><CloudUpload aria-hidden="true" data-icon="inline-start" /> {syncing ? 'Syncing…' : 'Sync queued payments'}</Button> : null}
          </div>
          <ul className="mt-3 divide-y divide-amber-200/70">
            {queue.map((record) => {
              const student = studentsById.get(record.student_id)
              return <li key={record.request_key} className="flex items-center justify-between gap-4 py-2 text-xs"><span className="truncate text-amber-950">{student ? `${student.first_name} ${student.last_name} · ${student.admission_number}` : 'Student account'} · queued {new Intl.DateTimeFormat('en-UG', { timeStyle: 'short', dateStyle: 'short' }).format(new Date(record.queued_at))}</span><span className="shrink-0 font-semibold text-amber-950">{currency(record.amount_ugx)}</span></li>
            })}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-base font-semibold tracking-tight">Student fee accounts</h2><p className="mt-1 text-sm text-muted-foreground">Search by student or admission number; filter by class and balance status.</p></div>
          <p className="text-xs text-muted-foreground">{filteredAccounts.length} of {accounts.length} students</p>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <label className="relative sm:col-span-1"><span className="sr-only">Search students</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student or admission no." className="h-10 pl-9" /></label>
          <label><span className="sr-only">Filter by class</span><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><option value="all">All classes</option>{classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.stream_name}</option>)}</select></label>
          <label><span className="sr-only">Filter by payment status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AccountStatus)} className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><option value="all">All payment statuses</option><option value="balance">Unpaid</option><option value="partial">Partially paid</option><option value="overdue">Overdue</option><option value="paid">Fully paid</option><option value="credit">Credit</option><option value="none">No invoice</option></select></label>
        </div>
        {filteredAccounts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead><tr className="border-b border-border text-xs text-muted-foreground"><th scope="col" className="pb-3 font-medium">Student</th><th scope="col" className="pb-3 font-medium">Class</th><th scope="col" className="pb-3 text-right font-medium">Invoiced</th><th scope="col" className="pb-3 text-right font-medium">Paid</th><th scope="col" className="pb-3 text-right font-medium">Balance</th><th scope="col" className="pb-3 text-right font-medium">Status</th></tr></thead>
              <tbody>{filteredAccounts.map(({ student, due, paid, balance, credit, status }) => <tr key={student.id} className="border-b border-border/70 last:border-0"><td className="py-3 pr-3"><button type="button" onClick={() => { setStudentId(student.id); setInvoiceId(''); document.getElementById('payment-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className="text-left font-medium text-primary hover:underline">{student.first_name} {student.last_name}<span className="mt-0.5 block text-xs font-normal text-muted-foreground">{student.admission_number}</span></button></td><td className="py-3 pr-3 text-muted-foreground">{student.class_id ? classNames.get(student.class_id) ?? 'Assigned' : 'Not assigned'}</td><td className="py-3 text-right">{currency(due)}</td><td className="py-3 text-right text-muted-foreground">{currency(paid)}</td><td className="py-3 text-right font-medium">{status === 'credit' ? `Credit · ${currency(credit)}` : currency(balance)}</td><td className="py-3 text-right"><Badge variant={status === 'overdue' ? 'destructive' : status === 'paid' || status === 'credit' ? 'secondary' : 'outline'}>{status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : status === 'partial' ? 'Partial' : status === 'credit' ? 'Credit' : status === 'none' ? 'No invoice' : 'Due'}</Badge></td></tr>)}</tbody>
            </table>
          </div>
        ) : <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No students match these filters.</div>}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4"><h2 className="text-base font-semibold tracking-tight">Recent payment register</h2><p className="mt-1 text-sm text-muted-foreground">Latest {payments.length} confirmed payments recorded for this school.</p></div>
        {payments.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-border text-xs text-muted-foreground"><th scope="col" className="pb-3 font-medium">Date</th><th scope="col" className="pb-3 font-medium">Student</th><th scope="col" className="pb-3 font-medium">Invoice / reference</th><th scope="col" className="pb-3 font-medium">Method</th><th scope="col" className="pb-3 text-right font-medium">Amount</th><th scope="col" className="pb-3 text-right font-medium">Receipt</th></tr></thead><tbody>{payments.map((payment) => { const student = studentsById.get(payment.student_id); return <tr key={payment.id} className="border-b border-border/70 last:border-0"><td className="py-3 pr-4 text-muted-foreground">{new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium' }).format(new Date(payment.received_at))}</td><td className="py-3 pr-4 font-medium">{student ? `${student.first_name} ${student.last_name} · ${student.admission_number}` : 'Student'}</td><td className="py-3 pr-4 text-muted-foreground">{payment.invoice_number ?? payment.reference_number ?? 'Unallocated'}</td><td className="py-3 pr-4 text-muted-foreground">{paymentMethodLabels[payment.method] ?? payment.method}</td><td className="py-3 text-right font-medium">{currency(payment.amount_ugx)}</td><td className="py-3 text-right">{student ? <ReceiptButton payment={payment} school={school} student={{ name: `${student.first_name} ${student.last_name}`, admissionNumber: student.admission_number }} /> : '—'}</td></tr>})}</tbody></table></div> : <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center"><p className="text-sm font-medium">No payments yet</p><p className="mt-1 text-xs text-muted-foreground">Confirmed payments will appear in this register.</p></div>}
      </section>
    </div>
  )
}
