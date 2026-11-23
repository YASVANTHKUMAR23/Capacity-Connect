import React from 'react';
import { ShieldCheck, X, FileText, Check } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 id="terms-modal-title" className="text-base font-bold text-white leading-tight">
                Terms of Use & Privacy Policy
              </h2>
              <p className="text-[11px] text-slate-400">
                India Meteorological Department (MoES) Portal Guidelines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100/80 flex items-start gap-2.5 text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-normal">
              <strong>Official Institutional Access:</strong> Capacity Connect is restricted to authorized personnel of the India Meteorological Department and Ministry of Earth Sciences.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-1">1. User Accountability & Credentials</h3>
            <p>
              Users are strictly responsible for maintaining the confidentiality of their portal credentials. Sharing accounts, passwords, or session tokens is strictly prohibited under government IT security frameworks.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-1">2. Data Integrity & Scientific Forecasting</h3>
            <p>
              All training resources, meteorological datasets, radar assessments, and models accessed through this platform remain the intellectual property of MoES/IMD. Trainees and trainers must utilize data solely for official capacity building and institutional research.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-1">3. Administrative Oversight & Audit Logging</h3>
            <p>
              In compliance with national cybersecurity standards, all authentication attempts, session creations, IP addresses, and assessment submissions are logged in an immutable audit repository.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-1">4. Privacy Policy</h3>
            <p>
              Personal details (name, official email, station designation, qualifications) are utilized solely to tailor competency matrices, generate official certifications, and verify administrative approvals.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onAccept();
              onClose();
            }}
            className="px-4.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>I Understand & Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
