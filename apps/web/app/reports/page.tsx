"use client"
import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'

export default function ReportsPage() {
  const [summary, setSummary] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    apiGet('/reports/summary').then(setSummary).catch((e) => setErr(e?.error?.message || e.message))
  }, [])

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>Raporlar</h2>
      {err && <p style={{ color: 'crimson' }}>{err}</p>}
      {!summary && !err && <p>Yükleniyor…</p>}
      {summary && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Stat title="Leads" value={summary.leads} />
            <Stat title="Accounts" value={summary.accounts} />
            <Stat title="Open Tasks" value={summary.tasks.open} />
            <Stat title="Closed Tasks" value={summary.tasks.closed} />
          </div>
          <div>
            <h3 style={{ fontWeight: 600 }}>Task Status</h3>
            <ul>
              {summary.tasks.byStatus.map((s: any) => (
                <li key={s.status}>{s.status}: {s._count.status}</li>
              ))}
            </ul>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <a href="http://localhost:3001/api/reports/tasks.csv" style={{ textDecoration: 'underline' }}>Tasks CSV indir</a>
            <a href="http://localhost:3001/api/reports/accounts.csv" style={{ textDecoration: 'underline' }}>Accounts CSV indir</a>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', padding: 12, borderRadius: 8, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: '#475569' }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

