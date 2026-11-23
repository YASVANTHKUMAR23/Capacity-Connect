import React, { useState, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Screen, UserAccount, UserRole } from '../../types';
import { authApi } from '../../services/authApi';
import { TurnstileWidget } from '../common/TurnstileWidget';
import { PasswordCriteria } from '../common/PasswordCriteria';
import { TermsModal } from '../common/TermsModal';

interface SignUpScreenProps {
  onNavigate: (screen: Screen) => void;
  setCurrentUser: (user: UserAccount | null) => void;
  showToast: (msg: string) => void;
  setVerificationEmail?: (email: string) => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onNavigate,
  setCurrentUser,
  showToast,
  setVerificationEmail,
}) => {
  const [role, setRole] = useState<UserRole>('trainee');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('1x00000000000000000000AA');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTurnstileVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide your full name');
      return;
    }
    if (!email.trim()) {
      setError('Please provide your official work email address');
      return;
    }
    if (!password || password.length < 12) {
      setError('Password must be at least 12 characters long according to security policy');
      return;
    }
    if (!agreeTerms) {
      setError('Please agree to the terms of use and privacy policy');
      return;
    }

    setIsLoading(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      
      // Real backend registration
      await authApi.register({
        fullName,
        email: email.trim(),
        password,
        role: role.toUpperCase() as 'TRAINER' | 'TRAINEE',
        organization: organization.trim() || 'India Meteorological Department',
        captchaToken,
      });

      if (setVerificationEmail) {
        setVerificationEmail(email.trim());
      }

      showToast('Registration successful! Please check your email for the 6-digit OTP code.');
      onNavigate('verify-otp');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto px-4">
      {/* Title block */}
      <div className="mb-6">
        <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-tight">
          Create your account
        </h1>
        <p className="text-[15px] text-slate-500 mt-2 font-normal leading-relaxed">
          Choose your role. An official IMD email (@imd.gov.in) is required for registration.
        </p>
      </div>

      {/* Role Segmented Control */}
      <div className="bg-[#eceef1] p-1 rounded-lg flex mb-6">
        <button
          type="button"
          onClick={() => setRole('trainee')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
            role === 'trainee'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Trainee
        </button>
        <button
          type="button"
          onClick={() => setRole('trainer')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
            role === 'trainer'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Trainer
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name inputs */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label 
              htmlFor="firstName" 
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              First name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Asha"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all shadow-xs"
            />
          </div>
          <div className="flex-1">
            <label 
              htmlFor="lastName" 
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Verma"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label 
            htmlFor="signupEmail" 
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Official IMD Email
          </label>
          <input
            id="signupEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="officer@imd.gov.in"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all shadow-xs"
          />
        </div>

        {/* Organization / Division */}
        <div>
          <label 
            htmlFor="organization" 
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Station / Division (Optional)
          </label>
          <input
            id="organization"
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. Regional Meteorological Centre"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all shadow-xs"
          />
        </div>

        {/* Password */}
        <div>
          <label 
            htmlFor="signupPassword" 
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Password (min 12 characters)
          </label>
          <div className="relative">
            <input
              id="signupPassword"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 12 characters"
              className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all shadow-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <PasswordCriteria password={password} />
        </div>

        {/* Terms checkbox with modal link */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-slate-900 bg-white border-slate-300 focus:ring-slate-900 focus:ring-offset-0 accent-slate-900 cursor-pointer"
            />
            <span className="text-sm text-slate-600 leading-snug">
              I agree to the{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsTermsOpen(true);
                }}
                className="underline text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                terms of use
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsTermsOpen(true);
                }}
                className="underline text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                privacy policy
              </button>
            </span>
          </label>
        </div>

        {/* Cloudflare Turnstile Captcha Widget */}
        <TurnstileWidget onVerify={handleTurnstileVerify} />

        {/* Create account button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#181c24] hover:bg-[#242b38] active:bg-[#12151b] text-white py-3 rounded-lg font-medium text-sm transition-all shadow-xs cursor-pointer disabled:opacity-60 flex items-center justify-center"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Create account'
            )}
          </button>
        </div>
      </form>

      {/* Footer link */}
      <div className="text-center mt-7 text-sm text-slate-600 font-normal">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="text-blue-600 hover:text-blue-700 font-medium hover:underline focus:outline-hidden transition-colors"
        >
          Sign in
        </button>
      </div>
      {/* Terms and Conditions Modal */}
      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        onAccept={() => setAgreeTerms(true)}
      />
    </div>
  );
};
