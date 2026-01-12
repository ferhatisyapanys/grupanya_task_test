import { IsIn, IsOptional, IsString } from 'class-validator'

export class UpdateTaskDto {
  @IsOptional() @IsIn(['ISTANBUL_CORE','ANADOLU_CORE','TRAVEL']) category?: any
  @IsOptional() @IsIn(['GENERAL','PROJECT']) type?: any
  @IsOptional() @IsIn(['LOW','MEDIUM','HIGH','CRITICAL']) priority?: any
  @IsOptional() @IsIn(['KEY','LONG_TAIL']) accountType?: any
  @IsOptional() @IsIn(['QUERY','FRESH','RAKIP','REFERANS','OLD']) source?: any
  @IsOptional() @IsString() mainCategory?: string
  @IsOptional() @IsString() subCategory?: string
  @IsOptional() @IsString() city?: string
  @IsOptional() @IsString() district?: string
  @IsOptional() @IsString() contact?: string
  @IsOptional() @IsString() details?: string
}
