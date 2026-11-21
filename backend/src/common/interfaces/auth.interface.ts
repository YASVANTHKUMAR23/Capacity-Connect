export enum Role {
  ADMIN = 'ADMIN',
  TRAINER = 'TRAINER',
  TRAINEE = 'TRAINEE',
}

export enum AccountStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum AuditEventType {
  REGISTER = 'REGISTER',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REUSE_DETECTED = 'TOKEN_REUSE_DETECTED',
  EMAIL_VERIFY_REQUEST = 'EMAIL_VERIFY_REQUEST',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  SESSION_REVOCATION = 'SESSION_REVOCATION',
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  sid?: string;
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  organization?: string | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
}
