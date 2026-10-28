import { generateClassInvoices } from '@/app/actions/finance'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type StructureOption = { id: string; name: string; education_level_id: string; student_type: string }
type ClassOption = { id: string; education_level_id: string; stream_name: string }

type BulkInvoiceFormProps = {
  structures: StructureOption[]
  classes: ClassOption[]
  levelNames: Map<string, string>
  activeTerm: { label: string; ends_on: string } | null
}

export function BulkInvoiceForm({ structures, classes, levelNames, activeTerm }: BulkInvoiceFormProps) {
  const canSubmit = Boolean(activeTerm && structures.length && classes.length)

  return (
    <form action={generateClassInvoices} className="flex flex-col gap-4">
      {activeTerm ? (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">Invoices will be linked to <span className="font-medium text-foreground">{activeTerm.label}</span>.</p>
      ) : (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Set an active school term before generating class invoices.</p>
      )}
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="batch-fee-structure">Fee structure</FieldLabel>
          <select id="batch-fee-structure" name="fee_structure_id" required disabled={!structures.length} className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50">
            {structures.map((structure) => <option key={structure.id} value={structure.id}>{levelNames.get(structure.education_level_id) ?? 'Level'} · {structure.student_type} · {structure.name}</option>)}
          </select>
          {!structures.length ? <FieldDescription>Save an active fee structure first.</FieldDescription> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="batch-fee-class">Class / stream</FieldLabel>
          <select id="batch-fee-class" name="class_id" required disabled={!classes.length} className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50">
            {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{levelNames.get(schoolClass.education_level_id) ?? 'Level'} · {schoolClass.stream_name}</option>)}
          </select>
          {!classes.length ? <FieldDescription>Add a class stream before generating invoices.</FieldDescription> : null}
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="batch-invoice-due-date">Due date</FieldLabel>
          <Input id="batch-invoice-due-date" name="due_on" type="date" defaultValue={activeTerm?.ends_on ?? ''} required />
          <FieldDescription>Only active students whose day or boarding type matches the structure will be invoiced. Existing invoices for this structure and term are skipped.</FieldDescription>
        </Field>
      </FieldGroup>
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={!canSubmit}>Generate class invoices</Button>
      </div>
    </form>
  )
}
