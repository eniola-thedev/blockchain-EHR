const express    = require("express");
const router     = express.Router();
const { AuditLog } = require("../models/index");
const { authenticate, requireRole } = require("../middleware/auth");

router.get("/", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const { page = 1, limit = 50, action, patientId } = req.query;
    const filter = {};
    if (action)    filter.action    = action;
    if (patientId) filter.patientId = patientId;

    const total = await AuditLog.countDocuments(filter);
    const logs  = await AuditLog.find(filter)
      .populate("performedBy", "email role firstName lastName")
      .populate("hospitalId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ logs, total, page: Number(page) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/patient/:patientId", authenticate, requireRole("hospital", "admin"), async (req, res) => {
  try {
    const logs = await AuditLog.find({ patientId: req.params.patientId })
      .populate("performedBy", "email role")
      .populate("hospitalId", "name")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ logs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
