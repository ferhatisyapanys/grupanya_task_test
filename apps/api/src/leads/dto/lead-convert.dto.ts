import { IsObject, IsOptional, IsString } from 'class-validator'

export class LeadConvertDto {
  @IsString()
  leadId!: string

  @IsOptional()
  @IsObject()
  account?: {
    accountName?: string
    businessName?: string
    category?: string
    type?: 'KEY' | 'LONG_TAIL'
    source?: 'QUERY' | 'FRESH' | 'RAKIP' | 'REFERANS' | 'OLD'
    status?: 'ACTIVE' | 'PASSIVE'
    notes?: string
  }
}

export class LeadLinkupDto {
  @IsString()
  leadId!: string

  @IsString()
  accountId!: string
}

