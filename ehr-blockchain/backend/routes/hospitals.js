const express = require("express");
const router = express.Router();
const { supabase } = require("../services/supabaseClient");
const { authenticate, requireRole } = require("../middleware/auth");

router.get("/", authenticate, async (req, res) => {
  try {
    const { data: hospitals, error } = await supabase
      .from("hospitals")
      .select("id, name, country, license_number, is_verified")
      .eq("is_active", true);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ hospitals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/patient/:patientId/home", authenticate, async (req, res) => {
  try {
    const { data: patient } = await supabase
      .from("users")
      .select("hospital_id")
      .eq("patient_id", req.params.patientId)
      .maybeSingle();
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const { data: hospital } = await supabase
      .from("hospitals")
      .select("id, name, country, phone, email")
      .eq("id", patient.hospital_id)
      .maybeSingle();
    res.json({ homeHospital: hospital });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const { data: hospital, error } = await supabase
      .from("hospitals")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();
    if (!hospital) return res.status(404).json({ error: "Not found" });
    res.json({ hospital });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch(
  "/:id/verify",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { data: hospital, error } = await supabase
        .from("hospitals")
        .update({ is_verified: true })
        .eq("id", req.params.id)
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      res.json({ message: "Hospital verified", hospital });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

module.exports = router;
