'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Printer, X } from 'lucide-react'
import { formatCurrency } from '@/lib/school/format-currency'

type ReceiptButtonProps = {
  payment: {
    id: string
    amount_ugx: number
    received_at: string
    method: string
    reference_number: string | null
    invoice_number?: string | null
  }
  school: { name: string; currency_code: string; country_code: string }
  student: { name: string; admissionNumber: string }
}

const methodNames: Record<string, string> = {
  mobile_money: 'Mobile money',
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
}

export function ReceiptButton({ payment, school, student }: ReceiptButtonProps) {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const receiptNumber = `RCPT-${payment.id.slice(0, 8).toUpperCase()}`
  const amount = formatCurrency(payment.amount_ugx, school.currency_code, school.country_code)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted">
        <Printer aria-hidden="true" className="size-3.5" /> Receipt
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        className="receipt-dialog m-auto max-h-[90vh] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-foreground/40"
      >
        <div className="receipt-sheet p-6 sm:p-8">
          <div className="receipt-dialog-actions mb-5 flex items-center justify-between">
            <p className="text-sm font-semibold">Payment receipt</p>
            <button type="button" aria-label="Close receipt" onClick={() => setOpen(false)} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="border-b-2 border-primary pb-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Official payment receipt</p>
            <h2 id={headingId} className="mt-2 text-xl font-semibold tracking-tight">{school.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{school.country_code} · {school.currency_code}</p>
          </div>
          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Receipt number</p>
              <p className="mt-1 font-mono text-sm font-semibold">{receiptNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Date received</p>
              <p className="mt-1 text-sm font-medium">{new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium' }).format(new Date(payment.received_at))}</p>
            </div>
          </div>
          <dl className="mt-5 divide-y divide-border rounded-lg border border-border px-4">
            <div className="flex justify-between gap-4 py-3"><dt className="text-xs text-muted-foreground">Student</dt><dd className="text-right text-sm font-medium">{student.name}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-xs text-muted-foreground">Admission number</dt><dd className="text-right text-sm font-medium">{student.admissionNumber}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-xs text-muted-foreground">Payment method</dt><dd className="text-right text-sm font-medium">{methodNames[payment.method] ?? payment.method}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-xs text-muted-foreground">Invoice</dt><dd className="text-right text-sm font-medium">{payment.invoice_number ?? 'Unallocated payment'}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-xs text-muted-foreground">Reference</dt><dd className="max-w-48 break-all text-right text-sm font-medium">{payment.reference_number ?? '—'}</dd></div>
            <div className="flex justify-between gap-4 py-4"><dt className="text-sm font-semibold">Amount received</dt><dd className="text-right text-lg font-bold">{amount}</dd></div>
          </dl>
          <div className="mt-5 flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-3">
            <div><p className="text-xs font-medium">Verification reference</p><p className="mt-1 font-mono text-xs text-muted-foreground">{payment.id.toUpperCase()}</p></div>
            <div aria-label="QR verification placeholder; receipt verification is not enabled" className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-background px-2 text-center text-[9px] font-medium leading-3 text-muted-foreground">QR verification<br />not enabled</div>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">Thank you. Keep this receipt for your records.</p>
          <div className="receipt-dialog-actions mt-6 flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">Close</button>
            <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Printer aria-hidden="true" className="size-4" /> Print / Save as PDF
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
