import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  AlertTriangle, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Filter, 
  RefreshCw, 
  ShieldAlert, 
  Zap, 
  ArrowUpRight,
  MapPin,
  Trash2
} from 'lucide-react';
import api from '../api/axiosClient';
import LeafletMap from '../components/LeafletMap';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge';

export default function OperationsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('ACTIVE');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const fetchData = async () => {
    try {
      const [mRes, cRes, clRes] = await Promise.all([
        api.get('/ops/metrics'),
        api.get('/complaints'),
        api.get('/clusters')
      ]);

      if (mRes.data.success) setMetrics(mRes.data.metrics);
      if (cRes.data.success) setComplaints(cRes.data.complaints);
      if (clRes.data.success) setClusters(clRes.data.clusters);
    } catch (err) {
      console.error('Ops fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCompleteAndRemove = async (complaintId, title) => {
    if (!window.confirm(`Mark work complete and remove "${title}" from the active queue? Citizen portal will show Work Done.`)) {
      return;
    }
    try {
      await api.post(`/ops/complaints/${complaintId}/complete-and-remove`, {
        notes: 'Operator verified work completed on site and cleared ticket from operational queue.'
      });
      fetchData();
    } catch (err) {
      alert('Failed to update ticket: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteComplaint = async (complaintId, title) => {
    if (!window.confirm(`Delete "${title}" from active operations queue? This will mark the incident as Work Done for the citizen.`)) {
      return;
    }
    try {
      await api.delete(`/ops/complaints/${complaintId}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete ticket: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const isDone = c.status === 'resolved' || c.status === 'verified' || c.status === 'completed' || c.work_completed;
    if (selectedFilter === 'ACTIVE') return !isDone;
    if (selectedFilter === 'CRITICAL') return c.priority === 'CRITICAL' && !isDone;
    if (selectedFilter === 'DONE') return isDone;
    if (selectedFilter === 'REOPENED') return c.status === 'reopened';
    return true; // 'ALL'
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Mission Control & Autonomous Triage</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Municipal Operations Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Real-time geospatial monitoring, root-cause clustering, and SLA breach control.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh Stream</span>
          </button>

          <Link
            to="/admin/action-center"
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-amber-900/30 flex items-center space-x-2 transition"
          >
            <Zap className="w-4 h-4" />
            <span>AI Action Center</span>
            {metrics?.pendingApprovals > 0 && (
              <span className="bg-white text-amber-950 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {metrics.pendingApprovals}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Total Reports */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Reports</span>
          <div className="text-2xl font-black text-white">{metrics ? metrics.totalComplaints : '0'}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">Live citizen intake</span>
        </div>

        {/* Active Clusters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Root Clusters</span>
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics ? metrics.activeClusters : '0'}</div>
          <span className="text-[10px] text-indigo-300 mt-1 block">Multi-report nodes</span>
        </div>

        {/* Critical Hazards */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Critical Priority</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400">{metrics ? metrics.criticalIncidents : '0'}</div>
          <span className="text-[10px] text-red-300 mt-1 block">Immediate safety risks</span>
        </div>

        {/* SLA Breaches */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">SLA Breaches</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{metrics ? metrics.slaBreaches : '0'}</div>
          <span className="text-[10px] text-amber-300 mt-1 block">Past target time</span>
        </div>

        {/* Pending Approvals */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">HITL Approvals</span>
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">{metrics ? metrics.pendingApprovals : '0'}</div>
          <span className="text-[10px] text-cyan-300 mt-1 block">Awaiting signoff</span>
        </div>

        {/* Reopened Verifications */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Re-Opened</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{metrics ? metrics.reopenedVerifications : '0'}</div>
          <span className="text-[10px] text-rose-300 mt-1 block">Closed-loop fails</span>
        </div>

      </div>

      {/* MAP & INCIDENT FEED GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Geospatial Map (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Geospatial Root-Cause Cluster Map</h3>
            </div>
            <span className="text-[11px] text-slate-400">Click pins for details</span>
          </div>

          <LeafletMap
            complaints={complaints}
            clusters={clusters}
            height="440px"
            onSelectComplaint={(c) => setSelectedComplaint(c)}
          />

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span>🔵 Single Incident Pins</span>
            <span>🟣 Dashed Circles = Root-Cause Cluster Radius</span>
            <span>🔴 Pulsing Pin = Critical Public Hazard</span>
          </div>
        </div>

        {/* Complaints Stream (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          
          {/* Filter Bar */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>Incoming Queue ({filteredComplaints.length})</span>
            </h3>

            <div className="flex items-center space-x-1 flex-wrap gap-1">
              {[
                { key: 'ACTIVE', label: 'Active Queue' },
                { key: 'ALL', label: 'All' },
                { key: 'CRITICAL', label: 'Critical' },
                { key: 'DONE', label: 'Work Done' },
                { key: 'REOPENED', label: 'Reopened' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setSelectedFilter(f.key)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    selectedFilter === f.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
            {filteredComplaints.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                {selectedFilter === 'ACTIVE' ? 'Active queue is all clear! No outstanding incidents.' : 'No complaints match filter.'}
              </div>
            ) : (
              filteredComplaints.map(comp => (
                <div 
                  key={comp.id} 
                  className={`bg-slate-950/80 p-4 rounded-xl border transition hover:border-slate-700 ${
                    selectedComplaint?.id === comp.id ? 'border-blue-500 shadow-md shadow-blue-950' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-900">
                      {comp.tracking_id}
                    </span>
                    <div className="flex items-center space-x-2">
                      <PriorityBadge priority={comp.priority} />
                      <StatusBadge status={comp.status} />
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-white mb-1 line-clamp-1">{comp.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">{comp.description}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                    <span className="text-slate-500 font-medium">{comp.category}</span>
                    <div className="flex items-center space-x-1.5">
                      {!(comp.status === 'resolved' || comp.status === 'verified' || comp.status === 'completed' || comp.work_completed) ? (
                        <>
                          <button
                            onClick={() => handleCompleteAndRemove(comp.id, comp.title)}
                            title="Mark work done and remove from active operational queue"
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-lg transition flex items-center space-x-1 shadow-sm shadow-emerald-950"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Work Done</span>
                          </button>
                          <button
                            onClick={() => handleDeleteComplaint(comp.id, comp.title)}
                            title="Delete from portal (marks work completed for citizen)"
                            className="text-[10px] bg-red-950/70 hover:bg-red-900 text-red-300 hover:text-white border border-red-800/80 px-2 py-1 rounded-lg transition flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                            <span>Delete</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
                          ✅ Work Done
                        </span>
                      )}
                      <Link
                        to={`/clusters/${comp.cluster_id}`}
                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center space-x-0.5 font-semibold ml-1"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
