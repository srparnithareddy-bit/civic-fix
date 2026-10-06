const express = require('express');
const router = express.Router();
const db = require('../models/dbStore');

// GET /api/clusters - List clusters
router.get('/', async (req, res) => {
  try {
    const clusters = await db.getClusters();
    const complaints = await db.getComplaints();
    const plans = await db.getPlans();

    // Enrich clusters with linked complaint lists and active plans
    const enriched = clusters.map(cl => {
      const linked = complaints.filter(c => c.cluster_id === cl.id);
      const plan = plans.find(p => p.cluster_id === cl.id) || null;
      return {
        ...cl,
        complaints: linked,
        active_plan: plan
      };
    });

    res.json({ success: true, count: enriched.length, clusters: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/clusters/:id - Cluster details
router.get('/:id', async (req, res) => {
  try {
    const cluster = await db.getClusterById(req.params.id);
    if (!cluster) {
      return res.status(404).json({ success: false, error: 'Cluster not found' });
    }

    const allComplaints = await db.getComplaints();
    const linkedComplaints = allComplaints.filter(c => c.cluster_id === cluster.id);
    
    const allPlans = await db.getPlans();
    const plan = allPlans.find(p => p.cluster_id === cluster.id) || null;
    
    let tasks = [];
    if (plan) {
      tasks = await db.getTasksByPlanId(plan.id);
    }

    const auditLogs = await db.getAuditLogs('cluster', cluster.id);

    res.json({
      success: true,
      cluster,
      complaints: linkedComplaints,
      plan,
      tasks,
      auditLogs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
