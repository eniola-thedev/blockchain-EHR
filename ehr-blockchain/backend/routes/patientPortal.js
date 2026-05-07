/**
 * Patient Portal Routes
 * Enhanced patient viewing capabilities
 */

const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");
const patientPortalController = require("../controllers/patientPortalController");

const router = express.Router();

// ─── Patient Profile & Demographics ─────────────────────────────────
router.get(
  "/profile",
  authenticate,
  requireRole("patient", "admin"),
  patientPortalController.getPatientProfile,
);

router.get(
  "/profile/:patientId",
  authenticate,
  requireRole("admin"),
  patientPortalController.getPatientProfile,
);

// ─── Timeline View ──────────────────────────────────────────────────
router.get(
  "/timeline",
  authenticate,
  requireRole("patient", "admin"),
  patientPortalController.getRecordTimeline,
);

router.get(
  "/timeline/:patientId",
  authenticate,
  requireRole("admin", "doctor"),
  patientPortalController.getRecordTimeline,
);

// ─── Lab Results ────────────────────────────────────────────────────
router.get(
  "/lab-results",
  authenticate,
  requireRole("patient", "admin"),
  patientPortalController.getLabResults,
);

router.get(
  "/lab-results/:patientId",
  authenticate,
  requireRole("admin", "doctor"),
  patientPortalController.getLabResults,
);

// ─── Current Medications ───────────────────────────────────────────
router.get(
  "/medications",
  authenticate,
  requireRole("patient", "admin"),
  patientPortalController.getCurrentMedications,
);

router.get(
  "/medications/:patientId",
  authenticate,
  requireRole("admin", "doctor"),
  patientPortalController.getCurrentMedications,
);

// ─── Vital Signs Trends ────────────────────────────────────────────
router.get(
  "/vital-trends",
  authenticate,
  requireRole("patient", "admin"),
  patientPortalController.getVitalSignsTrends,
);

router.get(
  "/vital-trends/:patientId",
  authenticate,
  requireRole("admin", "doctor"),
  patientPortalController.getVitalSignsTrends,
);

// ─── Search Records ────────────────────────────────────────────────
router.get(
  "/search",
  authenticate,
  requireRole("hospital", "doctor", "admin"),
  patientPortalController.searchRecords,
);

// ─── Export Summary ────────────────────────────────────────────────
router.get(
  "/export",
  authenticate,
  requireRole("patient", "admin"),
  patientPortalController.exportRecordsSummary,
);

router.get(
  "/export/:patientId",
  authenticate,
  requireRole("admin"),
  patientPortalController.exportRecordsSummary,
);

module.exports = router;
