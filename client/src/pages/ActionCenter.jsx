import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  CheckCircle, 
  XCircle, 
  Bot, 
  DollarSign, 
  Clock, 
  Truck, 
  Users, 
  CheckCircle2, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import api from '../api/axiosClient';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge';

export default function ActionCenter() {
  const [pendingPlans, setPendingPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [operatorNotes, setOperatorNotes] = useState('');
  const [customCost, setCustomCost] = useState('');
  const [customHours, setCustomHours] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const fetchPlans = async () => {
    try {
      const pendingRes = await api.get('/ops/pending-plans');
      if (pendingRes.data.success) {
        setPendingPlans(pendingRes.data.plans);
        if (pendingRes.data.plans.length > 0 && !selectedPlan) {
          setSelectedPlan(pendingRes.data.plans[0]);
          setCustomCost(pendingRes.data.plans[0].estimated_cost);
          setCustomHours(pendingRes.data.plans[0].estimated_hours);
        }
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setOperatorNotes('');
    setCustomCost(plan.estimated_cost);
    setCustomHours(plan.estimated_hours);
    setFeedbackMsg('');
  };

  const handleDecision = async (decision) => {
    if (!selectedPlan) return;
    setSubmitting(true);
    setFeedbackMsg('');

    try {
      const res = await api.post(`/ops/plans/${selectedPlan.id}/decision`, {
        decision,
        notes: operatorNotes || `Authorized by operator with status ${decision}`,
        modifiedCost: customCost ? parseFloat(customCost) : undefined,
        modifiedHours: customHours ? parseFloat(customHours) : undefined
      });

      if (res.data.success) {
        setFeedbackMsg(`Plan successfully ${decision}! Dispatched to ${selectedPlan.assigned_department}.`);
        fetchPlans();
      }
    } catch (err) {
      setFeedbackMsg('Error submitting decision: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskStatus = async (taskId, newStatus) => {
    try {
      await api.post(`/ops/tasks/${taskId}/status`, {
        status: newStatus,
        notes: `Operator updated task progress to ${newStatus}`
      });
      fetchPlans();
    } catch (err) {
      alert('Task update error: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4" />
            <span>Human-In-The-Loop AI Action Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Autonomous Plan Approvals & Crew Dispatch
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 max-w-2xl">
            Review autonomous AI remediation proposals, adjust municipal resource allocations, sign off budgets, and dispatch specialized field units.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => { setLoading(true); fetchPlans(); }}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-2 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Queue</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 bg-blue-950/70 border border-blue-800 text-blue-300 text-xs rounded-2xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* ACTION CENTER WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Pending Queue List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Pending Approvals ({pendingPlans.length})
            </h3>
            <span className="text-[10px] text-amber-400 font-bold bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800">
              HITL Gate
            </span>
          </div>

          {pendingPlans.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
              <Bot className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p>No operational plans currently waiting in review queue.</p>
              <span className="text-[10px] text-slate-600 mt-1 block">Submit a complaint in Citizen Portal to generate one!</span>
            </div>
          ) : (
            pendingPlans.map(plan => (
              <div
                key={plan.id}
                onClick={() => handleSelectPlan(plan)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  selectedPlan?.id === plan.id
                    ? 'bg-slate-900 border-amber-500/80 shadow-lg shadow-amber-950/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    {plan.assigned_department}
                  </span>
                  <PriorityBadge priority={plan.cluster?.priority || 'HIGH'} />
                </div>
                <h4 className="text-xs font-bold text-white mb-1 line-clamp-1">{plan.title}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{plan.root_cause_summary}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                  <span>Est: ${plan.estimated_cost}</span>
                  <span>{plan.estimated_hours} hrs</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Plan Deep-Dive & HITL Approval Terminal (8 cols) */}
        <div className="lg:col-span-8">
          {selectedPlan ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2 text-xs text-indigo-400 font-bold mb-1">
                    <Bot className="w-4 h-4" />
                    <span>AI Autonomous Proposal</span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{selectedPlan.title}</h2>
                </div>
                <StatusBadge status={selectedPlan.operator_approval_status} />
              </div>

              {/* Root Cause Card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Root Cause Diagnosis & Impact
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">{selectedPlan.root_cause_summary}</p>
                {selectedPlan.cluster && (
                  <div className="mt-2 text-[11px] text-indigo-400 flex items-center space-x-1">
                    <span>Incident Cluster:</span>
                    <strong className="text-indigo-300">{selectedPlan.cluster.title} ({selectedPlan.cluster.complaint_count} citizen reports aggregated)</strong>
                  </div>
                )}
              </div>

              {/* Required Resources & Crews */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Required Equipment & Personnel
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedPlan.required_resources?.map((res, i) => (
                    <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center space-x-2">
                      <Truck className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="line-clamp-2">{res}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Steps / Tasks */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Ordered Task Execution Plan
                </span>
                <div className="space-y-2.5">
                  {selectedPlan.tasks && selectedPlan.tasks.length > 0 ? (
                    selectedPlan.tasks.map((t, idx) => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center space-x-3">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <h5 className="font-bold text-slate-200">{t.title}</h5>
                            <p className="text-[11px] text-slate-400">{t.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <StatusBadge status={t.status} />
                          {t.status !== 'completed' && (
                            <button
                              onClick={() => handleTaskStatus(t.id, t.status === 'pending' ? 'in_progress' : 'completed')}
                              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded transition"
                            >
                              {t.status === 'pending' ? 'Start Task' : 'Mark Done'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    selectedPlan.steps?.map((s, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        <div className="font-bold text-slate-200">{s.step_number || idx + 1}. {s.title}</div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{s.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Operator Budget & Duration Signoff Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Authorized Budget ($ USD)
                  </label>
                  <input
                    type="number"
                    value={customCost}
                    onChange={(e) => setCustomCost(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Estimated Time (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Operator Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Operator Dispatch Directives / Notes
                </label>
                <textarea
                  rows="2"
                  value={operatorNotes}
                  onChange={(e) => setOperatorNotes(e.target.value)}
                  placeholder="Optional municipal notes (e.g., Prioritize heavy vac truck before rush hour)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Signoff Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision('rejected')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-red-300 bg-red-950/60 hover:bg-red-900 border border-red-800 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Proposal</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision('approved')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition shadow-lg shadow-amber-950/40 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Approve & Authorize Crew Dispatch</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
              Select an operational plan on the left to inspect and approve.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
