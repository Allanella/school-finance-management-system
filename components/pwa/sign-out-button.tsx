'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { clearQueuedPaymentsForUser } from '@/lib/offline/payment-queue'

export function SignOutButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false)

  async function handleSignOut() {
    setBusy(true)
    try {
      await clearQueuedPaymentsForUser(userId)
    } catch {
      // Sign-out remains available even if local browser storage cannot be cleared.
    }
    await signOut()
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={busy}
      className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
    >
      <LogOut aria-hidden="true" className="size-4" />
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
