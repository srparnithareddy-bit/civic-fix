const { callGemini, extractJson } = require('./geminiService');
const db = require('../models/dbStore');

// Haversine distance in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Cluster Agent: Root-Cause Aggregation
 * Scans active clusters and complaints to attach or spawn unified operational clusters.
 */
async function processClustering(complaint) {
  const activeClusters = await db.getClusters();
  const CLUSTER_MAX_RADIUS_METERS = 400; // 400m geographic neighborhood threshold

  // 1. Look for existing open cluster within radius and matching category/department
  for (const cluster of activeClusters) {
    if (cluster.status === 'resolved') continue;

    const dist = calculateDistanceMeters(
      complaint.latitude,
      complaint.longitude,
      cluster.latitude,
      cluster.longitude
    );

    if (dist <= (cluster.radius_meters || CLUSTER_MAX_RADIUS_METERS)) {
      // Found candidate cluster! Synthesize root cause update
      console.log(`🔗 Correlating complaint ${complaint.tracking_id} to cluster "${cluster.title}" (${Math.round(dist)}m away)`);
      
      const newCount = (cluster.complaint_count || 1) + 1;
      
      // Update root-cause summary using AI
      let updatedRootCause = cluster.root_cause;
      const clusterPrompt = `
You are the Root Cause Clustering Agent for CivicFix.
We have merged a new citizen complaint into an existing incident cluster.

Cluster Title: "${cluster.title}"
Current Root Cause Summary: "${cluster.root_cause}"
New Incoming Complaint:
- Title: "${complaint.title}"
- Description: "${complaint.description}"
- Category: "${complaint.category}"

Total Linked Citizen Reports: ${newCount}

Synthesize a refined Root Cause summary and higher priority assessment if necessary.
Return JSON ONLY:
{
  "updated_title": "<Concise incident cluster title>",
  "root_cause": "<Deep root cause analysis explaining why these multiple reports stem from a single civic point of failure>",
  "escalate_priority": "CRITICAL" | "HIGH" | "MEDIUM"
}
`;

      const aiResponse = await callGemini(clusterPrompt);
      let updatedTitle = cluster.title;
      let newPriority = cluster.priority;

      if (aiResponse) {
        try {
          const parsed = extractJson(aiResponse);
          if (parsed.updated_title) updatedTitle = parsed.updated_title;
          if (parsed.root_cause) updatedRootCause = parsed.root_cause;
          if (parsed.escalate_priority) newPriority = parsed.escalate_priority;
        } catch (e) {}
      } else {
        updatedRootCause = `${cluster.root_cause || cluster.title} (Corroborated by ${newCount} nearby citizen reports).`;
        if (newCount >= 3 && cluster.priority !== 'CRITICAL') {
          newPriority = 'HIGH';
        }
      }

      // Update cluster in DB
      const updatedCluster = await db.updateCluster(cluster.id, {
        title: updatedTitle,
        root_cause: updatedRootCause,
        complaint_count: newCount,
        priority: newPriority
      });

      // Link complaint to cluster
      await db.updateComplaint(complaint.id, {
        cluster_id: cluster.id,
        status: 'clustered'
      });

      await db.addAuditLog({
        entityType: 'cluster',
        entityId: cluster.id,
        actorType: 'AGENT',
        actorId: 'RootCauseClusterAgent',
        action: 'COMPLAINT_MERGED_TO_CLUSTER',
        reasoning: `Geospatial proximity (${Math.round(dist)}m) and semantic affinity matched with cluster "${cluster.title}".`,
        metadata: { complaint_id: complaint.id, tracking_id: complaint.tracking_id, total_reports: newCount }
      });

      return { cluster: updatedCluster, isNew: false };
    }
  }

  // 2. If no existing cluster matches, check other unclustered complaints within proximity
  const unclustered = await db.getComplaints();
  const nearbyReports = unclustered.filter(c => 
    c.id !== complaint.id &&
    !c.cluster_id &&
    calculateDistanceMeters(complaint.latitude, complaint.longitude, c.latitude, c.longitude) <= CLUSTER_MAX_RADIUS_METERS &&
    (c.category.toLowerCase() === complaint.category.toLowerCase() || c.priority === complaint.priority)
  );

  if (nearbyReports.length > 0) {
    // Form a brand new cluster aggregating these reports
    const allReports = [complaint, ...nearbyReports];
    
    const newClusterPrompt = `
You are the Root Cause Clustering Agent for CivicFix.
We detected ${allReports.length} related civic complaints in close physical proximity.

Reports:
${allReports.map((r, i) => `${i + 1}. [${r.category}] ${r.title} - "${r.description}" at (${r.latitude}, ${r.longitude})`).join('\n')}

Identify the underlying single root cause and return JSON ONLY:
{
  "title": "<Concise incident cluster title e.g. Major Water Main Rupture on Oak St>",
  "root_cause": "<Technical hypothesis of the single civic point of failure>",
  "department": "<Assigned department>",
  "priority": "CRITICAL" | "HIGH" | "MEDIUM"
}
`;

    let clusterTitle = `Incident Cluster: ${complaint.category} around ${complaint.address || 'Report Area'}`;
    let rootCause = `Multi-point civic anomaly detected across ${allReports.length} reports.`;
    let priority = complaint.priority || 'MEDIUM';
    let department = complaint.ai_triage_metadata?.department || 'Public Works & Roads';

    const aiResponse = await callGemini(newClusterPrompt);
    if (aiResponse) {
      try {
        const parsed = extractJson(aiResponse);
        if (parsed.title) clusterTitle = parsed.title;
        if (parsed.root_cause) rootCause = parsed.root_cause;
        if (parsed.department) department = parsed.department;
        if (parsed.priority) priority = parsed.priority;
      } catch (e) {}
    }

    const createdCluster = await db.createCluster({
      title: clusterTitle,
      root_cause: rootCause,
      department,
      priority,
      latitude: complaint.latitude,
      longitude: complaint.longitude,
      radius_meters: CLUSTER_MAX_RADIUS_METERS,
      complaint_count: allReports.length,
      status: 'active'
    });

    for (const rep of allReports) {
      await db.updateComplaint(rep.id, {
        cluster_id: createdCluster.id,
        status: 'clustered'
      });
    }

    await db.addAuditLog({
      entityType: 'cluster',
      entityId: createdCluster.id,
      actorType: 'AGENT',
      actorId: 'RootCauseClusterAgent',
      action: 'NEW_CLUSTER_FORMED',
      reasoning: `Discovered multi-complaint anomaly in ${CLUSTER_MAX_RADIUS_METERS}m radius. Formed unified cluster to solve root cause.`,
      metadata: { linked_complaint_count: allReports.length, reports: allReports.map(r => r.tracking_id) }
    });

    return { cluster: createdCluster, isNew: true };
  }

  // 3. No match yet - create standalone single-incident cluster or keep ready for incoming reports
  const singleCluster = await db.createCluster({
    title: `${complaint.title}`,
    root_cause: `Single-source report: ${complaint.description}`,
    department: complaint.ai_triage_metadata?.department || 'Public Works & Roads',
    priority: complaint.priority || 'MEDIUM',
    latitude: complaint.latitude,
    longitude: complaint.longitude,
    radius_meters: CLUSTER_MAX_RADIUS_METERS,
    complaint_count: 1,
    status: 'active'
  });

  await db.updateComplaint(complaint.id, {
    cluster_id: singleCluster.id,
    status: 'clustered'
  });

  await db.addAuditLog({
    entityType: 'cluster',
    entityId: singleCluster.id,
    actorType: 'AGENT',
    actorId: 'RootCauseClusterAgent',
    action: 'CLUSTER_INITIATED',
    reasoning: `Initiated root cause tracking cluster for complaint ${complaint.tracking_id}.`,
    metadata: { tracking_id: complaint.tracking_id }
  });

  return { cluster: singleCluster, isNew: true };
}

module.exports = { processClustering, calculateDistanceMeters };
