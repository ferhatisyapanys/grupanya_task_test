/*
 Seed Turkish Cities and Districts into Lookup table.
 - Reads JSON from artifacts/lov/tr_cities.json with shape:
   {
     "cities": [
       { "label": "İstanbul Avrupa", "code": "İstanbul Avrupa", "districts": ["Bakırköy", "Beşiktaş", ...] },
       { "label": "İstanbul Anadolu", "code": "İstanbul Anadolu", "districts": ["Kadıköy", "Üsküdar", ...] },
       { "label": "Ankara", "code": "Ankara", "districts": ["Çankaya", "Keçiören", ...] }
       ...
     ]
   }
 Usage:
   npm --workspace=apps/api run ts-node -- --compiler-options '{"module":"commonjs"}' scripts/seed-tr-cities.ts
*/
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

async function main() {
  // Ensure we use apps/api/.env first, then fallback
  dotenv.config({ path: path.resolve(__dirname, '../.env') })
  dotenv.config()
  const prisma = new PrismaClient()
  const file = path.resolve(__dirname, '../../../artifacts/lov/tr_cities.json')
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`)
    process.exit(1)
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { cities: { label: string; code?: string; districts?: string[] }[] }
  let cityCount = 0, distCount = 0
  for (const c of data.cities) {
    const code = c.code || c.label
    const cityLabel = c.label
    const existing = await prisma.lookup.findFirst({ where: { type: 'CITY', label: cityLabel } })
    if (!existing) {
      await prisma.lookup.create({ data: { type: 'CITY', label: cityLabel, code, active: true } })
      cityCount++
    }
    if (c.districts?.length) {
      for (const d of c.districts) {
        const ex = await prisma.lookup.findFirst({ where: { type: 'DISTRICT', label: d, code } })
        if (!ex) { await prisma.lookup.create({ data: { type: 'DISTRICT', label: d, code, active: true } }); distCount++ }
      }
    }
  }
  console.log(`Seeded: CITY +${cityCount}, DISTRICT +${distCount}`)
  await prisma.$disconnect()
}

main().catch((e)=>{ console.error(e); process.exit(1) })
