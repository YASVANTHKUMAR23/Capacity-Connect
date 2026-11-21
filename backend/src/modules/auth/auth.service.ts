import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { CaptchaService } from './services/captcha.service';
import { EmailDomainValidator, normalizeEmail } from './services/email-domain.validator';
import { EmailService } from '../email/email.service';
import { SessionService } from '../sessions/sessions.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { Role, AccountStatus, AuditEventType, UserResponse } from '../../common/interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly captchaService: CaptchaService,
    private readonly domainValidator: EmailDomainValidator,
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    // 1. CAPTCHA verification
    const isCaptchaValid = await this.captchaService.verify(dto.captchaToken, ipAddress);
    if (!isCaptchaValid) {
      throw new BadRequestException({
        code: ERROR_CODES.INVALID_CAPTCHA,
        message: 'Cloudflare Turnstile verification failed. Please try again.',
      });
    }

    // 2. Reject public Admin registration
    if (dto.role === (Role.ADMIN as any) || (dto.role as string) === 'ADMIN') {
      throw new ForbiddenException({
        code: ERROR_CODES.FORBIDDEN_RESOURCE,
        message: 'Public administrator registration is prohibited.',
      });
    }

    // 3. Email normalization and domain allowlist check
    const cleanEmail = normalizeEmail(dto.email);
    if (!this.domainValidator.isDomainAllowed(cleanEmail)) {
      throw new BadRequestException({
        code: ERROR_CODES.INVALID_EMAIL_DOMAIN,
        message: 'Only authorized government and IMD email addresses (e.g. @imd.gov.in) are allowed.',
      });
    }

    // 4. Duplicate email check
    const existing = await this.authRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new ConflictException({
        code: ERROR_CODES.EMAIL_ALREADY_EXISTS,
        message: 'An account with this email address already exists.',
      });
    }

    // 5. Argon2id password hash
    const passwordHash = await this.passwordService.hashPassword(dto.password);

    // 6. Create user in PENDING_APPROVAL status
    const user = await this.authRepository.createUser({
      fullName: dto.fullName.trim(),
      email: cleanEmail,
      passwordHash,
      role: dto.role as any,
      accountStatus: AccountStatus.PENDING_APPROVAL as any,
      organization: dto.organization?.trim() || null,
    });

    // 7. Invalidate any previous OTPs and generate secure 6-digit OTP (10m validity)
    await this.authRepository.invalidateActiveVerificationTokens(user.id);
    const { otp, hash } = this.tokenService.generateSixDigitOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    await this.authRepository.createVerificationToken(user.id, hash, expiresAt);

    // 8. Dispatch 6-digit OTP to user's registered email
    await this.emailService.sendVerificationOtp(cleanEmail, otp);

    // 9. Audit log
    await this.auditService.logEvent({
      userId: user.id,
      eventType: AuditEventType.REGISTER,
      ipAddress,
      userAgent,
      metadata: { role: user.role, email: cleanEmail },
    });

    return {
      success: true,
      message: 'Registration successful. A 6-digit verification OTP has been sent to your email.',
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        accountStatus: user.accountStatus,
        requiresEmailVerification: true,
      },
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    // 1. CAPTCHA verification
    const isCaptchaValid = await this.captchaService.verify(dto.captchaToken, ipAddress);
    if (!isCaptchaValid) {
      throw new BadRequestException({
        code: ERROR_CODES.INVALID_CAPTCHA,
        message: 'Cloudflare Turnstile verification failed. Please try again.',
      });
    }

    const cleanEmail = normalizeEmail(dto.email);
    const user = await this.authRepository.findByEmail(cleanEmail);

    if (!user) {
      await this.auditService.logEvent({
        eventType: AuditEventType.LOGIN_FAILURE,
        ipAddress,
        userAgent,
        metadata: { email: cleanEmail, reason: 'USER_NOT_FOUND' },
      });
      throw new UnauthorizedException({
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password.',
      });
    }

    // 2. Argon2id password check
    const isPasswordValid = await this.passwordService.verifyPassword(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      await this.auditService.logEvent({
        userId: user.id,
        eventType: AuditEventType.LOGIN_FAILURE,
        ipAddress,
        userAgent,
        metadata: { reason: 'INVALID_PASSWORD' },
      });
      throw new UnauthorizedException({
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password.',
      });
    }

    // 3. Email verification enforcement
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException({
        code: ERROR_CODES.EMAIL_NOT_VERIFIED,
        message: 'Please verify your official email address before logging in.',
      });
    }

    // 4. Account approval status enforcement
    if (user.accountStatus === (AccountStatus.PENDING_APPROVAL as any)) {
      throw new UnauthorizedException({
        code: ERROR_CODES.ACCOUNT_PENDING_APPROVAL,
        message: 'Your registration is currently pending administrator approval.',
      });
    }

    if (user.accountStatus === (AccountStatus.REJECTED as any)) {
      throw new UnauthorizedException({
        code: ERROR_CODES.ACCOUNT_REJECTED,
        message: 'This account registration request was declined by the administrator.',
      });
    }

    if (user.accountStatus === (AccountStatus.SUSPENDED as any)) {
      throw new UnauthorizedException({
        code: ERROR_CODES.ACCOUNT_SUSPENDED,
        message: 'Your account has been suspended by an administrator.',
      });
    }

    // 5. Create Refresh Session & JWT Access Token
    const { refreshToken, sessionId } = await this.sessionService.createSession(user.id, userAgent, ipAddress);
    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      sid: sessionId,
    });

    // 6. Update lastLoginAt
    await this.authRepository.updateUser(user.id, { lastLoginAt: new Date() });

    // 7. Audit log
    await this.auditService.logEvent({
      userId: user.id,
      eventType: AuditEventType.LOGIN_SUCCESS,
      ipAddress,
      userAgent,
      metadata: { sessionId },
    });

    return {
      accessToken,
      refreshToken,
      user: this.mapUserResponse(user),
    };
  }

  async verifyOtp(email: string, otp: string, ipAddress?: string, userAgent?: string) {
    const cleanEmail = normalizeEmail(email);
    const user = await this.authRepository.findByEmail(cleanEmail);

    if (!user) {
      throw new BadRequestException({
        code: ERROR_CODES.INVALID_OTP,
        message: 'Invalid verification request or email not found.',
      });
    }

    if (user.emailVerifiedAt) {
      return {
        success: true,
        message: 'Email is already verified. Your account is pending administrator review.',
      };
    }

    // Retrieve active OTP record for user
    const record = await this.authRepository.findLatestVerificationTokenForUser(user.id);

    if (!record || record.usedAt) {
      throw new BadRequestException({
        code: ERROR_CODES.INVALID_OTP,
        message: 'No active OTP found. Please request a new verification code.',
      });
    }

    // Check maximum attempts (5 allowed)
    if (record.attempts >= 5) {
      await this.authRepository.markVerificationTokenUsed(record.id);
      throw new BadRequestException({
        code: ERROR_CODES.OTP_MAX_ATTEMPTS_EXCEEDED,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
      });
    }

    // Check 10-minute expiration
    if (new Date() > record.expiresAt) {
      await this.authRepository.markVerificationTokenUsed(record.id);
      throw new BadRequestException({
        code: ERROR_CODES.OTP_EXPIRED,
        message: 'Verification OTP has expired. Please request a new one.',
      });
    }

    // Verify hashed OTP
    const submittedHash = this.tokenService.hashOpaqueToken(otp.trim());
    if (record.tokenHash !== submittedHash) {
      const updated = await this.authRepository.incrementVerificationAttempts(record.id);
      const remaining = 5 - updated.attempts;
      
      if (remaining <= 0) {
        await this.authRepository.markVerificationTokenUsed(record.id);
        throw new BadRequestException({
          code: ERROR_CODES.OTP_MAX_ATTEMPTS_EXCEEDED,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.',
        });
      }

      throw new BadRequestException({
        code: ERROR_CODES.INVALID_OTP,
        message: `Invalid OTP code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      });
    }

    // Successful verification
    await this.authRepository.markVerificationTokenUsed(record.id);
    await this.authRepository.updateUser(user.id, {
      emailVerifiedAt: new Date(),
    });

    await this.auditService.logEvent({
      userId: user.id,
      eventType: AuditEventType.EMAIL_VERIFIED,
      ipAddress,
      userAgent,
      metadata: { method: 'EMAIL_OTP' },
    });

    return {
      success: true,
      message: 'Email successfully verified! Your account is now pending administrator review.',
    };
  }

  async resendOtp(email: string, ipAddress?: string, userAgent?: string) {
    const cleanEmail = normalizeEmail(email);
    const user = await this.authRepository.findByEmail(cleanEmail);

    if (!user) {
      // Enumeration-resistant generic response
      return {
        success: true,
        message: 'If an unverified account exists for this email, a new verification OTP has been sent.',
      };
    }

    if (user.emailVerifiedAt) {
      return {
        success: true,
        message: 'Email is already verified. Your account is pending administrator review.',
      };
    }

    // Check 60-second resend cooldown
    const latestToken = await this.authRepository.findLatestVerificationTokenForUser(user.id);
    if (latestToken) {
      const elapsedMs = Date.now() - latestToken.createdAt.getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        throw new BadRequestException({
          code: ERROR_CODES.RESEND_COOLDOWN_ACTIVE,
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
        });
      }
    }

    // Invalidate previous OTPs
    await this.authRepository.invalidateActiveVerificationTokens(user.id);

    // Generate new 6-digit OTP (10 mins validity)
    const { otp, hash } = this.tokenService.generateSixDigitOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.authRepository.createVerificationToken(user.id, hash, expiresAt);

    // Send via email
    await this.emailService.sendVerificationOtp(cleanEmail, otp);

    await this.auditService.logEvent({
      userId: user.id,
      eventType: AuditEventType.EMAIL_VERIFY_REQUEST,
      ipAddress,
      userAgent,
      metadata: { method: 'RESEND_OTP' },
    });

    return {
      success: true,
      message: 'A new 6-digit verification code has been dispatched to your email address.',
    };
  }

  // Alias wrappers for backwards compatibility
  async verifyEmail(token: string, ipAddress?: string, userAgent?: string) {
    return this.verifyOtp(token, token, ipAddress, userAgent);
  }

  async resendVerification(email: string) {
    return this.resendOtp(email);
  }

  async forgotPassword(email: string, captchaToken: string, ipAddress?: string) {
    const isCaptchaValid = await this.captchaService.verify(captchaToken, ipAddress);
    if (!isCaptchaValid) {
      throw new BadRequestException({
        code: ERROR_CODES.INVALID_CAPTCHA,
        message: 'Cloudflare Turnstile verification failed. Please try again.',
      });
    }

    const cleanEmail = normalizeEmail(email);
    const user = await this.authRepository.findByEmail(cleanEmail);

    if (user && user.accountStatus !== (AccountStatus.SUSPENDED as any)) {
      const { token, hash } = this.tokenService.generateOpaqueToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15m expiry
      await this.authRepository.createPasswordResetToken(user.id, hash, expiresAt);
      await this.emailService.sendPasswordResetEmail(cleanEmail, token);
      await this.auditService.logEvent({
        userId: user.id,
        eventType: AuditEventType.PASSWORD_RESET_REQUEST,
        ipAddress,
      });
    }

    // Generic response regardless of whether user exists
    return {
      success: true,
      message: 'If your email is registered in our portal, a password reset link has been dispatched.',
    };
  }

  async resetPassword(dto: ResetPasswordDto, ipAddress?: string, userAgent?: string) {
    const hash = this.tokenService.hashOpaqueToken(dto.token);
    const record = await this.authRepository.findPasswordResetToken(hash);

    if (!record || record.usedAt) {
      throw new BadRequestException({
        code: ERROR_CODES.INVALID_RESET_TOKEN,
        message: 'Invalid or already used password reset link.',
      });
    }

    if (new Date() > record.expiresAt) {
      throw new BadRequestException({
        code: ERROR_CODES.TOKEN_EXPIRED,
        message: 'Password reset link has expired. Please request a new one.',
      });
    }

    const passwordHash = await this.passwordService.hashPassword(dto.newPassword);

    // Update password and invalidate token
    await this.authRepository.updateUser(record.userId, { passwordHash });
    await this.authRepository.markPasswordResetTokenUsed(record.id);

    // Revoke all existing sessions for safety
    await this.sessionService.revokeAllUserSessions(record.userId);

    await this.auditService.logEvent({
      userId: record.userId,
      eventType: AuditEventType.PASSWORD_RESET_SUCCESS,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Password has been reset successfully. You may now sign in with your new credentials.',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ipAddress?: string) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found.',
      });
    }

    const isMatch = await this.passwordService.verifyPassword(user.passwordHash, dto.currentPassword);
    if (!isMatch) {
      throw new BadRequestException({
        code: ERROR_CODES.INVALID_CURRENT_PASSWORD,
        message: 'The current password provided is incorrect.',
      });
    }

    const passwordHash = await this.passwordService.hashPassword(dto.newPassword);
    await this.authRepository.updateUser(userId, { passwordHash });

    await this.auditService.logEvent({
      userId,
      eventType: AuditEventType.PASSWORD_CHANGE,
      ipAddress,
    });

    return {
      success: true,
      message: 'Password updated successfully.',
    };
  }

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'User profile not found.',
      });
    }
    return this.mapUserResponse(user);
  }

  mapUserResponse(user: any): UserResponse {
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
