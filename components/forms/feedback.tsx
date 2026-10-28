const messages: Record<string, string> = {
  saved: 'Changes saved.',
  year_added: 'Academic year added.',
  term_added: 'Term added.',
  student_added: 'Student added successfully.',
  level_added: 'Education level added.',
  class_added: 'Class added successfully.',
  invoice_added: 'Fee invoice created.',
  payment_added: 'Payment recorded.',
  expense_added: 'Expense recorded.',
  fee_structure_added: 'Fee structure saved and ready to use.',
  structure_partial: 'The fee structure could not finish saving. It remains inactive and cannot generate invoices.',
  invoices_generated: 'Invoices generated for eligible students. Existing matching term invoices were skipped.',
  all_invoiced: 'Every eligible student already has an invoice for this structure and term.',
  no_active_term: 'Set an active school term before generating invoices.',
  no_students: 'No active students in this class match the selected student type.',
  too_many_students: 'This class exceeds the 1,000-student batch limit. Split the class before invoicing.',
  structure_class_mismatch: 'The fee structure and class must belong to the same education level.',
  requisition_submitted: 'Expense requisition submitted for finance review.',
  requisition_approved: 'Requisition approved. Record the actual expense when it is incurred.',
  requisition_rejected: 'Requisition rejected.',
  requisition_conflict: 'This requisition has already been reviewed. Refresh the page to see its latest status.',
  invalid: 'Check the form fields and try again.',
  failed: 'We could not save this item. Please review your access and try again.',
  duplicate: 'That identifier is already in use for this school.',
}

export function FormFeedback({ code }: { code?: string }) {
  if (!code || !messages[code]) return null
  const isError = ['invalid', 'failed', 'duplicate', 'structure_partial', 'no_active_term', 'no_students', 'too_many_students', 'structure_class_mismatch', 'requisition_conflict'].includes(code)

  return (
    <p
      role={isError ? 'alert' : 'status'}
      className={`mb-4 rounded-lg border px-3 py-2.5 text-sm ${isError ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-primary/20 bg-primary/5 text-foreground'}`}
    >
      {messages[code]}
    </p>
  )
}
