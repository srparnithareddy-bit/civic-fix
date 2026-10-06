const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const clusterRoutes = require('./routes/clusterRoutes');
const opsRoutes = require('./routes/opsRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger for observability
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Root landing page for http://localhost:5000/
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>CivicFix API Server</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; text-align: center; }
        .card { background: white; max-width: 600px; margin: 0 auto; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px; }
        .btn:hover { background: #1d4ed8; }
        .endpoints { text-align: left; background: #f1f5f9; padding: 16px; border-radius: 10px; margin-top: 20px; font-family: monospace; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1 style="color: #0f172a; margin-bottom: 8px;">🏛️ CivicFix Backend API</h1>
        <p style="color: #64748b; font-size: 14px;">The Backend & AI Agentic Service is running on Port 5000.</p>
        
        <a class="btn" href="http://localhost:3000">👉 Open Frontend UI (Port 3000)</a>
        
        <div class="endpoints">
          <strong>Available API Endpoints:</strong><br>
          • <a href="/api/health">/api/health</a> - API Status<br>
          • <a href="/api/complaints">/api/complaints</a> - Live Complaints<br>
          • <a href="/api/clusters">/api/clusters</a> - Root-Cause Clusters<br>
          • <a href="/api/ops/metrics">/api/ops/metrics</a> - Operations Metrics<br>
          • <a href="/api/ai/audit-logs">/api/ai/audit-logs</a> - Autonomous Execution Trace
        </div>
      </div>
    </body>
    </html>
  `);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/clusters', clusterRoutes);
app.use('/api/ops', opsRoutes);
app.use('/api/ai', aiRoutes);

// Health check & Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'CivicFix Autonomous Civic Operations Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 CivicFix Server listening on http://localhost:${PORT}`);
  console.log(`🤖 Agentic Workflow: OBSERVE -> PRIORITIZE -> CLUSTER -> PLAN -> HITL APPROVAL -> VERIFY`);
  console.log('====================================================');
});

module.exports = app;
