import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Express } from 'express';
import { ExhibitorService } from './exhibitor.service';
import { CreateExhibitorProductMultipartDto } from './dto/create-exhibitor-product-multipart.dto';
import { CreateExhibitorRepresentativeDto } from './dto/create-exhibitor-representative.dto';
import { UpdateExhibitorProductDto } from './dto/update-exhibitor-product.dto';
import { UpdateExhibitorProfileDto } from './dto/update-exhibitor-profile.dto';
import { UpdateExhibitorRepresentativeDto } from './dto/update-exhibitor-representative.dto';

type AuthedReq = { user: AuthUser };

/**
 * Authenticated exhibitor self-service (dashboard). All routes use the logged-in user’s exhibitor profile.
 * Base path: `/api/exhibitors/me/...`
 */
@ApiTags('exhibitors')
@Controller('api/exhibitors')
export class ExhibitorPortalController {
  constructor(private readonly exhibitorService: ExhibitorService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my exhibitor profile (edit form)' })
  getMe(@Req() req: AuthedReq) {
    const id = this.exhibitorService.requireExhibitorAccount(
      req.user.regType,
      req.user.exhibitor,
    );
    return this.exhibitorService.getPortalProfile(id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my company profile' })
  patchMe(@Req() req: AuthedReq, @Body() dto: UpdateExhibitorProfileDto) {
    const id = this.exhibitorService.requireExhibitorAccount(
      req.user.regType,
      req.user.exhibitor,
    );
    return this.exhibitorService.updatePortalProfile(id, dto);
  }

  @Get('me/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Dashboard summary (stats, booth status, hotel link)',
  })
  getDashboard(@Req() req: AuthedReq) {
    const id = this.exhibitorService.requireExhibitorAccount(
      req.user.regType,
      req.user.exhibitor,
    );
    return this.exhibitorService.getDashboard(id);
  }

  @Get('me/booth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Booth assignment + pending payment (same payload as dashboard booth section)' })
  getBooth(@Req() req: AuthedReq) {
    const id = this.exhibitorService.requireExhibitorAccount(
      req.user.regType,
      req.user.exhibitor,
    );
    return this.exhibitorService.getBoothPortal(id);
  }

  @Get('me/representatives')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my booth representatives' })
  listRepresentatives(@Req() req: AuthedReq) {
    const id = this.exhibitorService.requireExhibitorAccount(
      req.user.regType,
      req.user.exhibitor,
    );
    return this.exhibitorService.listRepresentatives(id);
  }

  @Post('me/representatives')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a representative' })
  addRepresentative(
    @Req() req: AuthedReq,
    @Body() dto: CreateExhibitorRepresentativeDto,
  ) {
    const eid = this.exhibitorService.requireExhibitorAccount(
      req.user.regType,
      req.user.exhibitor,
    );
    return this.exhibitorService.createRepresentative(eid, dto);
  }

  @Patch('me/representatives/:representativeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a representative' })
  patchRepresentative(
    @Req() req: AuthedReq,
    @Param('representativeId') representativeId: string,
    @Body() dto: UpdateExhibitorRepresentativeDto,
  ) {
    const eid = this.exhibitorService.requireExhibitorAccount(
      req.user.regType,
      req.user.exhibitor,
    );
    return this.exhibitorService.updateRepresentative(eid, representativeId, dto);
  }

  @Delete('me/representatives/:representativeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a representative' })
  deleteRepresentative(
    @Req() req: AuthedReq,
    @Param('representativeId') representativeId: string,
  ) {
    const eid = this.exhibitorService.requireExhibitorAccount(
      req.user.regType,
      req.user.exhibitor,
    );
    return this.exhibitorService.deleteRepresentative(eid, representativeId);
  }

  @Get('me/products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my showcase products' })
  listProducts(@Req() req: AuthedReq) {
    const id = this.exhibitorService.requireExhibitorAccount(
      req.user.regType,
      req.user.exhibitor,
    );
    return this.exhibitorService.listProducts(id);
  }

  @Post('me/products')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('productImage'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Add a product (multipart/form-data)',
    description:
      'Send fields as form data. Optional file field **`productImage`** (JPEG/PNG, max 5MB) is uploaded to Cloudinary and stored as `imageUrl`. You may omit the file and optionally set **`imageUrl`** to an existing URL instead.',
  })
  @ApiBody({
    description:
      'Form fields plus optional `productImage` binary (field name must be `productImage`).',
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Surgical kit model X' },
        description: { type: 'string', example: 'Short blurb' },
        imageUrl: {
          type: 'string',
          description: 'Optional if `productImage` is uploaded',
          example: 'https://res.cloudinary.com/.../image.jpg',
        },
        linkUrl: { type: 'string', example: 'https://example.com/product' },
        sortOrder: { type: 'integer', example: 0 },
        productImage: {
          type: 'string',
          format: 'binary',
          description: 'JPEG or PNG; max 5MB',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Product created' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid productImage (type/size)',
  })
  addProduct(
    @Req() req: AuthedReq,
    @Body() dto: CreateExhibitorProductMultipartDto,
    @UploadedFile() productImage: Express.Multer.File | undefined,
  ) {
    const eid = this.exhibitorService.requireExhibitorAccount(
      req.user.regType,
      req.user.exhibitor,
    );
    return this.exhibitorService.createProductMultipart(eid, dto, productImage);
  }

  @Patch('me/products/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  patchProduct(
    @Req() req: AuthedReq,
    @Param('productId') productId: string,
    @Body() dto: UpdateExhibitorProductDto,
  ) {
    const eid = this.exhibitorService.requireExhibitorAccount(
      req.user.regType,
      req.user.exhibitor,
    );
    return this.exhibitorService.updateProduct(eid, productId, dto);
  }

  @Delete('me/products/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product' })
  deleteProduct(@Req() req: AuthedReq, @Param('productId') productId: string) {
    const eid = this.exhibitorService.requireExhibitorAccount(
      req.user.regType,
      req.user.exhibitor,
    );
    return this.exhibitorService.deleteProduct(eid, productId);
  }
}
