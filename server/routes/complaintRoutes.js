const express = require('express');
const router = express.Router();
const db = require('../models/dbStore');
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const { triageComplaint } = require('../agents/triageAgent');
const { processClustering } = require('../agents/clusterAgent');
const { generateOperationalPlan } = require('../agents/planningAgent');
const { processVerificationFeedback } = require('../agents/verificationAgent');

// POST /api/complaints - Submit a new citizen issue
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      latitude,
      longitude,
      address,
      citizen_name,
      citizen_phone,
      media_url
    } = req.body;

    if (!title || !description || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, and GPS coordinates (latitude, longitude) are required'
      });
    }

    // 1. Create Initial Complaint Record
    const newComplaint = await db.createComplaint({
      user_id: req.user ? req.user.id : null,
      citizen_name: citizen_name || (req.user ? req.user.full_name : 'Anonymous Citizen'),
      citizen_phone: citizen_phone || (req.user ? req.user.phone : null),
      title,
      description,
      category: category || 'General Civic Issue',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      media_url: media_url || null,
      status: 'submitted'
    });

    await db.addAuditLog({
      entityType: 'complaint',
      entityId: newComplaint.id,
      actorType: req.user ? 'CITIZEN' : 'SYSTEM',
      actorId: req.user ? req.user.id : 'CitizenSubmission',
      action: 'COMPLAINT_SUBMITTED',
      reasoning: 'Citizen logged initial field incident report.',
      metadata: { tracking_id: newComplaint.tracking_id, title, category }
    });

    // 2. Autonomous Step: TRIAGE AGENT
    const triageResult = await triageComplaint(newComplaint);
    const triagedComplaint = await db.updateComplaint(newComplaint.id, {
      priority: triageResult.priority,
      urgency_score: triageResult.urgency_score,
      sla_deadline: triageResult.sla_deadline,
      ai_triage_metadata: triageResult,
      status: 'triaged'
    });

    await db.addAuditLog({
      entityType: 'complaint',
      entityId: newComplaint.id,
      actorType: 'AGENT',
      actorId: 'AutonomousTriageAgent',
      action: 'COMPLAINT_TRIAGED',
      reasoning: triageResult.reasoning,
      metadata: { priority: triageResult.priority, urgency_score: triageResult.urgency_score, flags: triageResult.hazard_flags }
    });

    // 3. Autonomous Step: ROOT-CAUSE CLUSTERING AGENT
    const clusterResult = await processClustering(triagedComplaint);
    const currentCluster = clusterResult.cluster;

    // 4. Autonomous Step: PLANNING AGENT (if cluster has no plan yet)
    let activePlan = null;
    const existingPlans = await db.getPlans();
    const clusterPlan = existingPlans.find(p => p.cluster_id === currentCluster.id);

    if (!clusterPlan) {
      activePlan = await generateOperationalPlan(currentCluster.id, triagedComplaint.id);
    } else {
      activePlan = clusterPlan;
    }

    const finalComplaint = await db.getComplaintById(newComplaint.id);

    res.status(201).json({
      success: true,
      message: 'Complaint processed autonomously through Triage, Clustering, and Planning pipelines.',
      complaint: finalComplaint,
      cluster: currentCluster,
      plan: activePlan
    });
  } catch (err) {
    console.error('Error creating complaint:', err);
    res.status(500).json({ success: false, error: 'Failed to process complaint: ' + err.message });
  }
});

// GET /api/complaints - List complaints with filters
router.get('/', async (req, res) => {
  try {
    const { status, priority, category, user_id } = req.query;
    const complaints = await db.getComplaints({ status, priority, category, user_id });
    res.json({ success: true, count: complaints.length, complaints });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/complaints/track/:trackingId - Public citizen tracking
router.get('/track/:trackingId', async (req, res) => {
  try {
    const trackingId = req.params.trackingId.toUpperCase();
    const complaint = await db.getComplaintByTrackingId(trackingId);

    if (!complaint) {
      return res.status(404).json({ success: false, error: `No complaint found with tracking code ${trackingId}` });
    }

    // Attach cluster and plan data
    let cluster = null;
    let plan = null;
    let tasks = [];
    let auditLogs = await db.getAuditLogs('complaint', complaint.id);

    if (complaint.cluster_id) {
      cluster = await db.getClusterById(complaint.cluster_id);
      const plans = await db.getPlans();
      plan = plans.find(p => p.cluster_id === complaint.cluster_id) || null;
      if (plan) {
        tasks = await db.getTasksByPlanId(plan.id);
      }
    }

    res.json({
      success: true,
      complaint,
      cluster,
      plan,
      tasks,
      timeline: auditLogs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/complaints/:id - Detail by UUID
router.get('/:id', async (req, res) => {
  try {
    const complaint = await db.getComplaintById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    const auditLogs = await db.getAuditLogs('complaint', complaint.id);
    res.json({ success: true, complaint, auditLogs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/complaints/:id/verify - Closed-Loop Citizen Verification
router.post('/:id/verify', optionalAuth, async (req, res) => {
  try {
    const { isFixed, feedbackNotes } = req.body;
    const citizenId = req.user ? req.user.id : null;

    if (typeof isFixed !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isFixed boolean is required' });
    }

    const result = await processVerificationFeedback(req.params.id, {
      isFixed,
      feedbackNotes,
      citizenId
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/complaints/:id - Admin removes ticket from operational queue (marks Work Done for citizen)
router.delete('/:id', optionalAuth, async (req, res) => {
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
      reasoning: 'Admin removed ticket from operational portal. Status recorded as Work Done for citizen tracking.',
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
