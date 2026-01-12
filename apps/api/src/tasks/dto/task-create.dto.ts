import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator'

export class CreateTaskDto {
  @IsString()
  taskListId!: string

  @IsString()
  accountId!: string

  @IsIn(['ISTANBUL_CORE','ANADOLU_CORE','TRAVEL'])
  category!: 'ISTANBUL_CORE' | 'ANADOLU_CORE' | 'TRAVEL'

  @IsIn(['GENERAL','PROJECT'])
  type!: 'GENERAL' | 'PROJECT'

  @IsIn(['LOW','MEDIUM','HIGH','CRITICAL'])
  priority!: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

  @IsIn(['KEY','LONG_TAIL'])
  accountType!: 'KEY' | 'LONG_TAIL'

  @IsIn(['QUERY','FRESH','RAKIP','REFERANS','OLD'])
  source!: 'QUERY' | 'FRESH' | 'RAKIP' | 'REFERANS' | 'OLD'

  @IsString()
  mainCategory!: string

  @IsString()
  subCategory!: string

  @IsOptional()
  @IsString()
  contact?: string

  @IsString()
  details!: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  district?: string

  // Optionally create as assigned immediately
  @IsOptional()
  @IsString()
  ownerId?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number

  @IsOptional()
  @IsIn(['HOT','NOT_HOT','DEAL','COLD'])
  status?: 'HOT'|'NOT_HOT'|'DEAL'|'COLD'

  @IsOptional()
  @IsIn(['OPEN','CLOSED'])
  generalStatus?: 'OPEN'|'CLOSED'
}

export class AssignTaskDto {
  @IsString()
  ownerId!: string

  @IsInt()
  @Min(1)
  durationDays!: number
}

export class UpdateStatusDto {
  @IsIn(['LOW','MEDIUM','HIGH','CRITICAL'])
  @IsOptional()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

  @IsOptional()
  @IsIn(['GENERAL','PROJECT'])
  type?: 'GENERAL' | 'PROJECT'
}
