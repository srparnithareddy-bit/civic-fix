import React from 'react';

export function PriorityBadge({ priority }) {
  const p = (priority || 'MEDIUM').toUpperCase();
  const styles = {
    CRITICAL: 'bg-red-950/80 text-red-400 border-red-800/80 shadow-sm shadow-red-950',
    HIGH: 'bg-amber-950/80 text-amber-400 border-amber-800/80 shadow-sm shadow-amber-950',
    MEDIUM: 'bg-blue-950/80 text-blue-400 border-blue-800/80 shadow-sm shadow-blue-950',
    LOW: 'bg-slate-800/80 text-slate-300 border-slate-700'
  };

  const dots = {
    CRITICAL: 'bg-red-500 animate-ping',
    HIGH: 'bg-amber-500',
    MEDIUM: 'bg-blue-500',
    LOW: 'bg-slate-400'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[p] || styles.MEDIUM}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[p] || dots.MEDIUM}`}></span>
      {p}
    </span>
  );
}

export function StatusBadge({ status }) {
  const s = (status || 'submitted').toLowerCase();
  
  const statusConfig = {
    submitted: { label: 'Submitted', color: 'bg-slate-800 text-slate-300 border-slate-700' },
    triaged: { label: 'Triaged (AI)', color: 'bg-purple-950/70 text-purple-300 border-purple-800' },
    clustered: { label: 'Clustered', color: 'bg-indigo-950/70 text-indigo-300 border-indigo-800' },
    planned: { label: 'Plan Ready', color: 'bg-cyan-950/70 text-cyan-300 border-cyan-800' },
    in_progress: { label: 'In Progress', color: 'bg-amber-950/70 text-amber-300 border-amber-700' },
    resolved: { label: 'Resolved (Pending Verification)', color: 'bg-emerald-950/70 text-emerald-300 border-emerald-700' },
    verified: { label: 'Closed & Verified', color: 'bg-emerald-900 text-emerald-200 border-emerald-600' },
    reopened: { label: 'Re-opened (Escalated)', color: 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse' },
    active: { label: 'Active', color: 'bg-blue-950 text-blue-300 border-blue-800' },
    pending_review: { label: 'Awaiting Operator Approval', color: 'bg-amber-950/90 text-amber-300 border-amber-600 font-medium' },
    approved: { label: 'Approved & Dispatched', color: 'bg-emerald-950 text-emerald-300 border-emerald-700' },
    rejected: { label: 'Rejected', color: 'bg-red-950 text-red-300 border-red-800' },
    completed: { label: 'Completed', color: 'bg-emerald-950 text-emerald-300 border-emerald-700' },
    pending: { label: 'Pending', color: 'bg-slate-800 text-slate-400 border-slate-700' }
  };

  const config = statusConfig[s] || { label: status, color: 'bg-slate-800 text-slate-300 border-slate-700' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}
