"use client"
import { useEffect, useRef, useState } from 'react'
import { useRef as _useRef } from 'react'
import { API_BASE, apiGet, apiPatch } from '../lib/api'

type Notification = { id: string; message: string; readAt?: string | null; taskId?: string | null }

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const timerRef = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement|null>(null)

  async function load() {
    try {
      const data = await apiGet<Notification[]>(`/notifications/me`)
      setItems(data)
    } catch {
      // ignore errors in polling
    }
  }

  useEffect(() => {
    load()
    // Try SSE first
    const url = new URL(`${API_BASE}/notifications/stream`)
    // Pass dev identity via query for middleware (prefer localStorage)
    const uid = (typeof window!=='undefined' && (window.localStorage.getItem('userId') || window.localStorage.getItem('devUserId'))) || (process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user')
    const role = (typeof window!=='undefined' && (window.localStorage.getItem('userRole') || window.localStorage.getItem('devRole'))) || (process.env.NEXT_PUBLIC_DEV_ROLE || 'SALESPERSON')
    url.searchParams.set('u', uid)
    url.searchParams.set('role', role)
    const es = new EventSource(url.toString())
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        setItems((arr) => [{ id: data.id, message: data.message, taskId: data.taskId }, ...arr])
      } catch {}
    }
    es.onerror = () => {
      // Fallback to polling if SSE fails
      if (!timerRef.current) timerRef.current = window.setInterval(load, 10000)
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [])

  // Close on outside click / Esc
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = rootRef.current
      if (!el) return
      if (open && e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (open && e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDocDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const unread = items.filter(i => !i.readAt)

  async function markRead(id: string) {
    await apiPatch(`/notifications/${id}/read`)
    await load()
  }

  return (
    <div className="relative" ref={rootRef}>
      <button onClick={() => setOpen((v) => !v)} className="relative text-xl" title="Bildirimler">
        🔔
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full px-1 text-xs">
            {unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 border rounded-lg bg-white w-80 max-h-80 overflow-auto z-10 shadow-lg">
          <div className="p-2 border-b font-semibold">Bildirimler</div>
          {items.length === 0 && <div className="p-3 text-slate-500">Bildirim yok</div>}
          {items.map(n => (
            <div key={n.id} className="flex gap-2 items-center p-2 border-b last:border-b-0">
              <div className="flex-1">
                <div className="text-sm">{n.message}</div>
                {n.taskId && <a href={`/tasks/${n.taskId}`} className="text-xs text-blue-600">Göreve git</a>}
              </div>
              {!n.readAt && (
                <button onClick={() => markRead(n.id)} className="border rounded-md px-2 py-1 text-sm bg-slate-50">Okundu</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
