import React, { useState, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Screen } from '../../types';
import { authApi } from '../../services/authApi';
import { PasswordCriteria } from '../common/PasswordCriteria';

interface ResetPasswordScreenProps {
  onNavigate: (screen: Screen) => void;
  showToast: (msg: string) => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  onNavigate,
  showToast,
}) => {
  // Pre-seed with clean state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const newPasswordId = useId();
  const confirmPasswordId = useId();

  // Check token presence on mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (!token) {
      setError('No reset token found in URL. Please use the link provided in your email.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters long according to security policy');
      return;
    }

    if (!confirmPassword) {
      setError('Please re-enter your password to confirm');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Extract token from URL query params
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setError('Missing or invalid password reset token. Please request a new link.');
        return;
      }

      await authApi.resetPassword(token, newPassword);
      showToast('Password updated successfully. Please sign in with your new password.');
      
      // Clean query parameters from URL bar
      window.history.replaceState({}, '', '/');
      onNavigate('login');
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Your reset link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto px-4">
      {/* Title block */}
      <div className="mb-7">
        <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-tight">
          Set a new password
        </h1>
        <p className="text-[15px] text-slate-500 mt-2 font-normal leading-relaxed">
          Choose a password you have not used before on this portal.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label 
            htmlFor={newPasswordId} 
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            New password
          </label>
          <div className="relative">
            <input
              id={newPasswordId}
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-10 bg-white border border-blue-600/80 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all shadow-xs"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden"
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <PasswordCriteria password={newPassword} />
        </div>

        {/* Confirm password */}
        <div>
          <label 
            htmlFor={confirmPasswordId} 
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id={confirmPasswordId}
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all shadow-xs"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#181c24] hover:bg-[#242b38] active:bg-[#12151b] text-white py-3 rounded-lg font-medium text-sm transition-all shadow-xs cursor-pointer disabled:opacity-60 flex items-center justify-center"
        >
          {isLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </div>
  );
};
