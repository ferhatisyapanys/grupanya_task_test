"use client"
import React, { createContext, useContext, useMemo, useState } from 'react'

type Toast = { id: string; title?: string; message: string; type?: 'info' | 'success' | 'error' };

type ToastCtx = { toasts: Toast[]; push: (t: Omit<Toast, 'id'>) => void; remove: (id: string) => void }

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const api = useMemo<ToastCtx>(() => ({
    toasts,
    push: (t) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((arr) => [...arr, { id, ...t }])
      setTimeout(() => {
        setToasts((arr) => arr.filter((x) => x.id !== id))
      }, 3500)
    },
    remove: (id) => setToasts((arr) => arr.filter((x) => x.id !== id)),
  }), [toasts])

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="fixed right-4 bottom-4 grid gap-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className={`min-w-[260px] max-w-[380px] p-3 rounded-lg text-slate-900 shadow-lg ${t.type === 'error' ? 'bg-red-100' : t.type === 'success' ? 'bg-green-100' : 'bg-slate-200'}`}>
            {t.title && <div className="font-semibold mb-1">{t.title}</div>}
            <div className="text-sm">{t.message}</div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
