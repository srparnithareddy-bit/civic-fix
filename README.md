# 🏛️ CivicFix: Autonomous Civic Operations Agent

> **Tagline:** Citizens report problems. CivicFix figures out who should solve them, plans the response, coordinates resources, tracks execution, and keeps following up until the issue is actually resolved.

CivicFix transforms traditional municipal complaint ticketing into an **Autonomous Civic Operations Platform** using a multi-agent AI architecture:
`OBSERVE` → `UNDERSTAND` → `PRIORITIZE` → `PLAN` → `COORDINATE` → `EXECUTE` → `MONITOR` → `VERIFY` → `REPLAN/ESCALATE`

---

## ⚡ Key Highlights & Core Features

1. **Root-Cause Complaint Clustering:** 
   - Dynamically aggregates multiple nearby citizen reports (geospatial Haversine radius + semantic similarity) into unified root-cause incident clusters (e.g. 5 water-pressure complaints on one street → 1 Water Main Rupture).
2. **Closed-Loop Verification Feedback:**
   - Citizens verify if the issue was physically resolved on site. If verification is rejected, CivicFix automatically re-opens the ticket, upgrades priority to `CRITICAL`, and triggers autonomous re-planning with supervisor review.
3. **Human-In-The-Loop (HITL) AI Action Center:**
   - Municipal operators review AI-generated tactical response plans (steps, required heavy machinery, specialist crew allocations, budget and SLA estimation) and authorize dispatch in a single click.
4. **Agentic Execution Trace & Observability:**
   - Full audit logging tracking every agent reasoning step, operator approval, and field task status transition.

---

## 🏗️ Monorepo Architecture

```
CivicFix/
├── package.json                   # Root workspace scripts
├── server/                        # Backend & AI Engine (Express + Gemini + Supabase)
│   ├── agents/
│   │   ├── geminiService.js       # Gemini API integration & structured JSON parser
│   │   ├── triageAgent.js         # OBSERVE -> PRIORITIZE (hazard detection, SLA deadline)
│   │   ├── clusterAgent.js        # Root-Cause Complaint Clustering (geospatial + semantic)
│   │   ├── planningAgent.js       # PLAN -> RESOURCE ALLOCATION (crews, equipment, budget)
│   │   └── verificationAgent.js   # MONITOR -> VERIFY -> REPLAN / ESCALATE (closed loop)
│   ├── config/
│   │   └── supabase.js            # Supabase PostgreSQL client configuration
│   ├── middleware/
│   │   └── auth.js                # JWT & Role-Based Access Control (citizen/operator)
│   ├── models/
│   │   ├── schema.sql             # Full Supabase PostgreSQL schema with indexes
│   │   └── dbStore.js             # Autonomous relational store with Supabase sync
│   ├── routes/
│   │   ├── authRoutes.js          # Register, Login, Me
│   │   ├── complaintRoutes.js     # Citizen submit, track, closed-loop verification
│   │   ├── clusterRoutes.js       # Incident clusters & root cause grouping
│   │   ├── opsRoutes.js           # Metrics, SLA breaches, HITL plan approvals
│   │   └── aiRoutes.js            # Audit log inspection & manual triage triggers
│   └── index.js                   # Server entry point (Port 5000)
└── client/                        # Frontend Portals (React + Vite + Tailwind CSS)
    ├── src/
    │   ├── api/                   # Axios client with auth interceptors
    │   ├── context/               # AuthContext for session management
    │   ├── components/
    │   │   ├── Navbar.jsx         # Modern slate navigation & agent status pill
    │   │   ├── LeafletMap.jsx     # Geospatial cluster & pin visualizer
    │   │   ├── StatusBadge.jsx    # High-contrast priority & status indicators
    │   │   ├── AuditLogTimeline.jsx# Agent reasoning execution trace
    │   │   └── VerificationModal.jsx# Closed-loop citizen feedback popup
    │   └── pages/
    │       ├── CitizenPortal.jsx  # Submit report, auto-GPS, live tracking timeline
    │       ├── OperationsDashboard.jsx # SLA breach counters, metrics, incident map
    │       ├── ActionCenter.jsx   # HITL AI plan review & crew dispatch
    │       ├── ClusterDetail.jsx  # Deep dive on root cause aggregated tickets
    │       └── Login.jsx          # One-click demo login & registration
    └── vite.config.js             # Vite config with /api proxy to backend
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
In the project root, run:
```bash
npm run install:all
```
*(Or install inside `server/` and `client/` individually with `npm install`)*

### 2. Configure Environment Variables (Optional)
In `server/.env`:
```env
PORT=5000
JWT_SECRET=civicfix-super-secure-production-jwt-secret-key-2025
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```
> *Note: CivicFix includes deterministic intelligent fallback engines for AI and local relational persistence, meaning the app is 100% operational out of the box even before API keys are added!*

### 3. Run the Backend & Frontend

**Terminal 1 (Server):**
```bash
npm run server
# Server will run on http://localhost:5000
```

**Terminal 2 (Client):**
```bash
npm run client
# Client will run on http://localhost:3000
```

---

## 🧪 Demo Walkthrough: Test the Closed Loop

1. Open `http://localhost:3000` (Citizen Portal).
2. Submit a report (e.g. *"Water pipe burst flooding street"*, category: *Water & Sewage Management*).
3. Observe real-time autonomous pipeline:
   - **Triage Agent:** Classifies as `HIGH`/`CRITICAL`, assigns 6h SLA deadline.
   - **Cluster Agent:** Groups into an active Root-Cause cluster.
   - **Planning Agent:** Formulates a 3-step action plan with crew and machinery needs.
4. Navigate to **Operations Dashboard** (`/ops`) or **AI Action Center** (`/action-center`):
   - Review the AI proposal, inspect budget and tasks, and click **"Approve & Authorize Crew Dispatch"**.
5. Back in the citizen tracking view, click **"Verify Resolution"**:
   - Test clicking **"No, Still Broken"** to watch the **Autonomous Verification Agent** reopen the ticket, escalate priority to `CRITICAL`, and trigger an auto-replan!
