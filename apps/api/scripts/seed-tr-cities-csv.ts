/*
 Seed Turkish Cities and Districts from a CSV placed at repo root: il_ilce.csv
 Expected CSV columns (header tolerated):
   il, ilce
 Delimiter can be comma or semicolon. Lines with missing values are skipped.

 Special handling for Istanbul: split into two CITY codes/labels:
   - "İstanbul Avrupa"
   - "İstanbul Anadolu"
 Districts are routed by a fixed partition list below.
 Other cities are imported as single CITY with code=label.
*/

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as dotenv from 'dotenv'

const IST_AVRUPA = new Set([
  'Arnavutköy', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş',
  'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih',
  'Gaziosmanpaşa', 'Güngören', 'Kağıthane', 'Küçükçekmece', 'Sarıyer', 'Silivri', 'Sultangazi', 'Şişli', 'Zeytinburnu'
])
const IST_ANADOLU = new Set([
  'Adalar', 'Ataşehir', 'Beykoz', 'Çekmeköy', 'Kadıköy', 'Kartal', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sultanbeyli', 'Şile', 'Tuzla', 'Ümraniye', 'Üsküdar'
])

const IST_ALIASES = new Map<string, string>([
  ['Küçük Çekmece', 'Küçükçekmece'],
  ['Büyük Çekmece', 'Büyükçekmece'],
])
function canonIstDist(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim()
  return IST_ALIASES.get(trimmed) || trimmed
}

function detectSep(line: string): string { return line.includes(';') && !line.includes(',') ? ';' : ',' }
function clean(s: string): string { return s.replace(/\uFEFF/g,'').trim() }

async function parseCsv(p: string): Promise<Array<{ city: string; district: string }>> {
  const stream = fs.createReadStream(p, 'utf8')
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
  let sep = ','
  const out: Array<{ city: string; district: string }> = []
  let first = true
  for await (const raw of rl) {
    const line = raw.trim()
    if (!line) continue
    if (first) { sep = detectSep(line); first = false; }
    const parts = line.split(sep)
    if (parts.length < 2) continue
    let c = clean(parts[0])
    let d = clean(parts[1])
    if (!c || !d) continue
    // skip header
    const low = c.toLowerCase()
    if ((low === 'il' || low === 'şehir' || low === 'sehir') && d.toLowerCase().includes('ilçe')) continue
    out.push({ city: c, district: d })
  }
  return out
}

async function main() {
  dotenv.config({ path: path.resolve(__dirname, '../.env') })
  dotenv.config()
  const prisma = new PrismaClient()
  const csvPath = path.resolve(__dirname, '../../../il_ilce.csv')
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found at ${csvPath}`)
    process.exit(1)
  }
  const rows = await parseCsv(csvPath)
  const byCity = new Map<string, Set<string>>()
  for (const r of rows) {
    const city = r.city
    const dist = r.district
    if (!byCity.has(city)) byCity.set(city, new Set())
    byCity.get(city)!.add(dist)
  }

  let cityCreated = 0, districtCreated = 0

  // Handle Istanbul split specially
  const istKey = Array.from(byCity.keys()).find(k => k.toLowerCase() === 'istanbul' || k.toLowerCase() === 'i̇stanbul')
  if (istKey) {
    const dists = byCity.get(istKey)!
    const all = Array.from(dists).map(canonIstDist)
    const avrupa = Array.from(new Set(all.filter(d => IST_AVRUPA.has(d))))
    const anadolu = Array.from(new Set(all.filter(d => IST_ANADOLU.has(d))))
    const cityPairs: Array<{ label: string; code: string; dists: string[] }> = [
      { label: 'İstanbul Avrupa', code: 'İstanbul Avrupa', dists: avrupa },
      { label: 'İstanbul Anadolu', code: 'İstanbul Anadolu', dists: anadolu },
    ]
    for (const c of cityPairs) {
      let cityRow = await prisma.lookup.findFirst({ where: { type: 'CITY', label: c.label } })
      if (!cityRow) { cityRow = await prisma.lookup.create({ data: { type: 'CITY', label: c.label, code: c.code, active: true } }); cityCreated++ }
      for (const d of c.dists) {
        let dist = await prisma.lookup.findFirst({ where: { type: 'DISTRICT', label: d, code: c.code } })
        if (!dist) {
          await prisma.lookup.create({ data: { type: 'DISTRICT', code: c.code, label: d, active: true, parentId: cityRow.id } }); districtCreated++
        } else if (!dist.parentId) {
          await prisma.lookup.update({ where: { id: dist.id }, data: { parentId: cityRow.id } })
        }
      }
    }
    byCity.delete(istKey)
  }

  // Handle other cities normally
  for (const [city, dset] of byCity.entries()) {
    const code = city
    let cityRow = await prisma.lookup.findFirst({ where: { type: 'CITY', label: city } })
    if (!cityRow) { cityRow = await prisma.lookup.create({ data: { type: 'CITY', label: city, code, active: true } }); cityCreated++ }
    for (const d of Array.from(dset)) {
      const ex = await prisma.lookup.findFirst({ where: { type: 'DISTRICT', code, label: d } })
      if (!ex) { await prisma.lookup.create({ data: { type: 'DISTRICT', code, label: d, active: true, parentId: cityRow.id } }); districtCreated++ }
      else if (!ex.parentId) { await prisma.lookup.update({ where: { id: ex.id }, data: { parentId: cityRow.id } }) }
    }
  }

  console.log(`CSV Seeded: CITY +${cityCreated}, DISTRICT +${districtCreated}`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
