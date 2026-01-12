"use client"
import { useEffect, useMemo, useState } from 'react'
import { getSdk } from '../../lib/sdk'
import { useSearchParams } from 'next/navigation'
import { useToast } from '../../components/Toaster'
import { Button } from '@grupanya/ui'
import { AsyncSelect } from '../../components/AsyncSelect'
import CategorySelector from '../../components/CategorySelector'
import UserPicker from '../../components/UserPicker'

type Task = { id: string; accountId: string; status: string; generalStatus: string; ownerId?: string | null; creationDate: string; priority: string; account?: { accountName: string } }
type Account = { id: string; accountName: string; type?: 'KEY'|'LONG_TAIL'; source?: 'QUERY'|'FRESH'|'RAKIP'|'REFERANS'|'OLD' }
type TaskList = { id: string; name: string; tag?: 'GENERAL'|'PROJECT' }

export default function TasksPage() {
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [lists, setLists] = useState<TaskList[]>([])
  const [form, setForm] = useState({ taskListId: '', accountId: '', details: '' })
  const [enums, setEnums] = useState<any>(null)
  const [lov, setLov] = useState<{ MAIN_CATEGORY: string[]; SUB_CATEGORY: string[] }|null>(null)
  const [taskFields, setTaskFields] = useState<{ category: string; type: string; priority: string; accountType: string; source: string; mainCategory: string; subCategory: string; city: string; district?: string; status?: string; generalStatus?: string; ownerId?: string; durationDays?: number}>({
    category: 'ISTANBUL_CORE',
    type: 'GENERAL',
    priority: 'MEDIUM',
    accountType: 'LONG_TAIL',
    source: 'QUERY',
    mainCategory: 'General',
    subCategory: 'General',
    city: '',
  })
  const [contacts, setContacts] = useState<any[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [accountOpenTasks, setAccountOpenTasks] = useState<number>(0)
  const { push } = useToast()
  // Applied filters (used to fetch)
  // Default view: HOT + OPEN
  const [filters, setFilters] = useState<{ ownerId?: string; status?: string; generalStatus?: string; q?: string; city?: string; page?: number; limit?: number }>({ status: 'HOT', generalStatus: 'OPEN', page: 1, limit: 20 })
  // Pending filters (bound to inputs); only applied when clicking "Uygula"
  const [pending, setPending] = useState<{ ownerId?: string; statuses?: string[]; generalStatus?: string; q?: string; city?: string }>({ statuses: ['HOT'], generalStatus: 'OPEN' })
  const [total, setTotal] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<string | null>(null)
  // Selection and assign helpers for unassigned view
  const [selected, setSelected] = useState<string[]>([])
  const [perOwner, setPerOwner] = useState<Record<string, string | undefined>>({})
  const [perDuration, setPerDuration] = useState<Record<string, number | undefined>>({})
  const [bulkOwnerId, setBulkOwnerId] = useState<string>('')
  const [bulkDuration, setBulkDuration] = useState<number>(7)

  async function load() {
    const sdk = getSdk()
    const [t, a, l] = await Promise.all([
      sdk.tasksList(filters) as any,
      sdk.accountsList().then((r: any) => r.items),
      sdk.tasklists() as any,
    ])
    if (Array.isArray(t)) { setTasks(t); setTotal(0) } else { setTasks(t.items || []); setTotal(t.total || 0) }
    setAccounts(a)
    setLists(l)
    setForm((f) => ({ ...f, taskListId: f.taskListId || l[0]?.id || '', accountId: f.accountId || a[0]?.id || '' }))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { load() }, [filters])
  useEffect(() => { getSdk().me().then((r:any)=> { setMyId(r?.user?.id || r?.id || null); setMyRole(r?.user?.role || r?.role || null) }).catch(()=> { setMyId(null); setMyRole(null) }) }, [])
  useEffect(() => {
    const own = searchParams.get('own')
    const unassigned = searchParams.get('unassigned')
    if (own === '1' && myId) setFilters(f=> ({ ...f, ownerId: myId, page: 1 }))
    else if (unassigned === '1') setFilters(f=> ({ ...f, ownerId: 'null', page: 1 }))
  }, [searchParams, myId])

  // When task list changes, auto-set task type from list tag
  useEffect(() => {
    if (!form.taskListId || !lists.length) return
    const tl = lists.find(x => x.id === form.taskListId)
    if (tl?.tag) {
      setTaskFields((tf) => ({ ...tf, type: tl.tag === 'PROJECT' ? 'PROJECT' : 'GENERAL' }))
    }
  }, [form.taskListId, lists])

  // When account changes, fetch details/contacts and auto-fill accountType/source
  useEffect(() => {
    (async () => {
      if (!form.accountId) { setContacts([]); setSelectedContactId(''); setAccountOpenTasks(0); return }
      try {
        const sdk = getSdk()
        const detail: any = await sdk.accountDetail(form.accountId)
        setAccountOpenTasks(detail?.openTasks || 0)
        setContacts(detail?.contacts || [])
        setSelectedContactId('')
        // Auto-fill accountType/source from account
        const acc = detail as any
        setTaskFields((tf) => ({
          ...tf,
          accountType: acc?.type || tf.accountType,
          source: acc?.source || tf.source,
          // Default City/District from account if empty in form
          city: tf.city || acc?.city || '',
          district: tf.district || acc?.district || undefined,
          // Default Main/Sub Category from account if present
          mainCategory: acc?.mainCategory || tf.mainCategory,
          subCategory: acc?.subCategory || tf.subCategory,
        }))
      } catch {
        setContacts([]); setSelectedContactId(''); setAccountOpenTasks(0)
      }
    })()
  }, [form.accountId])

  useEffect(() => {
    // fetch enums for dropdowns
    (async () => {
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
      const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
      const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'TEAM_LEADER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
      const res = await f(`${base}/lov/enums`, { headers: hdrs })
      const data = await res.json()
      setEnums(data)
      const [main, sub] = await Promise.all([
        f(`${base}/lov?type=MAIN_CATEGORY`, { headers: hdrs }).then(r=>r.json()).catch(()=>[]),
        f(`${base}/lov?type=SUB_CATEGORY`, { headers: hdrs }).then(r=>r.json()).catch(()=>[]),
      ])
      setLov({ MAIN_CATEGORY: (main as any[]).map(x=>x.label), SUB_CATEGORY: (sub as any[]).map(x=>x.label) })
    })()
  }, [])

  async function create() {
    if (!form.taskListId || !form.accountId) return
    // UI pre-validation: General list + account has open tasks warning
    const list = lists.find(l => l.id === form.taskListId)
    if ((list?.tag || taskFields.type) === 'GENERAL' && accountOpenTasks > 0) {
      push({ type: 'error', message: 'Bu account için açık bir General task mevcut. Önce onu kapatın.' })
      return
    }
    // Required fields validation
    const missing = !taskFields.category || !taskFields.type || !taskFields.priority || !taskFields.mainCategory || !taskFields.subCategory || !form.details
    if (missing) {
      setShowErrors(true)
      push({ type: 'error', message: 'Zorunlu alanları doldurun.' })
      return
    }
    try {
      await getSdk().taskCreate({
        taskListId: form.taskListId,
        accountId: form.accountId,
        category: taskFields.category,
        type: taskFields.type,
        priority: taskFields.priority,
        accountType: taskFields.accountType,
        source: taskFields.source,
        mainCategory: taskFields.mainCategory,
        subCategory: taskFields.subCategory,
        contact: (selectedContactId && contacts.find(c=>c.id===selectedContactId)?.name) || undefined,
        city: taskFields.city || undefined,
        district: taskFields.district || undefined,
        ownerId: taskFields.ownerId || undefined,
        status: (taskFields.status as any) || undefined,
        generalStatus: (taskFields.generalStatus as any) || undefined,
        durationDays: taskFields.durationDays || undefined,
        details: form.details || 'Yeni task',
      })
      push({ type: 'success', message: 'Task oluşturuldu.' })
      setForm((f) => ({ ...f, details: '' }))
      setSelectedContactId('')
      setShowErrors(false)
      await load()
    } catch (e: any) {
      push({ type: 'error', message: e?.error?.message || e.message })
    }
  }

  const accountMap = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a.accountName])), [accounts])
  const canAssign = (myRole === 'ADMIN' || myRole === 'MANAGER' || myRole === 'TEAM_LEADER')
  const isUnassigned = (filters.ownerId === 'null')
  const bulkDue = useMemo(() => {
    if (!bulkDuration || bulkDuration < 1) return ''
    const d = new Date(Date.now() + bulkDuration * 86400000)
    return d.toISOString().slice(0,10)
  }, [bulkDuration])

  function toggle(id: string, on: boolean) {
    setSelected(prev => on ? Array.from(new Set([...prev, id])) : prev.filter(x => x!==id))
  }

  async function bulkAssign() {
    const ids = selected
    if (!ids.length || !bulkOwnerId || !bulkDuration) return
    await Promise.all(ids.map(id => getSdk().taskAssign(id, { ownerId: bulkOwnerId, durationDays: bulkDuration })))
    setSelected([])
    await load()
  }

  async function quickAssign(id: string) {
    const ownerId = perOwner[id]; const durationDays = perDuration[id]
    if (!ownerId || !durationDays) return
    await getSdk().taskAssign(id, { ownerId, durationDays })
    await load()
  }

  function rowDue(days: number) {
    if (!days || days < 1) return ''
    const d = new Date(Date.now() + days * 86400000)
    return d.toISOString().slice(0,10)
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Tasks</h2>
      <div className="flex gap-2 items-center mb-3 flex-wrap">
        <input placeholder="Ara (Task ID / Account / Detay)…" value={pending.q || ''} onChange={(e) => setPending((p)=> ({ ...p, q: e.target.value || undefined }))} className="border rounded-md px-3 py-2 w-80" />
        <input placeholder="Owner ID" value={pending.ownerId || ''} onChange={(e) => setPending((p)=> ({ ...p, ownerId: e.target.value || undefined }))} className="border rounded-md px-3 py-2" />
        <div className="flex items-center gap-2 border rounded-md px-2 py-2">
          <span className="text-xs text-slate-600">Status</span>
          {['HOT','NOT_HOT','DEAL','COLD'].map(s => (
            <label key={s} className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={!!pending.statuses?.includes(s)} onChange={(e)=> setPending((p)=> ({ ...p, statuses: e.target.checked ? Array.from(new Set([...(p.statuses||[]), s])) : (p.statuses||[]).filter(x=>x!==s) }))} /> {s}
            </label>
          ))}
        </div>
        <select value={pending.generalStatus || ''} onChange={(e) => setPending((p)=> ({ ...p, generalStatus: e.target.value || undefined }))} className="border rounded-md px-3 py-2">
          <option value="">Gen. Status</option>
          {['OPEN','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <AsyncSelect
          placeholder="City ara…"
          value={pending.city || undefined}
          onChange={(val)=> setPending((p)=> ({ ...p, city: val }))}
          fetcher={async (q) => {
            const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
            const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
            const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'TEAM_LEADER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
            const res = await f(`${base}/lov?type=CITY`, { headers: hdrs })
            const arr = await res.json() as any[]
            const filtered = (q ? arr.filter(x => String(x.label).toLowerCase().includes(q.toLowerCase())) : arr)
            return filtered.map(x => ({ value: x.label, label: x.label }))
          }}
        />
        <button onClick={() => setFilters((f)=> ({ ...f, ownerId: pending.ownerId, status: (pending.statuses && pending.statuses.length ? pending.statuses.join(',') : undefined) as any, generalStatus: pending.generalStatus, q: pending.q, city: pending.city, page: 1 }))} className="border rounded-md px-3 py-2">Uygula</button>
        <button onClick={() => { setPending({}); setFilters((f)=> ({ ...f, q: undefined, ownerId: undefined, status: undefined, generalStatus: undefined, city: undefined, page: 1 })) }} className="border rounded-md px-3 py-2">Temizle</button>
        <div className="flex items-center gap-2 ml-auto">
          <button disabled={(filters.page||1)<=1} onClick={()=> setFilters(f=> ({ ...f, page: Math.max(1,(f.page||1)-1) }))} className="border rounded-md px-2 py-1">←</button>
          <span className="text-sm">Sayfa {filters.page||1} / {Math.max(1, Math.ceil(total / (filters.limit||20)))} • Toplam {total}</span>
          <button disabled={(filters.page||1)>=Math.ceil(total/(filters.limit||20))} onClick={()=> setFilters(f=> ({ ...f, page: (f.page||1)+1 }))} className="border rounded-md px-2 py-1">→</button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={()=> { if (!myId) return; setPending(p=> ({ ...p, ownerId: myId })); setFilters(f=> ({ ...f, ownerId: myId, page:1 })) }} className="border rounded-md px-3 py-2">My Tasks</button>
        <button onClick={()=> { setPending(p=> ({ ...p, ownerId: 'null' })); setFilters(f=> ({ ...f, ownerId: 'null', page:1 })) }} className="border rounded-md px-3 py-2">Unassigned</button>
        <a href="/tasks/new" className="ml-auto border rounded-md px-3 py-2 text-blue-700">+ Create Task</a>
      </div>

      {canAssign && isUnassigned && (
        <div className="flex items-center gap-2 flex-wrap border rounded-md p-2 mb-3">
          <span className="text-sm text-slate-600">Toplu atama</span>
          <UserPicker allowedRoles={['SALESPERSON']} value={bulkOwnerId} onChange={setBulkOwnerId} placeholder="Owner seçin…" />
          <input type="number" min={1} value={bulkDuration} onChange={(e)=> setBulkDuration(Number(e.target.value))} className="border rounded-md px-2 py-2 w-32" placeholder="Süre (gün)" />
          {bulkDue && <span className="text-xs text-slate-600">Bitiş: {bulkDue}</span>}
          <button onClick={bulkAssign} className="border rounded-md px-3 py-2">Ata</button>
          <span className="text-xs text-slate-500">Seçili: {selected.length}</span>
        </div>
      )}

      <div className="grid gap-2 w-full">
        {tasks.map(t => (
          <div key={t.id} className="border rounded-md px-3 py-2">
            <div className="flex justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {canAssign && isUnassigned && (
                    <input type="checkbox" checked={selected.includes(t.id)} onChange={(e)=> toggle(t.id, e.target.checked)} />
                  )}
                  <a href={`/tasks/${t.id}`} className="text-slate-900 no-underline">
                    <strong>{t.account?.accountName || accountMap[t.accountId] || 'Task'}</strong>
                  </a>
                </div>
                <div className="text-xs text-slate-600">{t.priority} • {t.status} • {t.generalStatus}{(t as any).city ? ` • ${(t as any).city}` : ''}</div>
                {(t as any).mainCategory || (t as any).subCategory ? (
                  <div className="text-xs text-slate-500">{(t as any).mainCategory || ''}{(t as any).subCategory ? ' / '+(t as any).subCategory : ''}</div>
                ) : null}
              </div>
              <div className="text-xs text-slate-600">{new Date(t.creationDate).toLocaleString('tr-TR')}</div>
            </div>
            {canAssign && isUnassigned && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <UserPicker allowedRoles={['SALESPERSON']} value={perOwner[t.id]} onChange={(id)=> setPerOwner(prev=> ({ ...prev, [t.id]: id }))} placeholder="Owner seçin…" />
                <input type="number" min={1} value={perDuration[t.id]||''} onChange={(e)=> setPerDuration(prev=> ({ ...prev, [t.id]: Number(e.target.value) }))} className="border rounded-md px-2 py-2 w-32" placeholder="Süre (gün)" />
                {perDuration[t.id] && <span className="text-xs text-slate-600">Bitiş: {rowDue(perDuration[t.id]||0)}</span>}
                <button onClick={()=> quickAssign(t.id)} className="border rounded-md px-3 py-2">Hızlı Ata</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
