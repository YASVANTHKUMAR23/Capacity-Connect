import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service';

describe('PasswordService (Argon2id)', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: any) => {
              if (key === 'argon2.memoryCost') return 4096;
              if (key === 'argon2.timeCost') return 2; // minimum allowed by argon2
              if (key === 'argon2.parallelism') return 1;
              return def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should hash a password with Argon2id', async () => {
    const password = 'StrongPassword123!';
    const hash = await service.hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).toContain('$argon2id$');
  });

  it('should verify a correct password against hash', async () => {
    const password = 'StrongPassword123!';
    const hash = await service.hashPassword(password);
    const isValid = await service.verifyPassword(hash, password);

    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = 'StrongPassword123!';
    const hash = await service.hashPassword(password);
    const isValid = await service.verifyPassword(hash, 'WrongPassword123!');

    expect(isValid).toBe(false);
  });
});
