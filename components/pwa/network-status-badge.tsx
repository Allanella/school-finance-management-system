'use client'

import { useEffect, useState } from 'react'
import { Cloud, CloudOff } from 'lucide-react'

export function NetworkStatusBadge() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine)
    updateStatus()
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  return (
    <span
      role="status"
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium sm:text-xs ${online ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}
    >
      {online ? <Cloud aria-hidden="true" className="size-3.5" /> : <CloudOff aria-hidden="true" className="size-3.5" />}
      <span className="hidden sm:inline">{online ? 'Online · Synced' : 'Offline · queue active'}</span>
      <span className="sm:hidden">{online ? 'Online' : 'Offline'}</span>
    </span>
  )
}
