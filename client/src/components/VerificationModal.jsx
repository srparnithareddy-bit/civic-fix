import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import api from '../api/axiosClient';

export default function VerificationModal({ complaint, isOpen, onClose, onVerified }) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !complaint) return null;

  const handleDecision = async (isFixed) => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.post(`/complaints/${complaint.id}/verify`, {
        isFixed,
        feedbackNotes: feedback.trim() || (isFixed ? 'Citizen confirmed resolution.' : 'Issue persists on site.')
      });

      if (res.data.success) {
        if (onVerified) {
          onVerified(res.data);
        }
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Closed-Loop Verification</h3>
            <p className="text-xs text-slate-400">Tracking Code: <span className="font-mono text-blue-400 font-semibold">{complaint.tracking_id}</span></p>
          </div>
        </div>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-4">
          <p className="text-xs font-semibold text-slate-300 mb-1">{complaint.title}</p>
          <p className="text-xs text-slate-400 line-clamp-2">{complaint.description}</p>
        </div>

        <p className="text-sm text-slate-300 mb-3">
          Municipal field operations reported this issue as resolved. Can you verify if the problem is physically fixed on site?
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Additional Observations / Feedback (Optional)
          </label>
          <textarea
            rows="3"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g., Road was paved smoothly OR Water is still leaking from the sidewalk joint..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-600 transition"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDecision(false)}
            className="flex items-center justify-center space-x-2 bg-rose-950/70 hover:bg-rose-900 border border-rose-700/80 text-rose-200 font-semibold px-4 py-2.5 rounded-xl text-xs transition disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>No, Still Broken (Reopen)</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDecision(true)}
            className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Yes, Confirmed Fixed</span>
          </button>
        </div>

      </div>
    </div>
  );
}
