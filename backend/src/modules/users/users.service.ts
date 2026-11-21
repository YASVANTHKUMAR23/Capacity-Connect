import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserResponse, Role, AccountStatus } from '../../common/interfaces/auth.interface';
import { ERROR_CODES } from '../../common/constants/error-codes';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException({
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role as Role,
      accountStatus: user.accountStatus as AccountStatus,
      emailVerified: !!user.emailVerifiedAt,
      organization: user.organization,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
