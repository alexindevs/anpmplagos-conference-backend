import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  DEFAULT_ACCESS_COOKIE_MAX_AGE_SECONDS,
  getDefaultRefreshCookieMaxAgeSeconds,
  setAuthCookies,
} from '../auth/auth-cookies';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.service';
import { RegistrationService } from './registration.service';
import { CreateRegistrationDto } from './dto';
import { ParseAndValidateRegistrationPipe } from './parse-and-validate-registration.pipe';
import { RegistrationFiles } from './registration-files.interface';
import {
  HttpCacheInterceptor,
  CacheInvalidationInterceptor,
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '../cache';

@ApiTags('registrations')
@Controller('api/registrations')
@UseInterceptors(HttpCacheInterceptor, CacheInvalidationInterceptor)
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new registration' })
  @ApiBody({
    type: CreateRegistrationDto,
    examples: {
      member: {
        summary: 'Member registration',
        value: {
          regType: 'member',
          email: 'dr.olatunji@example.com',
          password: 'securePassword123',
          title: 'Dr',
          fullName: 'Kayode Olatunji',
          phone: '+234 800 123 4567',
          bio: 'General practitioner with 15 years experience.',
          anpmpId: 'ID-123456',
          hasSpouse: true,
          spouseName: 'Jane Olatunji',
          spouseEmail: 'spouse@example.com',
          spousePhone: '+234 800 765 4321',
          primarySpecialty: 'general',
          hospitalOrg: 'Lagos State Teaching Hospital',
          organizationAddress: '1 Hospital Road, Lagos',
          zone: 'Lagos Zone A',
        },
      },
      attendee: {
        summary: 'Attendee (non-member) in medical field',
        value: {
          regType: 'attendee',
          email: 'dr.adebayo@example.com',
          password: 'securePassword123',
          fullName: 'Dr. Sarah Adebayo',
          phone: '+234 800 111 2222',
          inMedicalField: true,
          primarySpecialty: 'pediatrics',
          hospitalOrg: 'Private Clinic Lagos',
        },
      },
      attendeeNonMedical: {
        summary: 'Attendee (non-member) not in medical field',
        value: {
          regType: 'attendee',
          email: 'admin@hospital.com',
          password: 'securePassword123',
          fullName: 'John Doe',
          phone: '+234 800 333 4444',
          inMedicalField: false,
          occupation: 'Healthcare Administrator',
        },
      },
      company: {
        summary: 'Company registration',
        value: {
          regType: 'company',
          email: 'contact@medicorp.com',
          password: 'securePassword123',
          companyName: 'MediCorp Solutions',
          tagline: 'Leading the way in patient diagnostics',
          description:
            'A full description of your company for the conference directory.',
          boothPreference: 'Hall A, near entrance',
          website: 'https://www.medicorpsolutions.com',
          contactEmail: 'contact@medicorp.com',
          primaryContactName: 'Sarah Jenkins',
          primaryContactPhone: '+234 800 555 6666',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Registration created. For `regType: company`, sets `access_token` and `refresh_token` **httpOnly cookies** (same as `POST /api/auth/login`); JSON body includes `user` — tokens are not returned in JSON.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'clxyz123abc' },
        status: { type: 'string', example: 'pending-payment' },
        createdAt: { type: 'string', format: 'date-time' },
        message: {
          type: 'string',
          example: 'Registration saved. Complete payment to confirm.',
        },
        user: {
          type: 'object',
          description:
            'Company only; includes company.id for booth / session / sponsorship payments',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 422, description: 'ANPMP ID invalid (member only)' })
  @InvalidateCache({
    patterns: ['admin:dashboard:*', 'public:partners:*'],
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'logo', maxCount: 1 },
        { name: 'headerImage', maxCount: 1 },
      ],
      {
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
          const allowed = ['image/jpeg', 'image/png'];
          if (allowed.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(
              new BadRequestException('Only JPEG and PNG images allowed'),
              false,
            );
          }
        },
      },
    ),
  )
  async create(
    // `object` so global ValidationPipe skips; real validation runs in ParseAndValidateRegistrationPipe
    @Body(ParseAndValidateRegistrationPipe) dto: object,
    @Req() req: { files?: RegistrationFiles },
    @Res({ passthrough: true }) res: Response,
  ) {
    const files = req.files;
    const result = await this.registrationService.create(
      dto as CreateRegistrationDto,
      files,
    );

    if (result.access_token && result.refresh_token) {
      setAuthCookies(
        res,
        result.access_token,
        result.refresh_token,
        DEFAULT_ACCESS_COOKIE_MAX_AGE_SECONDS,
        getDefaultRefreshCookieMaxAgeSeconds(),
      );
      return {
        id: result.id,
        status: result.status,
        createdAt: result.createdAt,
        message: result.message,
        user: result.user,
      };
    }

    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user registration details and payment status',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns registration details and payment status',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', example: 'registered' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            regType: { type: 'string', example: 'member' },
            registrationStatus: { type: 'string', example: 'registered' },
          },
        },
        member: {
          type: 'object',
          properties: {
            fullName: { type: 'string' },
            phone: { type: 'string' },
            anpmpId: { type: 'string' },
          },
        },
        attendee: {
          type: 'object',
          properties: {
            fullName: { type: 'string' },
            phone: { type: 'string' },
          },
        },
        payment: {
          type: 'object',
          properties: {
            reference: { type: 'string' },
            status: { type: 'string', example: 'success' },
            paidAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @CacheKey('registration:me:{userId}')
  @CacheTTL(120)
  async getMe(@Req() req: Request & { user: AuthUser }) {
    return this.registrationService.findMe(req.user.id);
  }
}
