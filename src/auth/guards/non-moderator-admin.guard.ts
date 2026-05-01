import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthUser } from '../auth.service';

@Injectable()
export class NonModeratorAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as AuthUser;
    if (!user || user.regType !== 'admin' || !user.admin) {
      throw new ForbiddenException('Admin access required');
    }
    if (user.admin.adminType === 'moderator') {
      throw new ForbiddenException(
        'Payment verification requires superadmin or support role',
      );
    }
    return true;
  }
}
