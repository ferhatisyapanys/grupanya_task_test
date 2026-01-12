"use client"
import { useEffect, useMemo, useState } from 'react'
import { getSdk } from '../../../lib/sdk'
import { useToast } from '../../../components/Toaster'
import { Button } from '@grupanya/ui'
import { AsyncSelect } from '../../../components/AsyncSelect'
import CategorySelector from '../../../components/CategorySelector'
import UserPicker from '../../../components/UserPicker'

type Account = { id: string; accountName: string }
type TaskList = { id: string; name: string; tag?: 'GENERAL'|'PROJECT' }

export default function TaskCreatePage() {
  const { push } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [lists, setLists] = useState<TaskList[]>([])
  const [form, setForm] = useState({ taskListId: '', accountId: '', details: '' })
  const [enums, setEnums] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [accountOpenTasks, setAccountOpenTasks] = useState<number>(0)
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
  const [showErrors, setShowErrors] = useState(false)

  async function boot() {
    const sdk = getSdk()
    const [a, l] = await Promise.all([
      sdk.accountsList().then((r:any)=> r.items),
      sdk.tasklists() as any,
    ])
    setAccounts(a)
    setLists(l)
    setForm((f)=> ({ ...f, taskListId: f.taskListId || l[0]?.id || '', accountId: f.accountId || a[0]?.id || '' }))
  }

  useEffect(() => { boot() }, [])

  // enums
  useEffect(() => {
    (async () => {
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
      const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
      const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'TEAM_LEADER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
      const res = await f(`${base}/lov/enums`, { headers: hdrs })
      const data = await res.json()
      setEnums(data)
    })()
  }, [])

  // account change → contacts + auto fields
  useEffect(() => {
    (async () => {
      if (!form.accountId) { setContacts([]); setSelectedContactId(''); setAccountOpenTasks(0); return }
      try {
        const sdk = getSdk()
        const detail: any = await sdk.accountDetail(form.accountId)
        setAccountOpenTasks(detail?.openTasks || 0)
        setContacts(detail?.contacts || [])
        setSelectedContactId('')
        const acc = detail as any
        setTaskFields((tf) => ({
          ...tf,
          accountType: acc?.type || tf.accountType,
          source: acc?.source || tf.source,
          city: tf.city || acc?.city || '',
          district: tf.district || acc?.district || undefined,
          // Default main/sub category from account if present
          mainCategory: acc?.mainCategory || tf.mainCategory,
          subCategory: acc?.subCategory || tf.subCategory,
        }))
      } catch { setContacts([]); setSelectedContactId(''); setAccountOpenTasks(0) }
    })()
  }, [form.accountId])

  async function create() {
    const missing = !form.taskListId || !form.accountId || !taskFields.mainCategory || !taskFields.subCategory || !form.details
    if (missing) { setShowErrors(true); push({ type:'error', message:'Zorunlu alanları doldurun.' }); return }
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
      window.location.href = '/tasks'
    } catch (e:any) { push({ type:'error', message: e?.error?.message || e.message }) }
  }

  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold mb-2">Create Task</h2>
      <section className="border rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-slate-600">Task List</span>
            <select value={form.taskListId} onChange={(e) => setForm({ ...form, taskListId: e.target.value })} className="border rounded-md px-3 py-2 w-full">
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-slate-600">Account</span>
            <AsyncSelect
              className="w-full"
              placeholder="Account ara…"
              value={form.accountId}
              onChange={(val)=> setForm({...form, accountId: val})}
              fetcher={async (q) => {
                const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
                if (!q || q.trim().length < 2) {
                  const opts = accounts.map(a => ({ value: a.id, label: `${a.accountName} • ${a.id}` }))
                  const current = accounts.find(a => a.id === form.accountId)
                  if (!current && form.accountId) {
                    try { const acc = await getSdk().accountDetail(form.accountId) as any; opts.unshift({ value: acc.id, label: `${acc.accountName}${acc.city ? ' • '+acc.city : ''} • ${acc.id}` }) } catch {}
                  }
                  return opts.slice(0, 15)
                }
                const url = new URL((process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api') + '/accounts/search')
                url.searchParams.set('q', q)
                const res = await f(url.toString(), { headers: { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'TEAM_LEADER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' } })
                const data = await res.json()
                const list = (data as any[]).map((d:any) => ({ value: d.id, label: d.label }))
                if (form.accountId && !list.find(o => o.value === form.accountId)) {
                  const cur = (data as any[]).find((d:any)=> d.id === form.accountId)
                  if (cur) list.unshift({ value: cur.id, label: cur.label })
                }
                return list
              }}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-slate-600">Contact (opsiyonel)</span>
            <select value={selectedContactId} onChange={(e)=> setSelectedContactId(e.target.value)} className="border rounded-md px-3 py-2 w-full">
              <option value="">Seçin…</option>
              {contacts.map((c:any)=> <option key={c.id} value={c.id}>{c.name}{c.phone?` • ${c.phone}`:''}</option>)}
            </select>
          </label>
          {enums && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:col-span-2">
              <label className="grid gap-1">
                <span className="text-xs text-slate-600">Category</span>
                <select value={taskFields.category} onChange={(e)=>setTaskFields({...taskFields, category:e.target.value as any})} className="border rounded-md px-3 py-2 w-full">
                  {enums.TaskCategory.map((x:string)=>(<option key={x} value={x}>{x}</option>))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-600">Type</span>
                <select value={taskFields.type} onChange={(e)=>setTaskFields({...taskFields, type:e.target.value as any})} className="border rounded-md px-3 py-2 w-full">
                  {enums.TaskType.map((x:string)=>(<option key={x} value={x}>{x}</option>))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-600">Priority</span>
                <select value={taskFields.priority} onChange={(e)=>setTaskFields({...taskFields, priority:e.target.value as any})} className="border rounded-md px-3 py-2 w-full">
                  {enums.TaskPriority.map((x:string)=>(<option key={x} value={x}>{x}</option>))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-slate-600">Account Type</span>
                <select value={taskFields.accountType} onChange={(e)=>setTaskFields({...taskFields, accountType:e.target.value as any})} className="border rounded-md px-3 py-2 w-full">
                  {enums.AccountType.map((x:string)=>(<option key={x} value={x}>{x}</option>))}
                </select>
              </label>
              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs text-slate-600">Source</span>
                <select value={taskFields.source} onChange={(e)=>setTaskFields({...taskFields, source:e.target.value as any})} className="border rounded-md px-3 py-2 w-full">
                  {enums.AccountSource.map((x:string)=>(<option key={x} value={x}>{x}</option>))}
                </select>
              </label>
            </div>
          )}
          <div className="md:col-span-2">
            <CategorySelector
              main={taskFields.mainCategory}
              sub={taskFields.subCategory}
              onChange={(main, sub)=> setTaskFields({ ...taskFields, mainCategory: main, subCategory: sub })}
              allowCustom
              error={showErrors && (!taskFields.mainCategory || !taskFields.subCategory)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:col-span-2">
            <AsyncSelect
              className="w-full"
              placeholder="City ara…"
              value={taskFields.city || undefined}
              onChange={(val)=> setTaskFields({...taskFields, city: val, district: ''})}
              fetcher={async (q) => {
                const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
                const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
                const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'TEAM_LEADER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
                const res = await f(`${base}/lov?type=CITY`, { headers: hdrs })
                const arr = await res.json() as any[]
                const filtered = (q ? arr.filter(x => String(x.label).toLowerCase().includes(q.toLowerCase())) : arr)
                const list = filtered.map(x => ({ value: x.label, label: x.label }))
                if (q && !list.find(i=>i.value.toLowerCase()===q.toLowerCase())) list.unshift({ value: q, label: q })
                return list
              }}
            />
            <AsyncSelect
              className="w-full"
              placeholder="District ara…"
              value={taskFields.district || undefined}
              onChange={(val)=> setTaskFields({...taskFields, district: val})}
              fetcher={async (q) => {
                if (!taskFields.city) return []
                const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
                const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
                const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'TEAM_LEADER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
                const url = new URL(`${base}/lov`)
                url.searchParams.set('type','DISTRICT')
                url.searchParams.set('code', taskFields.city)
                const res = await f(url.toString(), { headers: hdrs })
                const arr = await res.json() as any[]
                const filtered = (q ? arr.filter(x => String(x.label).toLowerCase().includes(q.toLowerCase())) : arr)
                const list = filtered.map(x => ({ value: x.label, label: x.label }))
                if (q && !list.find(i=>i.value.toLowerCase()===q.toLowerCase())) list.unshift({ value: q, label: q })
                return list
              }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:col-span-2 items-center">
            <label className="grid gap-1">
              <span className="text-xs text-slate-600">Owner</span>
              <UserPicker allowedRoles={['SALESPERSON']} value={taskFields.ownerId} onChange={(id)=> setTaskFields({...taskFields, ownerId: id})} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-600">Status</span>
              <select value={taskFields.status || 'NOT_HOT'} onChange={(e)=> setTaskFields({...taskFields, status: e.target.value as any})} className="border rounded-md px-3 py-2 w-full">
                {['HOT','NOT_HOT','DEAL','COLD'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-600">Closed?</span>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={taskFields.generalStatus === 'CLOSED'} onChange={(e)=> setTaskFields({...taskFields, generalStatus: e.target.checked ? 'CLOSED' : 'OPEN'})} /> Closed</label>
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-slate-600">Duration (days)</span>
              <input type="number" min={1} placeholder="Duration" className="border rounded-md px-3 py-2 w-full" onChange={(e)=> setTaskFields({...taskFields, durationDays: Number(e.target.value)})} />
              {(taskFields.durationDays && taskFields.ownerId) ? (
                <span className="text-xs text-slate-500">Bitiş: {new Date(Date.now() + (taskFields.durationDays||0)*86400000).toISOString().slice(0,10)}</span>
              ) : null}
            </label>
          </div>
          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs text-slate-600">Detay</span>
            <textarea rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Detay" className={`rounded-md px-3 py-2 border w-full ${showErrors && !form.details ? 'border-red-500' : 'border-slate-300'}`} />
            {lists.find(l => l.id===form.taskListId)?.tag === 'GENERAL' && accountOpenTasks>0 && (
              <span className="text-xs text-red-600">Seçilen account için açık General task var!</span>
            )}
          </label>
          <div className="md:col-span-2">
            <Button onClick={create}>Task Oluştur</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
