import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Role } from '../../../common/interfaces/auth.interface';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;

  @IsEnum([Role.TRAINER, Role.TRAINEE], {
    message: 'Role must be either TRAINER or TRAINEE (public ADMIN registration is forbidden)',
  })
  role: Role;

  @IsString()
  @IsOptional()
  organization?: string;

  @IsString()
  @IsNotEmpty({ message: 'Cloudflare Turnstile CAPTCHA token is required' })
  captchaToken: string;
}
