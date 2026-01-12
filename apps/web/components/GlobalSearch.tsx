"use client"
import { useEffect, useRef, useState } from 'react'

type Item = { id: string; label: string; type: 'account'|'lead'|'task' }

export default function GlobalSearch() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement|null>(null)

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setItems([]); return }
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
      const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
      const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'SALESPERSON', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
      const [acc, lead, task] = await Promise.all([
        f(`${base}/accounts/search?q=${encodeURIComponent(q)}`, { headers: hdrs }).then(r=>r.json()).catch(()=>[]),
        f(`${base}/leads/search?q=${encodeURIComponent(q)}`, { headers: hdrs }).then(r=>r.json()).catch(()=>[]),
        f(`${base}/tasks/search?q=${encodeURIComponent(q)}`, { headers: hdrs }).then(r=>r.json()).catch(()=>[]),
      ])
      const stripId = (label: string) => {
        // Remove trailing bullets like ` • <id>`
        const parts = label.split(' • ')
        if (parts.length > 1) parts.pop()
        return parts.join(' • ')
      }
      const merged: Item[] = [
        ...(acc as any[]).map(a => ({ id: a.id, label: stripId(a.label), type: 'account' as const })),
        ...(lead as any[]).map(l => ({ id: l.id, label: stripId(l.label), type: 'lead' as const })),
        ...(task as any[]).map(t => ({ id: t.id, label: stripId(t.label), type: 'task' as const })),
      ].slice(0, 15)
      setItems(merged)
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  function goto(it: Item) {
    setOpen(false)
    if (it.type === 'account') window.location.href = `/accounts/${it.id}`
    if (it.type === 'lead') window.location.href = `/leads`
    if (it.type === 'task') window.location.href = `/tasks/${it.id}`
  }

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

  return (
    <div className="relative w-96" ref={rootRef}>
      <input value={q} onChange={(e)=>{ setQ(e.target.value); setOpen(true) }} onFocus={()=>setOpen(true)} placeholder="Ara: Account/Lead/Task…" className="border rounded-md px-3 py-2 w-full"/>
      {open && q && (
        <div className="absolute z-10 mt-2 w-full rounded-md border bg-white shadow-lg max-h-80 overflow-auto">
          {items.length ? items.map((it, i) => (
            <button key={i} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm" onClick={()=>goto(it)}>
              <span className="uppercase text-xs text-slate-400">{it.type}</span> {it.label}
            </button>
          )) : <div className="p-3 text-sm text-slate-500">Sonuç yok</div>}
        </div>
      )}
    </div>
  )
}
