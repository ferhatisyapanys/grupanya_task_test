/*
 Seed MAIN/SUB categories from a CSV at repo root named exactly "Categories_csv.csv".
 One-off import; after this UI will read from CategoryMain/CategorySub tables as LOV.
 Expected CSV columns (header tolerated):
   main, sub
 - If sub is empty, only main is inserted.
 - Idempotent: uses upsert-like logic.
*/
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as dotenv from 'dotenv'

type Row = { main: string; sub?: string }

function detectSep(line: string): string { return line.includes(';') && !line.includes(',') ? ';' : ',' }
function clean(s: string): string { return s.replace(/\uFEFF/g,'').trim() }

async function parseCsv(p: string): Promise<Row[]> {
  const stream = fs.createReadStream(p, 'utf8')
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
  let sep = ','
  const out: Row[] = []
  let first = true
  for await (const raw of rl) {
    const line = raw.trim()
    if (!line) continue
    if (first) { sep = detectSep(line); first = false }
    const parts = line.split(sep)
    if (parts.length < 1) continue
    let a = clean(parts[0] || '')
    let b = clean(parts[1] || '')
    if (!a) continue
    // Skip header
    if ((a.toLowerCase().includes('main') || a.toLowerCase().includes('ana')) && (b.toLowerCase().includes('sub') || b.toLowerCase().includes('alt'))) continue
    out.push({ main: a, sub: b || undefined })
  }
  return out
}

async function findCsv(): Promise<string | null> {
  const repoRoot = path.resolve(__dirname, '../../..')
  const fp = path.join(repoRoot, 'Categories_csv.csv')
  return fs.existsSync(fp) ? fp : null
}

async function main() {
  dotenv.config({ path: path.resolve(__dirname, '../.env') })
  dotenv.config()
  const prisma = new PrismaClient()
  const fp = await findCsv()
  if (!fp) { console.error('Category CSV not found at repo root (expected: Categories_csv.csv)'); process.exit(1) }
  const rows = await parseCsv(fp)
  let createdMain = 0, createdSub = 0
  // Prefer dedicated CategoryMain/Sub tables. If not migrated, fallback to Lookup.
  let useDedicated = true
  try { await prisma.categoryMain.findFirst() } catch { useDedicated = false }
  if (useDedicated) {
    for (const r of rows) {
      const mainLabel = r.main
      let main = await prisma.categoryMain.findUnique({ where: { label: mainLabel } })
      if (!main) { main = await prisma.categoryMain.create({ data: { label: mainLabel, active: true, order: 0 } }); createdMain++ }
      if (r.sub) {
        const subLabel = r.sub
        try {
          await prisma.categorySub.create({ data: { mainId: main.id, label: subLabel, active: true, order: 0 } })
          createdSub++
        } catch {
          await prisma.categorySub.updateMany({ where: { mainId: main.id, label: subLabel }, data: { active: true } })
        }
      }
    }
    console.log(`Seeded categories (CategoryMain/Sub). New mains: ${createdMain}, new subs: ${createdSub}`)
    return
  }
  // Fallback to Lookup
  const mains = new Map<string, string>()
  for (const r of rows) {
    let m = await prisma.lookup.findFirst({ where: { type: 'MAIN_CATEGORY', label: r.main } })
    if (!m) { m = await prisma.lookup.create({ data: { type: 'MAIN_CATEGORY', label: r.main, active: true, order: 0 } }); createdMain++ }
    mains.set(r.main, m.id)
    if (r.sub) {
      let s = await prisma.lookup.findFirst({ where: { type: 'SUB_CATEGORY', label: r.sub, parentId: m.id } })
      if (!s) {
        s = await prisma.lookup.findFirst({ where: { type: 'SUB_CATEGORY', label: r.sub } })
        if (!s) { await prisma.lookup.create({ data: { type: 'SUB_CATEGORY', label: r.sub, active: true, order: 0, parentId: m.id } }); createdSub++ }
        else if (!s.parentId) { await prisma.lookup.update({ where: { id: s.id }, data: { parentId: m.id } }) }
      }
    }
  }
  console.log(`Seeded categories (Lookup fallback). New mains: ${createdMain}, new subs: ${createdSub}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
