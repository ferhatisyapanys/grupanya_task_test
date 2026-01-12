import { IsEmail, IsObject, IsOptional, IsString, Matches } from 'class-validator'

export class UpdateLeadDto {
  @IsOptional() @IsString() company?: string
  @IsOptional() @IsString() webCategory?: string
  @IsOptional() @IsString() city?: string
  @IsOptional() @IsString() district?: string
  @IsOptional() @IsObject() payload?: Record<string, any>
  // New updatable fields
  @IsOptional() @IsEmail() email?: string
  @IsOptional() @IsString() @Matches(/^(?:\+90|0)?5\d{9}$/,{ message: 'Geçersiz cep telefonu' }) phone?: string
  @IsOptional() @IsString() person?: string
  @IsOptional() @IsString() website?: string
  @IsOptional() @IsString() instagram?: string
}
