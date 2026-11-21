import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TokenService } from '../auth/services/token.service';
import { AuditService } from '../audit/audit.service';
import { AuditEventType } from '../../common/interfaces/auth.interface';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<{ refreshToken: string; sessionId: string }> {
    const { token, hash } = this.tokenService.generateOpaqueToken();
    const expiryStr = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    const expiresAt = this.tokenService.calculateExpiry(expiryStr);

    const session = await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: hash,
        expiresAt,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
      },
    });

    return { refreshToken: token, sessionId: session.id };
  }

  async rotateSession(
    rawRefreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ userId: string; newRefreshToken: string; sessionId: string }> {
    const hash = this.tokenService.hashOpaqueToken(rawRefreshToken);

    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash: hash },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException({
        code: ERROR_CODES.TOKEN_INVALID,
        message: 'Invalid refresh token',
      });
    }

    // Refresh token reuse detection: If session was already revoked
    if (session.revokedAt) {
      // Revoke all sessions for this user family to protect against token theft
      await this.revokeAllUserSessions(session.userId);
      await this.auditService.logEvent({
        userId: session.userId,
        eventType: AuditEventType.TOKEN_REUSE_DETECTED,
        ipAddress,
        userAgent,
        metadata: { reusedSessionId: session.id },
      });

      throw new UnauthorizedException({
        code: ERROR_CODES.TOKEN_REUSED,
        message: 'Token reuse detected. All sessions have been terminated for security.',
      });
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException({
        code: ERROR_CODES.TOKEN_EXPIRED,
        message: 'Refresh token has expired',
      });
    }

    // Revoke old session and issue new one
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const newSession = await this.createSession(session.userId, userAgent, ipAddress);

    await this.auditService.logEvent({
      userId: session.userId,
      eventType: AuditEventType.TOKEN_REFRESH,
      ipAddress,
      userAgent,
      metadata: { oldSessionId: session.id, newSessionId: newSession.sessionId },
    });

    return {
      userId: session.userId,
      newRefreshToken: newSession.refreshToken,
      sessionId: newSession.sessionId,
    };
  }

  async revokeSessionByToken(rawRefreshToken: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const hash = this.tokenService.hashOpaqueToken(rawRefreshToken);
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash: hash } });

    if (session && !session.revokedAt) {
      await this.prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      await this.auditService.logEvent({
        userId: session.userId,
        eventType: AuditEventType.LOGOUT,
        ipAddress,
        userAgent,
        metadata: { sessionId: session.id },
      });
    }
  }

  async revokeSessionById(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.refreshSession.findUnique({ where: { id: sessionId } });

    if (!session || session.userId !== userId) {
      throw new ForbiddenException({
        code: ERROR_CODES.FORBIDDEN_RESOURCE,
        message: 'Cannot revoke session for another user',
      });
    }

    await this.prisma.refreshSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    await this.auditService.logEvent({
      userId,
      eventType: AuditEventType.SESSION_REVOCATION,
      metadata: { sessionId },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.logEvent({
      userId,
      eventType: AuditEventType.SESSION_REVOCATION,
      metadata: { type: 'REVOKE_ALL' },
    });
  }

  async getUserSessions(userId: string) {
    const sessions = await this.prisma.refreshSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    return sessions.map((s) => ({
      ...s,
      isRevoked: !!s.revokedAt,
      isExpired: new Date() > s.expiresAt,
    }));
  }
}
