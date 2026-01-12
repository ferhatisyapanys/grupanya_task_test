"use client"
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@grupanya/ui'
import { getSdk } from '../../../lib/sdk'
import { AsyncSelect } from '../../../components/AsyncSelect'
import CategorySelector from '../../../components/CategorySelector'
import UserPicker from '../../../components/UserPicker'

const REASONS = [
  'YETKILIYE_ULASILDI',
  'YETKILIYE_ULASILAMADI',
  'ISLETMEYE_ULASILAMADI',
  'TEKLIF_VERILDI',
  'KARSITEKLIF',
  'TEKLIF_KABUL',
  'TEKLIF_RED',
  'ISLETME_CALISMAK_ISTEMIYOR',
  'GRUPANYA_CALISMAK_ISTEMIYOR',
  'TEKRAR_ARANACAK',
]

export default function TaskDetail({ params }: { params: { id: string } }) {
  const { id } = params
  const [task, setTask] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const [me, setMe] = useState<any>(null)
  const [enums, setEnums] = useState<any>(null)
  const [lov, setLov] = useState<{ MAIN_CATEGORY: string[]; SUB_CATEGORY: string[] } | null>(null)
  const [edit, setEdit] = useState<any>(null)
  const [assign, setAssign] = useState({ ownerId: '', durationDays: 7 })
  const [log, setLog] = useState<{ reason: string; text?: string; followUpDate?: string; adFee?: string; commission?: string; joker?: string }>({ reason: 'YETKILIYE_ULASILDI' })
  const [status, setStatus] = useState<{ status: string; close: boolean }>({ status: 'HOT', close: false })
  const [taskContacts, setTaskContacts] = useState<any[]>([])
  const [accContacts, setAccContacts] = useState<any[]>([])
  const [newContactId, setNewContactId] = useState('')
  const [newIsPrimary, setNewIsPrimary] = useState(false)
  const [submittingLog, setSubmittingLog] = useState(false)

  async function load() {
    try {
      const [u, data] = await Promise.all([
        getSdk().me().then((r:any)=> r.user).catch(()=>null),
        getSdk().taskDetail(id) as any,
      ])
      setMe(u)
      setTask(data)
      setAssign(a => ({ ...a, ownerId: (data as any).ownerId || '' }))
      try {
        const [tcs, acs] = await Promise.all([
          getSdk().taskContacts(id) as any,
          getSdk().accountContacts(data.accountId) as any,
        ])
        setTaskContacts(tcs||[])
        setAccContacts(acs||[])
      } catch { setTaskContacts([]); setAccContacts([]) }
    } catch (e: any) {
      setErr(e?.error?.message || e.message)
    }
  }
  useEffect(() => { load() }, [id])

  // Fetch enums + LOV for edit dropdowns
  useEffect(() => {
    (async () => {
      const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
      const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
      const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'TEAM_LEADER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
      try {
        const res = await f(`${base}/lov/enums`, { headers: hdrs }); const data = await res.json(); setEnums(data)
        const [main, sub] = await Promise.all([
          f(`${base}/lov?type=MAIN_CATEGORY`, { headers: hdrs }).then(r=>r.json()).catch(()=>[]),
          f(`${base}/lov?type=SUB_CATEGORY`, { headers: hdrs }).then(r=>r.json()).catch(()=>[]),
        ])
        setLov({ MAIN_CATEGORY: (main as any[]).map((x:any)=>x.label), SUB_CATEGORY: (sub as any[]).map((x:any)=>x.label) })
      } catch {}
    })()
  }, [])

  const isOfferReason = log.reason === 'TEKLIF_VERILDI' || log.reason === 'KARSITEKLIF'
  const role = me?.role as ('ADMIN'|'MANAGER'|'TEAM_LEADER'|'SALESPERSON'|undefined)
  const isManagerOrAdmin = role === 'MANAGER' || role === 'ADMIN'
  const isTeamLeader = role === 'TEAM_LEADER'
  const isSales = role === 'SALESPERSON'
  const isOwner = !!(me?.id && task?.ownerId && me.id === task.ownerId)
  const canAssign = isManagerOrAdmin || isTeamLeader
  const canSetStatus = isManagerOrAdmin || isTeamLeader || (isSales && isOwner)
  const canEdit = isManagerOrAdmin || isTeamLeader
  const canManageContacts = isManagerOrAdmin || isTeamLeader
  const canAcceptRejectOffer = isManagerOrAdmin || isTeamLeader || (isSales && isOwner)

  async function doAssign() {
    await getSdk().taskAssign(id, { ownerId: assign.ownerId, durationDays: Number(assign.durationDays) })
    await load()
  }

  async function addLog() {
    if (submittingLog) return
    // Client-side validations
    if (log.reason === 'TEKRAR_ARANACAK' && !log.followUpDate) { alert('Follow Up tarihi zorunlu (TEKRAR_ARANACAK)'); return }
    if (isOfferReason) {
      const a = Number(log.adFee), c = Number(log.commission), j = Number(log.joker)
      if (!(Number.isFinite(a) && Number.isFinite(c) && Number.isFinite(j))) { alert('Teklif için Ad Fee, Commission, Joker gereklidir'); return }
    }
    const body: any = { reason: log.reason, text: log.text }
    if (log.followUpDate) body.followUpDate = log.followUpDate
    if (isOfferReason) { body.adFee = Number(log.adFee); body.commission = Number(log.commission); body.joker = Number(log.joker) }
    setSubmittingLog(true)
    try {
      await getSdk().taskActivity(id, body)
      setLog({ reason: 'YETKILIYE_ULASILDI' })
      await load()
    } finally { setSubmittingLog(false) }
  }

  async function updateStatus() {
    await getSdk().taskSetStatus(id, { status: status.status, close: status.close, closedReason: status.close ? (edit?.closedReason || '') : undefined })
    await load()
  }

  async function addTaskContact() {
    if (!newContactId) return
    await getSdk().taskAddContact(id, { contactId: newContactId, isPrimary: newIsPrimary })
    setNewContactId(''); setNewIsPrimary(false)
    await load()
  }

  async function setPrimary(tcId: string) {
    await getSdk().taskUpdateContact(id, tcId, { isPrimary: true })
    await load()
  }

  async function removeTaskContact(tcId: string) {
    await getSdk().taskDeleteContact(id, tcId)
    await load()
  }

  async function acceptOffer() { await getSdk().taskActivity(id, { reason: 'TEKLIF_KABUL' }); await load() }
  async function rejectOffer() { await getSdk().taskActivity(id, { reason: 'TEKLIF_RED' }); await load() }

  if (err) return <p style={{ color: 'crimson' }}>{err}</p>
  if (!task) return <p>Yükleniyor…</p>

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <a href="/tasks" style={{ color: '#2563eb' }}>← Tasks</a>
      <div className="border rounded-md p-3">
        <div className="flex justify-between items-baseline gap-3">
          <h2 className="text-lg font-semibold">
            <a href={`/accounts/${task.accountId}`} className="text-slate-900 hover:underline">
              {task.account?.accountName || task.accountId}
            </a>
          </h2>
          <div className="text-xs text-slate-600">#{task.id}</div>
        </div>
        <div className="mt-1">
          <a href={`/accounts/${task.accountId}`} className="text-blue-600 text-sm">Account’u Gör →</a>
        </div>
        <div className="text-sm text-slate-700">Status: {task.status} • {task.generalStatus} • Priority: {task.priority}</div>
        {task.dueDate && <div className="text-xs text-slate-600">Due: {new Date(task.dueDate).toLocaleString('tr-TR')}</div>}
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {canAssign && (
          <div className="border rounded-md p-3">
            <h3 className="font-semibold mb-2">Assign</h3>
            <div className="flex items-center gap-2">
              <UserPicker value={assign.ownerId} onChange={(id) => setAssign({ ...assign, ownerId: id })} />
              <input type="number" min={1} value={assign.durationDays} onChange={(e) => setAssign({ ...assign, durationDays: Number(e.target.value) })} placeholder="Duration (days)" className="border rounded-md px-2 py-2 w-40" />
              <Button onClick={doAssign}>Assign</Button>
            </div>
          </div>
        )}

        {canSetStatus && (
          <div className="border rounded-md p-3">
            <h3 className="font-semibold mb-2">Status</h3>
            <div className="flex gap-2 items-center">
              <select value={status.status} onChange={(e) => setStatus({ ...status, status: e.target.value })} className="border rounded-md px-3 py-2">
                {['HOT','NOT_HOT','DEAL','COLD'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={status.close} onChange={(e) => setStatus({ ...status, close: e.target.checked })} /> Close
              </label>
              {status.close && (
                <input className="border rounded-md px-2 py-2" placeholder="Closed reason" value={edit?.closedReason||''} onChange={(e)=> setEdit({...edit, closedReason: e.target.value})} />
              )}
              <Button onClick={updateStatus}>Update</Button>
            </div>
          </div>
        )}
      </section>

      {/* Edit section */}
      {canEdit && (
      <section className="border rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Edit</h3>
          <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={()=> setEdit({
            category: task.category, type: task.type, priority: task.priority, accountType: task.accountType, source: task.source,
            mainCategory: (task as any).mainCategory || 'General', subCategory: (task as any).subCategory || 'General',
            city: (task as any).city || '', details: task.details || ''
          })}>Düzenle</Button>
          <Button variant="secondary" onClick={async()=>{
            // Save As New Task using current fields
            const me = await getSdk().me().then((r:any)=> r.user).catch(()=>null)
            const body: any = {
              taskListId: task.taskListId,
              accountId: task.accountId,
              category: task.category,
              type: task.type,
              priority: task.priority,
              accountType: task.accountType,
              source: task.source,
              mainCategory: (task as any).mainCategory,
              subCategory: (task as any).subCategory,
              city: (task as any).city || undefined,
              // contact kaldırıldı; kontak yönetimi Account ekranında yapılır
              details: task.details || '',
              // status/generalStatus is optional; copy current
              status: task.status,
              generalStatus: task.generalStatus,
              // assign to me by default so it's visible under My Tasks
              ownerId: me?.user?.id || me?.id || undefined,
              durationDays: 7,
            }
            try {
              const created = await getSdk().taskCreate(body)
              window.location.href = `/tasks/${(created as any).id}`
            } catch (e:any) {
              alert(e?.error?.message || e.message || 'Save As New başarısız')
            }
          }}>Save As New</Button>
          </div>
        </div>
        {edit && (
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              {enums && (
                <>
                  <select value={edit.category} onChange={(e)=> setEdit({...edit, category: e.target.value})} className="border rounded-md px-2 py-2">
                    {enums.TaskCategory.map((x:string)=>(<option key={x} value={x}>{x}</option>))}
                  </select>
                  <select value={edit.type} onChange={(e)=> setEdit({...edit, type: e.target.value})} className="border rounded-md px-2 py-2">
                    {enums.TaskType.map((x:string)=>(<option key={x} value={x}>{x}</option>))}
                  </select>
                  <select value={edit.priority} onChange={(e)=> setEdit({...edit, priority: e.target.value})} className="border rounded-md px-2 py-2">
                    {enums.TaskPriority.map((x:string)=>(<option key={x} value={x}>{x}</option>))}
                  </select>
                  <select value={edit.accountType} onChange={(e)=> setEdit({...edit, accountType: e.target.value})} className="border rounded-md px-2 py-2">
                    {enums.AccountType.map((x:string)=>(<option key={x} value={x}>{x}</option>))}
                  </select>
                  <select value={edit.source} onChange={(e)=> setEdit({...edit, source: e.target.value})} className="border rounded-md px-2 py-2">
                    {enums.AccountSource.map((x:string)=>(<option key={x} value={x}>{x}</option>))}
                  </select>
                </>
              )}
              <CategorySelector
                main={edit.mainCategory}
                sub={edit.subCategory}
                onChange={(main, sub)=> setEdit({ ...edit, mainCategory: main, subCategory: sub })}
                allowCustom
              />
              <AsyncSelect placeholder="City…" value={edit.city||undefined} onChange={(v)=> setEdit({...edit, city:v, district: ''})} fetcher={async (q)=>{
                const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
                const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
                const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'TEAM_LEADER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
                const res = await f(`${base}/lov?type=CITY`, { headers: hdrs }); const arr = await res.json() as any[]
                const filtered = (q ? arr.filter((x:any)=> String(x.label).toLowerCase().includes(q.toLowerCase())) : arr)
                const list = filtered.map((x:any)=> ({ value: x.label, label: x.label })); if (q && !list.find((i:any)=>i.value.toLowerCase()===q.toLowerCase())) list.unshift({ value: q, label: q }); return list
              }} />
              <AsyncSelect placeholder="District…" value={edit.district||undefined} onChange={(v)=> setEdit({...edit, district:v})} fetcher={async (q)=>{
                if (!edit.city) return []
                const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
                const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
                const hdrs = { 'x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'TEAM_LEADER', 'x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
                const url = new URL(`${base}/lov`)
                url.searchParams.set('type','DISTRICT'); url.searchParams.set('code', edit.city)
                const res = await f(url.toString(), { headers: hdrs }); const arr = await res.json() as any[]
                const filtered = (q ? arr.filter((x:any)=> String(x.label).toLowerCase().includes(q.toLowerCase())) : arr)
                const list = filtered.map((x:any)=> ({ value: x.label, label: x.label })); if (q && !list.find((i:any)=>i.value.toLowerCase()===q.toLowerCase())) list.unshift({ value: q, label: q }); return list
              }} />
              <input className="border rounded-md px-2 py-2 flex-1 min-w-[200px]" placeholder="Contact" value={edit.contact||''} onChange={(e)=> setEdit({...edit, contact:e.target.value})}/>
              <input className="border rounded-md px-2 py-2 flex-1 min-w-[200px]" placeholder="Details" value={edit.details||''} onChange={(e)=> setEdit({...edit, details:e.target.value})}/>
              <Button variant="secondary" onClick={async ()=>{
                const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'
                const f = (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch) as typeof fetch
                const hdrs = { 'Content-Type':'application/json','x-user-role': process.env.NEXT_PUBLIC_DEV_ROLE || 'TEAM_LEADER','x-user-id': process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user' }
                const res = await f(`${base}/tasks/${id}`, { method:'PATCH', headers: hdrs, body: JSON.stringify(edit) })
                if (!res.ok) { const e = await res.json(); alert(e?.error?.message||'Hata'); return }
                window.location.reload()
              }}>Kaydet</Button>
            </div>
          </div>
        )}
      </section>
      )}

      <section className="border rounded-md p-3">
        <h3 className="font-semibold mb-2">Salesperson Activity Log</h3>
        <div className="flex gap-2 flex-wrap items-center mb-2">
          <select value={log.reason} onChange={(e) => setLog({ ...log, reason: e.target.value })} className="border rounded-md px-3 py-2">
            {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {log.reason === 'TEKRAR_ARANACAK' && <input type="date" value={log.followUpDate || ''} onChange={(e) => setLog({ ...log, followUpDate: e.target.value })} className="border rounded-md px-3 py-2" />}
          {isOfferReason && (
            <>
              <input type="number" placeholder="Ad Fee" value={log.adFee || ''} onChange={(e) => setLog({ ...log, adFee: e.target.value })} className="border rounded-md px-3 py-2 w-32" />
              <input type="number" placeholder="Commission" value={log.commission || ''} onChange={(e) => setLog({ ...log, commission: e.target.value })} className="border rounded-md px-3 py-2 w-32" />
              <input type="number" placeholder="Joker" value={log.joker || ''} onChange={(e) => setLog({ ...log, joker: e.target.value })} className="border rounded-md px-3 py-2 w-32" />
            </>
          )}
          <input value={log.text || ''} onChange={(e) => setLog({ ...log, text: e.target.value })} placeholder="Görüşme notu" className="flex-1 border rounded-md px-3 py-2" />
          {(isManagerOrAdmin || isTeamLeader || (isSales && isOwner)) && <Button onClick={addLog} disabled={submittingLog}>Ekle</Button>}
        </div>

        <div className="grid gap-2">
          {task.logs?.map((l: any) => {
            const canDelete = isManagerOrAdmin || isTeamLeader || (isSales && me?.id && l.author?.id === me.id)
            return (
              <div key={l.id} className="border rounded-md px-3 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-slate-600">{new Date(l.createdAt).toLocaleString('tr-TR')} • {l.author?.id || ''}</div>
                    <div><strong>{l.reason}</strong>{l.followUpDate ? ` → ${new Date(l.followUpDate).toLocaleDateString('tr-TR')}` : ''}</div>
                    {l.text && <div className="text-slate-700">{l.text}</div>}
                  </div>
                  {canDelete && (
                    <button className="text-xs text-red-600" onClick={async()=>{
                      if (!confirm('Bu log kaydını silmek istiyor musunuz?')) return
                      await getSdk().taskDeleteActivity(id, l.id)
                      await load()
                    }}>Sil</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Account section (contacts managed on Account page) */}
      <section className="border rounded-md p-3">
        <h3 className="font-semibold mb-2">Account</h3>
        <div className="text-sm text-slate-700">Bu task’ın account bilgileri ve kontakları Account profilinde yönetilir.</div>
        <div className="mt-2">
          <a href={`/accounts/${task.accountId}`} className="text-blue-600">Account’u Gör →</a>
        </div>
      </section>

      {/* Offers section */}
      <section className="border rounded-md p-3">
        <h3 className="font-semibold mb-2">Offers</h3>
        <div className="grid gap-2">
          {(task.offers||[]).map((o:any)=> (
            <div key={o.id} className="border rounded-md px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-sm">{o.type || '—'} • {o.status || 'PENDING'}</div>
                <div className="text-xs text-slate-600">Ad Fee: {o.adFee ?? '-'} • Commission: {o.commission ?? '-'} • Joker: {o.joker ?? '-'}</div>
              </div>
              {(o.status !== 'ACCEPTED' && o.status !== 'REJECTED') && canAcceptRejectOffer && (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={acceptOffer}>Kabul Et</Button>
                  <Button variant="secondary" onClick={rejectOffer}>Reddet</Button>
                </div>
              )}
            </div>
          ))}
          {(task.offers||[]).length === 0 && <div className="text-sm text-slate-500">Teklif bulunmuyor.</div>}
        </div>
      </section>
    </div>
  )
}
