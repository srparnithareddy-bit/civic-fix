const express = require('express');
const router = express.Router();
const db = require('../models/dbStore');
const { triageComplaint } = require('../agents/triageAgent');
const { generateOperationalPlan } = require('../agents/planningAgent');

// GET /api/ai/audit-logs - System-wide autonomous execution trace
router.get('/audit-logs', async (req, res) => {
  try {
    const { entityType, entityId } = req.query;
    const logs = await db.getAuditLogs(entityType, entityId);
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/re-triage/:complaintId - Force re-run of AI Triage
router.post('/re-triage/:complaintId', async (req, res) => {
  try {
    const complaint = await db.getComplaintById(req.params.complaintId);
    if (!complaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    const triageResult = await triageComplaint(complaint);
    const updated = await db.updateComplaint(complaint.id, {
      priority: triageResult.priority,
      urgency_score: triageResult.urgency_score,
      sla_deadline: triageResult.sla_deadline,
      ai_triage_metadata: triageResult
    });

    await db.addAuditLog({
      entityType: 'complaint',
      entityId: complaint.id,
      actorType: 'AGENT',
      actorId: 'AutonomousTriageAgent',
      action: 'MANUAL_RE_TRIAGE_TRIGGERED',
      reasoning: triageResult.reasoning,
      metadata: triageResult
    });

    res.json({ success: true, complaint: updated, triage: triageResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
