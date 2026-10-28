import type { ReactNode } from 'react'
import { AppShell } from '@/components/school/app-shell'
import { getSchoolContext } from '@/lib/school/context'

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { school, user, role, schools, activeTerm } = await getSchoolContext()

  return (
    <AppShell
      schoolName={school.name}
      schoolType={school.school_type}
      activeSchoolId={school.id}
      schoolOptions={schools}
      activeTermLabel={activeTerm?.label ?? null}
      userEmail={user.email ?? ''}
      userId={user.id}
      role={role}
    >
      {children}
    </AppShell>
  )
}
