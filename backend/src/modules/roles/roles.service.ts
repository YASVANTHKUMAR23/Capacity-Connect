import { Injectable } from '@nestjs/common';
import { Role } from '../../common/interfaces/auth.interface';

@Injectable()
export class RolesService {
  private readonly roleHierarchy: Record<Role, number> = {
    [Role.ADMIN]: 100,
    [Role.TRAINER]: 50,
    [Role.TRAINEE]: 10,
  };

  isAuthorized(userRole: Role, requiredRole: Role): boolean {
    return (this.roleHierarchy[userRole] || 0) >= (this.roleHierarchy[requiredRole] || 0);
  }

  getRoles(): Role[] {
    return [Role.ADMIN, Role.TRAINER, Role.TRAINEE];
  }
}
