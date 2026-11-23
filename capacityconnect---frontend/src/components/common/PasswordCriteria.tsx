import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordCriteriaProps {
  password: string;
}

export const PasswordCriteria: React.FC<PasswordCriteriaProps> = ({ password }) => {
  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const criteriaCount = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  // Strength label & color
  let strengthLabel = 'Very Weak';
  let strengthColor = 'bg-rose-500';
  let textColor = 'text-rose-600';

  if (criteriaCount >= 5) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-500';
    textColor = 'text-emerald-600';
  } else if (criteriaCount >= 4) {
    strengthLabel = 'Good';
    strengthColor = 'bg-blue-500';
    textColor = 'text-blue-600';
  } else if (criteriaCount >= 3) {
    strengthLabel = 'Fair';
    strengthColor = 'bg-amber-500';
    textColor = 'text-amber-600';
  }

  const items = [
    { label: 'At least 12 characters', met: hasMinLength },
    { label: 'Uppercase letter (A-Z)', met: hasUpper },
    { label: 'Lowercase letter (a-z)', met: hasLower },
    { label: 'Number (0-9)', met: hasNumber },
    { label: 'Special symbol (!@#$%^&*)', met: hasSpecial },
  ];

  if (!password) return null;

  return (
    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Password strength:</span>
        <span className={`font-semibold ${textColor}`}>{strengthLabel}</span>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              criteriaCount >= step ? strengthColor : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-[11px]">
            {item.met ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            )}
            <span className={item.met ? 'text-slate-700 font-medium' : 'text-slate-400'}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
