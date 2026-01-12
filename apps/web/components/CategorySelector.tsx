"use client"
import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../lib/api'

type Cat = { id: string; label: string; active: boolean; order: number; children?: Cat[] }

type Props = {
  main?: string
  sub?: string
  onChange: (main: string, sub: string) => void
  className?: string
  allowCustom?: boolean
  error?: boolean
}

export default function CategorySelector({ main = '', sub = '', onChange, className, allowCustom = false, error = false }: Props) {
  const [tree, setTree] = useState<Cat[]>([])
  const [m, setM] = useState(main)
  const [s, setS] = useState(sub)
  const [customMain, setCustomMain] = useState('')
  const [customSub, setCustomSub] = useState('')

  useEffect(() => { setM(main || ''); setS(sub || '') }, [main, sub])

  useEffect(() => {
    apiGet<Cat[]>(`/lov/categories?mode=TREE`).then(setTree).catch(() => setTree([]))
  }, [])

  const subs = useMemo(() => (tree.find(x => x.label === m)?.children || []), [tree, m])

  function onMainChange(val: string) {
    const nextMain = val
    const validSub = subs.some(c => c.label === s)
    const nextSub = validSub ? s : ''
    setM(nextMain); setS(nextSub)
    onChange(nextMain, nextSub)
  }
  function onSubChange(val: string) {
    setS(val)
    onChange(m, val)
  }

  return (
    <div className={(className || 'flex items-center gap-2') + (error ? ' ring-1 ring-red-500 rounded-md p-1' : '')}>
      <select value={m} onChange={(e)=> onMainChange(e.target.value)} className="border rounded-md px-2 py-2">
        <option value="">Main Category</option>
        {tree.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
      </select>
      <select value={s} onChange={(e)=> onSubChange(e.target.value)} className="border rounded-md px-2 py-2">
        <option value="">Sub Category</option>
        {subs.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
      </select>
      {allowCustom && (
        <div className="flex items-center gap-2">
          <input value={customMain} onChange={(e)=> { setCustomMain(e.target.value); onChange(e.target.value, s) }} placeholder="Özel Main" className="border rounded-md px-2 py-2 w-36" />
          <input value={customSub} onChange={(e)=> { setCustomSub(e.target.value); onChange(m, e.target.value) }} placeholder="Özel Sub" className="border rounded-md px-2 py-2 w-36" />
        </div>
      )}
    </div>
  )
}
