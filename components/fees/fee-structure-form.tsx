import { createFeeStructure } from '@/app/actions/finance'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { LineItemsEditor } from '@/components/finance/line-items-editor'

type EducationLevelOption = { id: string; name: string }

type FeeStructureFormProps = {
  levels: EducationLevelOption[]
  currencyCode: string
  countryCode: string
}

export function FeeStructureForm({ levels, currencyCode, countryCode }: FeeStructureFormProps) {
  return (
    <form action={createFeeStructure} className="flex flex-col gap-5">
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="fee-structure-name">Structure name</FieldLabel>
          <Input id="fee-structure-name" name="name" required maxLength={120} placeholder="e.g. Term 1 tuition and materials" />
        </Field>
        <Field>
          <FieldLabel htmlFor="fee-structure-level">Education level</FieldLabel>
          <select id="fee-structure-level" name="education_level_id" required disabled={!levels.length} className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50">
            {levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
          </select>
          {!levels.length ? <FieldDescription>Add an active education level before creating a fee structure.</FieldDescription> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="fee-structure-student-type">Student type</FieldLabel>
          <select id="fee-structure-student-type" name="student_type" defaultValue="day" className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <option value="day">Day student</option>
            <option value="boarding">Boarding student</option>
            <option value="other">Other student type</option>
          </select>
          <FieldDescription>Day, boarding, and other student types can use separate schedules.</FieldDescription>
        </Field>
      </FieldGroup>
      <LineItemsEditor idPrefix="fee-structure-item" itemLabel="Fee item" currencyCode={currencyCode} countryCode={countryCode} />
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={!levels.length}>Save fee structure</Button>
      </div>
    </form>
  )
}
