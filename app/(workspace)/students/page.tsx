import Link from 'next/link'
import { ArrowUpRight, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { FormFeedback } from '@/components/forms/feedback'
import { addStudent } from '@/app/actions/students'
import { Panel, PageHeading } from '@/components/school/page-heading'
import { getSchoolContext } from '@/lib/school/context'

const dateFormatter = new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium', timeZone: 'UTC' })

type StudentsPageProps = { searchParams: Promise<{ status?: string }> }

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const [{ supabase, school }, params] = await Promise.all([getSchoolContext(), searchParams])
  const [studentsResult, classesResult, levelsResult] = await Promise.all([
    supabase
      .from('students')
      .select('id, admission_number, first_name, last_name, class_id, student_type, status, admitted_on')
      .eq('school_id', school.id)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true }),
    supabase.from('classes').select('id, education_level_id, stream_name').eq('school_id', school.id),
    supabase.from('education_levels').select('id, name').eq('school_id', school.id),
  ])

  const students = studentsResult.data ?? []
  const classes = classesResult.data ?? []
  const levels = levelsResult.data ?? []
  const levelNames = new Map(levels.map((level) => [level.id, level.name]))
  const classNames = new Map(
    classes.map((schoolClass) => [
      schoolClass.id,
      `${levelNames.get(schoolClass.education_level_id) ?? 'Level'} · ${schoolClass.stream_name}`,
    ]),
  )

  return (
    <div className="space-y-6">
      <PageHeading
        title="Students"
        description="Maintain the school register and link learners to the right class stream."
        action={
          <Link href="/classes" className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted">
            Classes & levels <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        }
      />
      <FormFeedback code={params.status} />

      <Panel title="Register a student" description="Admission numbers must be unique within your school.">
        <form action={addStudent}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="admission_number">Admission number</FieldLabel>
              <Input id="admission_number" name="admission_number" required maxLength={64} placeholder="e.g. 2026-014" />
            </Field>
            <Field>
              <FieldLabel htmlFor="first_name">First name</FieldLabel>
              <Input id="first_name" name="first_name" required maxLength={80} autoComplete="given-name" />
            </Field>
            <Field>
              <FieldLabel htmlFor="last_name">Last name</FieldLabel>
              <Input id="last_name" name="last_name" required maxLength={80} autoComplete="family-name" />
            </Field>
            <Field>
              <FieldLabel htmlFor="class_id">Class stream</FieldLabel>
              <select id="class_id" name="class_id" defaultValue="" className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="">Not assigned yet</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>{classNames.get(schoolClass.id)}</option>
                ))}
              </select>
              <FieldDescription>Class assignment can be updated later.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="student_type">Student type</FieldLabel>
              <select id="student_type" name="student_type" defaultValue="day" className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="day">Day</option>
                <option value="boarding">Boarding</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="guardian_name">Parent or guardian</FieldLabel>
              <Input id="guardian_name" name="guardian_name" maxLength={120} autoComplete="name" />
            </Field>
            <Field>
              <FieldLabel htmlFor="guardian_phone">Guardian phone</FieldLabel>
              <Input id="guardian_phone" name="guardian_phone" type="tel" maxLength={32} autoComplete="tel" placeholder="+256 700 000 000" />
            </Field>
          </FieldGroup>
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{levels.length} education level{levels.length === 1 ? '' : 's'} configured</p>
            <Button type="submit" className="gap-2">
              <UserPlus aria-hidden="true" /> Add student
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title={`Student register (${students.length})`} description="Students are visible only within this school workspace.">
        {students.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th scope="col" className="pb-3 font-medium">Admission no.</th>
                  <th scope="col" className="pb-3 font-medium">Student</th>
                  <th scope="col" className="pb-3 font-medium">Class stream</th>
                  <th scope="col" className="pb-3 font-medium">Type</th>
                  <th scope="col" className="pb-3 font-medium">Admitted</th>
                  <th scope="col" className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-border/70 last:border-0">
                    <td className="py-3 pr-4 font-medium">{student.admission_number}</td>
                    <td className="py-3 pr-4">{student.first_name} {student.last_name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{student.class_id ? classNames.get(student.class_id) ?? 'Unassigned' : 'Unassigned'}</td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">{student.student_type}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{dateFormatter.format(new Date(student.admitted_on))}</td>
                    <td className="py-3"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">{student.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-9 text-center">
            <p className="text-sm font-medium">No students yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Use the form above to add your first student to the register.</p>
          </div>
        )}
      </Panel>
    </div>
  )
}
