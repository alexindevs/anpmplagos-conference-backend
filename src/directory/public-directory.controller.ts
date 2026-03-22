import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SponsorTier } from '@prisma/client';
import { ExhibitorService } from '../exhibitor/exhibitor.service';
import { SponsorService } from '../sponsor/sponsor.service';

function parseTierQuery(raw: string | undefined): SponsorTier {
  if (raw == null || raw === '') {
    throw new BadRequestException('Query "tier" is required');
  }
  const allowed = Object.values(SponsorTier) as string[];
  if (!allowed.includes(raw)) {
    throw new BadRequestException(
      `tier must be one of: ${allowed.join(', ')}`,
    );
  }
  return raw as SponsorTier;
}

@ApiTags('Public directory')
@Controller('api/public')
export class PublicDirectoryController {
  constructor(
    private readonly exhibitorService: ExhibitorService,
    private readonly sponsorService: SponsorService,
  ) {}

  @Get('partners-by-tier')
  @ApiOperation({
    summary:
      'List registered exhibitors and active sponsors for a display tier (public)',
    description:
      'Exhibitors must have `tier` set (e.g. via admin) to appear; sponsors must be active with matching `tier`.',
  })
  @ApiQuery({
    name: 'tier',
    enum: SponsorTier,
    required: true,
    example: SponsorTier.gold,
  })
  async partnersByTier(@Query('tier') tierRaw: string) {
    const tier = parseTierQuery(tierRaw);
    const [exhibitors, sponsors] = await Promise.all([
      this.exhibitorService.findPublic({ tier }),
      this.sponsorService.findPublic({ tier }),
    ]);
    return { tier, exhibitors, sponsors };
  }
}
