import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ReceiptsService } from './receipts.service';
import { ReceiptFormatterService } from './receipt-formatter.service';
import { ReceiptQueryDto } from './dto';

@ApiTags('Receipts')
@Controller('api/receipts')
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly receiptFormatter: ReceiptFormatterService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List receipts for the authenticated user (member, attendee, or company)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({
    name: 'kind',
    required: false,
    enum: [
      'registration',
      'order',
      'booth',
      'masterclass',
      'panel',
      'presentation',
      'hotel_room',
      'sponsorship_plan',
      'advert_slot',
      'branding_slot',
    ],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'success', 'failed', 'refunded'],
  })
  @ApiQuery({ name: 'reference', required: false })
  async listUserReceipts(
    @Req() req: Request & { user: AuthUser },
    @Query() query: ReceiptQueryDto,
  ) {
    return this.receiptsService.listUserReceipts(req.user, {
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
      kind: query.kind,
      status: query.status,
      reference: query.reference,
    });
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all receipts (admin only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({
    name: 'kind',
    required: false,
    enum: [
      'registration',
      'order',
      'booth',
      'masterclass',
      'panel',
      'presentation',
      'hotel_room',
      'sponsorship_plan',
      'advert_slot',
      'branding_slot',
    ],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'success', 'failed', 'refunded'],
  })
  @ApiQuery({ name: 'reference', required: false })
  async listAllReceipts(@Query() query: ReceiptQueryDto) {
    return this.receiptsService.listAllReceipts({
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
      kind: query.kind,
      status: query.status,
      reference: query.reference,
    });
  }

  @Get('by-reference/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a specific receipt by payment reference',
    description:
      'Users can only access their own receipts. Admins can access any receipt.',
  })
  @ApiParam({ name: 'reference', example: 'PAY-123456' })
  async getReceiptByReference(
    @Param('reference') reference: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.receiptsService.getReceiptByReference(reference, req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a specific receipt by payment ID',
    description:
      'Users can only access their own receipts. Admins can access any receipt.',
  })
  @ApiParam({ name: 'id', example: 'clx123456' })
  async getReceiptById(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    return this.receiptsService.getReceiptById(id, req.user);
  }

  @Get(':id/html')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Header('Content-Type', 'text/html')
  @ApiOperation({
    summary: 'Get a printable HTML receipt',
    description:
      'Returns a formatted HTML receipt that can be printed or converted to PDF. Users can only access their own receipts. Admins can access any receipt.',
  })
  @ApiParam({ name: 'id', example: 'clx123456' })
  async getReceiptHtml(
    @Param('id') id: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    const receipt = await this.receiptsService.getReceiptById(id, req.user);
    return this.receiptFormatter.generateReceiptHtml(receipt);
  }

  @Get('by-reference/:reference/html')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Header('Content-Type', 'text/html')
  @ApiOperation({
    summary: 'Get a printable HTML receipt by payment reference',
    description:
      'Returns a formatted HTML receipt that can be printed or converted to PDF. Users can only access their own receipts. Admins can access any receipt.',
  })
  @ApiParam({ name: 'reference', example: 'PAY-ORD-1234567890' })
  async getReceiptHtmlByReference(
    @Param('reference') reference: string,
    @Req() req: Request & { user: AuthUser },
  ) {
    const receipt = await this.receiptsService.getReceiptByReference(
      reference,
      req.user,
    );
    return this.receiptFormatter.generateReceiptHtml(receipt);
  }
}
