import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '../../../common/interfaces/auth.interface';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mocked.jwt.token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'jwt.accessSecret') return 'test_secret';
              if (key === 'jwt.accessExpiresIn') return '15m';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should generate an access token with claims', () => {
    const token = service.generateAccessToken({
      userId: 'uuid-123',
      email: 'officer@imd.gov.in',
      role: Role.TRAINEE,
      sid: 'session-456',
    });

    expect(token).toBe('mocked.jwt.token');
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'uuid-123',
        email: 'officer@imd.gov.in',
        role: Role.TRAINEE,
        sid: 'session-456',
      }),
      expect.any(Object),
    );
  });

  it('should generate opaque token and sha256 hash', () => {
    const { token, hash } = service.generateOpaqueToken();

    expect(token).toHaveLength(80); // 40 bytes hex = 80 chars
    expect(hash).toHaveLength(64); // sha256 hex = 64 chars
    expect(service.hashOpaqueToken(token)).toBe(hash);
  });

  it('should calculate expiry date accurately', () => {
    const before = Date.now();
    const expiry = service.calculateExpiry('15m');
    const after = Date.now();

    const expected15m = 15 * 60 * 1000;
    expect(expiry.getTime() - before).toBeGreaterThanOrEqual(expected15m);
    expect(expiry.getTime() - after).toBeLessThanOrEqual(expected15m);
  });
});
