/*
 Convert provided root CSVs:
  - "Ortak Master Task List 2017-2023 - Team 1.csv"  (tasks + accounts)
  - "Query Listesi 2017-2023 - 2021-2022.csv"        (leads)
 into the normalized import CSVs under artifacts/import/ expected by import-sheets.ts
*/
import * as fs from 'fs'
import * as path from 'path'

type Row = Record<string, string>

function parseCSV(content: string): Row[] {
  const rows: Row[] = []
  const lines: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < content.length; i++) {
    const c = content[i]
    if (c === '"') {
      if (q && content[i + 1] === '"') { cur += '"'; i++ } else { q = !q }
    } else if (c === '\n' && !q) { lines.push(cur); cur = '' } else { cur += c }
  }
  if (cur.length) lines.push(cur)
  const split = (line: string) => {
    const out: string[] = []; let v = ''; let qq = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { if (qq && line[i + 1] === '"') { v += '"'; i++ } else { qq = !qq } }
      else if (ch === ',' && !qq) { out.push(v); v = '' } else { v += ch }
    }
    out.push(v)
    return out
  }
  if (!lines.length) return rows
  const headers = split(lines[0]).map(h => h.trim())
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const cols = split(lines[i])
    const obj: Row = {}
    headers.forEach((h, idx) => obj[h] = (cols[idx] ?? '').trim())
    rows.push(obj)
  }
  return rows
}

function readCSV(p: string): Row[] { return parseCSV(fs.readFileSync(p, 'utf8')) }
function w(dir: string, name: string, headers: string[], rows: (string[])[]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const out = [headers.join(',')].concat(rows.map(r => r.map(v => v == null ? '' : csv(v)).join(','))).join('\n')
  fs.writeFileSync(path.join(dir, name), out)
}
function csv(v: any): string { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
function coreFromCity(city: string) { return /istanbul|i̇stanbul/i.test(city || '') ? 'ISTANBUL_CORE' : 'ANADOLU_CORE' }
function srcMap(v: string) {
  const s = (v || '').toLowerCase()
  if (s.includes('old')) return 'OLD'
  if (s.includes('fresh')) return 'FRESH'
  if (s.includes('refer')) return 'REFERANS'
  if (s.includes('rakip') || s.includes('rakıp')) return 'RAKIP'
  if (s.includes('query')) return 'QUERY'
  return 'QUERY'
}
function priMap(v: string) { const s=(v||'').toLowerCase(); if(s.includes('high')) return 'HIGH'; if(s.includes('low')) return 'LOW'; if(s.includes('critical')) return 'CRITICAL'; return 'MEDIUM' }

function findCsv(base: string, prefix: string): string | null {
  try {
    const files = fs.readdirSync(base)
    const hit = files.find(f => f.toLowerCase().endsWith('.csv') && f.toLowerCase().startsWith(prefix.toLowerCase()))
    return hit ? path.join(base, hit) : null
  } catch { return null }
}

function main() {
  // Attempt repo root resolution (this script runs from apps/api by default)
  const cwd = process.cwd()
  const repoRoot = path.resolve(cwd, '..', '..')
  const teamCsv = findCsv(repoRoot, 'ortak master task list') || findCsv(cwd, 'ortak master task list')
  const queryCsv = findCsv(repoRoot, 'query listesi') || findCsv(cwd, 'query listesi')
  const outDir = path.join(repoRoot, 'artifacts', 'import')

  if (!teamCsv) throw new Error('Team CSV not found under repo root')
  if (!queryCsv) throw new Error('Query CSV not found under repo root')

  const team = readCSV(teamCsv)
  const query = readCSV(queryCsv)

  // Accounts from team CSV
  const accountSet = new Map<string, Row>()
  for (const r of team) {
    const name = r['İşletme Adı'] || r['Isletme Adı'] || r['Isletme'] || ''
    if (!name) continue
    if (!accountSet.has(name)) accountSet.set(name, r)
  }
  const accountsRows = Array.from(accountSet.entries()).map(([name, r]) => [
    '', // externalId
    name,
    name,
    'ACTIVE',
    srcMap(r['Kaynak']),
    r['Ana Kategori'] || 'General',
    'LONG_TAIL',
    '', // creationDate
    (r['İşletme İletişim']||'').replace(/\s+/g,' ').trim(),
    '',
    '',
  ])
  w(outDir, 'accounts.csv', ['externalId','accountName','businessName','status','source','category','type','creationDate','businessContact','contactPerson','notes'], accountsRows)

  // TaskList single
  w(outDir,'tasklists.csv',['name','tag'],[["Imported Team 1","GENERAL"]])

  // Tasks
  const tasksRows: string[][] = []
  for (const r of team) {
    const accountName = r['İşletme Adı'] || ''
    if (!accountName) continue
    const city = r['Şehir'] || ''
    tasksRows.push([
      r['Task ID'] || '', // externalId
      'Imported Team 1', // taskListName
      accountName,
      '', // ownerEmail (opsiyonel)
      coreFromCity(city), // category
      'GENERAL',
      priMap(r['Öncelik']),
      'LONG_TAIL',
      srcMap(r['Kaynak']),
      r['Ana Kategori'] || 'General',
      r['Kategori'] || 'General',
      (r['İşletme İletişim']||'').replace(/\s+/g,' ').trim(),
      (r['Hizmetler']||'').trim() || (r['Not']||''),
      r['Task Yaratma Tarihi'] || '',
      '', // assignmentDate
      '', // durationDays
      '', // dueDate
      'NOT_HOT',
      'OPEN',
      r['Geçmiş Task ID'] || '',
      r['Son Satışçı'] || ''
    ])
  }
  w(outDir, 'tasks.csv', ['externalId','taskListName','accountName','ownerEmail','category','type','priority','accountType','source','mainCategory','subCategory','contact','details','creationDate','assignmentDate','durationDays','dueDate','status','generalStatus','previousTaskId','lastSalesperson'], tasksRows)

  // Leads from query CSV
  const leadsRows: string[][] = []
  for (const r of query) {
    const company = r['Company'] || r['Şirket'] || ''
    const created = r['Created On'] || r['Oluşturma'] || ''
    const webCat = r['Web Category'] || r['Web Kategori'] || ''
    const payload: Record<string, any> = {
      email: r['Email'] || '',
      phone: (r['Phone\t']||r['Phone']||'').trim(),
      website: r['Website'] || '',
      district: r['District'] || '',
      city: r['City'] || '',
      address: r['Address'] || '',
      services: r['Company Services'] || '',
      bestService: r['Company Best Service'] || '',
      status: r['Status'] || '',
      queryStatus: r['Query Status'] || '',
      note: r['Not'] || '',
    }
    leadsRows.push([
      r['Id'] || '', // externalId
      created,
      company,
      company,
      webCat,
      JSON.stringify(payload),
      '', // linkedAccountName
    ])
  }
  w(outDir,'leads.csv',[ 'externalId','createdAt','accountName','businessName','category','payloadJson','linkedAccountName' ], leadsRows)

  console.log('Converted to artifacts/import/*.csv')
}

main()
