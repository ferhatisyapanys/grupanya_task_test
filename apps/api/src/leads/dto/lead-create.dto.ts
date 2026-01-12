import { IsEmail, IsISO8601, IsObject, IsOptional, IsString, Matches } from 'class-validator'

export class CreateLeadDto {
  @IsOptional()
  @IsISO8601()
  createdAt?: string

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
  @IsObject()
  payload?: Record<string, any>

  // New required contact fields
  @IsEmail()
  email!: string

  @IsString()
  @Matches(/^(?:\+90|0)?5\d{9}$/,{ message: 'Geçersiz cep telefonu' })
  phone!: string

  @IsString()
  contactPerson!: string

  // Optional URLs
  @IsOptional()
  @IsString()
  website?: string

  @IsOptional()
  @IsString()
  instagram?: string

  @IsString()
  city!: string

  @IsString()
  district!: string
}
