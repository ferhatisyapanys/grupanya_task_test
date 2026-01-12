import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../infrastructure/prisma/prisma.service'
import { hashPassword } from '../security/token.util'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  list(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true }
    return this.prisma.user.findMany({ where, select: { id: true, name: true, email: true, role: true, isActive: true }, take: 200 })
  }

  async create(body: { email: string; name?: string; role?: string; password?: string; managerId?: string }) {
    if (!body.email) throw new BadRequestException('email required')
    const existing = await this.prisma.user.findUnique({ where: { email: body.email } })
    if (existing) throw new BadRequestException('email already exists')
    const password = body.password ? await hashPassword(body.password) : null
    if ((body.role as any) === 'SALESPERSON' && !body.managerId) throw new BadRequestException('managerId required for SALESPERSON')
    try {
      const data: any = { email: body.email, name: body.name || null, role: (body.role as any) || 'SALESPERSON', password }
      // Include managerId only if provided to avoid schema mismatch before migration
      if (body.managerId !== undefined) data.managerId = body.managerId
      return await this.prisma.user.create({ data, select: { id: true, email: true, role: true, name: true, managerId: true } })
    } catch (e:any) {
      const msg = String(e?.message || '')
      if (/Unknown (argument|field).*managerId/i.test(msg)) {
        throw new BadRequestException('User hierarchy is not migrated. Please run Prisma migrate to add managerId.')
      }
      throw e
    }
  }

  async update(id: string, body: any) {
    const u = await this.prisma.user.findUnique({ where: { id } })
    if (!u) throw new NotFoundException('user not found')
    const data: any = {}
    const fields = ['name','firstName','lastName','isActive']
    for (const f of fields) if (body[f] !== undefined) data[f] = body[f]
    return this.prisma.user.update({ where: { id }, data, select: { id: true, email: true, role: true, name: true } })
  }

  async changeRole(id: string, role: string, managerId?: string) {
    const u = await this.prisma.user.findUnique({ where: { id } })
    if (!u) throw new NotFoundException('user not found')
    if ((role as any) === 'SALESPERSON' && !(u as any).managerId && !managerId) throw new BadRequestException('managerId required for SALESPERSON')
    try {
      return await this.prisma.user.update({ where: { id }, data: { role: role as any, ...(managerId !== undefined ? { managerId } : {}) }, select: { id: true, email: true, role: true, name: true, managerId: true } })
    } catch (e:any) {
      const msg = String(e?.message || '')
      if (/Unknown (argument|field).*managerId/i.test(msg)) {
        throw new BadRequestException('User hierarchy is not migrated. Please run Prisma migrate to add managerId.')
      }
      throw e
    }
  }

  async deactivate(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } })
    if (!u) throw new NotFoundException('user not found')
    return this.prisma.user.update({ where: { id }, data: { isActive: false }, select: { id: true, email: true, role: true, name: true, isActive: true } })
  }

  async setPassword(id: string, password: string) {
    const u = await this.prisma.user.findUnique({ where: { id } })
    if (!u) throw new NotFoundException('user not found')
    const hashed = await hashPassword(password)
    await this.prisma.user.update({ where: { id }, data: { password: hashed } as any })
    return { ok: true }
  }
}
