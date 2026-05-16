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
import { AdvertSlotService } from './advert-slot.service';
import { CreateAdvertSlotMultipartDto } from './dto/create-advert-slot-multipart.dto';
import { UpdateTotalSlotsDto } from './dto/update-total-slots.dto';

@ApiTags('admin')
@Controller('api/admin/advert-slots')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminAdvertSlotController {
  constructor(private readonly advertSlotService: AdvertSlotService) {}

  @Get()
  @ApiOperation({ summary: 'List all advert slots (admin)' })
  list() {
    return this.advertSlotService.findAllForAdmin();
  }

  @Post()
  @UseInterceptors(FileInterceptor('advertSlotImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create an advert slot (admin, multipart/form-data)',
    description:
      'Send **`advertSlotImage`** (JPEG/PNG, max 5MB) and/or **`advertSlotImageUrl`**. At least one image source is required.',
  })
  @ApiBody({
    description:
      'Form fields plus optional `advertSlotImage` binary (field name must be `advertSlotImage`).',
    schema: {
      type: 'object',
      required: ['title', 'price'],
      properties: {
        title: { type: 'string', example: 'Homepage leaderboard' },
        price: { type: 'integer', example: 5_000_000, description: 'Kobo' },
        description: { type: 'string' },
        isReserved: { type: 'boolean' },
        totalSlots: { type: 'integer', example: 1, minimum: 1 },
        advertSlotImageUrl: { type: 'string' },
        advertSlotImage: {
          type: 'string',
          format: 'binary',
          description: 'JPEG or PNG; max 5MB',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Slot created' })
  create(
    @Body() dto: CreateAdvertSlotMultipartDto,
    @UploadedFile() advertSlotImage: Express.Multer.File | undefined,
  ) {
    return this.advertSlotService.createFromMultipart(dto, advertSlotImage);
  }

  @Patch(':id/reserve')
  @ApiOperation({ summary: 'Reserve an advert slot (admin hold)' })
  reserve(@Param('id') id: string) {
    return this.advertSlotService.reserve(id);
  }

  @Patch(':id/unreserve')
  @ApiOperation({ summary: 'Unreserve an advert slot' })
  unreserve(@Param('id') id: string) {
    return this.advertSlotService.unreserve(id);
  }

  @Patch(':id/total-slots')
  @ApiOperation({ summary: 'Update the total number of copies for sale' })
  updateTotalSlots(
    @Param('id') id: string,
    @Body() dto: UpdateTotalSlotsDto,
  ) {
    return this.advertSlotService.updateTotalSlots(id, dto.totalSlots);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an unpurchased advert slot' })
  remove(@Param('id') id: string) {
    return this.advertSlotService.remove(id);
  }
}
