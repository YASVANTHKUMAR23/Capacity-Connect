export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_key_change_in_production_32char',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret_key_change_in_production_32char',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  argon2: {
    memoryCost: parseInt(process.env.ARGON2_MEMORY_COST, 10) || 65536,
    timeCost: parseInt(process.env.ARGON2_TIME_COST, 10) || 3,
    parallelism: parseInt(process.env.ARGON2_PARALLELISM, 10) || 4,
  },
  turnstile: {
    secretKey: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA',
    siteKey: process.env.CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
    bypassInDev: process.env.CLOUDFLARE_TURNSTILE_BYPASS_DEV === 'true',
  },
  imd: {
    allowedEmailDomains: (process.env.IMD_ALLOWED_EMAIL_DOMAINS || 'imd.gov.in,moes.gov.in')
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  },
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM_EMAIL || 'Capacity Connect <noreply@imd.gov.in>',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
});
