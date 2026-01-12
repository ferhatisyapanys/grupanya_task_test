import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export enum SortOption {
  name_asc = 'name_asc',
  name_desc = 'name_desc',
  newest = 'newest',
  oldest = 'oldest',
}

export class AccountListQueryDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption

  @IsOptional()
  @IsString()
  source?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  type?: string

  // Pagination and location filters
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  district?: string
}

export class CreateAccountDto {
  @IsString()
  accountName!: string
  @IsString()
  businessName!: string
  @IsString()
  category!: string
  @IsString()
  source!: 'QUERY' | 'FRESH' | 'RAKIP' | 'REFERANS' | 'OLD'
  @IsString()
  type!: 'KEY' | 'LONG_TAIL'
  @IsString()
  status!: 'ACTIVE' | 'PASSIVE'
  @IsOptional()
  @IsString()
  businessContact?: string
  @IsOptional()
  @IsString()
  contactPerson?: string
  @IsOptional()
  @IsString()
  notes?: string
  @IsOptional()
  @IsString()
  city?: string
  @IsOptional()
  @IsString()
  district?: string
  @IsOptional()
  @IsString()
  address?: string
  @IsOptional()
  @IsString()
  website?: string

  @IsOptional()
  @IsString()
  instagram?: string
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  accountName?: string
  @IsOptional()
  @IsString()
  businessName?: string
  @IsOptional()
  @IsString()
  category?: string
  @IsOptional()
  @IsString()
  source?: 'QUERY' | 'FRESH' | 'RAKIP' | 'REFERANS' | 'OLD'
  @IsOptional()
  @IsString()
  type?: 'KEY' | 'LONG_TAIL'
  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'PASSIVE'
  @IsOptional()
  @IsString()
  businessContact?: string
  @IsOptional()
  @IsString()
  contactPerson?: string
  @IsOptional()
  @IsString()
  notes?: string
  @IsOptional()
  @IsString()
  city?: string
  @IsOptional()
  @IsString()
  district?: string
  @IsOptional()
  @IsString()
  address?: string
  @IsOptional()
  @IsString()
  website?: string

  @IsOptional()
  @IsString()
  instagram?: string
}
