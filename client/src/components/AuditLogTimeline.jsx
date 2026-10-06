import React from 'react';
import { Bot, UserCheck, ShieldAlert, CheckCircle, RefreshCw, Clock } from 'lucide-react';

export default function AuditLogTimeline({ logs = [] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
        No autonomous audit logs recorded yet.
      </div>
    );
  }

  const getIcon = (actorType, action) => {
    if (action.includes('REOPEN') || action.includes('FAILED')) {
      return <RefreshCw className="w-4 h-4 text-rose-400" />;
    }
    if (actorType === 'AGENT') {
      return <Bot className="w-4 h-4 text-cyan-400" />;
    }
    if (actorType === 'OPERATOR') {
      return <UserCheck className="w-4 h-4 text-amber-400" />;
    }
    return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="relative pl-6 pb-4 border-l border-slate-800 last:pb-0">
          {/* Timeline node */}
          <div className="absolute -left-[13px] top-0.5 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
            {getIcon(log.actor_type, log.action)}
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  {log.action.replace(/_/g, ' ')}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  log.actor_type === 'AGENT'
                    ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800'
                    : log.actor_type === 'OPERATOR'
                    ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                }`}>
                  {log.actor_id || log.actor_type}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>

            {log.reasoning && (
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60 mb-2">
                {log.reasoning}
              </p>
            )}

            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 font-mono overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
