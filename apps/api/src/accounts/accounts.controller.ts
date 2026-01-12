import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common'
import { AccountsService } from './accounts.service'
import { AccountListQueryDto, CreateAccountDto, UpdateAccountDto } from './dto/account.dto'
import { MinRole } from '../security/roles.decorator'
import { Roles } from '../security/role.types'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private svc: AccountsService) {}

  @Get()
  @MinRole(Roles.SALESPERSON)
  list(@Query() q: AccountListQueryDto) {
    return this.svc.list(q)
  }

  @Get('search')
  @MinRole(Roles.SALESPERSON)
  search(@Query('q') q?: string, @Query('take') take?: string) {
    return this.svc.search(q || '', take ? Number(take) : 10)
  }

  @Get(':id')
  @MinRole(Roles.SALESPERSON)
  detail(@Param('id') id: string) {
    return this.svc.detail(id)
  }

  @Post()
  @MinRole(Roles.MANAGER)
  create(@Body() body: CreateAccountDto) {
    return this.svc.create(body)
  }

  @Patch(':id')
  @MinRole(Roles.MANAGER)
  update(@Param('id') id: string, @Body() body: UpdateAccountDto) {
    return this.svc.update(id, body)
  }

  @Patch(':id/status')
  @MinRole(Roles.MANAGER)
  changeStatus(@Param('id') id: string, @Body() body: { status: 'ACTIVE'|'PASSIVE' }) {
    return this.svc.changeStatus(id, body.status)
  }

  // Contacts
  @Get(':id/contacts')
  @MinRole(Roles.SALESPERSON)
  listContacts(@Param('id') id: string) { return this.svc.listContacts(id) }

  @Post(':id/contacts')
  @MinRole(Roles.MANAGER)
  createContact(@Param('id') id: string, @Body() body: { type: 'BUSINESS'|'PERSON'; name: string; phone?: string; email?: string; address?: string; isPrimary?: boolean }) { return this.svc.createContact(id, body) }

  @Patch(':id/contacts/:contactId')
  @MinRole(Roles.MANAGER)
  updateContact(@Param('id') id: string, @Param('contactId') contactId: string, @Body() body: Partial<{ type: 'BUSINESS'|'PERSON'; name: string; phone?: string; email?: string; address?: string; isPrimary?: boolean }>) { return this.svc.updateContact(id, contactId, body) }

  @Delete(':id/contacts/:contactId')
  @MinRole(Roles.MANAGER)
  deleteContact(@Param('id') id: string, @Param('contactId') contactId: string) { return this.svc.deleteContact(id, contactId) }

  // Notes
  @Get(':id/notes')
  @MinRole(Roles.SALESPERSON)
  listNotes(@Param('id') id: string) { return this.svc.listNotes(id) }

  @Post(':id/notes')
  @MinRole(Roles.SALESPERSON)
  createNote(@Req() req: Request, @Param('id') id: string, @Body() body: { content: string }) { const user=(req as any).user; return this.svc.createNote(id, body.content, user?.id) }

  @Delete(':id/notes/:noteId')
  @MinRole(Roles.MANAGER)
  deleteNote(@Param('id') id: string, @Param('noteId') noteId: string) { return this.svc.deleteNote(id, noteId) }

  // Histories
  @Get(':id/activity-history')
  @MinRole(Roles.SALESPERSON)
  activityHistory(@Param('id') id: string) { return this.svc.accountActivityHistory(id) }

  @Get(':id/deal-history')
  @MinRole(Roles.SALESPERSON)
  dealHistory(@Param('id') id: string) { return this.svc.accountDealHistory(id) }

  @Get(':id/task-history')
  @MinRole(Roles.SALESPERSON)
  taskHistory(@Param('id') id: string) { return this.svc.accountTaskHistory(id) }

  // Delete (ADMIN only)
  @Delete(':id')
  @MinRole(Roles.ADMIN)
  remove(@Param('id') id: string) { return this.svc.remove(id) }

  // Duplicate/Save As (MANAGER and above)
  @Post(':id/duplicate')
  @MinRole(Roles.MANAGER)
  duplicate(@Param('id') id: string, @Body() body: { suffix?: string }) { return this.svc.duplicate(id, body?.suffix) }
}
