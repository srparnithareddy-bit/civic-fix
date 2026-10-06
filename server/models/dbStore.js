const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

// In-Memory / Local store state (starts clean / empty, populated on user/operator actions)
const localStore = {
  users: [],
  complaints: [],
  clusters: [],
  plans: [],
  tasks: [],
  audit_logs: []
};

// Seed initial system operator account if none exists
async function initializeDefaultUsers() {
  const existingOperator = localStore.users.find(u => u.email === 'operator@civicfix.gov');
  if (!existingOperator) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);
    localStore.users.push({
      id: uuidv4(),
      email: 'operator@civicfix.gov',
      password_hash: passwordHash,
      full_name: 'Lead Operations Dispatcher',
      role: 'operator',
      department: 'Central Emergency & Public Works',
      phone: '+1-555-0199',
      created_at: new Date().toISOString()
    });
  }

  const existingCitizen = localStore.users.find(u => u.email === 'citizen@example.com');
  if (!existingCitizen) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('citizen123', salt);
    localStore.users.push({
      id: uuidv4(),
      email: 'citizen@example.com',
      password_hash: passwordHash,
      full_name: 'Jane Doe',
      role: 'citizen',
      department: null,
      phone: '+1-555-0144',
      created_at: new Date().toISOString()
    });
  }
}

initializeDefaultUsers();

