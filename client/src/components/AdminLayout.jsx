import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  Activity, 
  Zap, 
  UserCheck, 
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const location = useLocation();
  const { user, login } = useAuth();

  const isOperator = user && (user.role === 'operator' || user.role === 'supervisor');

  const isActive = (path) => {
    if (path === '/admin' && (location.pathname === '/admin' || location.pathname === '/ops')) return true;
    return location.pathname === path;
  };

  const handleLoginAsOperator = async () => {
    await login('operator@civicfix.gov', 'admin123');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Admin Role Warning Banner if logged in as citizen or guest */}
      {!isOperator && (
        <div className="bg-amber-950/70 border border-amber-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <UserCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-200">Viewing Municipal Admin Portal</h4>
              <p className="text-[11px] text-amber-300/80">
                You are currently viewing with preview access. Switch to Municipal Operator for full plan approval & crew dispatch rights.
              </p>
            </div>
          </div>
          <button
            onClick={handleLoginAsOperator}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition shrink-0 shadow-md flex items-center space-x-1.5"
          >
            <span>Switch to Operator Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Admin Sub-Navigation Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-900/30">
            OP
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Municipal Operations Control</h2>
            <p className="text-[11px] text-slate-400">Autonomous Triaging, Dispatch & Human-In-The-Loop Signoff</p>
          </div>
        </div>

        <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <Link
            to="/admin"
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
              isActive('/admin')
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Dashboard & Metrics</span>
          </Link>

          <Link
            to="/admin/action-center"
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
              isActive('/admin/action-center')
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Action Center (HITL)</span>
          </Link>
        </nav>
      </div>

      {/* Render Active Admin View */}
      <Outlet />
    </div>
  );
}
