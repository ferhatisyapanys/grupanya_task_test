import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

async function main() {
  dotenv.config({ path: path.resolve(__dirname, '../.env') })
  dotenv.config()
  const prisma = new PrismaClient()
  const fromCode = 'İstanbul Anadolu'
  const toCode = 'İstanbul Avrupa'
  const label = 'Şişli'
  const existing = await prisma.lookup.findFirst({ where: { type: 'DISTRICT', label, code: fromCode } })
  if (existing) {
    await prisma.lookup.update({ where: { id: existing.id }, data: { code: toCode } })
    console.log('Moved Şişli district from Anadolu to Avrupa')
  } else {
    console.log('No Şişli under Anadolu found; nothing to change')
  }
  await prisma.$disconnect()
}

main().catch((e)=>{ console.error(e); process.exit(1) })

