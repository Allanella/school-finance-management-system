import Link from 'next/link'
import { ArrowUpRight, CalendarDays, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { FormFeedback } from '@/components/forms/feedback'
import { createAcademicYear, createSchoolTerm, updateSchoolSettings } from '@/app/actions/settings'
import { Panel, PageHeading } from '@/components/school/page-heading'
import { getSchoolContext } from '@/lib/school/context'
import { getSchoolTypeLabel, schoolTypes, schoolTypeLabels } from '@/lib/school/types'

type SettingsPageProps = { searchParams: Promise<{ status?: string }> }

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const [{ supabase, school, user, role }, params] = await Promise.all([getSchoolContext(), searchParams])
  const [levelsResult, yearsResult, termsResult] = await Promise.all([
    supabase.from('education_levels').select('id, name, stage, sequence_index, is_active').eq('school_id', school.id).order('sequence_index'),
    supabase.from('academic_years').select('id, name, starts_on, ends_on').eq('school_id', school.id).order('starts_on', { ascending: false }),
    supabase.from('school_terms').select('id, academic_year_id, name, starts_on, ends_on').eq('school_id', school.id).order('starts_on', { ascending: false }),
  ])
  const levels = levelsResult.data ?? []
  const years = yearsResult.data ?? []
  const terms = termsResult.data ?? []
  const yearNames = new Map(years.map((year) => [year.id, year.name]))
  const canManage = ['owner', 'admin'].includes(role)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

  return (
    <div className="space-y-6">
      <PageHeading title="School settings" description="Manage your school profile, education type, and academic calendar." />
      <FormFeedback code={params.status} />

      {canManage ? (
        <Panel title="School profile" description="Default levels are added for primary and secondary school types; you can add or rename levels separately.">
          <form action={updateSchoolSettings}>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="school-name">School name</FieldLabel>
                <Input id="school-name" name="name" required minLength={2} maxLength={160} defaultValue={school.name} className="h-10" />
              </Field>
              <Field>
                <FieldLabel htmlFor="school-type">School type</FieldLabel>
                <select id="school-type" name="school_type" defaultValue={school.school_type} className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  {schoolTypes.map((schoolType) => <option key={schoolType} value={schoolType}>{schoolTypeLabels[schoolType]}</option>)}
                </select>
                <FieldDescription>Changing the type never removes existing education levels.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="currency">Accounting currency</FieldLabel>
                <Input id="currency" value={`${school.currency_code} · ${school.country_code}`} readOnly aria-readonly="true" className="h-10" />
                <FieldDescription>New workspaces start with UGX. Currency changes require a finance migration.</FieldDescription>
              </Field>
            </FieldGroup>
            <div className="mt-5 flex justify-end border-t border-border pt-4">
              <Button type="submit" className="gap-2"><Settings2 aria-hidden="true" /> Save school settings</Button>
            </div>
          </form>
        </Panel>
      ) : (
        <Panel title="School profile">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-medium text-muted-foreground">School name</dt><dd className="mt-1 text-sm font-medium">{school.name}</dd></div>
            <div><dt className="text-xs font-medium text-muted-foreground">School type</dt><dd className="mt-1 text-sm font-medium">{getSchoolTypeLabel(school.school_type)}</dd></div>
            <div><dt className="text-xs font-medium text-muted-foreground">Currency</dt><dd className="mt-1 text-sm font-medium">{school.currency_code} · {school.country_code}</dd></div>
            <div><dt className="text-xs font-medium text-muted-foreground">Access role</dt><dd className="mt-1 text-sm font-medium capitalize">{role}</dd></div>
          </dl>
        </Panel>
      )}

      {canManage ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Add academic year" description="Set the date range for the school year before adding terms.">
            <form action={createAcademicYear}>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="year-name">Academic year name</FieldLabel>
                  <Input id="year-name" name="name" required maxLength={64} placeholder="2026" className="h-10" />
                </Field>
                <Field><FieldLabel htmlFor="year-start">Starts</FieldLabel><Input id="year-start" name="starts_on" type="date" required className="h-10" /></Field>
                <Field><FieldLabel htmlFor="year-end">Ends</FieldLabel><Input id="year-end" name="ends_on" type="date" required className="h-10" /></Field>
              </FieldGroup>
              <div className="mt-5 flex justify-end"><Button type="submit" className="gap-2"><CalendarDays aria-hidden="true" /> Add year</Button></div>
            </form>
          </Panel>

          <Panel title="Add school term" description="Terms must fit inside one school’s academic year.">
            <form action={createSchoolTerm}>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="academic-year-id">Academic year</FieldLabel>
                  <select id="academic-year-id" name="academic_year_id" required disabled={!years.length} className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50">
                    {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
                  </select>
                  {!years.length ? <FieldDescription>Add an academic year before adding terms.</FieldDescription> : null}
                </Field>
                <Field><FieldLabel htmlFor="term-name">Term name</FieldLabel><Input id="term-name" name="name" required maxLength={64} placeholder="Term 1" className="h-10" /></Field>
                <Field><FieldLabel htmlFor="term-start">Starts</FieldLabel><Input id="term-start" name="starts_on" type="date" required className="h-10" /></Field>
                <Field><FieldLabel htmlFor="term-end">Ends</FieldLabel><Input id="term-end" name="ends_on" type="date" required className="h-10" /></Field>
              </FieldGroup>
              <div className="mt-5 flex justify-end"><Button type="submit" disabled={!years.length} className="gap-2"><CalendarDays aria-hidden="true" /> Add term</Button></div>
            </form>
          </Panel>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title={`Education levels (${levels.length})`}
          description="The school can use its own naming and sequence."
          action={<Link href="/classes" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Manage levels <ArrowUpRight aria-hidden="true" className="size-3.5" /></Link>}
        >
          {levels.length ? (
            <ul className="divide-y divide-border">
              {levels.map((level) => <li key={level.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><span className="text-sm font-medium">{level.name}</span><span className="text-xs text-muted-foreground">Order {level.sequence_index} · {level.is_active ? 'Active' : 'Inactive'}</span></li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No education levels configured yet.</p>}
        </Panel>

        <Panel title={`Academic periods (${terms.length} terms)`} description="The current term is shown in the app header when today falls within its dates.">
          {terms.length ? (
            <ul className="divide-y divide-border">
              {terms.map((term) => {
                const isCurrent = term.starts_on <= today && term.ends_on >= today
                return (
                  <li key={term.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div><p className="text-sm font-medium">{term.name} · {yearNames.get(term.academic_year_id) ?? 'Academic year'}</p><p className="mt-0.5 text-xs text-muted-foreground">{term.starts_on} to {term.ends_on}</p></div>
                    {isCurrent ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Active now</span> : null}
                  </li>
                )
              })}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No terms configured yet. Add an academic year, then add a term.</p>}
        </Panel>

        <Panel title="Account" description="Access details for your signed-in school account.">
          <dl className="space-y-3">
            <div className="flex flex-col gap-1 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between"><dt className="text-xs text-muted-foreground">Email</dt><dd className="break-all text-sm font-medium">{user.email ?? 'No email available'}</dd></div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><dt className="text-xs text-muted-foreground">School role</dt><dd className="text-sm font-medium capitalize">{role}</dd></div>
          </dl>
          <p className="mt-5 rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">Student and finance records are scoped to this school. Ask a school administrator to manage membership access.</p>
        </Panel>
      </div>
    </div>
  )
}
