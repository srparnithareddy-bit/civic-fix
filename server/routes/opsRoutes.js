const express = require('express');
const router = express.Router();
const db = require('../models/dbStore');
const { optionalAuth, authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/ops/metrics - Operational KPI and SLA metrics
router.get('/metrics', async (req, res) => {
  try {
    const complaints = await db.getComplaints();
    const clusters = await db.getClusters();
    const plans = await db.getPlans();
    const now = new Date();

    const totalComplaints = complaints.length;
    const activeClusters = clusters.filter(c => c.status !== 'resolved').length;
    const criticalIncidents = complaints.filter(c => c.priority === 'CRITICAL' && c.status !== 'resolved').length;
    const highIncidents = complaints.filter(c => c.priority === 'HIGH' && c.status !== 'resolved').length;
    
    // SLA breaches: complaints not resolved whose SLA deadline passed
    const slaBreaches = complaints.filter(c => {
      if (['resolved', 'verified'].includes(c.status)) return false;
      if (!c.sla_deadline) return false;
      return new Date(c.sla_deadline) < now;
    }).length;

    const pendingApprovals = plans.filter(p => p.operator_approval_status === 'pending_review').length;
    const reopenedVerifications = complaints.filter(c => c.status === 'reopened').length;
    const verifiedResolved = complaints.filter(c => c.status === 'verified').length;

    res.json({
      success: true,
      metrics: {
        totalComplaints,
        activeClusters,
        criticalIncidents,
        highIncidents,
        slaBreaches,
        pendingApprovals,
        reopenedVerifications,
        verifiedResolved,
        resolutionRate: totalComplaints > 0 ? Math.round(((verifiedResolved + complaints.filter(c => c.status === 'resolved').length) / totalComplaints) * 100) : 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ops/pending-plans - HITL Plan Approval Queue
router.get('/pending-plans', async (req, res) => {
  try {
    const plans = await db.getPlans();
    const pending = plans.filter(p => p.operator_approval_status === 'pending_review');
    const clusters = await db.getClusters();

    const enriched = await Promise.all(pending.map(async p => {
      const cluster = clusters.find(c => c.id === p.cluster_id);
      const tasks = await db.getTasksByPlanId(p.id);
      return {
        ...p,
        cluster,
        tasks
      };
    }));

    res.json({ success: true, count: enriched.length, plans: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ops/plans/:id/decision - Operator Approves or Rejects AI Plan
router.post('/plans/:id/decision', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, notes, modifiedCost, modifiedHours } = req.body; // 'approved' | 'rejected'

    if (!['approved', 'rejected', 'modified'].includes(decision)) {
      return res.status(400).json({ success: false, error: "Decision must be 'approved', 'rejected', or 'modified'" });
    }

    const plan = await db.getPlanById(id);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    const operatorId = req.user ? req.user.id : 'Operator_Control';
    const operatorName = req.user ? req.user.full_name : 'Municipal Operator';

    const updates = {
      operator_approval_status: decision,
      operator_notes: notes || null,
      approved_by: operatorId,
      approved_at: new Date().toISOString()
    };

    if (modifiedCost) updates.estimated_cost = modifiedCost;
    if (modifiedHours) updates.estimated_hours = modifiedHours;

    const updatedPlan = await db.updatePlan(id, updates);

    // If approved, update Cluster and Complaint statuses to in_progress / planned
    if (decision === 'approved' || decision === 'modified') {
      if (plan.cluster_id) {
        await db.updateCluster(plan.cluster_id, { status: 'in_progress' });
        
        // Update all complaints in this cluster
        const complaints = await db.getComplaints();
        const clusterComplaints = complaints.filter(c => c.cluster_id === plan.cluster_id);
        for (const c of clusterComplaints) {
          await db.updateComplaint(c.id, { status: 'in_progress' });
        }
      }
    }

    await db.addAuditLog({
      entityType: 'plan',
      entityId: id,
      actorType: 'OPERATOR',
      actorId: operatorName,
      action: `PLAN_${decision.toUpperCase()}`,
      reasoning: notes || `Operator signed off and dispatched resources with status: ${decision}`,
      metadata: { decision, plan_title: plan.title }
    });

    res.json({
      success: true,
      message: `Plan ${decision} successfully. Dispatch authorized.`,
      plan: updatedPlan
    });
  } catch (err) {
    console.error('Plan decision error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ops/tasks/:id/status - Update work order task status
router.post('/tasks/:id/status', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, evidence_url, notes } = req.body; // 'pending', 'in_progress', 'completed', 'blocked'

    const taskUpdates = {
      status,
      evidence_url: evidence_url || null,
      notes: notes || null
    };

    if (status === 'completed') {
      taskUpdates.completed_at = new Date().toISOString();
    }

    const updatedTask = await db.updateTask(id, taskUpdates);
    if (!updatedTask) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await db.addAuditLog({
      entityType: 'task',
      entityId: id,
      actorType: 'OPERATOR',
      actorId: req.user ? req.user.full_name : 'Field Crew',
      action: `TASK_${status.toUpperCase()}`,
      reasoning: notes || `Field task status updated to ${status}`,
      metadata: { task_title: updatedTask.title }
    });

    res.json({ success: true, task: updatedTask });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ops/complaints/:id/resolve - Mark physical repair complete & request citizen verification
router.post('/complaints/:id/resolve', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const updatedComplaint = await db.updateComplaint(id, {
      status: 'resolved',
      verification_status: 'pending',
      verification_notes: resolutionNotes || 'Field crew completed repair. Awaiting citizen verification.'
    });

    if (!updatedComplaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    await db.addAuditLog({
      entityType: 'complaint',
      entityId: id,
      actorType: 'OPERATOR',
      actorId: req.user ? req.user.full_name : 'Municipal Supervisor',
      action: 'REPAIR_RESOLVED_AWAITING_VERIFICATION',
      reasoning: resolutionNotes || 'Physical work finished on site. Prompting citizen for closed-loop signoff.',
      metadata: { tracking_id: updatedComplaint.tracking_id }
    });

    res.json({
      success: true,
      message: 'Complaint marked resolved. Closed-loop verification sent to citizen.',
      complaint: updatedComplaint
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ops/complaints/:id/complete-and-remove - Admin marks work complete and removes from active operational queue
router.post('/complaints/:id/complete-and-remove', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const existing = await db.getComplaintById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    const updatedComplaint = await db.updateComplaint(id, {
      status: 'resolved',
      work_completed: true,
      work_completed_at: new Date().toISOString(),
      removed_from_admin: true,
      verification_status: 'pending',
      verification_notes: notes || 'Admin verified physical work finished. Ticket removed from active operational queue.'
    });

    await db.addAuditLog({
      entityType: 'complaint',
      entityId: id,
      actorType: 'OPERATOR',
      actorId: req.user ? req.user.full_name : 'Municipal Administrator',
      action: 'WORK_COMPLETED_AND_REMOVED_BY_ADMIN',
      reasoning: notes || 'Municipal Administrator marked on-site repair complete and removed ticket from active operational queue. Work is done.',
      metadata: { tracking_id: updatedComplaint.tracking_id }
    });

    res.json({
      success: true,
      message: 'Work marked complete. Ticket removed from Admin Active Queue. Citizen portal will reflect Work Done.',
      complaint: updatedComplaint
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/ops/complaints/:id - Admin deletes ticket from portal (marks work completed for citizen)
router.delete('/complaints/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.getComplaintById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    const updatedComplaint = await db.updateComplaint(id, {
      status: 'resolved',
      work_completed: true,
      work_completed_at: new Date().toISOString(),
      removed_from_admin: true,
      verification_status: 'pending'
    });

    await db.addAuditLog({
      entityType: 'complaint',
      entityId: id,
      actorType: 'OPERATOR',
      actorId: req.user ? req.user.full_name : 'Municipal Administrator',
      action: 'WORK_COMPLETED_AND_REMOVED_BY_ADMIN',
      reasoning: 'Ticket deleted from Admin active portal. Marked as WORK DONE for citizen tracking.',
      metadata: { tracking_id: updatedComplaint.tracking_id }
    });

    res.json({
      success: true,
      message: 'Ticket removed from admin portal. Citizen portal updated to Work Done.',
      complaint: updatedComplaint
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
