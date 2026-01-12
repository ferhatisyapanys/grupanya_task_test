/*
 One-off util: Enrich an Account from its linked Lead (latest),
 filling common/default fields: category (main/sub), city/district,
 website/instagram, businessContact/contactPerson, address/services/bestService/notes.

 Usage:
   cd apps/api
   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/enrich-account-from-lead.ts <accountId>
*/
import { PrismaClient } from '@prisma/client'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config()

const prisma = new PrismaClient()

async function resolveCategory(src: { explicit?: string; web?: string; payload?: string; main?: string | null; sub?: string | null }): Promise<{ main?: string; sub?: string; category: string }> {
  let main = (src.main || '').toString().trim()
  let sub = (src.sub || '').toString().trim()
  const candidates = [src.explicit, src.web, src.payload].filter(Boolean) as string[]
  const split = (v: string) => {
    const s = String(v || '')
    const parts = s.split(/\s*[/\->|]\s*/).filter(Boolean)
    if (parts.length >= 2) return { m: parts[0], s: parts[1] }
    if (parts.length === 1) return { m: parts[0], s: '' }
    return { m: '', s: '' }
  }
  if (!main || !sub) {
    for (const c of candidates) {
      const r = split(c!)
      if (!main && r.m) main = r.m
      if (!sub && r.s) sub = r.s
      if (main && sub) break
    }
  }
  if (!main && sub) {
    try {
      const hit = await prisma.categorySub.findFirst({ where: { label: { equals: sub, mode: 'insensitive' } }, include: { main: true } })
      if (hit) { main = hit.main.label; sub = hit.label }
    } catch {
      try {
        const subRow = await prisma.lookup.findFirst({ where: { type: 'SUB_CATEGORY', label: { equals: sub, mode: 'insensitive' } } })
        if (subRow && (subRow as any).parentId) {
          const mainRow = await prisma.lookup.findUnique({ where: { id: (subRow as any).parentId as string } })
          if (mainRow) { main = (mainRow as any).label || main; sub = (subRow as any).label || sub }
        }
      } catch {}
    }
  }
  const category = sub ? `${main} / ${sub}` : (main || 'General')
  return { main: main || undefined, sub: sub || undefined, category }
}

async function main() {
  const accountId = process.argv[2]
  if (!accountId) { console.error('Usage: enrich-account-from-lead.ts <accountId>'); process.exit(1) }
  const account = await prisma.account.findUnique({ where: { id: accountId } })
  if (!account) { console.error('Account not found:', accountId); process.exit(1) }
  const lead = await prisma.lead.findFirst({ where: { linkedAccountId: accountId }, orderBy: { createdAt: 'desc' } })
  if (!lead) { console.error('No linked lead found for account:', accountId); process.exit(1) }
  const payload = (lead.payload ?? {}) as any

  const { main, sub, category } = await resolveCategory({ explicit: undefined, web: lead.webCategory || undefined, payload: payload.category, main: (lead as any).mainCategory, sub: (lead as any).subCategory })

  const patch: any = {}
  if (category) patch.category = category
  if (main) patch.mainCategory = main
  if (sub) patch.subCategory = sub
  const leadWebsite = (lead as any).website || payload.website
  if (leadWebsite) patch.website = String(leadWebsite)
  const leadInstagram = payload.instagram
  if (leadInstagram) patch.instagram = String(leadInstagram)
  const leadPhone = lead.phone || payload.phone
  if (leadPhone) patch.businessContact = String(leadPhone)
  const leadPerson = (lead as any).person
  if (leadPerson) patch.contactPerson = String(leadPerson)
  const leadCity = lead.city || payload.city
  if (leadCity) patch.city = String(leadCity)
  const leadDistrict = lead.district || payload.district
  if (leadDistrict) patch.district = String(leadDistrict)
  if (payload.address) patch.address = String(payload.address)
  if (payload.services) patch.services = String(payload.services)
  if (payload.bestService) patch.bestService = String(payload.bestService)
  if (payload.note && !(account as any).notes) patch.notes = String(payload.note)

  if (Object.keys(patch).length === 0) {
    console.log('No fields to update from lead.');
    return
  }
  await prisma.account.update({ where: { id: accountId }, data: patch })
  console.log('Account updated from lead:', { accountId, patch })
}

main().catch((e) => { console.error(e); process.exit(1) })

