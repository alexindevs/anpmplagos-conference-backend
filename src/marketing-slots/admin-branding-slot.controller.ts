import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BrandingSlotService } from './branding-slot.service';
import { CreateBrandingSlotMultipartDto } from './dto/create-branding-slot-multipart.dto';
import { UpdateTotalSlotsDto } from './dto/update-total-slots.dto';

@ApiTags('admin')
@Controller('api/admin/branding-slots')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminBrandingSlotController {
  constructor(private readonly brandingSlotService: BrandingSlotService) {}

  @Get()
  @ApiOperation({ summary: 'List all branding slots (admin)' })
  list() {
    return this.brandingSlotService.findAllForAdmin();
  }

  @Post()
  @UseInterceptors(FileInterceptor('brandingSlotImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a branding slot (admin, multipart/form-data)',
    description:
      'Send **`brandingSlotImage`** (JPEG/PNG, max 5MB) and/or **`brandingSlotImageUrl`**. At least one image source is required.',
  })
  @ApiBody({
    description:
      'Form fields plus optional `brandingSlotImage` binary (field name must be `brandingSlotImage`).',
    schema: {
      type: 'object',
      required: ['title', 'price'],
      properties: {
        title: { type: 'string', example: 'Stage backdrop — left' },
        price: { type: 'integer', example: 12_000_000, description: 'Kobo' },
        description: { type: 'string' },
        isReserved: { type: 'boolean' },
        totalSlots: { type: 'integer', example: 1, minimum: 1 },
        brandingSlotImageUrl: { type: 'string' },
        brandingSlotImage: {
          type: 'string',
          format: 'binary',
          description: 'JPEG or PNG; max 5MB',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Slot created' })
  create(
    @Body() dto: CreateBrandingSlotMultipartDto,
    @UploadedFile() brandingSlotImage: Express.Multer.File | undefined,
  ) {
    return this.brandingSlotService.createFromMultipart(dto, brandingSlotImage);
  }

  @Patch(':id/reserve')
  @ApiOperation({ summary: 'Reserve a branding slot (admin hold)' })
  reserve(@Param('id') id: string) {
    return this.brandingSlotService.reserve(id);
  }

  @Patch(':id/unreserve')
  @ApiOperation({ summary: 'Unreserve a branding slot' })
  unreserve(@Param('id') id: string) {
    return this.brandingSlotService.unreserve(id);
  }

  @Patch(':id/total-slots')
  @ApiOperation({ summary: 'Update the total number of copies for sale' })
  updateTotalSlots(
    @Param('id') id: string,
    @Body() dto: UpdateTotalSlotsDto,
  ) {
    return this.brandingSlotService.updateTotalSlots(id, dto.totalSlots);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an unpurchased branding slot' })
  remove(@Param('id') id: string) {
    return this.brandingSlotService.remove(id);
  }
}
