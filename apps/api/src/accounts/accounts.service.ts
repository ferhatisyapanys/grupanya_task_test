import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../infrastructure/prisma/prisma.service'
import { AccountListQueryDto, CreateAccountDto, SortOption, UpdateAccountDto } from './dto/account.dto'

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async list(q: AccountListQueryDto & { page?: number; limit?: number; city?: string; district?: string }) {
    const where: any = {}
    if (q.q) {
      where.OR = [
        { accountName: { contains: q.q, mode: 'insensitive' } },
        { businessName: { contains: q.q, mode: 'insensitive' } },
      ]
    }
    if (q.source) where.source = q.source as any
    if (q.status) where.status = q.status as any
    if (q.type) where.type = q.type as any
    if ((q as any).city) where.city = (q as any).city
    if ((q as any).district) where.district = (q as any).district

    let orderBy: any = { accountName: 'asc' }
    switch (q.sort) {
      case SortOption.name_desc:
        orderBy = { accountName: 'desc' }
        break
      case SortOption.newest:
        orderBy = { creationDate: 'desc' }
        break
      case SortOption.oldest:
        orderBy = { creationDate: 'asc' }
        break
    }

    const page = Number((q as any).page || 1)
    const limit = Math.min(Number((q as any).limit || 20), 100)
    const skip = (page - 1) * limit
    const [items, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({ where, orderBy, take: limit, skip }),
      this.prisma.account.count({ where }),
    ])
    return { items, total, page, limit }
  }

  async detail(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        history: { orderBy: { createdAt: 'desc' }, take: 20 },
        tasks: { select: { id: true, status: true, generalStatus: true }, take: 5, orderBy: { creationDate: 'desc' } },
        contacts: true,
        notesRel: { orderBy: { createdAt: 'desc' }, take: 10 },
        deals: { orderBy: { startDate: 'desc' }, take: 5 },
      },
    })
    if (!account) throw new NotFoundException('Account not found')
    const openTasks = account.tasks.filter(t => t.generalStatus === 'OPEN').length
    return { ...account, openTasks }
  }

  create(body: CreateAccountDto) {
    return this.prisma.$transaction(async (tx) => {
      const pubId = await this.generateAccountPublicId(tx)
      // Parse category string "Main / Sub" into separate columns if present
      let mainCategory: string | undefined; let subCategory: string | undefined
      if ((body as any).category) {
        const parts = String((body as any).category).split(' / ')
        mainCategory = parts[0] || undefined
        subCategory = parts[1] || undefined
      }
      const acc = await tx.account.create({ data: { ...(body as any), mainCategory: mainCategory || null, subCategory: subCategory || null, accountPublicId: pubId } })
      await tx.activityHistory.create({ data: { accountId: acc.id, type: 'PROFILE_UPDATE', summary: `Account created (${pubId})` } })
      return acc
    })
  }

  async update(id: string, body: UpdateAccountDto) {
    const exists = await this.prisma.account.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('Account not found')
    const data: any = { ...(body as any) }
    if ((body as any).category) {
      const parts = String((body as any).category).split(' / ')
      data.mainCategory = parts[0] || null
      data.subCategory = parts[1] || null
    }
    const updated = await this.prisma.account.update({ where: { id }, data })
    await this.prisma.activityHistory.create({ data: { accountId: id, type: 'PROFILE_UPDATE', summary: `Account updated` } })
    return updated
  }

  async search(q: string, take = 10) {
    const where: any = q
      ? { OR: [
            { accountName: { contains: q, mode: 'insensitive' } },
            { businessName: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
          ] }
      : {}
    const items = await this.prisma.account.findMany({ where, orderBy: { accountName: 'asc' }, take })
    return items.map(a => ({ id: a.id, label: `${a.accountName}${a.city ? ' • '+a.city : ''} • ${a.id}`, accountName: a.accountName, city: a.city }))
  }

  // Contacts
  async listContacts(accountId: string) {
    const acc = await this.prisma.account.findUnique({ where: { id: accountId }, select: { id: true } })
    if (!acc) throw new NotFoundException('Account not found')
    return this.prisma.accountContact.findMany({ where: { accountId }, orderBy: { isPrimary: 'desc' } })
  }
  async createContact(accountId: string, body: { type: 'BUSINESS'|'PERSON'; name: string; phone?: string; email?: string; address?: string; isPrimary?: boolean }) {
    const acc = await this.prisma.account.findUnique({ where: { id: accountId }, select: { id: true } })
    if (!acc) throw new NotFoundException('Account not found')
    if (body.isPrimary) {
      await this.prisma.accountContact.updateMany({ where: { accountId }, data: { isPrimary: false } })
    }
    return this.prisma.accountContact.create({ data: { accountId, type: body.type as any, name: body.name, phone: body.phone || null, email: body.email || null, address: body.address || null, isPrimary: !!body.isPrimary } })
  }
  async updateContact(accountId: string, contactId: string, body: Partial<{ type: 'BUSINESS'|'PERSON'; name: string; phone?: string; email?: string; address?: string; isPrimary?: boolean }>) {
    const contact = await this.prisma.accountContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.accountId !== accountId) throw new NotFoundException('Contact not found')
    if (body.isPrimary) await this.prisma.accountContact.updateMany({ where: { accountId }, data: { isPrimary: false } })
    return this.prisma.accountContact.update({ where: { id: contactId }, data: { ...(body.type ? { type: body.type as any } : {}), ...(body.name ? { name: body.name } : {}), phone: body.phone ?? contact.phone, email: body.email ?? contact.email, address: body.address ?? contact.address, ...(body.isPrimary !== undefined ? { isPrimary: body.isPrimary } : {}) } })
  }
  async deleteContact(accountId: string, contactId: string) {
    const contact = await this.prisma.accountContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.accountId !== accountId) throw new NotFoundException('Contact not found')
    await this.prisma.accountContact.delete({ where: { id: contactId } })
    return { ok: true }
  }

  // Notes
  async listNotes(accountId: string) {
    const acc = await this.prisma.account.findUnique({ where: { id: accountId }, select: { id: true } })
    if (!acc) throw new NotFoundException('Account not found')
    return this.prisma.accountNote.findMany({ where: { accountId }, orderBy: { createdAt: 'desc' }, take: 50 })
  }
  async createNote(accountId: string, content: string, createdById?: string) {
    const acc = await this.prisma.account.findUnique({ where: { id: accountId }, select: { id: true } })
    if (!acc) throw new NotFoundException('Account not found')
    return this.prisma.accountNote.create({ data: { accountId, content, createdById: createdById || null } })
  }
  async deleteNote(accountId: string, noteId: string) {
    const note = await this.prisma.accountNote.findUnique({ where: { id: noteId } })
    if (!note || note.accountId !== accountId) throw new NotFoundException('Note not found')
    await this.prisma.accountNote.delete({ where: { id: noteId } })
    return { ok: true }
  }

  // Status change with validation
  async changeStatus(id: string, status: 'ACTIVE'|'PASSIVE') {
    const acc = await this.prisma.account.findUnique({ where: { id }, include: { tasks: { where: { generalStatus: 'OPEN' } } } })
    if (!acc) throw new NotFoundException('Account not found')
    if (status === 'PASSIVE' && acc.tasks.length > 0) {
      throw new Error('Cannot set PASSIVE while there are OPEN tasks')
    }
    const updated = await this.prisma.account.update({ where: { id }, data: { status } as any })
    await this.prisma.activityHistory.create({ data: { accountId: id, type: 'PROFILE_UPDATE', summary: `Status changed to ${status}` } })
    return updated
  }

  // Histories
  accountActivityHistory(id: string) { return this.prisma.activityHistory.findMany({ where: { accountId: id }, orderBy: { createdAt: 'desc' }, take: 100 }) }
  accountDealHistory(id: string) { return this.prisma.dealHistory.findMany({ where: { deal: { accountId: id } }, orderBy: { createdAt: 'desc' }, take: 100 }) }
  accountTaskHistory(id: string) { return this.prisma.task.findMany({ where: { accountId: id }, orderBy: { creationDate: 'desc' }, take: 100, select: { id: true, status: true, generalStatus: true, creationDate: true, closedAt: true, closedReason: true } }) }

  // Account ID generator ACC-YYYYMM-XXXXX
  private async generateAccountPublicId(tx: PrismaService) {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const prefix = `ACC-${y}${m}-`
    const start = new Date(y, now.getMonth(), 1)
    const end = new Date(y, now.getMonth() + 1, 1)
    const count = await tx.account.count({ where: { creationDate: { gte: start, lt: end } } })
    const seq = String(count + 1).padStart(5, '0')
    return prefix + seq
  }

  // Admin-only: Remove account if no hard dependencies (tasks/leads/deals). Cleans up notes/contacts/history.
  async remove(id: string) {
    const acc = await this.prisma.account.findUnique({ where: { id } })
    if (!acc) throw new NotFoundException('Account not found')
    // Gather related entities (within a simple transactional read, then map ids)
    const [tasks, deals] = await this.prisma.$transaction([
      this.prisma.task.findMany({ where: { accountId: id }, select: { id: true } }),
      this.prisma.deal.findMany({ where: { accountId: id }, select: { id: true } }),
    ])
    const taskIds = tasks.map((x) => x.id)
    const dealIds = deals.map((x) => x.id)
    // Cascade delete in strict order within a single interactive transaction
    await this.prisma.$transaction(async (tx) => {
      // Unlink leads first so FK constraints don't block
      await tx.lead.updateMany({ where: { linkedAccountId: id }, data: { linkedAccountId: null } })

      // Break potential cross-account FK: any deal referencing these tasks must be detached first
      if (taskIds.length) {
        await tx.deal.updateMany({ where: { taskId: { in: taskIds } }, data: { taskId: null } })
      }

      // Deal relations then deals (must happen BEFORE task deletes because Deal.taskId references Task)
      if (dealIds.length) {
        await tx.dealHistory.deleteMany({ where: { dealId: { in: dealIds } } })
      }
      await tx.deal.deleteMany({ where: { accountId: id } })

      // Task relations then tasks
      if (taskIds.length) {
        await tx.taskContact.deleteMany({ where: { taskId: { in: taskIds } } })
        await tx.offer.deleteMany({ where: { taskId: { in: taskIds } } })
        await tx.activityLog.deleteMany({ where: { taskId: { in: taskIds } } })
        await tx.notification.deleteMany({ where: { taskId: { in: taskIds } } })
      }
      await tx.task.deleteMany({ where: { accountId: id } })

      // Account-side relations
      await tx.accountNote.deleteMany({ where: { accountId: id } })
      await tx.accountContact.deleteMany({ where: { accountId: id } })
      await tx.activityHistory.deleteMany({ where: { accountId: id } })

      // Finally delete account
      await tx.account.delete({ where: { id } })
    })
    return { ok: true }
  }

  // Manager+: duplicate account (profile-only). Returns the new account.
  async duplicate(id: string, suffix?: string) {
    const acc = await this.prisma.account.findUnique({ where: { id } })
    if (!acc) throw new NotFoundException('Account not found')
    const now = new Date()
    const yy = String(now.getFullYear()).slice(2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const sfx = suffix || ''
    const name = `${acc.accountName}${sfx}`
    const bname = `${acc.businessName}${sfx}`
    const created = await this.prisma.account.create({
      data: {
        accountName: name,
        businessName: bname,
        status: acc.status,
        source: acc.source,
        category: acc.category,
        type: acc.type,
        city: (acc as any).city || null,
        district: (acc as any).district || null,
        address: (acc as any).address || null,
        website: (acc as any).website || null,
        instagram: (acc as any).instagram || null,
        businessContact: (acc as any).businessContact || null,
        contactPerson: (acc as any).contactPerson || null,
        notes: (acc as any).notes || null,
        services: (acc as any).services || null,
        bestService: (acc as any).bestService || null,
      } as any,
    })
    await this.prisma.activityHistory.create({ data: { accountId: created.id, type: 'PROFILE_UPDATE', summary: `Account duplicated from ${acc.id}` } })
    return created
  }
}
