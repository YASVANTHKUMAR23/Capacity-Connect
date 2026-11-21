import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { JwtPayload, AccountStatus } from '../../../common/interfaces/auth.interface';
import { ERROR_CODES } from '../../../common/constants/error-codes';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret') || 'dev_access_secret_key_change_in_production_32char',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'User account no longer exists',
      });
    }

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new UnauthorizedException({
        code: ERROR_CODES.ACCOUNT_SUSPENDED,
        message: 'Account has been suspended',
      });
    }

    if (user.accountStatus === AccountStatus.REJECTED) {
      throw new UnauthorizedException({
        code: ERROR_CODES.ACCOUNT_REJECTED,
        message: 'Account registration was rejected',
      });
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      sid: payload.sid,
    };
  }
}
