import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './sessions.service';
import { PrismaService } from '../../database/prisma.service';
import { TokenService } from '../auth/services/token.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuditEventType } from '../../common/interfaces/auth.interface';

describe('SessionService & Refresh Token Rotation', () => {
  let sessionService: SessionService;
  let prismaService: any;
  let tokenService: any;
  let auditService: any;

  beforeEach(async () => {
    prismaService = {
      refreshSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
    };

    tokenService = {
      generateOpaqueToken: jest.fn().mockReturnValue({ token: 'new-raw-token', hash: 'new-hash' }),
      hashOpaqueToken: jest.fn().mockImplementation((t) => `hash_of_${t}`),
      calculateExpiry: jest.fn().mockReturnValue(new Date(Date.now() + 7 * 86400 * 1000)),
    };

    auditService = {
      logEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: prismaService },
        { provide: TokenService, useValue: tokenService },
        { provide: AuditService, useValue: auditService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('7d'),
          },
        },
      ],
    }).compile();

    sessionService = module.get<SessionService>(SessionService);
  });

  it('should detect token reuse and revoke all sessions for that user family', async () => {
    const rawToken = 'stolen-old-token';
    const hash = `hash_of_${rawToken}`;

    // Simulate session that was ALREADY revoked
    prismaService.refreshSession.findUnique.mockResolvedValueOnce({
      id: 'session-123',
      userId: 'user-family-456',
      tokenHash: hash,
      revokedAt: new Date(Date.now() - 10000), // revoked in the past
      expiresAt: new Date(Date.now() + 100000),
    });

    await expect(sessionService.rotateSession(rawToken)).rejects.toThrow(UnauthorizedException);

    // Verify all sessions were revoked
    expect(prismaService.refreshSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-family-456', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });

    // Verify audit event logged
    expect(auditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AuditEventType.TOKEN_REUSE_DETECTED,
        userId: 'user-family-456',
      }),
    );
  });

  it('should rotate valid refresh token: revoke current and return new session', async () => {
    const rawToken = 'valid-token';
    const hash = `hash_of_${rawToken}`;

    prismaService.refreshSession.findUnique.mockResolvedValueOnce({
      id: 'session-old',
      userId: 'user-789',
      tokenHash: hash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100000),
    });

    prismaService.refreshSession.create.mockResolvedValueOnce({
      id: 'session-new',
    });

    const result = await sessionService.rotateSession(rawToken);

    expect(result.userId).toBe('user-789');
    expect(result.newRefreshToken).toBe('new-raw-token');
    expect(result.sessionId).toBe('session-new');

    // Check old session was revoked
    expect(prismaService.refreshSession.update).toHaveBeenCalledWith({
      where: { id: 'session-old' },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
