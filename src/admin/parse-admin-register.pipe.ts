import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { AdminType } from '@prisma/client';

type FormBody = Record<string, unknown>;

@Injectable()
export class ParseAdminRegisterPipe implements PipeTransform<
  FormBody,
  { email: string; password: string; name: string; adminType: AdminType }
> {
  transform(value: FormBody) {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Invalid request body');
    }
    const email = String(value.email ?? '').trim();
    const password = String(value.password ?? '');
    const name = String(value.name ?? '').trim();
    const adminType = String(value.adminType ?? 'superadmin').toLowerCase();

    if (!email) throw new BadRequestException('email is required');
    if (!password) throw new BadRequestException('password is required');
    if (!name) throw new BadRequestException('name is required');
    if (password.length < 8)
      throw new BadRequestException('password must be at least 8 characters');

    if (adminType !== 'superadmin') {
      throw new BadRequestException('Only superadmin is allowed for now');
    }

    return { email, password, name, adminType: 'superadmin' as AdminType };
  }
}
