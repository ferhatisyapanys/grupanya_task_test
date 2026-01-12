import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../infrastructure/prisma/prisma.service'

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // Roles
  listRoles() { return this.prisma.appRole.findMany({ include: { permissions: { include: { permission: true } } } }) }
  async createRole(name: string) { if (!name) throw new BadRequestException('name required'); return this.prisma.appRole.create({ data: { name } }) }

  // Permissions
  listPermissions() { return this.prisma.permission.findMany() }
  async createPermission(body: { name: string; module: string; description?: string }) {
    if (!body?.name) throw new BadRequestException('name required')
    return this.prisma.permission.create({ data: { name: body.name, module: body.module, description: body.description || null } })
  }

  async attachPermission(roleId: string, permissionId: string) {
    const role = await this.prisma.appRole.findUnique({ where: { id: roleId } })
    if (!role) throw new NotFoundException('role not found')
    const perm = await this.prisma.permission.findUnique({ where: { id: permissionId } })
    if (!perm) throw new NotFoundException('permission not found')
    return this.prisma.rolePermission.create({ data: { roleId, permissionId } })
  }

  // Assign role to user
  async assignRoleToUser(userId: string, roleId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('user not found')
    const role = await this.prisma.appRole.findUnique({ where: { id: roleId } })
    if (!role) throw new NotFoundException('role not found')
    return this.prisma.user.update({ where: { id: userId }, data: { appRoleId: roleId } })
  }
}

