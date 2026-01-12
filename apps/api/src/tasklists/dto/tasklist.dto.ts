import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator'

export class TaskListQueryDto {
  @IsOptional()
  @IsIn(['GENERAL','PROJECT'])
  tag?: 'GENERAL' | 'PROJECT'
}

export class CreateTaskListDto {
  @IsString()
  name!: string

  @IsIn(['GENERAL','PROJECT'])
  tag!: 'GENERAL' | 'PROJECT'

  @IsOptional()
  @IsString()
  description?: string
}

export class UpdateTaskListDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsIn(['GENERAL','PROJECT'])
  tag?: 'GENERAL' | 'PROJECT'

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
