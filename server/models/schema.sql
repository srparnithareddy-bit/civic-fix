-- =========================================================
-- CivicFix: Autonomous Civic Operations Agent
-- Database Schema for Supabase / PostgreSQL
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'citizen' CHECK (role IN ('citizen', 'operator', 'supervisor')),
    phone VARCHAR(50),
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CLUSTERS TABLE (Root-Cause Aggregation of Complaints)
CREATE TABLE IF NOT EXISTS clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    root_cause TEXT,
    department VARCHAR(100) NOT NULL,
    priority VARCHAR(50) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters DOUBLE PRECISION DEFAULT 250.0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('forming', 'active', 'planned', 'in_progress', 'resolved', 'reopened')),
    complaint_count INTEGER DEFAULT 1,
    ai_cluster_meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. COMPLAINTS TABLE (Individual Citizen Reports)
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    citizen_name VARCHAR(150),
    citizen_phone VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g. Water Supply, Road Hazard, Electrical/Grid, Waste/Sanitation
    media_url TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN (
        'submitted', 
        'triaged', 
        'clustered', 
        'planned', 
        'in_progress', 
        'resolved', 
        'verified', 
        'reopened'
    )),
    priority VARCHAR(50) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    urgency_score INTEGER DEFAULT 50, -- 0 to 100
    cluster_id UUID REFERENCES clusters(id) ON DELETE SET NULL,
    sla_deadline TIMESTAMP WITH TIME ZONE,
    ai_triage_metadata JSONB,
    verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'confirmed_fixed', 'rejected_reopen')),
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. OPERATIONAL PLANS (AI-Generated Root-Cause Action Plans)
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE,
    complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    root_cause_summary TEXT NOT NULL,
    estimated_cost NUMERIC(10, 2) DEFAULT 0.00,
    estimated_hours NUMERIC(6, 2) DEFAULT 4.0,
    assigned_department VARCHAR(100) NOT NULL,
    required_resources JSONB DEFAULT '[]'::jsonb, -- e.g., ["Hydro-Jet Vac Truck", "2x Plumbers", "Safety Barricades"]
    steps JSONB DEFAULT '[]'::jsonb, -- Array of execution step objects
    operator_approval_status VARCHAR(50) DEFAULT 'pending_review' CHECK (operator_approval_status IN ('pending_review', 'approved', 'rejected', 'modified')),
    operator_notes TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TASKS (Actionable Crew Work Items)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_crew VARCHAR(150),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
    sequence_order INTEGER DEFAULT 1,
    evidence_url TEXT,
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. AUDIT LOGS (Autonomous Agent & Operator Traceability)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'complaint', 'cluster', 'plan', 'task'
    entity_id UUID NOT NULL,
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('AGENT', 'OPERATOR', 'CITIZEN', 'SYSTEM')),
    actor_id VARCHAR(100),
    action VARCHAR(100) NOT NULL, -- 'TRIAGED', 'CLUSTERED', 'PLAN_GENERATED', 'PLAN_APPROVED', 'STATUS_CHANGED', 'VERIFICATION_FAILED_REOPEN'
    reasoning TEXT,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_complaints_tracking ON complaints(tracking_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_cluster ON complaints(cluster_id);
CREATE INDEX IF NOT EXISTS idx_clusters_status ON clusters(status);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
