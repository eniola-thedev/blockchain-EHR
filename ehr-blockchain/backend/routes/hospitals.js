const express  = require("express");
const router   = express.Router();
const { Hospital } = require("../models/index");
const User     = require("../models/User");
const { authenticate, requireRole } = require("../middleware/auth");

router.get("/", authenticate, async (req, res) => {
  try {
    const hospitals = await Hospital.find({ isActive: true })
      .select("name country licenseNumber isVerified");
    res.json({ hospitals });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/patient/:patientId/home", authenticate, async (req, res) => {
  try {
    const patient = await User.findOne({ patientId: req.params.patientId })
      .populate("hospitalId", "name country phone email");
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json({ homeHospital: patient.hospitalId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id).select("-__v");
    if (!hospital) return res.status(404).json({ error: "Not found" });
    res.json({ hospital });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch("/:id/verify", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id, { isVerified: true }, { new: true }
    );
    if (!hospital) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Hospital verified", hospital });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
