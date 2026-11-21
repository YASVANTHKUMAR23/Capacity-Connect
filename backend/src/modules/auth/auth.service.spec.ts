import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { CaptchaService } from './services/captcha.service';
import { EmailDomainValidator } from './services/email-domain.validator';
import { EmailService } from '../email/email.service';
import { SessionService } from '../sessions/sessions.service';
import { AuditService } from '../audit/audit.service';
import { Role, AccountStatus } from '../../common/interfaces/auth.interface';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let authService: AuthService;
  let authRepository: Partial<AuthRepository>;
  let captchaService: Partial<CaptchaService>;
  let domainValidator: Partial<EmailDomainValidator>;
  let passwordService: Partial<PasswordService>;
  let tokenService: Partial<TokenService>;
  let sessionService: Partial<SessionService>;
  let emailService: Partial<EmailService>;
  let auditService: Partial<AuditService>;

  beforeEach(async () => {
    authRepository = {
      findByEmail: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      createVerificationToken: jest.fn(),
      findVerificationToken: jest.fn(),
      markVerificationTokenUsed: jest.fn(),
      createPasswordResetToken: jest.fn(),
      findPasswordResetToken: jest.fn(),
      markPasswordResetTokenUsed: jest.fn(),
    };

    captchaService = {
      verify: jest.fn().mockResolvedValue(true),
    };

    domainValidator = {
      isDomainAllowed: jest.fn().mockReturnValue(true),
    };

    passwordService = {
      hashPassword: jest.fn().mockResolvedValue('$argon2id$hashedpassword'),
      verifyPassword: jest.fn().mockResolvedValue(true),
    };

    tokenService = {
      generateOpaqueToken: jest.fn().mockReturnValue({ token: 'test-token', hash: 'test-hash' }),
      generateAccessToken: jest.fn().mockReturnValue('mock-jwt-access-token'),
      hashOpaqueToken: jest.fn().mockReturnValue('test-hash'),
      calculateExpiry: jest.fn().mockReturnValue(new Date(Date.now() + 60000)),
    };

    sessionService = {
      createSession: jest.fn().mockResolvedValue({ refreshToken: 'mock-refresh-token', sessionId: 'mock-session-id' }),
      revokeAllUserSessions: jest.fn().mockResolvedValue(undefined),
    };

    emailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    auditService = {
      logEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepository },
        { provide: PasswordService, useValue: passwordService },
        { provide: TokenService, useValue: tokenService },
        { provide: CaptchaService, useValue: captchaService },
        { provide: EmailDomainValidator, useValue: domainValidator },
        { provide: EmailService, useValue: emailService },
        { provide: SessionService, useValue: sessionService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should reject invalid Turnstile CAPTCHA', async () => {
      (captchaService.verify as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        authService.register({
          fullName: 'Asha Verma',
          email: 'asha@imd.gov.in',
          password: 'Password123456!',
          role: Role.TRAINEE,
          captchaToken: 'invalid-token',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject public ADMIN registration attempts', async () => {
      await expect(
        authService.register({
          fullName: 'Hacker Admin',
          email: 'admin@imd.gov.in',
          password: 'Password123456!',
          role: Role.ADMIN,
          captchaToken: 'valid-token',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject unauthorized email domains', async () => {
      (domainValidator.isDomainAllowed as jest.Mock).mockReturnValueOnce(false);

      await expect(
        authService.register({
          fullName: 'Test User',
          email: 'user@gmail.com',
          password: 'Password123456!',
          role: Role.TRAINEE,
          captchaToken: 'valid-token',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully register a Trainee with PENDING_APPROVAL status', async () => {
      (authRepository.createUser as jest.Mock).mockResolvedValueOnce({
        id: 'user-uuid-1',
        fullName: 'Asha Verma',
        email: 'asha@imd.gov.in',
        role: Role.TRAINEE,
        accountStatus: AccountStatus.PENDING_APPROVAL,
      });

      const res = await authService.register({
        fullName: 'Asha Verma',
        email: 'asha@imd.gov.in',
        password: 'Password123456!',
        role: Role.TRAINEE,
        captchaToken: 'valid-token',
      });

      expect(res.success).toBe(true);
      expect(res.data.accountStatus).toBe(AccountStatus.PENDING_APPROVAL);
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should deny login when email is unverified', async () => {
      (authRepository.findByEmail as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        email: 'asha@imd.gov.in',
        passwordHash: 'hash',
        emailVerifiedAt: null, // Unverified
        accountStatus: AccountStatus.ACTIVE,
      });

      await expect(
        authService.login({
          email: 'asha@imd.gov.in',
          password: 'password',
          captchaToken: 'valid',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should deny login when account is pending administrator approval', async () => {
      (authRepository.findByEmail as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        email: 'asha@imd.gov.in',
        passwordHash: 'hash',
        emailVerifiedAt: new Date(),
        accountStatus: AccountStatus.PENDING_APPROVAL,
      });

      await expect(
        authService.login({
          email: 'asha@imd.gov.in',
          password: 'password',
          captchaToken: 'valid',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should successfully login an approved and verified user', async () => {
      (authRepository.findByEmail as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        fullName: 'Dr. Ravi Menon',
        email: 'ravi.menon@imd.gov.in',
        role: Role.TRAINER,
        passwordHash: 'hash',
        emailVerifiedAt: new Date(),
        accountStatus: AccountStatus.ACTIVE,
      });

      const res = await authService.login({
        email: 'ravi.menon@imd.gov.in',
        password: 'password',
        captchaToken: 'valid',
      });

      expect(res.accessToken).toBe('mock-jwt-access-token');
      expect(res.user.email).toBe('ravi.menon@imd.gov.in');
      expect(res.refreshToken).toBe('mock-refresh-token');
    });
  });
});