// Generic helper methods that work with Supabase if active, otherwise Local Store
const db = {
  // AUDIT LOGS
  async addAuditLog({ entityType, entityId, actorType, actorId, action, reasoning, metadata = {} }) {
    const log = {
      id: uuidv4(),
      entity_type: entityType,
      entity_id: entityId,
      actor_type: actorType, // AGENT, OPERATOR, CITIZEN, SYSTEM
      actor_id: actorId || 'SYSTEM',
      action,
      reasoning,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    if (supabase) {
      try {
        await supabase.from('audit_logs').insert([log]);
      } catch (err) {
        console.warn('Supabase audit log insert error, storing locally:', err.message);
      }
    }
    localStore.audit_logs.unshift(log);
    return log;
  },

  async getAuditLogs(entityType, entityId) {
    if (supabase) {
      try {
        let query = supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
        if (entityType && entityId) {
          query = query.eq('entity_type', entityType).eq('entity_id', entityId);
        }
        const { data, error } = await query;
        if (!error && data) return data;
      } catch (e) {
        // fallback
      }
    }
    if (entityType && entityId) {
      return localStore.audit_logs.filter(l => l.entity_type === entityType && l.entity_id === entityId);
    }
    return localStore.audit_logs;
  },

  // USERS
  async findUserByEmail(email) {
    if (supabase) {
      try {
        const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
        if (data) return data;
      } catch (e) {}
    }
    return localStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  async findUserById(id) {
    if (supabase) {
      try {
        const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
        if (data) return data;
      } catch (e) {}
    }
    return localStore.users.find(u => u.id === id);
  },

  async createUser(userData) {
    const newUser = {
      id: uuidv4(),
      ...userData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        if (!error && data) return data;
      } catch (e) {}
    }
    localStore.users.push(newUser);
    return newUser;
  },

  // COMPLAINTS
  async getComplaints(filter = {}) {
    if (supabase) {
      try {
        let query = supabase.from('complaints').select('*').order('created_at', { ascending: false });
        if (filter.status) query = query.eq('status', filter.status);
        if (filter.priority) query = query.eq('priority', filter.priority);
        if (filter.category) query = query.eq('category', filter.category);
        if (filter.user_id) query = query.eq('user_id', filter.user_id);
        const { data, error } = await query;
        if (!error && data) return data;
      } catch (e) {}
    }
    return localStore.complaints.filter(c => {
      if (filter.status && c.status !== filter.status) return false;
      if (filter.priority && c.priority !== filter.priority) return false;
      if (filter.category && c.category !== filter.category) return false;
      if (filter.user_id && c.user_id !== filter.user_id) return false;
      return true;
    });
  },

  async getComplaintById(id) {
    if (supabase) {
      try {
        const { data } = await supabase.from('complaints').select('*').eq('id', id).maybeSingle();
        if (data) return data;
      } catch (e) {}
    }
    return localStore.complaints.find(c => c.id === id);
  },

  async getComplaintByTrackingId(trackingId) {
    if (supabase) {
      try {
        const { data } = await supabase.from('complaints').select('*').eq('tracking_id', trackingId.toUpperCase()).maybeSingle();
        if (data) return data;
      } catch (e) {}
    }
    return localStore.complaints.find(c => c.tracking_id.toUpperCase() === trackingId.toUpperCase());
  },

  async createComplaint(complaintData) {
    const trackingId = 'CVX-' + Math.floor(100000 + Math.random() * 900000);
    const newComplaint = {
      id: uuidv4(),
      tracking_id: trackingId,
      status: 'submitted',
      priority: complaintData.priority || 'MEDIUM',
      urgency_score: complaintData.urgency_score || 50,
      verification_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...complaintData
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('complaints').insert([newComplaint]).select().single();
        if (!error && data) return data;
      } catch (e) {}
    }
    localStore.complaints.unshift(newComplaint);
    return newComplaint;
  },

  async updateComplaint(id, updates) {
    const updatedRecord = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('complaints').update(updatedRecord).eq('id', id).select().single();
        if (!error && data) return data;
      } catch (e) {}
    }

    const index = localStore.complaints.findIndex(c => c.id === id);
    if (index !== -1) {
      localStore.complaints[index] = { ...localStore.complaints[index], ...updatedRecord };
      return localStore.complaints[index];
    }
    return null;
  },

  // CLUSTERS
  async getClusters() {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('clusters').select('*').order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {}
    }
    return localStore.clusters;
  },

  async getClusterById(id) {
    if (supabase) {
      try {
        const { data } = await supabase.from('clusters').select('*').eq('id', id).maybeSingle();
        if (data) return data;
      } catch (e) {}
    }
    return localStore.clusters.find(cl => cl.id === id);
  },

  async createCluster(clusterData) {
    const newCluster = {
      id: uuidv4(),
      status: 'active',
      complaint_count: clusterData.complaint_count || 1,
      radius_meters: clusterData.radius_meters || 250,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...clusterData
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('clusters').insert([newCluster]).select().single();
        if (!error && data) return data;
      } catch (e) {}
    }
    localStore.clusters.unshift(newCluster);
    return newCluster;
  },

  async updateCluster(id, updates) {
    const updatedRecord = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('clusters').update(updatedRecord).eq('id', id).select().single();
        if (!error && data) return data;
      } catch (e) {}
    }

    const index = localStore.clusters.findIndex(c => c.id === id);
    if (index !== -1) {
      localStore.clusters[index] = { ...localStore.clusters[index], ...updatedRecord };
      return localStore.clusters[index];
    }
    return null;
  },

  // PLANS
  async getPlans() {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('plans').select('*').order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {}
    }
    return localStore.plans;
  },

  async getPlanById(id) {
    if (supabase) {
      try {
        const { data } = await supabase.from('plans').select('*').eq('id', id).maybeSingle();
        if (data) return data;
      } catch (e) {}
    }
    return localStore.plans.find(p => p.id === id);
  },

  async createPlan(planData) {
    const newPlan = {
      id: uuidv4(),
      operator_approval_status: 'pending_review',
      required_resources: planData.required_resources || [],
      steps: planData.steps || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...planData
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('plans').insert([newPlan]).select().single();
        if (!error && data) return data;
      } catch (e) {}
    }
    localStore.plans.unshift(newPlan);
    return newPlan;
  },

  async updatePlan(id, updates) {
    const updatedRecord = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('plans').update(updatedRecord).eq('id', id).select().single();
        if (!error && data) return data;
      } catch (e) {}
    }

    const index = localStore.plans.findIndex(p => p.id === id);
    if (index !== -1) {
      localStore.plans[index] = { ...localStore.plans[index], ...updatedRecord };
      return localStore.plans[index];
    }
    return null;
  },

  // TASKS
  async getTasksByPlanId(planId) {
    if (supabase) {
      try {
        const { data } = await supabase.from('tasks').select('*').eq('plan_id', planId).order('sequence_order', { ascending: true });
        if (data) return data;
      } catch (e) {}
    }
    return localStore.tasks.filter(t => t.plan_id === planId).sort((a, b) => a.sequence_order - b.sequence_order);
  },

  async createTask(taskData) {
    const newTask = {
      id: uuidv4(),
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...taskData
    };
    if (supabase) {
      try {
        const { data, error } = await supabase.from('tasks').insert([newTask]).select().single();
        if (!error && data) return data;
      } catch (e) {}
    }
    localStore.tasks.push(newTask);
    return newTask;
  },

  async updateTask(id, updates) {
    const updatedRecord = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    if (supabase) {
      try {
        const { data, error } = await supabase.from('tasks').update(updatedRecord).eq('id', id).select().single();
        if (!error && data) return data;
      } catch (e) {}
    }
    const index = localStore.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      localStore.tasks[index] = { ...localStore.tasks[index], ...updatedRecord };
      return localStore.tasks[index];
    }
    return null;
  },

  // Raw store access for diagnostics / reset
  getLocalStore() {
    return localStore;
  }
};

module.exports = db;
