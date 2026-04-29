'use client'

import { useState, useEffect } from 'react'

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' }

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    function onToast(e: Event) {
      const { message, type } = (e as CustomEvent<{ message: string; type: Toast['type'] }>).detail
      const id = Date.now()
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 6000)
    }
    window.addEventListener('app:toast', onToast)
    return () => window.removeEventListener('app:toast', onToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`max-w-sm rounded-lg px-4 py-3 shadow-lg text-sm text-white leading-snug
            ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
