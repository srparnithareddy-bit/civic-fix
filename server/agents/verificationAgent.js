const { callGemini, extractJson } = require('./geminiService');
const db = require('../models/dbStore');
const { generateOperationalPlan } = require('./planningAgent');

/**
 * Verification Agent: MONITOR -> VERIFY -> REPLAN / ESCALATE
 * Closes the feedback loop with the citizen. If verification fails, re-opens & auto-escalates.
 */
async function processVerificationFeedback(complaintId, { isFixed, feedbackNotes, citizenId }) {
  const complaint = await db.getComplaintById(complaintId);
  if (!complaint) {
    throw new Error('Complaint not found');
  }

  if (isFixed) {
    // 1. Citizen confirmed problem is resolved
    const updated = await db.updateComplaint(complaintId, {
      status: 'verified',
      verification_status: 'confirmed_fixed',
      verification_notes: feedbackNotes || 'Citizen verified successful resolution.'
    });

    await db.addAuditLog({
      entityType: 'complaint',
      entityId: complaintId,
      actorType: 'CITIZEN',
      actorId: citizenId || complaint.citizen_name || 'Citizen',
      action: 'VERIFICATION_CONFIRMED',
      reasoning: 'Citizen validated on-site completion. Closed loop satisfied.',
      metadata: { feedback: feedbackNotes }
    });

    return {
      status: 'verified',
      message: 'Resolution confirmed by citizen. Ticket permanently closed.',
      complaint: updated
    };
  } else {
    // 2. Citizen indicated problem NOT fixed -> CLOSED-LOOP REOPEN & AUTO-REPLAN
    console.log(`⚠️ CLOSED-LOOP ALERT: Citizen reported issue ${complaint.tracking_id} is STILL UNRESOLVED. Initiating auto-replan & escalation.`);

    // Escalate priority
    const escalatedPriority = complaint.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
    const updated = await db.updateComplaint(complaintId, {
      status: 'reopened',
      priority: escalatedPriority,
      verification_status: 'rejected_reopen',
      verification_notes: feedbackNotes || 'Citizen indicated failure of previous intervention.'
    });

    // Escalate cluster if attached
    if (complaint.cluster_id) {
      await db.updateCluster(complaint.cluster_id, {
        status: 'reopened',
        priority: 'CRITICAL'
      });
    }

    // AI Root Cause Re-Evaluation Prompt
    const replanPrompt = `
You are the Escalation & Re-Planning Agent for CivicFix.
A citizen reported that a previous municipal repair FAILED to solve the problem.

Original Complaint: "${complaint.title}"
Citizen Re-Open Feedback: "${feedbackNotes || 'Problem persists on site.'}"
Previous Category: "${complaint.category}"

Formulate an Escalated Remediation Plan addressing why the first attempt likely failed.
Return JSON ONLY:
{
  "escalation_reason": "<Why initial fix failed>",
  "revised_approach": "<Specialized diagnostic or senior crew deployment required>",
  "urgency_rating": "CRITICAL"
}
`;

    let escalationMeta = {
      escalation_reason: 'Prior intervention failed verification. Upgrading to senior crew inspection.',
      revised_approach: 'Comprehensive ultrasound / deep diagnostics and senior supervisor dispatch.'
    };

    const aiRes = await callGemini(replanPrompt);
    if (aiRes) {
      try {
        const parsed = extractJson(aiRes);
        if (parsed.escalation_reason) escalationMeta = parsed;
      } catch (e) {}
    }

    // Audit log escalation
    await db.addAuditLog({
      entityType: 'complaint',
      entityId: complaintId,
      actorType: 'AGENT',
      actorId: 'AutonomousVerificationAgent',
      action: 'CLOSED_LOOP_VERIFICATION_FAILED_REOPEN',
      reasoning: `Citizen rejection triggered automatic ticket re-opening and priority escalation to ${escalatedPriority}. Notes: ${feedbackNotes}`,
      metadata: escalationMeta
    });

    // Trigger immediate new tactical plan
    let newPlan = null;
    if (complaint.cluster_id) {
      newPlan = await generateOperationalPlan(complaint.cluster_id, complaint.id);
    }

    return {
      status: 'reopened',
      message: 'Verification failed: Issue re-opened with escalated priority. New remediation plan generated.',
      complaint: updated,
      plan: newPlan
    };
  }
}

module.exports = { processVerificationFeedback };
