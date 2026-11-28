import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { Screen, UserAccount } from '../../types';
import { authApi } from '../../services/authApi';

interface VerifyOtpScreenProps {
  email: string;
  onNavigate: (screen: Screen) => void;
  setCurrentUser: (user: UserAccount | null) => void;
  showToast: (msg: string) => void;
}

export const VerifyOtpScreen: React.FC<VerifyOtpScreenProps> = ({
  email,
  onNavigate,
  setCurrentUser,
  showToast,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const displayEmail = email || 'your official email';

  // 60-Second Cooldown Timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric inputs
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // Handle single digit
    const char = cleanVal.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);

    // Auto-advance cursor
    if (index < 5 && char) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasted[i] || '';
    }
    setDigits(nextDigits);

    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const otpCode = digits.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.verifyOtp(email, otpCode);
      showToast(res.message || 'Email verified successfully! Awaiting administrator approval.');

      // Update current user account status to verified & pending approval
      setCurrentUser({
        firstName: 'Officer',
        lastName: 'IMD',
        email,
        organization: 'India Meteorological Department',
        role: 'trainee',
        status: 'pending',
        submittedDate: 'Today',
      });

      onNavigate('pending-approval');
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please check your OTP and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      const res = await authApi.resendOtp(email);
      showToast(res.message || 'New 6-digit OTP sent to your email.');
      setCooldownSeconds(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto px-4">
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl border border-blue-100 bg-blue-50/70 flex items-center justify-center text-blue-600 shadow-xs mb-6">
        <ShieldCheck className="w-6 h-6 stroke-[1.8]" />
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-[30px] font-bold text-slate-900 tracking-tight leading-tight">
          Verify your email
        </h1>
        <p className="text-[14px] text-slate-500 mt-2 font-normal leading-relaxed">
          We have sent a 6-digit One-Time Password (OTP) to{' '}
          <span className="font-semibold text-slate-800 break-all">{displayEmail}</span>. The code expires in 10 minutes.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* OTP Inputs Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
            6-Digit Verification Code
          </label>
          <div className="flex gap-2 justify-between" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-13 text-center text-xl font-bold text-slate-900 bg-white border border-slate-300 rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all"
              />
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || digits.join('').length !== 6}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Verifying Code...
            </>
          ) : (
            'Verify & Continue'
          )}
        </button>

        {/* Resend Cooldown Section */}
        <div className="text-center pt-2">
          {cooldownSeconds > 0 ? (
            <p className="text-xs text-slate-500">
              Resend available in <span className="font-semibold text-slate-700">{cooldownSeconds}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isResending}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              {isResending ? 'Sending...' : 'Did not receive code? Resend OTP'}
            </button>
          )}
        </div>

        {/* Return to Sign in */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center">
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign in
          </button>
        </div>
      </form>
    </div>
  );
};
