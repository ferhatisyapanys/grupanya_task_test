import { Injectable, NestMiddleware } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import type { RoleString } from './role.types'
import { verifyToken } from './token.util'
import { PrismaService } from '../infrastructure/prisma/prisma.service'

declare global {
  // eslint-disable-next-line no-var
  var __devAuth__: boolean | undefined
}

function parseRole(v?: string | null): RoleString | undefined {
  if (!v) return undefined
  const up = v.toUpperCase().trim()
  if (['ADMIN','MANAGER','TEAM_LEADER','SALESPERSON'].includes(up)) return up as RoleString
  return undefined
}

@Injectable()
export class DevUserMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // If a real auth is later added, this middleware can be removed.
    const url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl)

    // 1) If Authorization: Bearer <token> present, prefer JWT user
    const auth = req.header('authorization') || req.header('Authorization')
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const tok = auth.slice(7).trim()
      try {
        const payload = verifyToken(tok)
        ;(req as any).user = { id: payload.sub, role: (payload.role as any) || 'SALESPERSON' }
        return next()
      } catch {
        // fallthrough to dev headers
      }
    }
    const qUser = url.searchParams.get('u') || undefined
    const qRole = url.searchParams.get('role') || undefined

    const id = (req.headers['x-user-id'] as string) || qUser || 'dev-user'
    const email = (req.headers['x-user-email'] as string) || 'dev@example.com'
    const defaultRole = parseRole(process.env.DEV_DEFAULT_ROLE || 'ADMIN') || 'ADMIN'
    const role = parseRole((req.headers['x-user-role'] as string) || qRole || defaultRole) ?? defaultRole

    ;(req as any).user = { id, email, role }

    // Ensure a corresponding user exists in DB for dev visibility (non-blocking best-effort)
    try {
      const normEmail = email ? String(email) : `${id}@dev.local`
      const existingByEmail = await this.prisma.user.findUnique({ where: { email: normEmail } })
      if (!existingByEmail) {
        // Try create with provided id to make it deterministic in dev
        const data: any = { id, email: normEmail, role: (role as any) || 'SALESPERSON', isActive: true }
        await this.prisma.user.create({ data })
      } else if (existingByEmail.role !== (role as any)) {
        await this.prisma.user.update({ where: { email: normEmail }, data: { role: (role as any) } })
      }
    } catch {
      // ignore dev upsert errors
    }
    // Remove dev auth query params to avoid DTO whitelist validation errors
    try {
      if ((req as any).query) {
        delete (req as any).query.u
        delete (req as any).query.role
      }
    } catch {}
    next()
  }
}
