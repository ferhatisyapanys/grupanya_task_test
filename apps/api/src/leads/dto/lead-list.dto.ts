import { IsInt, IsISO8601, IsOptional, IsPositive, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class LeadListQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string

  @IsOptional()
  @IsISO8601()
  to?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  pageSize?: number = 20

  @IsOptional() @IsString() status?: string
  @IsOptional() @IsString() source?: string
  @IsOptional() @IsString() search?: string
  @IsOptional() @IsString() city?: string
  @IsOptional() @IsString() district?: string
}
