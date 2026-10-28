'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import {
  BookOpenCheck,
  ChartNoAxesCombined,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Settings2,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react'
import { switchSchool } from '@/app/actions/school'
import { SignOutButton } from '@/components/pwa/sign-out-button'
import { NetworkStatusBadge } from '@/components/pwa/network-status-badge'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import type { SchoolOption } from '@/lib/school/context'
import { getSchoolTypeLabel } from '@/lib/school/types'

type AppShellProps = {
  children: ReactNode
  schoolName: string
  schoolType: string
  activeSchoolId: string
  schoolOptions: SchoolOption[]
  activeTermLabel: string | null
  userEmail: string
  role: string
  userId: string
}

const navigation = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/students', label: 'Students', icon: UsersRound },
  { href: '/classes', label: 'Classes & levels', icon: BookOpenCheck },
  { href: '/fees', label: 'Fees & invoices', icon: ReceiptText },
  { href: '/payments', label: 'Payments', icon: CircleDollarSign },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/reports', label: 'Reports', icon: ChartNoAxesCombined },
  { href: '/settings', label: 'Settings', icon: Settings2 },
]

const mobileNavigation = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/fees', label: 'Fees', icon: ReceiptText },
  { href: '/payments', label: 'Collect', icon: CircleDollarSign },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings2 },
]

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span>{label}</span>
            {active ? <ChevronRight aria-hidden="true" className="ml-auto size-4 opacity-70" /> : null}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarContent({
  schoolName,
  schoolType,
  role,
  userId,
  onNavigate,
}: Pick<AppShellProps, 'schoolName' | 'schoolType' | 'role' | 'userId'> & { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <GraduationCap aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">SchoolFinance</p>
          <p className="truncate text-xs text-muted-foreground">{schoolName}</p>
        </div>
      </div>
      <div className="px-4 py-4">
        <div className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <p className="text-xs font-medium text-foreground">{getSchoolTypeLabel(schoolType)}</p>
          <p className="mt-0.5 text-xs capitalize text-muted-foreground">{role}</p>
        </div>
        <NavigationLinks onNavigate={onNavigate} />
      </div>
      <div className="mt-auto border-t border-border p-4">
        <SignOutButton userId={userId} />
      </div>
    </div>
  )
}

function SchoolSwitcher({
  activeSchoolId,
  schoolOptions,
  schoolName,
}: Pick<AppShellProps, 'activeSchoolId' | 'schoolOptions' | 'schoolName'>) {
  if (schoolOptions.length < 2) {
    return <span className="max-w-40 truncate text-sm font-medium text-muted-foreground md:max-w-60">{schoolName}</span>
  }

  return (
    <form action={switchSchool} className="min-w-0">
      <label htmlFor="active-school" className="sr-only">Active school</label>
      <select
        id="active-school"
        name="school_id"
        defaultValue={activeSchoolId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-9 max-w-40 truncate rounded-md border border-border bg-background px-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-56"
      >
        {schoolOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </form>
  )
}

function MobileBottomNavigation() {
  const pathname = usePathname()

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {mobileNavigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                <Icon aria-hidden="true" className="size-4" />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function AppShell({
  children,
  schoolName,
  schoolType,
  activeSchoolId,
  schoolOptions,
  activeTermLabel,
  userEmail,
  role,
  userId,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border bg-card md:block">
        <SidebarContent schoolName={schoolName} schoolType={schoolType} role={role} userId={userId} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-foreground/30" />
          <aside className="absolute inset-y-0 left-0 w-[min(20rem,85vw)] border-r border-border bg-card shadow-xl">
            <div className="absolute right-3 top-3 z-10">
              <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <SidebarContent schoolName={schoolName} schoolType={schoolType} role={role} userId={userId} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-dvh flex-col md:pl-64">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground md:hidden">
              <Menu aria-hidden="true" className="size-4" />
            </button>
            <SchoolSwitcher activeSchoolId={activeSchoolId} schoolOptions={schoolOptions} schoolName={schoolName} />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden max-w-44 truncate rounded-full bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground lg:inline-flex">
              {activeTermLabel ?? 'No active term'}
            </span>
            <NetworkStatusBadge />
            <span className="hidden max-w-48 truncate text-xs text-muted-foreground xl:inline">{userEmail}</span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {userEmail.slice(0, 1).toUpperCase() || 'S'}
            </span>
          </div>
        </header>
        <div className="px-4 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl"><InstallPrompt /></div>
        </div>
        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 md:pb-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileBottomNavigation />
    </div>
  )
}
