"use client"
import { useEffect, useMemo, useState } from 'react'
import { getSdk } from '../../../lib/sdk'
import { Button } from '@grupanya/ui'

type TaskList = { id: string; name: string; tag: 'GENERAL'|'PROJECT'; description?: string|null }
type Task = { id: string; accountId: string; status: string; generalStatus: string; creationDate: string; priority: string; mainCategory?: string; subCategory?: string }
type Account = { id: string; accountName: string }

export default function TaskListDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [list, setList] = useState<TaskList | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  // Default filters: HOT + OPEN
  const [status, setStatus] = useState<string>('HOT')
  const [generalStatus, setGeneralStatus] = useState<string>('OPEN')
  const sdk = getSdk()

  async function load() {
    try {
      const [tl, res, accs] = await Promise.all([
        sdk.tasklistDetail(id) as any,
        sdk.tasksList({ taskListId: id, status: status||undefined, generalStatus: generalStatus||undefined, page, limit }) as any,
        sdk.accountsList().then((r:any)=> r.items) as any,
      ])
      setList(tl)
      if (Array.isArray(res)) { setTasks(res); setTotal(0) } else { setTasks(res.items||[]); setTotal(res.total||0) }
      setAccounts(accs||[])
    } catch (e:any) {
      setErr(e?.error?.message || e.message)
    }
  }

  useEffect(()=>{ load() }, [id, page, limit, status, generalStatus])

  const accountMap = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a.accountName])), [accounts])

  if (err) return <p style={{ color:'crimson' }}>{err}</p>
  if (!list) return <p>Yükleniyor…</p>

  return (
    <div className="grid gap-3">
      <a href="/tasklists" className="text-blue-600">← Task Lists</a>
      <div className="border rounded-md p-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{list.name} <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${list.tag==='GENERAL'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{list.tag}</span></h2>
          <div className="text-xs text-slate-600">#{list.id}</div>
        </div>
        {list.description && <div className="text-slate-700 text-sm mt-1">{list.description}</div>}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select value={status} onChange={(e)=> setStatus(e.target.value)} className="border rounded-md px-3 py-2">
          <option value="">Status</option>
          {['HOT','NOT_HOT','DEAL','COLD'].map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={generalStatus} onChange={(e)=> setGeneralStatus(e.target.value)} className="border rounded-md px-3 py-2">
          <option value="">Gen. Status</option>
          {['OPEN','CLOSED'].map(s=> <option key={s} value={s}>{s}</option>)}
        </select>
        <Button variant="secondary" onClick={()=>{ setPage(1); load() }}>Uygula</Button>
        <div className="flex items-center gap-2 ml-auto">
          <button disabled={page<=1} onClick={()=> setPage(p=> Math.max(1,p-1))} className="border rounded-md px-2 py-1">←</button>
          <span className="text-sm">Sayfa {page} / {Math.max(1, Math.ceil(total/limit))} • Toplam {total}</span>
          <button disabled={page>=Math.ceil(total/limit)} onClick={()=> setPage(p=> p+1)} className="border rounded-md px-2 py-1">→</button>
        </div>
      </div>

      <div className="grid gap-2">
        {tasks.map(t => (
          <a key={t.id} href={`/tasks/${t.id}`} className="border rounded-md px-3 py-2 text-slate-900 no-underline">
            <div className="flex justify-between">
              <div>
                <strong>{accountMap[t.accountId] || t.accountId}</strong>
                <div className="text-xs text-slate-600">{t.priority} • {t.status} • {t.generalStatus}</div>
                {(t as any).mainCategory || (t as any).subCategory ? (
                  <div className="text-xs text-slate-500">{(t as any).mainCategory || ''}{(t as any).subCategory ? ' / '+(t as any).subCategory : ''}</div>
                ) : null}
              </div>
              <div className="text-xs text-slate-600">{new Date(t.creationDate).toLocaleString('tr-TR')}</div>
            </div>
          </a>
        ))}
        {tasks.length === 0 && <div className="text-sm text-slate-500">Bu listede görev bulunmuyor.</div>}
      </div>
    </div>
  )
}
