import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BoothService } from '../booth/booth.service';
import { CreateBoothMultipartDto } from '../booth/dto/create-booth-multipart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('admin')
@Controller('api/admin/booths')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminBoothController {
  constructor(private readonly boothService: BoothService) {}

  @Get()
  @ApiOperation({
    summary: 'List all booths with occupant info (admin only)',
    description:
      'Returns every booth slot. **`takenBy`** is set when the booth is assigned to an exhibitor or sponsor (`kind`, `id`, `name`, `slug`); otherwise `null`.',
  })
  @ApiResponse({ status: 200, description: 'All booths (sorted by tier, then name)' })
  listAll() {
    return this.boothService.findAllForAdmin();
  }

  @Post()
  @UseInterceptors(FileInterceptor('boothImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a booth (admin only, multipart/form-data)',
    description:
      'Send booth fields as form data. Provide **`boothImage`** (JPEG/PNG, max 5MB) and/or **`boothImageUrl`** (existing image URL). At least one image source is required.',
  })
  @ApiBody({
    description:
      'Form fields plus optional `boothImage` binary (field name must be `boothImage`).',
    schema: {
      type: 'object',
      required: ['name', 'size', 'price'],
      properties: {
        name: { type: 'string', example: 'Booth A1' },
        size: { type: 'string', example: '10x10' },
        price: {
          type: 'integer',
          example: 15000000,
          description: 'Kobo',
        },
        description: { type: 'string', example: 'Near main entrance' },
        tier: {
          type: 'string',
          enum: ['headliner', 'platinum', 'gold', 'silver'],
          description: 'Booth slot / zone tier',
        },
        isReserved: {
          type: 'boolean',
          example: false,
          description: 'May be sent as string true/false in form data',
        },
        boothImageUrl: {
          type: 'string',
          description:
            'Optional if `boothImage` file is uploaded (e.g. Cloudinary URL)',
        },
        boothImage: {
          type: 'string',
          format: 'binary',
          description: 'JPEG or PNG; max 5MB',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Booth created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(
    @Body() dto: CreateBoothMultipartDto,
    @UploadedFile() boothImage: Express.Multer.File | undefined,
  ) {
    return this.boothService.createFromMultipart(dto, boothImage);
  }

  @Patch(':id/reserve')
  @ApiOperation({ summary: 'Reserve a booth (admin only)' })
  @ApiResponse({ status: 200, description: 'Booth reserved' })
  @ApiResponse({ status: 404, description: 'Booth not found' })
  reserve(@Param('id') id: string) {
    return this.boothService.reserve(id);
  }

  @Patch(':id/unreserve')
  @ApiOperation({ summary: 'Unreserve a booth (admin only)' })
  @ApiResponse({ status: 200, description: 'Booth unreserved' })
  @ApiResponse({ status: 404, description: 'Booth not found' })
  unreserve(@Param('id') id: string) {
    return this.boothService.unreserve(id);
  }
}
