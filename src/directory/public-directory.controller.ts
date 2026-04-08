import { BadRequestException, Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SponsorTier } from '@prisma/client';
import { CompanyService } from '../company/company.service';
import { HttpCacheInterceptor, CacheKey, CacheTTL } from '../cache';

function parseTierQuery(raw: string | undefined): SponsorTier {
  if (raw == null || raw === '') {
    throw new BadRequestException('Query "tier" is required');
  }
  const allowed = Object.values(SponsorTier) as string[];
  if (!allowed.includes(raw)) {
    throw new BadRequestException(`tier must be one of: ${allowed.join(', ')}`);
  }
  return raw as SponsorTier;
}

@ApiTags('Public directory')
@Controller('api/public')
@UseInterceptors(HttpCacheInterceptor)
@CacheTTL(300)
export class PublicDirectoryController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('partners-by-tier')
  @ApiOperation({
    summary:
      'List registered companies whose effective display tier matches the query (public)',
    description:
      'Effective tier is the higher of booth zone tier and highest paid sponsorship tier.',
  })
  @ApiQuery({
    name: 'tier',
    enum: SponsorTier,
    required: true,
    example: SponsorTier.gold,
  })
  @CacheKey('public:partners:tier:{query.tier}')
  async partnersByTier(@Query('tier') tierRaw: string) {
    const tier = parseTierQuery(tierRaw);
    const companies = await this.companyService.findPublic({ tier });
    return { tier, companies };
  }
}
