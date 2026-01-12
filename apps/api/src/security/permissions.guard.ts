import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSION_KEY } from './permissions.decorator'
import { PrismaService } from '../infrastructure/prisma/prisma.service'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required) return true
    const req = context.switchToHttp().getRequest()
    const user = req.user as { id: string; role: 'ADMIN'|'MANAGER'|'TEAM_LEADER'|'SALESPERSON' } | undefined
    if (!user) throw new UnauthorizedException('Missing user')
    if (user.role === 'ADMIN') return true
    const u = await this.prisma.user.findUnique({ where: { id: user.id }, include: { appRole: { include: { permissions: { include: { permission: true } } } } } })
    const perms = new Set((u?.appRole?.permissions || []).map(rp => rp.permission.name))
    if (!perms.has(required)) throw new ForbiddenException('Missing permission')
    return true
  }
}

