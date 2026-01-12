import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { AdminService } from './admin.service'
import { MinRole } from './roles.decorator'
import { Roles } from './role.types'
import { ApiTags } from '@nestjs/swagger'
import { RequirePermission } from './permissions.decorator'

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private svc: AdminService) {}

  @Get('roles')
  @MinRole(Roles.ADMIN)
  @RequirePermission('rbac:manage')
  roles() { return this.svc.listRoles() }

  @Post('roles')
  @MinRole(Roles.ADMIN)
  @RequirePermission('rbac:manage')
  createRole(@Body() body: { name: string }) { return this.svc.createRole(body.name) }

  @Get('permissions')
  @MinRole(Roles.ADMIN)
  @RequirePermission('rbac:manage')
  perms() { return this.svc.listPermissions() }

  @Post('permissions')
  @MinRole(Roles.ADMIN)
  @RequirePermission('rbac:manage')
  createPerm(@Body() body: { name: string; module: string; description?: string }) { return this.svc.createPermission(body) }

  @Post('roles/:roleId/permissions')
  @MinRole(Roles.ADMIN)
  @RequirePermission('rbac:manage')
  attach(@Param('roleId') roleId: string, @Body() body: { permissionId: string }) { return this.svc.attachPermission(roleId, body.permissionId) }

  @Patch('users/:userId/appRole')
  @MinRole(Roles.ADMIN)
  @RequirePermission('rbac:manage')
  assignRole(@Param('userId') userId: string, @Body() body: { roleId: string }) { return this.svc.assignRoleToUser(userId, body.roleId) }
}

