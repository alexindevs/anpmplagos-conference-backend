import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class ModeratorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (
      !user ||
      user.regType !== 'admin' ||
      !user.admin ||
      user.admin.adminType !== 'moderator'
    ) {
      throw new ForbiddenException('Attendance moderator access required');
    }
    return true;
  }
}
