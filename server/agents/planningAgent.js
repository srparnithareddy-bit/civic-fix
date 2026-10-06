const { callGemini, extractJson } = require('./geminiService');
const db = require('../models/dbStore');

/**
 * Planning Agent: PLAN -> COORDINATE -> RESOURCE ALLOCATION
 * Synthesizes an actionable operational plan with resource & crew assignment.
 */
async function generateOperationalPlan(clusterId, complaintId = null) {
  const cluster = await db.getClusterById(clusterId);
  const complaint = complaintId ? await db.getComplaintById(complaintId) : null;

  const prompt = `
You are the Operations Planning Agent for CivicFix.
Your job is to generate a tactical, highly realistic municipal response plan for the following civic incident.

Incident Details:
- Title: "${cluster ? cluster.title : complaint?.title}"
- Root Cause: "${cluster ? cluster.root_cause : complaint?.description}"
- Department: "${cluster ? cluster.department : 'Public Works'}"
- Priority: "${cluster ? cluster.priority : 'MEDIUM'}"
- Reports impacted: ${cluster ? cluster.complaint_count : 1}

Generate an operational plan as STRICT JSON:
{
  "title": "<Concise Plan Title>",
  "root_cause_summary": "<Actionable summary of why this plan permanently fixes the problem>",
  "estimated_cost": <Number in USD, e.g. 1200>,
  "estimated_hours": <Number hours to complete, e.g. 5.5>,
  "assigned_department": "<Department name>",
  "required_resources": [
    "<Equipment or heavy vehicle, e.g. Vacuum Tanker Truck>",
    "<Personnel specialized crew, e.g. 2x Hydraulic Technicians>",
    "<Safety gear or materials, e.g. High-visibility road barriers>"
  ],
  "steps": [
    {
      "step_number": 1,
      "title": "<e.g. Site Isolation & Traffic Diversion>",
      "description": "<Specific instructions>",
      "estimated_minutes": 30
    },
    {
      "step_number": 2,
      "title": "<e.g. Hydraulic Repair / Direct Intervention>",
      "description": "<Specific instructions>",
      "estimated_minutes": 120
    },
    {
      "step_number": 3,
      "title": "<e.g. Surface Restoration & Quality Inspection>",
      "description": "<Specific instructions>",
      "estimated_minutes": 60
    }
  ]
}
`;

  let planData = null;
  const aiResponse = await callGemini(prompt);

  if (aiResponse) {
    try {
      planData = extractJson(aiResponse);
    } catch (e) {
      console.warn('Planning AI JSON parse failed, using heuristic template');
    }
  }

  if (!planData) {
    const dept = cluster?.department || 'Public Works & Roads';
    planData = {
      title: `Rapid Resolution Protocol: ${cluster?.title || 'Civic Hazard'}`,
      root_cause_summary: `Systematic resolution targeting: ${cluster?.root_cause || 'Civic infrastructure repair'}.`,
      estimated_cost: cluster?.priority === 'CRITICAL' ? 3500 : 850,
      estimated_hours: cluster?.priority === 'CRITICAL' ? 8.0 : 4.0,
      assigned_department: dept,
      required_resources: [
        'Rapid Intervention Vehicle #4',
        '2x Certified Field Technicians',
        'Standard Safety Barricades & Signage'
      ],
      steps: [
        {
          step_number: 1,
          title: 'Deploy Safety Perimeter & Hazard Assessment',
          description: 'Establish cones and verify site safety before commencing work.',
          estimated_minutes: 30
        },
        {
          step_number: 2,
          title: 'Direct Repair & Component Replacement',
          description: 'Execute primary physical fix addressing root cause.',
          estimated_minutes: 150
        },
        {
          step_number: 3,
          title: 'Post-Intervention Verification & Site Clearance',
          description: 'Conduct quality check, capture proof of completion photo, clear site.',
          estimated_minutes: 45
        }
      ]
    };
  }

  // Create plan in DB (Human-In-The-Loop pending_review)
  const createdPlan = await db.createPlan({
    cluster_id: clusterId,
    complaint_id: complaintId,
    title: planData.title,
    root_cause_summary: planData.root_cause_summary,
    estimated_cost: planData.estimated_cost,
    estimated_hours: planData.estimated_hours,
    assigned_department: planData.assigned_department,
    required_resources: planData.required_resources,
    steps: planData.steps,
    operator_approval_status: 'pending_review'
  });

  // Create individual tasks
  for (let i = 0; i < planData.steps.length; i++) {
    const s = planData.steps[i];
    await db.createTask({
      plan_id: createdPlan.id,
      title: s.title,
      description: s.description,
      assigned_crew: planData.assigned_department + ' Crew A',
      status: 'pending',
      sequence_order: s.step_number || (i + 1)
    });
  }

  // Audit log
  await db.addAuditLog({
    entityType: 'plan',
    entityId: createdPlan.id,
    actorType: 'AGENT',
    actorId: 'AutonomousPlanningAgent',
    action: 'PLAN_GENERATED_PENDING_APPROVAL',
    reasoning: `Synthesized ${planData.steps.length}-step operational response. Queued for Human-In-The-Loop operator signoff.`,
    metadata: {
      estimated_cost: planData.estimated_cost,
      estimated_hours: planData.estimated_hours,
      department: planData.assigned_department
    }
  });

  return createdPlan;
}

module.exports = { generateOperationalPlan };
