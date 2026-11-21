import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(private readonly configService: ConfigService) {}

  async hashPassword(password: string): Promise<string> {
    const memoryCost = this.configService.get<number>('argon2.memoryCost', 65536);
    const timeCost = this.configService.get<number>('argon2.timeCost', 3);
    const parallelism = this.configService.get<number>('argon2.parallelism', 4);

    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost,
      timeCost,
      parallelism,
    });
  }

  async verifyPassword(hash: string, plainText: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainText);
    } catch (err) {
      this.logger.error('Argon2 password verification failed:', err);
      return false;
    }
  }

  async needsRehash(hash: string): Promise<boolean> {
    const memoryCost = this.configService.get<number>('argon2.memoryCost', 65536);
    const timeCost = this.configService.get<number>('argon2.timeCost', 3);
    const parallelism = this.configService.get<number>('argon2.parallelism', 4);

    return argon2.needsRehash(hash, {
      memoryCost,
      timeCost,
      parallelism,
    });
  }
}
