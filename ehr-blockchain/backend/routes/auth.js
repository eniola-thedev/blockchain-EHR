// routes/auth.js
const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");
const { authenticate, requireRole } = require("../middleware/auth");

router.post("/register/hospital", authCtrl.registerHospital);
router.post(
  "/register/patient",
  authenticate,
  requireRole("hospital", "doctor", "admin"),
  authCtrl.registerPatient,
);
router.post(
  "/register/patient-by-doctor",
  authenticate,
  requireRole("doctor"),
  authCtrl.registerPatientByDoctor,
);
router.post(
  "/register/doctor",
  authenticate,
  requireRole("hospital", "admin"),
  authCtrl.registerDoctor,
);
router.post("/login", authCtrl.login);
router.get("/me", authenticate, authCtrl.getMe);

module.exports = router;
