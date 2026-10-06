const { callGemini, extractJson } = require('./geminiService');

/**
 * Triage Agent: OBSERVE -> UNDERSTAND -> PRIORITIZE
 * Classifies severity, computes urgency score, assigns SLA, detects safety hazards.
 */
async function triageComplaint(complaint) {
  const prompt = `
You are the Lead Triage Agent for CivicFix, an autonomous civic operations system.
Analyze the following citizen complaint and return a STRICT JSON OBJECT ONLY.

Complaint Data:
Title: "${complaint.title}"
Description: "${complaint.description}"
Category: "${complaint.category}"
Address: "${complaint.address || 'Unknown'}"
Coordinates: Lat ${complaint.latitude}, Lng ${complaint.longitude}

Return JSON with this exact schema:
{
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "urgency_score": <Integer from 1 to 100>,
  "department": "Public Works & Roads" | "Water & Sewage Management" | "Power & Grid Operations" | "Sanitation & Waste" | "Public Safety & Traffic",
  "hazard_flags": ["<risk 1>", "<risk 2>"],
  "sla_hours": <Integer SLA response deadline in hours>,
  "reasoning": "<Short chain of thought why this priority and department were chosen>",
  "recommended_immediate_action": "<Brief operator advisory>"
}
`;

  const aiText = await callGemini(prompt);
  if (aiText) {
    try {
      const parsed = extractJson(aiText);
      const slaDeadline = new Date(Date.now() + (parsed.sla_hours || 24) * 3600 * 1000).toISOString();
      return {
        priority: parsed.priority || 'MEDIUM',
        urgency_score: parsed.urgency_score || 50,
        department: parsed.department || 'Public Works & Roads',
        hazard_flags: parsed.hazard_flags || [],
        sla_deadline: slaDeadline,
        reasoning: parsed.reasoning || 'Automated classification completed by AI triage agent.',
        recommended_immediate_action: parsed.recommended_immediate_action || 'Inspect on-site.'
      };
    } catch (e) {
      console.warn('Fallback to heuristic triage:', e.message);
    }
  }

  // Deterministic Intelligent Fallback
  const text = `${complaint.title} ${complaint.description} ${complaint.category}`.toLowerCase();
  let priority = 'MEDIUM';
  let urgency = 55;
  let slaHours = 24;
  let department = 'Public Works & Roads';
  const flags = [];

  if (text.includes('fire') || text.includes('gas leak') || text.includes('sinkhole') || text.includes('collapse') || text.includes('electrocution') || text.includes('live wire')) {
    priority = 'CRITICAL';
    urgency = 95;
    slaHours = 2;
    flags.push('Immediate Public Hazard', 'High Life Safety Risk');
    department = 'Public Safety & Traffic';
  } else if (text.includes('burst') || text.includes('flooding') || text.includes('water main') || text.includes('sewage') || text.includes('blackout') || text.includes('traffic light down')) {
    priority = 'HIGH';
    urgency = 80;
    slaHours = 6;
    flags.push('Infrastructure Disruption', 'Flow Disruption');
    department = text.includes('blackout') || text.includes('traffic light') ? 'Power & Grid Operations' : 'Water & Sewage Management';
  } else if (text.includes('pothole') || text.includes('crack') || text.includes('trash') || text.includes('garbage') || text.includes('debris')) {
    priority = 'MEDIUM';
    urgency = 45;
    slaHours = 48;
    flags.push('Civic Maintenance Required');
    department = text.includes('trash') || text.includes('garbage') ? 'Sanitation & Waste' : 'Public Works & Roads';
  } else {
    priority = 'LOW';
    urgency = 25;
    slaHours = 72;
    flags.push('Routine Service Inquiry');
    department = 'Public Works & Roads';
  }

  const slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

  return {
    priority,
    urgency_score: urgency,
    department,
    hazard_flags: flags,
    sla_deadline: slaDeadline,
    reasoning: `Deterministic agent heuristic identified keywords triggering ${priority} priority for ${department}.`,
    recommended_immediate_action: `Dispatch ${department} inspection crew within ${slaHours} hours.`
  };
}

module.exports = { triageComplaint };
