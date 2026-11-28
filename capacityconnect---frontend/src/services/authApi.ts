// Centralized Authentication API Service for Capacity Connect

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

let inMemoryAccessToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem('cc_access_token') : null;

// Single in-flight refresh promise mutex to deduplicate concurrent refresh calls
let activeRefreshTokenPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('cc_access_token', token);
    } else {
      localStorage.removeItem('cc_access_token');
    }
  }
};

export const getAccessToken = () => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('cc_access_token');
    if (stored) {
      inMemoryAccessToken = stored;
      return stored;
    }
  }
  return null;
};

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  accessToken?: string;
  user?: any;
}

export async function authFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Includes HttpOnly refresh cookie
    });
  } catch (networkError) {
    throw {
      success: false,
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to Capacity Connect backend. Please ensure the server is running.',
    };
  }

  // Automatic silent refresh on 401 Unauthorized for protected endpoints
  if (response.status === 401 && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/refresh')) {
    try {
      if (!activeRefreshTokenPromise) {
        activeRefreshTokenPromise = (async () => {
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData.accessToken) {
                setAccessToken(refreshData.accessToken);
                return refreshData.accessToken;
              }
            }
            // Refresh failed (cookie expired, revoked, or token reuse detected)
            // Immediately purge access token so we NEVER retry with dead credentials
            setAccessToken(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('cc_active_screen');
              window.dispatchEvent(new Event('cc_session_expired'));
            }
            return null;
          } catch {
            setAccessToken(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('cc_active_screen');
              window.dispatchEvent(new Event('cc_session_expired'));
            }
            return null;
          } finally {
            activeRefreshTokenPromise = null;
          }
        })();
      }

      const newAccessToken = await activeRefreshTokenPromise;
      if (newAccessToken) {
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        const retryRes = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
        const retryData = await retryRes.json().catch(() => ({}));
        if (!retryRes.ok) throw retryData;
        return retryData;
      }
    } catch (e) {
      setAccessToken(null);
      throw e;
    }
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw result;
  }
  return result;
}

export const authApi = {
  // 1. Registration
  async register(data: {
    fullName: string;
    email: string;
    password: string;
    role: 'TRAINER' | 'TRAINEE';
    organization?: string;
    captchaToken?: string;
  }) {
    return authFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        captchaToken: data.captchaToken || '1x00000000000000000000AA',
      }),
    });
  },

  // 2. 6-Digit Email OTP Verification
  async verifyOtp(email: string, otp: string) {
    return authFetch('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
    });
  },

  // 3. Resend OTP
  async resendOtp(email: string) {
    return authFetch('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
  },

  // 4. Login (Admin, Trainer, Trainee)
  async login(credentials: { email: string; password: string; captchaToken?: string }) {
    const res = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
        captchaToken: credentials.captchaToken || '1x00000000000000000000AA',
      }),
    });

    if (res.accessToken) {
      setAccessToken(res.accessToken);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cc_auth_login', { detail: { user: res.user } }));
      }
    }
    return res;
  },

  // 5. Logout
  async logout() {
    try {
      await authFetch('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } finally {
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cc_active_screen');
        localStorage.removeItem('cc_active_admin_tab');
        localStorage.removeItem('cc_active_trainer_tab');
        localStorage.removeItem('cc_active_trainee_tab');
        window.dispatchEvent(new Event('cc_auth_logout'));
      }
    }
  },

  // 6. Current Authenticated User
  async getMe() {
    return authFetch('/auth/me', { method: 'GET' });
  },

  // 7. Password Recovery
  async forgotPassword(email: string, captchaToken?: string) {
    return authFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim(),
        captchaToken: captchaToken || '1x00000000000000000000AA',
      }),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    return authFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },
};
