import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../infrastructure/prisma/prisma.service'
import { LeadConvertDto, LeadLinkupDto } from './dto/lead-convert.dto'
import { CreateLeadDto } from './dto/lead-create.dto'

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  private async log(leadId: string, action: 'CREATED'|'VIEWED'|'CONVERTED'|'LINKED'|'UPDATED', details?: any, userId?: string) {
    await this.prisma.leadActivityLog.create({ data: { leadId, action: action as any, details: details ?? null, createdById: userId ?? null } })
  }

  async list(params: { from?: Date; to?: Date; skip: number; take: number; status?: string; source?: string; search?: string; city?: string; district?: string }) {
    const where: any = {}
    if (params.from || params.to) {
      where.createdAt = {}
      if (params.from) where.createdAt.gte = params.from
      if (params.to) where.createdAt.lte = params.to
    }
    if (params.status) where.workflowStatus = params.status as any
    if (params.source) where.payload = { path: ['source'], string_contains: params.source } as any
    if (params.city) where.city = { contains: params.city, mode: 'insensitive' }
    if (params.district) where.district = { contains: params.district, mode: 'insensitive' }
    if (params.search) {
      const q = String(params.search)
      where.OR = [
        { company: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ]
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      this.prisma.lead.count({ where }),
    ])
    return { items, total }
  }

  async detail(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } })
    if (!lead) throw new NotFoundException('Lead not found')
    await this.log(id, 'VIEWED')
    return lead
  }

  async history(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } })
    if (!lead) throw new NotFoundException('Lead not found')
    return this.prisma.leadActivityLog.findMany({ where: { leadId: id }, orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, name: true, email: true } } } })
  }

  async create(dto: CreateLeadDto) {
    const payload = dto.payload ?? {
      accountName: dto.accountName,
      businessName: dto.businessName,
      category: dto.category,
      city: dto.city,
      district: dto.district,
      instagram: dto.instagram,
    }
    // Parse category string into main/sub when provided
    let mainCategory: string | undefined; let subCategory: string | undefined
    if ((dto as any).category) {
      const parts = String((dto as any).category).split(' / ')
      mainCategory = parts[0] || undefined
      subCategory = parts[1] || undefined
    }
    const lead = await this.prisma.lead.create({
      data: {
        createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
        payload: payload as any,
        company: dto.accountName ?? null,
        webCategory: dto.category ?? null,
        mainCategory: mainCategory || null,
        subCategory: subCategory || null,
        city: dto.city ?? null,
        district: dto.district ?? null,
        email: dto.email,
        phone: dto.phone,
        website: dto.website ?? null,
        person: dto.contactPerson,
      },
    })
    await this.log(lead.id, 'CREATED', { source: 'API' })
    return lead
  }

  async search(q: string, take = 10) {
    const where: any = q ? {
      OR: [
        { company: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ]
    } : {}
    const items = await this.prisma.lead.findMany({ where, take, orderBy: { createdAt: 'desc' } })
    return items.map(l => ({ id: l.id, label: `${l.company || (l as any).payload?.accountName || 'Lead'} • ${l.id}`, city: l.city }))
  }

  async update(id: string, body: any) {
    const lead = await this.prisma.lead.findUnique({ where: { id } })
    if (!lead) throw new NotFoundException('Lead not found')
    const data: any = {}
    const fields = ['company','webCategory','city','district','email','phone','person','website']
    for (const k of fields) if (body[k] !== undefined) data[k] = body[k]
    if (body.instagram) {
      // store instagram in payload to avoid schema change
      const cur = (lead.payload ?? {}) as any
      cur.instagram = body.instagram
      data.payload = cur
    }
    if (body.payload) data.payload = body.payload
    const updated = await this.prisma.lead.update({ where: { id }, data })
    await this.log(id, 'UPDATED', { fields: Object.keys(data) })
    return updated
  }

  async convert(dto: LeadConvertDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } })
    if (!lead) throw new NotFoundException('Lead not found')
    if (lead.linkedAccountId) throw new BadRequestException('Lead already linked')

    const payload = (lead.payload ?? {}) as any
    const acc = dto.account ?? {}
    // Prefer explicitly provided name, then edited lead.company, then payload
    const accountName = (acc.accountName || lead.company || payload.accountName || '').trim()
    const businessName = (acc.businessName || lead.company || payload.businessName || accountName || `Lead ${lead.id}`).trim()
    // Resolve category robustly (supports "Main / Sub", or only Sub by lookup)
    const resolvedCat = await this.resolveCategory({
      explicit: acc.category as any,
      web: lead.webCategory as any,
      payload: payload.category as any,
      main: (lead as any).mainCategory,
      sub: (lead as any).subCategory,
    })
    const categoryStr = resolvedCat.category
    const leadMain = resolvedCat.main
    const leadSub = resolvedCat.sub

    // Try to match existing account by name (case-insensitive)
    let existing: any = null
    if (accountName) {
      existing = await this.prisma.account.findFirst({ where: { accountName: { equals: accountName, mode: 'insensitive' } } })
    }
    // Fallback match by website or phone if present in payload
    if (!existing && (payload.website || payload.phone)) {
      existing = await this.prisma.account.findFirst({
        where: {
          OR: [
            { website: payload.website ? { equals: String(payload.website), mode: 'insensitive' } : undefined },
            { businessContact: payload.phone ? { contains: String(payload.phone), mode: 'insensitive' } : undefined },
          ].filter(Boolean) as any,
        },
      })
    }

    if (existing) {
      // Enrich/overwrite existing account fields from lead/payload (prefer fresh lead info)
      const patch: any = {}
      const leadWebsite = lead.website || payload.website
      if (leadWebsite) patch.website = String(leadWebsite)
      const leadInstagram = payload.instagram
      if (leadInstagram) (patch as any).instagram = String(leadInstagram)
      const leadPhone = lead.phone || payload.phone
      if (leadPhone) patch.businessContact = String(leadPhone)
      const leadPerson = lead.person
      if (leadPerson) patch.contactPerson = String(leadPerson)
      const leadCity = lead.city || payload.city
      if (leadCity) patch.city = String(leadCity)
      const leadDistrict = lead.district || payload.district
      if (leadDistrict) patch.district = String(leadDistrict)
      // main/sub category enrichment (overwrite with lead category)
      if (leadMain) (patch as any).mainCategory = String(leadMain)
      if (leadSub) (patch as any).subCategory = String(leadSub)
      if (categoryStr) (patch as any).category = String(categoryStr)
      const leadAddress = payload.address
      if (!(existing as any).address && leadAddress) (patch as any).address = String(leadAddress)
      const leadServices = payload.services
      if (!(existing as any).services && leadServices) (patch as any).services = String(leadServices)
      const leadBestService = payload.bestService
      if (!(existing as any).bestService && leadBestService) (patch as any).bestService = String(leadBestService)
      const leadNote = payload.note
      if (!(existing as any).notes && leadNote) (patch as any).notes = String(leadNote)

      await this.prisma.$transaction([
        this.prisma.lead.update({ where: { id: lead.id }, data: { linkedAccountId: existing.id } }),
        ...(Object.keys(patch).length ? [this.prisma.account.update({ where: { id: existing.id }, data: patch })] : []),
        this.prisma.activityHistory.create({ data: { accountId: existing.id, type: 'LEAD_LINKUP', summary: `Lead ${lead.id} linked to existing account ${existing.accountName}` } }),
      ])
      await this.log(lead.id, 'LINKED', { accountId: existing.id })
      return { accountId: existing.id, linked: true }
    }

    const account = await this.prisma.account.create({
      data: {
        accountName: accountName || businessName,
        businessName,
        status: (acc.status as any) || 'ACTIVE',
        source: (acc.source as any) || 'QUERY',
        category: categoryStr || 'General',
        mainCategory: (leadMain as any) || null,
        subCategory: (leadSub as any) || null,
        type: (acc.type as any) || 'LONG_TAIL',
        website: (lead.website as any) || payload.website || null,
        businessContact: (lead.phone as any) || payload.phone || null,
        contactPerson: (lead.person as any) || null,
        // instagram may exist in schema; if not, cast will ignore at runtime
        ...(payload?.instagram ? { instagram: (payload as any).instagram } : {}),
        city: (lead.city as any) || payload.city || null,
        district: (lead.district as any) || payload.district || null,
        address: payload.address || null,
        services: payload.services || null,
        bestService: payload.bestService || null,
        notes: (acc as any).notes || payload.note || null,
      },
    } as any)

    await this.prisma.$transaction([
      this.prisma.lead.update({ where: { id: lead.id }, data: { linkedAccountId: account.id, workflowStatus: 'CONVERTED' as any, company: businessName, city: payload.city || null, email: (lead.email as any) || (payload as any).email || null, phone: (lead.phone as any) || (payload as any).phone || null, website: (lead.website as any) || (payload as any).website || null } as any }),
      this.prisma.activityHistory.create({ data: { accountId: account.id, type: 'LEAD_CONVERT', summary: `Lead ${lead.id} converted to account` } }),
    ])
    await this.log(lead.id, 'CONVERTED', { accountId: account.id })
    return { accountId: account.id, linked: false }
  }

  async linkup(dto: LeadLinkupDto) {
    const [lead, account] = await Promise.all([
      this.prisma.lead.findUnique({ where: { id: dto.leadId } }),
      this.prisma.account.findUnique({ where: { id: dto.accountId } }),
    ])
    if (!lead) throw new NotFoundException('Lead not found')
    if (!account) throw new NotFoundException('Account not found')
    // Prepare optional account enrichment (only if missing on account)
    const payload = (lead.payload ?? {}) as any
    const patch: any = {}
    const leadWebsite = lead.website || payload.website
    if (!account.website && leadWebsite) patch.website = String(leadWebsite)
    // instagram lives under payload
    const leadInstagram = payload.instagram
    if (!(account as any).instagram && leadInstagram) (patch as any).instagram = String(leadInstagram)
    // phone/contact person enrichment
    const leadPhone = lead.phone || payload.phone
    if (!account.businessContact && leadPhone) patch.businessContact = String(leadPhone)
    const leadPerson = lead.person
    if (!account.contactPerson && leadPerson) patch.contactPerson = String(leadPerson)
    const leadCity = lead.city || payload.city
    if (!account.city && leadCity) patch.city = String(leadCity)
    const leadDistrict = lead.district || payload.district
    if (!account.district && leadDistrict) patch.district = String(leadDistrict)

    await this.prisma.$transaction([
      this.prisma.lead.update({ where: { id: lead.id }, data: { linkedAccountId: account.id, workflowStatus: 'LINKED' as any } }),
      ...(Object.keys(patch).length ? [this.prisma.account.update({ where: { id: account.id }, data: patch })] : []),
      this.prisma.activityHistory.create({
        data: { accountId: account.id, type: 'LEAD_LINKUP', summary: `Lead ${lead.id} linked to account ${account.accountName}` },
      }),
    ])
    await this.log(lead.id, 'LINKED', { accountId: account.id })
    return { ok: true }
  }

  async remove(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } })
    if (!lead) throw new NotFoundException('Lead not found')
    await this.prisma.$transaction([
      this.prisma.leadActivityLog.deleteMany({ where: { leadId: id } }),
      this.prisma.lead.delete({ where: { id } }),
    ])
    return { ok: true }
  }

  async unlink(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } })
    if (!lead) throw new NotFoundException('Lead not found')
    if (!lead.linkedAccountId) return { ok: true }
    const accId = lead.linkedAccountId
    await this.prisma.$transaction([
      this.prisma.lead.update({ where: { id }, data: { linkedAccountId: null } }),
      // Optional: account side history entry
      this.prisma.activityHistory.create({ data: { accountId: accId, type: 'PROFILE_UPDATE', summary: `Lead ${id} unlinked from account` } }),
    ])
    await this.log(id, 'UPDATED', { unlinked: true, accountId: accId })
    return { ok: true }
  }

  // Resolve category main/sub using multiple hints. Accepts strings like "Main / Sub",
  // or only sub label by looking up CategorySub and deriving its main.
  private async resolveCategory(src: { explicit?: string; web?: string; payload?: string; main?: string; sub?: string }): Promise<{ main?: string; sub?: string; category: string }> {
    // Direct values from lead columns have priority
    let main = src.main?.toString().trim() || ''
    let sub = src.sub?.toString().trim() || ''

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
    // If only sub is present, or still ambiguous, try lookup in CategorySub then Lookup fallback
    if (!main && sub) {
      let resolved = false
      try {
        const hit = await this.prisma.categorySub.findFirst({ where: { label: { equals: sub, mode: 'insensitive' } }, include: { main: true } })
        if (hit) { main = hit.main.label; sub = hit.label; resolved = true }
      } catch {
        // ignore when CategorySub table not migrated
      }
      if (!resolved) {
        try {
          const subRow = await this.prisma.lookup.findFirst({ where: { type: 'SUB_CATEGORY', label: { equals: sub, mode: 'insensitive' } } })
          if (subRow && (subRow as any).parentId) {
            const mainRow = await this.prisma.lookup.findUnique({ where: { id: (subRow as any).parentId as string } })
            if (mainRow) { main = (mainRow as any).label || main; sub = (subRow as any).label || sub }
          }
        } catch {}
      }
    }
    // If only main present, ensure it matches known main (best-effort) — optional
    // If only main is present and sub is empty, that's acceptable
    const category = sub ? `${main} / ${sub}` : (main || 'General')
    return { main: main || undefined, sub: sub || undefined, category }
  }
}
