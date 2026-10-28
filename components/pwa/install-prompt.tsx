'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

type InstallChoice = { outcome: 'accepted' | 'dismissed'; platform: string }
type BeforeInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<InstallChoice>
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPrompt | null>(null)
  const [standalone, setStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)')
    const checkStandalone = () => setStandalone(displayMode.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPrompt)
    }
    checkStandalone()
    displayMode.addEventListener('change', checkStandalone)
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', checkStandalone)

    return () => {
      displayMode.removeEventListener('change', checkStandalone)
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', checkStandalone)
    }
  }, [])

  if (standalone || dismissed) return null

  async function installApp() {
    if (!installEvent) {
      setShowInstructions(true)
      return
    }
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') setStandalone(true)
    setInstallEvent(null)
  }

  return (
    <aside className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Download aria-hidden="true" className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">Install School Finance App</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            With the payment desk open, entries can be queued locally during a connection outage and synced when you reconnect. Private pages are not cached.
          </p>
          {showInstructions ? (
            <p className="mt-1 text-xs text-muted-foreground">Use your browser menu and choose “Install app” or “Add to Home Screen”.</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-11 sm:pl-0">
        <button type="button" onClick={installApp} className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          Install
        </button>
        <button type="button" aria-label="Dismiss install prompt" onClick={() => setDismissed(true)} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-background">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </aside>
  )
}
