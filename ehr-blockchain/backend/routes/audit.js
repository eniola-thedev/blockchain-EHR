const express = require("express");
const router = express.Router();
const { supabase } = require("../services/supabaseClient");
const { authenticate, requireRole } = require("../middleware/auth");

router.get(
  "/",
  authenticate,
  requireRole("hospital", "admin"),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, action } = req.query;

      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (action) query = query.eq("action", action);

      const { data: logs, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      res.json({ logs, page: Number(page) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.get(
  "/patient/:patientId",
  authenticate,
  requireRole("hospital", "admin"),
  async (req, res) => {
    try {
      const { data: logs, error } = await supabase
        .from("audit_logs")
        .select("*")
        .contains("details", { patientId: req.params.patientId })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ logs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

module.exports = router;
