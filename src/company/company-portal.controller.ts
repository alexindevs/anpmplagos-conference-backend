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
import { CompanyService } from './company.service';
import { CreateCompanyProductMultipartDto } from './dto/create-company-product-multipart.dto';
import { CreateCompanyRepresentativeDto } from './dto/create-company-representative.dto';
import { UpdateCompanyProductDto } from './dto/update-company-product.dto';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { UpdateCompanyRepresentativeDto } from './dto/update-company-representative.dto';

type AuthedReq = { user: AuthUser };

@ApiTags('companies')
@Controller('api/companies')
export class CompanyPortalController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my company profile (edit form)' })
  getMe(@Req() req: AuthedReq) {
    const id = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.getPortalProfile(id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my company profile' })
  patchMe(@Req() req: AuthedReq, @Body() dto: UpdateCompanyProfileDto) {
    const id = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.updatePortalProfile(id, dto);
  }

  @Get('me/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Dashboard summary (stats, booth status, sponsorship totals)',
  })
  getDashboard(@Req() req: AuthedReq) {
    const id = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.getDashboard(id);
  }

  @Get('me/sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'My purchased session slots (masterclass, panel, presentation) and pending session payments',
  })
  getMySessions(@Req() req: AuthedReq) {
    const id = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.listCompanySessionSlots(id);
  }

  @Get('me/booth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Booth assignment + pending payment (same payload as dashboard booth section)',
  })
  getBooth(@Req() req: AuthedReq) {
    const id = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.getBoothPortal(id);
  }

  @Get('me/representatives')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my booth representatives' })
  listRepresentatives(@Req() req: AuthedReq) {
    const id = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.listRepresentatives(id);
  }

  @Post('me/representatives')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a representative' })
  addRepresentative(
    @Req() req: AuthedReq,
    @Body() dto: CreateCompanyRepresentativeDto,
  ) {
    const cid = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.createRepresentative(cid, dto);
  }

  @Patch('me/representatives/:representativeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a representative' })
  patchRepresentative(
    @Req() req: AuthedReq,
    @Param('representativeId') representativeId: string,
    @Body() dto: UpdateCompanyRepresentativeDto,
  ) {
    const cid = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.updateRepresentative(cid, representativeId, dto);
  }

  @Delete('me/representatives/:representativeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a representative' })
  deleteRepresentative(
    @Req() req: AuthedReq,
    @Param('representativeId') representativeId: string,
  ) {
    const cid = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.deleteRepresentative(cid, representativeId);
  }

  @Get('me/products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my showcase products' })
  listProducts(@Req() req: AuthedReq) {
    const id = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.listProducts(id);
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
    @Body() dto: CreateCompanyProductMultipartDto,
    @UploadedFile() productImage: Express.Multer.File | undefined,
  ) {
    const cid = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.createProductMultipart(cid, dto, productImage);
  }

  @Patch('me/products/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  patchProduct(
    @Req() req: AuthedReq,
    @Param('productId') productId: string,
    @Body() dto: UpdateCompanyProductDto,
  ) {
    const cid = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.updateProduct(cid, productId, dto);
  }

  @Delete('me/products/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product' })
  deleteProduct(@Req() req: AuthedReq, @Param('productId') productId: string) {
    const cid = this.companyService.requireCompanyAccount(
      req.user.regType,
      req.user.company,
    );
    return this.companyService.deleteProduct(cid, productId);
  }
}
