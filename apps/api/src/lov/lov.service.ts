import { Injectable } from '@nestjs/common'
import { PrismaService } from '../infrastructure/prisma/prisma.service'

@Injectable()
export class LovService {
  constructor(private prisma: PrismaService) {}

  async list(type: string, code?: string) {
    if (!type) return []
    // Special handling for hierarchical DISTRICT by CITY label
    if (type === 'DISTRICT' && code) {
      // 1) Try parent relation (CITY by label)
      const city = await this.prisma.lookup.findFirst({ where: { type: 'CITY', label: code, active: true } })
      if (city) {
        const items = await this.prisma.lookup.findMany({ where: { type: 'DISTRICT', active: true, parentId: city.id }, orderBy: { label: 'asc' }, take: 2000 })
        if (items.length) return items.map(i => ({ code: i.code, label: i.label }))
      }
      // 2) Legacy fallback: code column match (if data seeded with code)
      const legacy = await this.prisma.lookup.findMany({ where: { type: 'DISTRICT', active: true, code }, orderBy: { label: 'asc' }, take: 2000 })
      if (legacy.length) return legacy.map(i => ({ code: i.code, label: i.label }))
      // 3) Final fallback: return all active districts (avoid empty UI)
      const all = await this.prisma.lookup.findMany({ where: { type: 'DISTRICT', active: true }, orderBy: { label: 'asc' }, take: 2000 })
      return all.map(i => ({ code: i.code, label: i.label }))
    }
    // Default (CITY, MAIN/SUB, others)
    const where: any = { type, active: true }
    if (code) where.code = code
    const items = await this.prisma.lookup.findMany({ where, orderBy: { label: 'asc' }, take: 2000 })
    return items.map(i => ({ code: i.code, label: i.label }))
  }

  enums() {
    return {
      TaskCategory: ['ISTANBUL_CORE','ANADOLU_CORE','TRAVEL'],
      TaskType: ['GENERAL','PROJECT'],
      TaskPriority: ['LOW','MEDIUM','HIGH','CRITICAL'],
      AccountType: ['KEY','LONG_TAIL'],
      AccountSource: ['QUERY','FRESH','RAKIP','REFERANS','OLD'],
      TaskStatus: ['HOT','NOT_HOT','DEAL','COLD'],
      GeneralStatus: ['OPEN','CLOSED']
    }
  }

  private mapType(t: 'MAIN'|'SUB') { return t === 'MAIN' ? 'MAIN_CATEGORY' : 'SUB_CATEGORY' }

  async listCategories(mode: 'TREE'|'MAIN'|'SUB' = 'TREE') {
    // Prefer dedicated CategoryMain/Sub tables; fallback to Lookup if not migrated
    try {
      if (mode === 'MAIN') {
        return this.prisma.categoryMain.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { label: 'asc' }] })
      }
      if (mode === 'SUB') {
        return this.prisma.categorySub.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { label: 'asc' }] })
      }
      const mains = await this.prisma.categoryMain.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { label: 'asc' }], include: { subs: { where: { active: true }, orderBy: [{ order: 'asc' }, { label: 'asc' }] } } })
      return mains.map(m => ({ id: m.id, label: m.label, active: m.active, order: m.order, children: (m.subs||[]).map(s=> ({ id: s.id, label: s.label, active: s.active, order: s.order })) }))
    } catch {
      // Fallback to Lookup
      if (mode === 'MAIN') {
        return this.prisma.lookup.findMany({ where: { type: 'MAIN_CATEGORY', active: true }, orderBy: [{ order: 'asc' }, { label: 'asc' }] })
      }
      if (mode === 'SUB') {
        return this.prisma.lookup.findMany({ where: { type: 'SUB_CATEGORY', active: true }, orderBy: [{ order: 'asc' }, { label: 'asc' }] })
      }
      const mains = await this.prisma.lookup.findMany({ where: { type: 'MAIN_CATEGORY', active: true }, orderBy: [{ order: 'asc' }, { label: 'asc' }] })
      const subs = await this.prisma.lookup.findMany({ where: { type: 'SUB_CATEGORY', active: true }, orderBy: [{ order: 'asc' }, { label: 'asc' }] })
      const byParent = subs.reduce<Record<string, any[]>>((acc, s) => { const pid = (s as any).parentId || ''; (acc[pid] ||= []).push(s); return acc }, {})
      return mains.map(m => ({ ...m, children: byParent[m.id] || [] }))
    }
  }

  async createCategory(body: { name: string; type: 'MAIN'|'SUB'; parentId?: string; order?: number; active?: boolean }) {
    if (!body?.name) throw new Error('name required')
    const type = this.mapType(body.type)
    if (body.type === 'SUB' && !body.parentId) throw new Error('parentId required for SUB')
    return this.prisma.lookup.create({ data: { type, label: body.name, code: null, active: body.active ?? true, parentId: body.parentId || null, order: body.order ?? 0 } })
  }

  async updateCategory(id: string, body: Partial<{ name: string; parentId?: string|null; order?: number; active?: boolean }>) {
    const item = await this.prisma.lookup.findUnique({ where: { id } })
    if (!item) throw new Error('category not found')
    return this.prisma.lookup.update({ where: { id }, data: { label: body.name ?? undefined, parentId: (body.parentId === undefined ? undefined : (body.parentId || null)), order: body.order ?? undefined, active: body.active ?? undefined } })
  }

  async deleteCategory(id: string) {
    const item = await this.prisma.lookup.findUnique({ where: { id } })
    if (!item) throw new Error('category not found')
    // soft delete
    await this.prisma.lookup.update({ where: { id }, data: { active: false } })
    return { ok: true }
  }
}
