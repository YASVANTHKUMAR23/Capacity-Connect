import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async createVerificationToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        attempts: 0,
      },
    });
  }

  async findVerificationToken(tokenHash: string) {
    return this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async findLatestVerificationTokenForUser(userId: string) {
    return this.prisma.emailVerificationToken.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  async invalidateActiveVerificationTokens(userId: string) {
    return this.prisma.emailVerificationToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async incrementVerificationAttempts(id: string) {
    return this.prisma.emailVerificationToken.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
      },
    });
  }

  async markVerificationTokenUsed(id: string) {
    return this.prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findPasswordResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async markPasswordResetTokenUsed(id: string) {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
