/*
 Simple CSV → DB migration for the Task Yönetim Modülü
 Usage:
   npm --workspace=apps/api run import:sheets -- ./artifacts/import [--dry]

 Expected CSV files under the given directory (presence optional):
   - users.csv             (email,name,role)
   - accounts.csv          (externalId,accountName,businessName,status,source,category,type,creationDate,businessContact,contactPerson,notes)
   - leads.csv             (externalId,createdAt,accountName,businessName,category,payloadJson,linkedAccountName)
   - tasklists.csv         (name,tag)
   - tasks.csv             (externalId,taskListName,accountName,ownerEmail,category,type,priority,accountType,source,mainCategory,subCategory,contact,details,creationDate,assignmentDate,durationDays,dueDate,status,generalStatus)
   - activity_logs.csv     (taskExternalId,authorEmail,reason,followUpDate,text,createdAt,adFee,commission,joker)
   - offers.csv            (taskExternalId,adFee,commission,joker)

 Notes:
 - Dates should be ISO-like or parseable by new Date().
 - Role values: ADMIN|MANAGER|TEAM_LEADER|SALESPERSON
 - Enums (status, source, tag etc.) should match schema values.
*/

import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

type Row = Record<string, string>

function parseCSV(content: string): Row[] {
  // Minimal CSV parser supporting quotes and commas
  const rows: Row[] = []
  const lines: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < content.length; i++) {
    const c = content[i]
    if (c === '"') {
      if (inQuotes && content[i + 1] === '"') {
        cur += '"'; i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === '\n' && !inQuotes) {
      lines.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  if (cur.length) lines.push(cur)
  const split = (line: string) => {
    const out: string[] = []
    let val = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (q && line[i + 1] === '"') { val += '"'; i++ } else { q = !q }
      } else if (ch === ',' && !q) { out.push(val); val = '' } else { val += ch }
    }
    out.push(val)
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

function readCSVMaybe(dir: string, name: string): Row[] | null {
  const p = path.join(dir, name)
  if (!fs.existsSync(p)) return null
  const txt = fs.readFileSync(p, 'utf8')
  return parseCSV(txt)
}

function toDate(v?: string) { if (!v) return undefined; const d = new Date(v); return isNaN(d.getTime()) ? undefined : d }
function toInt(v?: string) { if (!v) return undefined; const n = Number(v); return Number.isFinite(n) ? n : undefined }
function toFloat(v?: string) { if (!v) return undefined; const n = Number(v); return Number.isFinite(n) ? n : undefined }
function norm(v?: string) { return (v || '').replace(/\s+/g,' ').trim() }

async function main() {
  // Load app-specific .env first
  dotenv.config({ path: path.resolve(__dirname, '../.env') })
  dotenv.config()
  const args = process.argv.slice(2)
  const dir = path.resolve(args.find(a => !a.startsWith('--')) || './artifacts/import')
  const dry = args.includes('--dry')
  if (!fs.existsSync(dir)) {
    console.error(`Import directory not found: ${dir}`)
    process.exit(1)
  }
  const prisma = new PrismaClient()
  console.log(`Importing from: ${dir} ${dry ? '(dry-run)' : ''}`)

  // Collect LOV values
  const mainCategories = new Set<string>()
  const subCategories = new Set<string>()
  const webCategories = new Set<string>()
  const cities = new Set<string>()
  const districts = new Set<string>()

  // USERS
  const users = readCSVMaybe(dir, 'users.csv')
  if (users?.length) {
    let ok = 0
    for (const r of users) {
      if (!r.email) continue
      if (dry) { ok++; continue }
      await prisma.user.upsert({
        where: { email: r.email },
        create: { email: r.email, name: r.name || null, role: (r.role as any) || 'SALESPERSON' },
        update: { name: r.name || null, role: (r.role as any) || undefined },
      })
      ok++
    }
    console.log(`Users imported: ${ok}`)
  }

  // ACCOUNTS
  const accounts = readCSVMaybe(dir, 'accounts.csv')
  const accountIdByName = new Map<string, string>()
  if (accounts?.length) {
    let ok = 0
    for (const r of accounts) {
      if (!r.accountName || !r.businessName) continue
      if (dry) { ok++; continue }
      if (r.category) mainCategories.add(norm(r.category))
      const existing = r.externalId
        ? await prisma.account.findFirst({ where: { externalRef: r.externalId } })
        : await prisma.account.findFirst({ where: { accountName: r.accountName } })
      const acc = existing
        ? await prisma.account.update({ where: { id: existing.id }, data: {
            businessName: r.businessName,
            status: (r.status as any) || existing.status,
            source: (r.source as any) || existing.source,
            category: r.category || existing.category,
            type: (r.type as any) || existing.type,
            businessContact: r.businessContact || existing.businessContact || null,
            contactPerson: r.contactPerson || existing.contactPerson || null,
            notes: r.notes || existing.notes || null,
          } })
        : await prisma.account.create({ data: {
            externalRef: r.externalId || null,
            accountName: r.accountName,
            businessName: r.businessName,
            status: (r.status as any) || 'ACTIVE',
            source: (r.source as any) || 'QUERY',
            category: r.category || 'General',
            type: (r.type as any) || 'LONG_TAIL',
            creationDate: toDate(r.creationDate) || undefined,
            businessContact: r.businessContact || null,
            contactPerson: r.contactPerson || null,
            notes: r.notes || null,
          } })
      accountIdByName.set(acc.accountName, acc.id)
      ok++
    }
    console.log(`Accounts imported: ${ok}`)
  }

  // LEADS
  const leads = readCSVMaybe(dir, 'leads.csv')
  if (leads?.length) {
    let ok = 0
    for (const r of leads) {
      const payload = r.payloadJson ? safeJson(r.payloadJson) : { accountName: r.accountName, businessName: r.businessName, category: r.category }
      if (r.category) webCategories.add(norm(r.category))
      const linkedAccountId = r.linkedAccountName ? accountIdByName.get(r.linkedAccountName) : undefined
      if (dry) { ok++; continue }
      const city = (payload as any)?.city || null
      const district = (payload as any)?.district || null
      if (city) cities.add(String(city))
      if (district) districts.add(String(district))
      await prisma.lead.create({ data: { externalRef: r.externalId || null, createdAt: toDate(r.createdAt) || undefined, payload: payload as any, company: r.accountName || null, webCategory: r.category || null, city: city as any, district: district as any, linkedAccountId } })
      ok++
    }
    console.log(`Leads imported: ${ok}`)
  }

  // TASKLISTS
  const lists = readCSVMaybe(dir, 'tasklists.csv')
  const listIdByName = new Map<string, string>()
  if (lists?.length) {
    let ok = 0
    for (const r of lists) {
      if (!r.name || !r.tag) continue
      if (dry) { ok++; continue }
      const existing = await prisma.taskList.findFirst({ where: { name: r.name } })
      const tl = existing
        ? await prisma.taskList.update({ where: { id: existing.id }, data: { tag: r.tag as any } })
        : await prisma.taskList.create({ data: { name: r.name, tag: r.tag as any, createdBy: 'import' } })
      listIdByName.set(tl.name, tl.id)
      ok++
    }
    console.log(`TaskLists imported: ${ok}`)
  }

  // TASKS
  const tasks = readCSVMaybe(dir, 'tasks.csv')
  const taskIdByExternal = new Map<string, string>()
  if (tasks?.length) {
    let ok = 0, fail = 0
    for (const r of tasks) {
      try {
        const accountId = accountIdByName.get(r.accountName)
        const taskListId = listIdByName.get(r.taskListName)
        if (!accountId || !taskListId) { fail++; continue }
        if (r.mainCategory) mainCategories.add(norm(r.mainCategory))
        if (r.subCategory) subCategories.add(norm(r.subCategory))
        const owner = r.ownerEmail ? await prisma.user.findUnique({ where: { email: r.ownerEmail } }) : null
        if (dry) { ok++; continue }
        const t = await prisma.task.create({
          data: {
            externalRef: r.externalId || null,
            taskListId,
            accountId,
            ownerId: owner?.id || null,
            category: r.category as any,
            type: r.type as any,
            priority: r.priority as any,
            accountType: r.accountType as any,
            source: r.source as any,
            mainCategory: r.mainCategory || 'General',
            subCategory: r.subCategory || 'General',
            contact: r.contact || null,
            details: r.details || '',
            creationDate: toDate(r.creationDate) || undefined,
            assignmentDate: toDate(r.assignmentDate) || undefined,
            durationDays: toInt(r.durationDays) || undefined,
            dueDate: toDate(r.dueDate) || undefined,
            status: (r.status as any) || undefined,
            generalStatus: (r.generalStatus as any) || undefined,
            previousTaskId: r.previousTaskId || undefined,
            lastSalesperson: r.lastSalesperson || undefined,
          },
        })
        if (r.externalId) taskIdByExternal.set(r.externalId, t.id)
        ok++
      } catch (e) {
        console.error('Task import failed:', r, e)
        fail++
      }
    }
    console.log(`Tasks imported: ${ok}, failed: ${fail}`)
  }

  // Seed Lookup (LOV) values
  if (!dry) {
    const createIfMissing = async (type: string, label: string) => {
      const exists = await prisma.lookup.findFirst({ where: { type, label } })
      if (!exists) await prisma.lookup.create({ data: { type, label } })
    }
    for (const v of Array.from(mainCategories)) if (v) await createIfMissing('MAIN_CATEGORY', v)
    for (const v of Array.from(subCategories)) if (v) await createIfMissing('SUB_CATEGORY', v)
    for (const v of Array.from(webCategories)) if (v) await createIfMissing('WEB_CATEGORY', v)
    for (const v of Array.from(cities)) if (v) await createIfMissing('CITY', v)
    for (const v of Array.from(districts)) if (v) await createIfMissing('DISTRICT', v)
    console.log(`LOV seeded: MAIN(${mainCategories.size}), SUB(${subCategories.size}), WEB(${webCategories.size}), CITY(${cities.size}), DISTRICT(${districts.size})`)
  }

  // ACTIVITY LOGS (with optional offer columns)
  const logs = readCSVMaybe(dir, 'activity_logs.csv')
  if (logs?.length) {
    let ok = 0, fail = 0
    for (const r of logs) {
      try {
        const taskId = r.taskExternalId ? taskIdByExternal.get(r.taskExternalId) : undefined
        if (!taskId) { fail++; continue }
        const author = r.authorEmail ? await prisma.user.findUnique({ where: { email: r.authorEmail } }) : null
        if (dry) { ok++; continue }
        await prisma.activityLog.create({
          data: {
            taskId,
            authorId: author?.id || 'import',
            reason: r.reason as any,
            followUpDate: toDate(r.followUpDate) || undefined,
            text: r.text || null,
            createdAt: toDate(r.createdAt) || undefined,
          },
        })
        if (r.adFee || r.commission || r.joker) {
          await prisma.offer.create({ data: { taskId, adFee: toFloat(r.adFee) || null, commission: toFloat(r.commission) || null, joker: toFloat(r.joker) || null } })
        }
        ok++
      } catch (e) {
        console.error('ActivityLog import failed:', r, e)
        fail++
      }
    }
    console.log(`Activity logs imported: ${ok}, failed: ${fail}`)
  }

  // OFFERS (standalone)
  const offers = readCSVMaybe(dir, 'offers.csv')
  if (offers?.length) {
    let ok = 0, fail = 0
    for (const r of offers) {
      try {
        const taskId = r.taskExternalId ? taskIdByExternal.get(r.taskExternalId) : undefined
        if (!taskId) { fail++; continue }
        if (dry) { ok++; continue }
        await prisma.offer.create({ data: { taskId, adFee: toFloat(r.adFee) || null, commission: toFloat(r.commission) || null, joker: toFloat(r.joker) || null } })
        ok++
      } catch (e) {
        console.error('Offer import failed:', r, e)
        fail++
      }
    }
    console.log(`Offers imported: ${ok}, failed: ${fail}`)
  }

  console.log('Import completed.')
  await prisma.$disconnect()
}

function safeJson(s: string) { try { return JSON.parse(s) } catch { return {} } }

main().catch((e) => { console.error(e); process.exit(1) })
