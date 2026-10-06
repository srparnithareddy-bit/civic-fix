import React, { useState, useEffect } from 'react';
import { 
  Send, 
  MapPin, 
  Camera, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Bot, 
  Layers, 
  Clock, 
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Compass
} from 'lucide-react';
import api from '../api/axiosClient';
import LeafletMap from '../components/LeafletMap';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge';
import AuditLogTimeline from '../components/AuditLogTimeline';
import VerificationModal from '../components/VerificationModal';

const CATEGORIES = [
  'Water & Sewage Management',
  'Public Works & Roads',
  'Power & Grid Operations',
  'Sanitation & Waste',
  'Public Safety & Traffic'
];

export default function CitizenPortal() {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'track'
  
  // Submission Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState({ latitude: 37.7749, longitude: -122.4194 });
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [mediaPreview, setMediaPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Tracking Search State
  const [trackingSearch, setTrackingSearch] = useState('');
  const [trackedData, setTrackedData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        () => {}
      );
    }
  }, []);

  const handleMapLocationSelect = (lat, lng) => {
    setCoords({ latitude: lat, longitude: lng });
    setAddress(`Pinned Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  const handleImageSimulation = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(null);

    try {
      const payload = {
        title,
        category,
        description,
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: address || `Lat: ${coords.latitude.toFixed(4)}, Lng: ${coords.longitude.toFixed(4)}`,
        citizen_name: citizenName || 'Anonymous Citizen',
        citizen_phone: citizenPhone || null,
        media_url: mediaPreview
      };

      const res = await api.post('/complaints', payload);
      if (res.data.success) {
        setSubmitSuccess(res.data);
        setTitle('');
        setDescription('');
        setMediaPreview(null);
        setTrackingSearch(res.data.complaint.tracking_id);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit report. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchTracking = async (e) => {
    if (e) e.preventDefault();
    if (!trackingSearch.trim()) return;

    setTrackingLoading(true);
    setTrackingError('');
    setTrackedData(null);

    try {
      const res = await api.get(`/complaints/track/${trackingSearch.trim()}`);
      if (res.data.success) {
        setTrackedData(res.data);
      }
    } catch (err) {
      setTrackingError(err.response?.data?.error || 'Complaint not found. Please verify tracking ID.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header Banner */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div>
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Autonomous Civic Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Report Civic Issues. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Watch Autonomous AI Coordinate the Fix.</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Citizens report problems. CivicFix uses autonomous AI agents to triage hazards, aggregate root causes, coordinate city crews, and follow up with closed-loop verification.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                activeTab === 'submit'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </button>
            <button
              onClick={() => setActiveTab('track')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                activeTab === 'track'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Live Tracking</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: SUBMIT REPORT */}
      {activeTab === 'submit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Submission Form (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>New Incident Report</span>
            </h2>

            {submitSuccess && (
              <div className="mb-6 p-4 bg-emerald-950/70 border border-emerald-800 rounded-xl">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm mb-1">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Report Autonomously Triaged & Submitted!</span>
                </div>
                <p className="text-xs text-slate-300 mb-2">
                  Tracking ID: <strong className="text-white font-mono bg-emerald-900/80 px-2 py-0.5 rounded">{submitSuccess.complaint.tracking_id}</strong>
                </p>
                <div className="text-xs text-slate-400 space-y-1 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                  <div>🤖 <strong>AI Triage:</strong> Assigned <strong className="text-amber-400">{submitSuccess.complaint.priority}</strong> priority</div>
                  <div>🔗 <strong>Root-Cause Cluster:</strong> {submitSuccess.cluster?.title || 'Stand-alone incident'}</div>
                  <div>📋 <strong>Action Plan:</strong> {submitSuccess.plan?.title || 'Formulating tactical response...'}</div>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('track');
                    handleSearchTracking();
                  }}
                  className="mt-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3.5 py-1.5 rounded-lg flex items-center space-x-1 transition shadow-md shadow-emerald-950"
                >
                  <span>Track Live Autonomous Execution</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {submitError && (
              <div className="mb-6 p-4 bg-red-950/70 border border-red-800 rounded-xl text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Major Water Main Bursting onto Street"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Street Address / Landmark</label>
                  <input
                    type="text"
                    placeholder="e.g. Corner of 4th & Market St"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Detailed Description *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Describe what you see, any immediate danger or hazards, flooding levels, or traffic blockage..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Photo Upload Simulation */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Attach Photo / Evidence</label>
                <div className="flex items-center space-x-3">
                  <label className="cursor-pointer bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center space-x-2 transition">
                    <Camera className="w-4 h-4 text-blue-400" />
                    <span>Upload or Take Photo</span>
                    <input type="file" accept="image/*" onChange={handleImageSimulation} className="hidden" />
                  </label>
                  {mediaPreview && (
                    <div className="relative">
                      <img src={mediaPreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-700" />
                      <button
                        type="button"
                        onClick={() => setMediaPreview(null)}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Citizen Contact (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Your Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Rivera"
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Phone for Status SMS (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 555-0199"
                    value={citizenPhone}
                    onChange={(e) => setCitizenPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Bot className="w-5 h-5 animate-spin" />
                    <span>Autonomous AI Agents Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Submit & Trigger Autonomous Agent Ops</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Location Map Pin Drop (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>Pin Incident Location</span>
                </h3>
                <span className="text-[11px] text-slate-400">Click map to adjust pin</span>
              </div>
              <p className="text-xs text-slate-400 mb-3 font-mono">
                Current Pin: <strong className="text-emerald-400">{coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</strong>
              </p>

              <LeafletMap
                center={[coords.latitude, coords.longitude]}
                zoom={14}
                selectedPoint={coords}
                onLocationSelect={handleMapLocationSelect}
                height="320px"
              />
            </div>

            <div className="mt-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center space-x-2 text-blue-400 font-semibold">
                <Layers className="w-4 h-4" />
                <span>Geospatial AI Clustering Active</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                If other citizens within 400m report related symptoms, our Root-Cause Cluster Agent will dynamically correlate them into a single high-priority municipal intervention.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: LIVE TRACKING & CLOSED-LOOP VERIFICATION */}
      {activeTab === 'track' && (
        <div className="space-y-6">
          
          {/* Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <form onSubmit={handleSearchTracking} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
                <input
                  type="text"
                  placeholder="Enter Tracking Code (e.g. CVX-937320)"
                  value={trackingSearch}
                  onChange={(e) => setTrackingSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 uppercase font-mono tracking-wider focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={trackingLoading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {trackingLoading ? <span>Searching...</span> : <span>Track Ticket</span>}
              </button>
            </form>

            {trackingError && (
              <div className="mt-4 p-3.5 bg-red-950/70 border border-red-800 text-red-300 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{trackingError}</span>
              </div>
            )}
          </div>

          {/* Tracked Ticket Details */}
          {trackedData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Main Ticket Status (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Header Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                    <div className="flex items-center space-x-3">
                      <span className="text-base font-mono font-extrabold bg-blue-950 text-blue-400 border border-blue-800 px-3 py-1 rounded-xl">
                        {trackedData.complaint.tracking_id}
                      </span>
                      <PriorityBadge priority={trackedData.complaint.priority} />
                    </div>
                    <StatusBadge status={trackedData.complaint.status} />
                  </div>

                  <h2 className="text-xl font-bold text-white mb-2">{trackedData.complaint.title}</h2>
                  <p className="text-sm text-slate-300 mb-4">{trackedData.complaint.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Category</span>
                      <strong className="text-slate-200">{trackedData.complaint.category}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Reported On</span>
                      <strong className="text-slate-200">{new Date(trackedData.complaint.created_at).toLocaleDateString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">SLA Target</span>
                      <strong className="text-amber-400">
                        {trackedData.complaint.sla_deadline ? new Date(trackedData.complaint.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Standard 24h'}
                      </strong>
                    </div>
                  </div>

                  {/* Verification Banner */}
                  {['resolved', 'in_progress', 'reopened'].includes(trackedData.complaint.status) && (
                    <div className="mt-5 p-4 bg-gradient-to-r from-emerald-950/60 to-blue-950/60 border border-emerald-800/80 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Closed-Loop Verification Ready</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Verify if the problem was satisfactorily repaired on site.
                        </p>
                      </div>
                      <button
                        onClick={() => setVerifyModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition shrink-0 shadow-lg shadow-emerald-900/40"
                      >
                        Verify Resolution
                      </button>
                    </div>
                  )}

                  {trackedData.complaint.status === 'reopened' && (
                    <div className="mt-5 p-4 bg-rose-950/80 border border-rose-800 rounded-xl">
                      <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span>Closed-Loop Escalation Active</span>
                      </div>
                      <p className="text-xs text-rose-200 mt-1">
                        Citizen rejected previous repair. Ticket was automatically escalated to <strong>HIGH/CRITICAL</strong> and a senior engineering intervention plan is underway.
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Root-Cause & Action Plan */}
                {trackedData.plan && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-base font-bold text-white mb-3 flex items-center space-x-2">
                      <Bot className="w-5 h-5 text-indigo-400" />
                      <span>Autonomous Operational Plan</span>
                    </h3>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Root Cause Diagnosis</div>
                      <p className="text-xs text-slate-200 leading-relaxed">{trackedData.plan.root_cause_summary}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Crew Execution Tasks</div>
                      {trackedData.tasks && trackedData.tasks.length > 0 ? (
                        trackedData.tasks.map((task, idx) => (
                          <div key={task.id} className="flex items-start space-x-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-200">{task.title}</h4>
                                <StatusBadge status={task.status} />
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">{task.description}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">Tasks being dispatched by municipal operator...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Audit Logs & Traceability (5 cols) */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span>Autonomous Execution Trace</span>
                </h3>
                <AuditLogTimeline logs={trackedData.timeline || []} />
              </div>

            </div>
          )}

        </div>
      )}

      {/* Closed-Loop Verification Modal */}
      {trackedData && (
        <VerificationModal
          complaint={trackedData.complaint}
          isOpen={verifyModalOpen}
          onClose={() => setVerifyModalOpen(false)}
          onVerified={() => {
            handleSearchTracking();
          }}
        />
      )}

    </div>
  );
}
