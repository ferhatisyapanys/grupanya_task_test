import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common'
import { TasksService } from './tasks.service'
import { AssignTaskDto, CreateTaskDto } from './dto/task-create.dto'
import { ActivityLogDto, TaskStatusDto } from './dto/task-activity.dto'
import { UpdateTaskDto } from './dto/task-update.dto'
import { MinRole } from '../security/roles.decorator'
// using string union validated by DTO
import { Roles } from '../security/role.types'
import type { Request } from 'express'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private svc: TasksService) {}

  @Get()
  @MinRole(Roles.SALESPERSON)
  list(@Req() req: Request, @Query() q: any) {
    const user = (req as any).user
    return this.svc.list(q, user)
  }

  @Get('search')
  @MinRole(Roles.SALESPERSON)
  search(@Query('q') q?: string, @Query('take') take?: string) {
    return this.svc.search(q || '', take ? Number(take) : 10)
  }

  @Get(":id")
  @MinRole(Roles.SALESPERSON)
  detail(@Param('id') id: string) {
    return this.svc.detail(id)
  }

  @Post()
  @MinRole(Roles.TEAM_LEADER)
  create(@Req() req: Request, @Body() body: CreateTaskDto) {
    const user = (req as any).user
    return this.svc.create(user, body)
  }

  @Post(':id/assign')
  @MinRole(Roles.TEAM_LEADER)
  assign(@Req() req: Request, @Param('id') id: string, @Body() body: AssignTaskDto) {
    const user = (req as any).user
    return this.svc.assign(user, id, body)
  }

  @Post(':id/activity')
  @MinRole(Roles.SALESPERSON)
  activity(@Req() req: Request, @Param('id') id: string, @Body() body: ActivityLogDto) {
    const user = (req as any).user
    return this.svc.addActivity(user, id, body)
  }

  @Delete(':id/activity/:logId')
  @MinRole(Roles.SALESPERSON)
  removeActivity(@Req() req: Request, @Param('id') id: string, @Param('logId') logId: string) {
    const user = (req as any).user
    return this.svc.deleteActivity(user, id, logId)
  }

  @Patch(':id/status')
  @MinRole(Roles.SALESPERSON)
  setStatus(@Req() req: Request, @Param('id') id: string, @Body() body: TaskStatusDto & { close?: boolean; closedReason?: string }) {
    const user = (req as any).user
    return this.svc.setStatus(user, id, body.status as any, body.close, (body as any).closedReason)
  }

  @Patch(':id')
  @MinRole(Roles.TEAM_LEADER)
  update(@Param('id') id: string, @Body() body: UpdateTaskDto) {
    return this.svc.update(id, body)
  }
}
