"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { getSdk } from '../lib/sdk'

type Props = { value?: string; onChange: (id: string) => void; placeholder?: string; allowedRoles?: string[] }

export default function UserPicker({ value, onChange, placeholder = 'Owner seçin…', allowedRoles }: Props) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement|null>(null)

  useEffect(() => {
    getSdk().usersList().then((u: any) => setUsers(u)).catch(() => setUsers([]))
  }, [])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    let base = users
    if (allowedRoles && allowedRoles.length) base = base.filter(u => allowedRoles.includes(u.role))
    if (!qq) return base
    return base.filter((u) => (u.name || '').toLowerCase().includes(qq) || (u.email || '').toLowerCase().includes(qq) || u.role.toLowerCase().includes(qq))
  }, [q, users, allowedRoles])

  const selected = users.find((u) => u.id === value)

  // Close on outside click
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = rootRef.current
      if (!el) return
      if (open && e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="px-3 py-2 border rounded-md text-left w-64 bg-white">
        {selected ? (
          <span>{selected.name || selected.email} <span className="text-xs text-slate-500">({selected.role})</span></span>
        ) : (
          <span className="text-slate-500">{placeholder}</span>
        )}
      </button>
      {open && (
        <div className="absolute z-10 mt-2 w-72 rounded-md border bg-white shadow-lg p-2" onKeyDown={(e)=>{ if (e.key==='Escape') setOpen(false) }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara…" className="w-full border rounded-md px-2 py-1 mb-2" />
          <div className="max-h-64 overflow-auto divide-y">
            {filtered.map((u) => (
              <button key={u.id} className="w-full text-left px-2 py-2 hover:bg-slate-50" onClick={() => { onChange(u.id); setOpen(false) }}>
                <div className="font-medium">{u.name || u.email}</div>
                <div className="text-xs text-slate-500">{u.email} • {u.role}</div>
              </button>
            ))}
            {filtered.length === 0 && <div className="text-sm text-slate-500 p-2">Sonuç yok</div>}
          </div>
        </div>
      )}
    </div>
  )
}
