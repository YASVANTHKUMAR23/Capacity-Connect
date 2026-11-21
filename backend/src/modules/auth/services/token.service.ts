import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { JwtPayload, Role } from '../../../common/interfaces/auth.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(payload: { userId: string; email: string; role: Role; sid?: string }): string {
    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const expiresIn = this.configService.get<string>('jwt.accessExpiresIn');

    const jwtPayload: JwtPayload = {
      sub: payload.userId,
      email: payload.email,
      role: payload.role,
      ...(payload.sid ? { sid: payload.sid } : {}),
    };

    return this.jwtService.sign(jwtPayload, {
      secret: accessSecret,
      expiresIn: expiresIn as any,
    });
  }

  generateOpaqueToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(40).toString('hex');
    const hash = this.hashOpaqueToken(token);
    return { token, hash };
  }

  hashOpaqueToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  calculateExpiry(durationStr: string): Date {
    const match = durationStr.match(/^(\d+)([smhd])$/);
    const now = Date.now();
    if (!match) {
      return new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days fallback
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now + value * 1000);
      case 'm':
        return new Date(now + value * 60 * 1000);
      case 'h':
        return new Date(now + value * 3600 * 1000);
      case 'd':
        return new Date(now + value * 86400 * 1000);
      default:
        return new Date(now + 7 * 86400 * 1000);
    }
  }
}
