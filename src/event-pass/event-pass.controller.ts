import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.service';
import { EventPassService } from './event-pass.service';

@ApiTags('Event Pass')
@Controller('api/event-pass')
export class EventPassController {
  constructor(private readonly eventPassService: EventPassService) {}

  @Post('conference/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate conference pass QR code' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 201,
    description: 'Conference pass QR code generated',
    schema: {
      type: 'object',
      properties: {
        qrCodeUrl: { type: 'string' },
      },
    },
  })
  async generateConferencePass(
    @Param('userId') userId: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    const authUser = req.user;

    if (authUser.regType !== 'admin' && authUser.id !== userId) {
      throw new ForbiddenException(
        'You can only generate your own conference pass',
      );
    }

    return this.eventPassService.generateConferencePass(userId);
  }

  @Get('conference/:userId')
  @ApiOperation({ summary: 'Get conference pass details (public)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Conference pass details',
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'string', nullable: true },
        name: { type: 'string' },
        ticketType: { type: 'string', example: 'member' },
        bio: { type: 'string', nullable: true },
        qrCodeUrl: { type: 'string' },
        viewCount: { type: 'number' },
      },
    },
  })
  async getConferencePass(@Param('userId') userId: string) {
    return this.eventPassService.getConferencePassData(userId, true);
  }

  @Post('hotel/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate hotel pass QR code' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 201,
    description: 'Hotel pass QR code generated',
    schema: {
      type: 'object',
      properties: {
        qrCodeUrl: { type: 'string' },
      },
    },
  })
  async generateHotelPass(
    @Param('userId') userId: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    const authUser = req.user;

    if (authUser.regType !== 'admin' && authUser.id !== userId) {
      throw new ForbiddenException('You can only generate your own hotel pass');
    }

    return this.eventPassService.generateHotelPass(userId);
  }

  @Get('hotel/:userId')
  @ApiOperation({ summary: 'Get hotel pass details (public)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Hotel pass details',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        avatar: { type: 'string', nullable: true },
        hotels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              hotelName: { type: 'string' },
              rooms: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    roomType: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        qrCodeUrl: { type: 'string' },
      },
    },
  })
  async getHotelPass(@Param('userId') userId: string) {
    return this.eventPassService.getHotelPassData(userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user event passes' })
  @ApiResponse({
    status: 200,
    description: 'User event passes',
    schema: {
      type: 'object',
      properties: {
        conferencePass: {
          type: 'object',
          nullable: true,
          properties: {
            qrCodeUrl: { type: 'string' },
            viewCount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        hotelPass: {
          type: 'object',
          nullable: true,
          properties: {
            qrCodeUrl: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  async getUserPasses(@Req() req: Request & { user: AuthUser }) {
    return this.eventPassService.getUserPasses(req.user.id);
  }
}
