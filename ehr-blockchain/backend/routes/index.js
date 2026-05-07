// routes/auth.js
const express    = require("express");
const router     = express.Router();
const authCtrl   = require("../controllers/authController");
const { authenticate, requireRole } = require("../middleware/auth");

router.post("/register/hospital", authCtrl.registerHospital);
router.post("/register/patient",  authenticate, requireRole("hospital", "doctor", "admin"), authCtrl.registerPatient);
router.post("/register/doctor",   authenticate, requireRole("hospital", "admin"), authCtrl.registerDoctor);
router.post("/login",             authCtrl.login);
router.get("/me",                 authenticate, authCtrl.getMe);

module.exports = router;

// ═══════════════════════════════════════════════════════════

// routes/records.js
const recordRouter = express.Router();
const recordCtrl   = require("../controllers/recordController");
const multer       = require("multer");
const { blockPatientWrite } = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/dicom"];
    cb(null, allowed.includes(file.mimetype));
  },
});

recordRouter.post("/",                     authenticate, blockPatientWrite, requireRole("doctor", "hospital", "admin"), recordCtrl.createRecord);
recordRouter.get("/patient/:patientId",    authenticate, recordCtrl.getPatientRecords);
recordRouter.get("/summary/:patientId",    authenticate, recordCtrl.getPatientSummary);
recordRouter.get("/my-summary",            authenticate, requireRole("patient"), recordCtrl.getPatientSummary);
recordRouter.get("/:recordId",             authenticate, recordCtrl.getRecord);
recordRouter.post("/:recordId/upload",     authenticate, blockPatientWrite, upload.single("file"), recordCtrl.uploadFile);

module.exports = { authRouter: router, recordRouter };

// ═══════════════════════════════════════════════════════════

// routes/hospitals.js
const hospitalRouter = express.Router();
const { Hospital }   = require("../models/index");

// Get all hospitals (for inter-hospital lookup)
hospitalRouter.get("/", authenticate, async (req, res) => {
  const hospitals = await Hospital.find({ isActive: true })
    .select("name country licenseNumber isVerified");
  res.json({ hospitals });
});

// Get single hospital
hospitalRouter.get("/:id", authenticate, async (req, res) => {
  const hospital = await Hospital.findById(req.params.id)
    .select("-__v");
  if (!hospital) return res.status(404).json({ error: "Not found" });
  res.json({ hospital });
});

// Admin: verify a hospital
hospitalRouter.patch("/:id/verify", authenticate, requireRole("admin"), async (req, res) => {
  const hospital    = await Hospital.findByIdAndUpdate(
    req.params.id,
    { isVerified: true },
    { new: true }
  );
  if (!hospital) return res.status(404).json({ error: "Not found" });
  res.json({ message: "Hospital verified", hospital });
});

// Lookup patient's home hospital
hospitalRouter.get("/patient/:patientId/home", authenticate, async (req, res) => {
  const User = require("../models/User");
  const patient = await User.findOne({ patientId: req.params.patientId })
    .populate("hospitalId", "name country phone email");
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  res.json({ homeHospital: patient.hospitalId });
});

module.exports = hospitalRouter;

// ═══════════════════════════════════════════════════════════

// routes/access.js
const accessRouter = express.Router();
const accessCtrl   = require("../controllers/accessController");

accessRouter.post("/request",             authenticate, requireRole("hospital", "doctor"), accessCtrl.requestAccess);
accessRouter.post("/:requestId/grant",    authenticate, requireRole("hospital", "admin"),  accessCtrl.grantAccess);
accessRouter.post("/:requestId/revoke",   authenticate, requireRole("hospital", "admin"),  accessCtrl.revokeAccess);
accessRouter.get("/incoming",             authenticate, requireRole("hospital", "admin"),  accessCtrl.getIncomingRequests);
accessRouter.get("/outgoing",             authenticate, requireRole("hospital", "doctor"), accessCtrl.getOutgoingRequests);
accessRouter.get("/check/:patientId",     authenticate, accessCtrl.checkAccess);

module.exports = accessRouter;

// ═══════════════════════════════════════════════════════════

// routes/audit.js
const auditRouter = express.Router();
const { AuditLog } = require("../models/index");

// Get audit logs (admin only)
auditRouter.get("/", authenticate, requireRole("admin"), async (req, res) => {
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
});

// Get audit logs for a specific patient
auditRouter.get("/patient/:patientId", authenticate, requireRole("hospital", "admin"), async (req, res) => {
  const logs = await AuditLog.find({ patientId: req.params.patientId })
    .populate("performedBy", "email role")
    .populate("hospitalId", "name")
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ logs });
});

module.exports = { auditRouter };
