/**
 * Enhanced Access Control Routes
 * Inter-hospital communication and record sharing
 */

const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");
const enhancedAccessController = require("../controllers/enhancedAccessController");
const patientDirectoryController = require("../controllers/patientDirectoryController");

const router = express.Router();

// ─── Request Medical Records (Hospital to Hospital) ──────────────────
router.post(
  "/request",
  authenticate,
  requireRole("hospital", "doctor", "admin"),
  enhancedAccessController.requestMedicalRecords,
);

// ─── Get Incoming Requests (for home hospital) ──────────────────────
router.get(
  "/incoming",
  authenticate,
  requireRole("hospital", "admin"),
  enhancedAccessController.getIncomingRequests,
);

// ─── Get Outgoing Requests (my hospital's requests) ──────────────────
router.get(
  "/outgoing",
  authenticate,
  requireRole("hospital", "doctor", "admin"),
  enhancedAccessController.getOutgoingRequests,
);

// ─── Approve Request ────────────────────────────────────────────────
router.post(
  "/:requestId/approve",
  authenticate,
  requireRole("hospital", "admin"),
  enhancedAccessController.approveAccessRequest,
);

// ─── Deny Request ──────────────────────────────────────────────────
router.post(
  "/:requestId/deny",
  authenticate,
  requireRole("hospital", "admin"),
  enhancedAccessController.denyAccessRequest,
);

// ─── Revoke Access ────────────────────────────────────────────────
router.post(
  "/:requestId/revoke",
  authenticate,
  requireRole("hospital", "admin"),
  enhancedAccessController.revokeAccess,
);

// ─── Check Access Status ───────────────────────────────────────────
router.get(
  "/status/:patientId",
  authenticate,
  requireRole("hospital", "doctor", "admin", "patient"),
  enhancedAccessController.getAccessStatus,
);

// ─── Network-wide Patients (for inter-hospital request page) ─────────
router.get(
  "/patients",
  authenticate,
  requireRole("hospital", "doctor", "admin"),
  patientDirectoryController.listNetworkPatients,
);

// ─── Get Verified Hospitals (for discovery) ────────────────────────
router.get(
  "/hospitals/verified",
  authenticate,
  enhancedAccessController.getVerifiedHospitals,
);

module.exports = router;
