import { BookOpenCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { FormFeedback } from '@/components/forms/feedback'
import { addClass, addEducationLevel } from '@/app/actions/classes'
import { Panel, PageHeading } from '@/components/school/page-heading'
import { getSchoolContext } from '@/lib/school/context'
import { educationStageLabels, educationStages } from '@/lib/school/types'

type ClassesPageProps = { searchParams: Promise<{ status?: string }> }

export default async function ClassesPage({ searchParams }: ClassesPageProps) {
  const [{ supabase, school, role }, params] = await Promise.all([getSchoolContext(), searchParams])
  const [levelsResult, classesResult, studentCountsResult] = await Promise.all([
    supabase.from('education_levels').select('id, name, stage, sequence_index, is_active').eq('school_id', school.id).order('sequence_index'),
    supabase.from('classes').select('id, education_level_id, stream_name, academic_year_id').eq('school_id', school.id),
    supabase.from('students').select('class_id').eq('school_id', school.id),
  ])

  const levels = levelsResult.data ?? []
  const classes = classesResult.data ?? []
  const studentsByClass = new Map<string, number>()
  for (const student of studentCountsResult.data ?? []) {
    if (student.class_id) studentsByClass.set(student.class_id, (studentsByClass.get(student.class_id) ?? 0) + 1)
  }
  const levelNames = new Map(levels.map((level) => [level.id, level.name]))
  const canManage = ['owner', 'admin'].includes(role)

  return (
    <div className="space-y-6">
      <PageHeading title="Classes & levels" description="Adapt education stages and class streams to your school’s curriculum." />
      <FormFeedback code={params.status} />

      {canManage ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Add an education level" description="Use the stages that match your school. Custom levels are supported.">
            <form action={addEducationLevel}>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="level_name">Level name</FieldLabel>
                  <Input id="level_name" name="name" required maxLength={64} placeholder="e.g. P.1 or Year 1" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="stage">Education stage</FieldLabel>
                  <select id="stage" name="stage" defaultValue="primary" className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    {educationStages.map((stage) => <option key={stage} value={stage}>{educationStageLabels[stage]}</option>)}
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="sequence_index">Sort order</FieldLabel>
                  <Input id="sequence_index" name="sequence_index" type="number" min="0" max="999" step="1" defaultValue="1" required />
                  <FieldDescription>Used to order levels in registers.</FieldDescription>
                </Field>
              </FieldGroup>
              <div className="mt-5 flex justify-end">
                <Button type="submit">Add level</Button>
              </div>
            </form>
          </Panel>

          <Panel title="Add a class stream" description="A stream belongs to one school-defined education level.">
            <form action={addClass}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="education_level_id">Education level</FieldLabel>
                  <select id="education_level_id" name="education_level_id" required disabled={!levels.length} className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50">
                    {levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
                  </select>
                  {!levels.length ? <FieldDescription>Add an education level before creating a class.</FieldDescription> : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="stream_name">Stream</FieldLabel>
                  <Input id="stream_name" name="stream_name" maxLength={32} defaultValue="A" required placeholder="e.g. A, Blue, North" />
                </Field>
              </FieldGroup>
              <div className="mt-5 flex justify-end">
                <Button type="submit" disabled={!levels.length} className="gap-2"><BookOpenCheck aria-hidden="true" /> Add class</Button>
              </div>
            </form>
          </Panel>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Only school owners and administrators can change education levels or class streams.</div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={`Education levels (${levels.length})`} description="Levels can be named for any school system.">
          {levels.length ? (
            <ul className="divide-y divide-border">
              {levels.map((level) => (
                <li key={level.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{level.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{educationStageLabels[level.stage as keyof typeof educationStageLabels] ?? 'Custom'} · order {level.sequence_index}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${level.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{level.is_active ? 'Active' : 'Inactive'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No education levels yet. Add your first level above.</p>
          )}
        </Panel>

        <Panel title={`Class streams (${classes.length})`} description="Students can be assigned to streams from their register.">
          {classes.length ? (
            <ul className="divide-y divide-border">
              {classes.map((schoolClass) => (
                <li key={schoolClass.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{levelNames.get(schoolClass.education_level_id) ?? 'Education level'} · {schoolClass.stream_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{studentsByClass.get(schoolClass.id) ?? 0} students</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{schoolClass.academic_year_id ? 'Academic year linked' : 'No academic year linked'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No class streams yet. Add a level, then create a stream above.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}
