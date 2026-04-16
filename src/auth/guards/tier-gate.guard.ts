import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SponsorTier } from '@prisma/client';
import { AuthUser } from '../auth.service';
import { CompanyService } from '../../company/company.service';
import {
  effectiveDisplayTier,
  tierRank,
} from '../../company/company-tier.util';

export const MIN_TIER_KEY = 'minTier';
export const MinTier = (tier: SponsorTier) => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(MIN_TIER_KEY, tier, descriptor?.value || target);
  };
};

@Injectable()
export class TierGateGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly companyService: CompanyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const minTier = this.reflector.get<SponsorTier>(
      MIN_TIER_KEY,
      context.getHandler(),
    );

    if (!minTier) {
      return true; // No tier requirement specified
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.regType !== 'company') {
      throw new ForbiddenException('Company account required');
    }

    const company = await this.companyService.findByUserId(user.id);
    if (!company) {
      throw new ForbiddenException('Company profile not found');
    }

    const effectiveTier = effectiveDisplayTier(company);
    const currentRank = tierRank(effectiveTier);
    const requiredRank = tierRank(minTier);

    if (currentRank < requiredRank) {
      throw new ForbiddenException(
        `This feature requires ${minTier} tier or higher. Current tier: ${effectiveTier}`,
      );
    }

    // Attach company to request for downstream use
    (request as Request & { company?: any }).company = company;
    return true;
  }
}
