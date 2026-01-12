"use client"
import { useEffect, useMemo, useRef, useState } from 'react'

type Option = { value: string; label: string }

export function AsyncSelect({
  placeholder,
  fetcher,
  value,
  onChange,
  className,
}: {
  placeholder?: string
  fetcher: (q: string) => Promise<Option[]>
  value?: string
  onChange: (val: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<Option[]>([])
  const [loading, setLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement|null>(null)

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const list = await fetcher(q)
        setOpts(list)
      } catch {
        setOpts([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q, fetcher])

  const selected = useMemo(() => opts.find(o => o.value === value), [opts, value])

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

  // Close when value changes externally
  useEffect(() => { if (open) setOpen(false) }, [value])

  return (
    <div className={`relative ${className || 'w-72'}`} ref={rootRef}>
      <button type="button" onClick={() => setOpen(v=>!v)} className="w-full border rounded-md px-3 py-2 text-left bg-white">
        {selected ? selected.label : (placeholder || 'Seçin…')}
      </button>
      {open && (
        <div className="absolute z-10 mt-2 w-full rounded-md border bg-white shadow-lg p-2" onKeyDown={(e)=>{ if (e.key==='Escape') setOpen(false) }}>
          <input autoFocus value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Ara…" className="w-full border rounded-md px-2 py-1 mb-2"/>
          <div className="max-h-64 overflow-auto divide-y">
            {loading ? <div className="p-2 text-sm text-slate-500">Yükleniyor…</div> : (
              opts.length ? opts.map(o => (
                <button key={o.value} className="w-full text-left px-2 py-2 hover:bg-slate-50" onClick={()=>{ onChange(o.value); setOpen(false) }}>
                  {o.label}
                </button>
              )) : <div className="p-2 text-sm text-slate-500">Sonuç yok</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
