import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailDomainValidator, extractEmailDomain, normalizeEmail } from './email-domain.validator';

describe('EmailDomainValidator & Helpers', () => {
  let validator: EmailDomainValidator;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailDomainValidator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              if (key === 'imd.allowedEmailDomains') {
                return ['imd.gov.in', 'moes.gov.in'];
              }
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    validator = module.get<EmailDomainValidator>(EmailDomainValidator);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('normalizeEmail', () => {
    it('should lowercase and trim email addresses', () => {
      expect(normalizeEmail('  Officer.IMD@imd.gov.in  ')).toBe('officer.imd@imd.gov.in');
      expect(normalizeEmail('')).toBe('');
    });
  });

  describe('extractEmailDomain', () => {
    it('should correctly extract exact domain after the final @ separator', () => {
      expect(extractEmailDomain('employee@imd.gov.in')).toBe('imd.gov.in');
      expect(extractEmailDomain('employee@fakeimd.gov.in')).toBe('fakeimd.gov.in');
      expect(extractEmailDomain('employee@imd.gov.in.fake.com')).toBe('imd.gov.in.fake.com');
      expect(extractEmailDomain('invalid-email-no-at')).toBe('');
      expect(extractEmailDomain('trailing-at@')).toBe('');
    });
  });

  describe('isDomainAllowed', () => {
    it('should accept official @imd.gov.in emails', () => {
      expect(validator.isDomainAllowed('employee@imd.gov.in')).toBe(true);
      expect(validator.isDomainAllowed('officer.ravi@imd.gov.in')).toBe(true);
    });

    it('should accept official @moes.gov.in emails', () => {
      expect(validator.isDomainAllowed('scientist@moes.gov.in')).toBe(true);
    });

    it('should reject unauthorized commercial domains like @gmail.com', () => {
      expect(validator.isDomainAllowed('employee@gmail.com')).toBe(false);
    });

    it('should reject spoofed or subdomain matching attempts without substring bypass', () => {
      expect(validator.isDomainAllowed('employee@fakeimd.gov.in')).toBe(false);
      expect(validator.isDomainAllowed('employee@imd.gov.in.fake.com')).toBe(false);
      expect(validator.isDomainAllowed('employee@sub.imd.gov.in')).toBe(false);
    });
  });
});
