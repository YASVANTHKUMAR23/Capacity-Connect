# Capacity Connect — Frontend to Backend API Integration Guide
## Module 01: Authentication & Identity Management

This document provides complete instructions for connecting the prebuilt React frontend to the NestJS backend APIs without breaking existing UI workflows.

---

### 1. Base Configuration

- **API Base URL**: `http://localhost:3000/api/v1`
- **Credentials**: Send cookies on every cross-origin request (`credentials: 'include'`).
- **Cloudflare Turnstile**: Ensure the Turnstile widget uses the site key provided in backend `.env` (testing key: `1x00000000000000000000AA`).

---

### 2. Frontend HTTP Client Implementation Pattern

Create an API client helper (e.g. `src/services/apiClient.ts`) to handle authentication state, tokens in memory, and cookie-based refresh tokens:

```typescript
let memoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  memoryAccessToken = token;
};

export const getAccessToken = () => memoryAccessToken;

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (memoryAccessToken) {
    headers.set('Authorization', `Bearer ${memoryAccessToken}`);
  }

  const response = await fetch(`http://localhost:3000/api/v1${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // sends and receives HttpOnly refresh cookie
  });

  // If access token expired, attempt automatic silent refresh
  if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    const refreshRes = await fetch('http://localhost:3000/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setAccessToken(data.accessToken);
      // Retry original request
      headers.set('Authorization', `Bearer ${data.accessToken}`);
      const retryResponse = await fetch(`http://localhost:3000/api/v1${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });
      return retryResponse.json();
    } else {
      setAccessToken(null);
      throw new Error('SESSION_EXPIRED');
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw data;
  }
  return data;
}
```

---

### 3. Screen-by-Screen API Mapping

| Screen / Component | User Action | Backend Endpoint | Method | Request Payload | Response / Next Step |
|---|---|---|---|---|---|
| **SignUpScreen** | Submit registration form | `/auth/register` | `POST` | `{ fullName, email, password, role: 'TRAINER' \| 'TRAINEE', organization, captchaToken }` | Redirects to `pending-approval` or `check-email` |
| **SignInScreen** | Submit login credentials | `/auth/login` | `POST` | `{ email, password, captchaToken }` | Returns `{ accessToken, user }`. Sets `refreshToken` cookie. Route by role: `admin-portal`, `trainer-portal`, `trainee-portal`, or `trainee-setup` |
| **PendingApprovalScreen** | Polling status or checking status | `/auth/me` | `GET` | Bearer token | Check `accountStatus`: `ACTIVE`, `PENDING_APPROVAL`, `REJECTED` |
| **ForgotPasswordScreen** | Submit email for reset link | `/auth/forgot-password` | `POST` | `{ email, captchaToken }` | Redirect to `check-email` |
| **ResetPasswordScreen** | Submit reset token & new password | `/auth/reset-password` | `POST` | `{ token, newPassword }` | Toast success, navigate to `login` |
| **CheckEmailScreen** | Resend verification email | `/auth/resend-verification` | `POST` | `{ email }` | Toast dispatched notice |
| **Logout Button** | Logout from active session | `/auth/logout` | `POST` | `{}` | Clears session, navigate to `login` |
| **Global Initial Load** | Check active session | `/auth/refresh` | `POST` | `{}` | If successful, restores user state silently |

---

### 4. Handling Backend Error Codes

The backend responds with uniform error formats:
```json
{
  "success": false,
  "code": "ACCOUNT_PENDING_APPROVAL",
  "message": "Your registration is currently pending administrator approval."
}
```

Map the error codes in your frontend error handlers:
- `ACCOUNT_PENDING_APPROVAL`: Redirect to `pending-approval` screen with informational notice.
- `EMAIL_NOT_VERIFIED`: Prompt user to click the verification link in their email or navigate to `check-email`.
- `ACCOUNT_REJECTED`: Display rejection message.
- `ACCOUNT_SUSPENDED`: Display account suspended alert.
- `INVALID_EMAIL_DOMAIN`: Notify user to use their official government email (`@imd.gov.in` or `@moes.gov.in`).
- `INVALID_CAPTCHA`: Refresh Cloudflare Turnstile widget and prompt the user to retry.
