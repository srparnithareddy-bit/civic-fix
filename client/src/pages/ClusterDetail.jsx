import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layers, Bot, ArrowLeft, Users, Clock } from 'lucide-react';
import api from '../api/axiosClient';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge';
import AuditLogTimeline from '../components/AuditLogTimeline';

export default function ClusterDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/clusters/${id}`)
      .then(res => {
        if (res.data.success) {
          setData(res.data);
        }
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to fetch cluster details');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 text-xs">
        Loading cluster root cause data...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-red-400 text-sm mb-4">{error || 'Cluster not found'}</div>
        <Link to="/admin" className="text-xs text-blue-400 underline">Back to Operations Dashboard</Link>
      </div>
    );
  }

  const { cluster, complaints, plan, tasks, auditLogs } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Back Link */}
      <Link to="/admin" className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-white transition">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Operations Dashboard</span>
      </Link>

      {/* Cluster Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                Root-Cause Incident Cluster ({cluster.complaint_count} Reports Linked)
              </span>
              <h1 className="text-xl font-extrabold text-white">{cluster.title}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <PriorityBadge priority={cluster.priority} />
            <StatusBadge status={cluster.status} />
          </div>
        </div>

        {/* AI Root Cause Synthesis */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold mb-1">
            <Bot className="w-4 h-4" />
            <span>AI Root-Cause Synthesis</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">{cluster.root_cause}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-500 block">Department</span>
            <strong className="text-slate-200">{cluster.department}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Radius</span>
            <strong className="text-slate-200">{cluster.radius_meters || 400}m</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Coordinates</span>
            <strong className="text-slate-200 font-mono">{cluster.latitude.toFixed(4)}, {cluster.longitude.toFixed(4)}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Formed On</span>
            <strong className="text-slate-200">{new Date(cluster.created_at).toLocaleDateString()}</strong>
          </div>
        </div>
      </div>

      {/* Linked Complaints and Plan Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Linked Complaints (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span>Linked Citizen Complaints ({complaints.length})</span>
          </h3>

          <div className="space-y-3">
            {complaints.map(c => (
              <div key={c.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded">
                    {c.tracking_id}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
                <h4 className="text-xs font-bold text-slate-200 mb-1">{c.title}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{c.description}</p>
                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                  <span>Reported by: {c.citizen_name || 'Anonymous'}</span>
                  <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log / Operational Plan (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Agent Operations Audit Trace</span>
          </h3>
          <AuditLogTimeline logs={auditLogs || []} />
        </div>

      </div>

    </div>
  );
}
