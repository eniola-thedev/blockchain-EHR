const express    = require("express");
const router     = express.Router();
const recordCtrl = require("../controllers/recordController");
const multer     = require("multer");
const { authenticate, requireRole, blockPatientWrite } = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post("/",                  authenticate, blockPatientWrite, requireRole("doctor", "hospital", "admin"), recordCtrl.createRecord);
router.get("/my-summary",         authenticate, requireRole("patient"), recordCtrl.getPatientSummary);
router.get("/patient/:patientId", authenticate, recordCtrl.getPatientRecords);
router.get("/summary/:patientId", authenticate, recordCtrl.getPatientSummary);
router.get("/:recordId",          authenticate, recordCtrl.getRecord);
router.post("/:recordId/upload",  authenticate, blockPatientWrite, upload.single("file"), recordCtrl.uploadFile);

module.exports = router;
