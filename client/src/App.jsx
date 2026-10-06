import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import CitizenPortal from './pages/CitizenPortal';
import OperationsDashboard from './pages/OperationsDashboard';
import ActionCenter from './pages/ActionCenter';
import ClusterDetail from './pages/ClusterDetail';
import Login from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
          <Navbar />
          
          <main className="flex-1">
            <Routes>
              {/* ========================================================= */}
              {/* 1. PUBLIC CITIZEN PORTAL                                   */}
              {/* ========================================================= */}
              <Route path="/" element={<CitizenPortal />} />
              <Route path="/citizen" element={<CitizenPortal />} />
              
              {/* ========================================================= */}
              {/* 2. MUNICIPAL ADMIN & OPERATIONS PORTAL                     */}
              {/* ========================================================= */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<OperationsDashboard />} />
                <Route path="action-center" element={<ActionCenter />} />
              </Route>

              {/* Legacy / Direct Route Aliases for Admin */}
              <Route path="/ops" element={<Navigate to="/admin" replace />} />
              <Route path="/action-center" element={<Navigate to="/admin/action-center" replace />} />

              {/* Root-Cause Cluster Deep Dive */}
              <Route path="/clusters/:id" element={<ClusterDetail />} />
              <Route path="/admin/clusters/:id" element={<ClusterDetail />} />
              
              {/* Auth */}
              <Route path="/login" element={<Login />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          {/* Dark Footer */}
          <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500 mt-12">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-400">CivicFix: 2-Portal Autonomous Civic Operations Framework</span>
              </div>
              <div className="flex items-center space-x-4 text-[11px]">
                <span className="text-blue-400 font-semibold">👤 Citizen Portal: /citizen</span>
                <span className="text-amber-400 font-semibold">🏢 Admin Portal: /admin</span>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
