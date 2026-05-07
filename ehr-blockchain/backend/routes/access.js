const express = require("express");
const router = express.Router();
const accessCtrl = require("../controllers/accessController");
const { authenticate, requireRole } = require("../middleware/auth");

router.post(
  "/request",
  authenticate,
  requireRole("hospital", "doctor"),
  accessCtrl.requestAccess,
);
router.post(
  "/:requestId/grant",
  authenticate,
  requireRole("hospital", "admin"),
  accessCtrl.grantAccess,
);
router.post(
  "/:requestId/revoke",
  authenticate,
  requireRole("hospital", "admin"),
  accessCtrl.revokeAccess,
);
router.get(
  "/incoming",
  authenticate,
  requireRole("hospital", "admin"),
  accessCtrl.getIncomingRequests,
);
router.get(
  "/outgoing",
  authenticate,
  requireRole("hospital", "doctor", "hospital"),
  accessCtrl.getOutgoingRequests,
);
router.get("/check/:patientId", authenticate, accessCtrl.checkAccess);
router.get(
  "/hospitals/available",
  authenticate,
  requireRole("hospital", "doctor"),
  accessCtrl.getAvailableHospitals,
);

module.exports = router;
