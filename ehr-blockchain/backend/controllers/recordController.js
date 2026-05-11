const { MedicalRecord, AuditLog } = require("../models/index");
const User = require("../models/User");
const blockchainService = require("../services/blockchainService");
const ipfsService = require("../services/ipfsService");
const encryptionService = require("../services/encryptionService");
const MedicationInteractionService = require("../services/medicationInteractionService");
const crypto = require("crypto");

// ─── Create Medical Record ──────────────────────────────────────────
exports.createRecord = async (req, res) => {
  try {
    const {
      patientId,
      recordType,
      title,
      description,
      diagnosis,
      medications,
      labResults,
      vitalSigns,
    } = req.body;

    // Verify patient exists
    const patient = await User.findOne({ patientId, role: "patient" });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // Check for medication interactions and vital sign abnormalities
    const interactions = MedicationInteractionService.checkInteractions(
      medications || [],
    );
    const abnormalities = MedicationInteractionService.checkAbnormalities(
      vitalSigns,
      labResults,
    );

    // Prepare record data
    const recordData = {
      patientId,
      recordType,
      title,
      description,
      diagnosis,
      medications,
      labResults,
      vitalSigns,
      createdAt: new Date().toISOString(),
      hospitalName: req.user.hospitalId?.name || "Unknown",
      doctorName:
        `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
    };

    // 1. Encrypt the record data
    const encrypted = encryptionService.encryptData(JSON.stringify(recordData));

    // 2. Upload encrypted data to IPFS
    const ipfsResult = await ipfsService.uploadJSON(encrypted);
    const ipfsHash = ipfsResult.cid;

    // 3. Create hash of the record for blockchain
    const dataHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(recordData))
      .digest("hex");

    // 4. Store hash on blockchain
    let txHash = null;
    try {
      const tx = await blockchainService.addRecord(
        patientId,
        ipfsHash,
        recordType,
        req.user.hospitalId?.walletAddress,
      );
      txHash = tx.hash;
    } catch (blockchainErr) {
      console.warn(
        "Blockchain write failed (non-critical):",
        blockchainErr.message,
      );
      // Continue — blockchain failure shouldn't block record creation
    }

    // 5. Save to MongoDB
    const record = await MedicalRecord.create({
      patientId,
      patientUser: patient._id,
      recordType,
      title,
      description,
      diagnosis,
      medications: medications || [],
      labResults: labResults || [],
      vitalSigns: vitalSigns || {},
      ipfsDataHash: ipfsHash,
      blockchainTxHash: txHash,
      createdByHospital: req.user.hospitalId,
      createdByDoctor: req.user._id,
      doctorName: recordData.doctorName,
      hospitalName: recordData.hospitalName,
    });

    // 6. Audit log
    await AuditLog.create({
      action: "RECORD_CREATED",
      performedBy: req.user._id,
      patientId,
      hospitalId: req.user.hospitalId,
      resourceId: record._id.toString(),
      details: { recordType, title, txHash, ipfsHash },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: "Medical record created successfully",
      recordId: record._id,
      ipfsHash,
      txHash,
      warnings: {
        interactions: interactions.length > 0 ? interactions : null,
        abnormalities: abnormalities.length > 0 ? abnormalities : null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Patient Records ────────────────────────────────────────────
exports.getPatientRecords = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { type, page = 1, limit = 20 } = req.query;

    // Check access
    const hasAccess = await checkRecordAccess(req.user, patientId);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "No access to this patient's records" });
    }

    const filter = { patientId, isDeleted: false };
    if (type) filter.recordType = type;

    const total = await MedicalRecord.countDocuments(filter);
    const records = await MedicalRecord.find(filter)
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("createdByDoctor", "firstName lastName specialization")
      .populate("createdByHospital", "name");

    // Log the access
    await AuditLog.create({
      action: "RECORD_VIEWED",
      performedBy: req.user._id,
      patientId,
      hospitalId: req.user.hospitalId,
      details: { recordCount: records.length, filter: type || "all" },
      ipAddress: req.ip,
    });

    // Also log on blockchain
    try {
      await blockchainService.logRecordAccess(patientId, "RECORD_VIEWED");
    } catch (e) {
      /* non-critical */
    }

    res.json({
      records,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Single Record ──────────────────────────────────────────────
exports.getRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.recordId)
      .populate("createdByDoctor", "firstName lastName specialization")
      .populate("createdByHospital", "name address");

    if (!record) return res.status(404).json({ error: "Record not found" });

    const hasAccess = await checkRecordAccess(req.user, record.patientId);
    if (!hasAccess) return res.status(403).json({ error: "Access denied" });

    await AuditLog.create({
      action: "RECORD_VIEWED",
      performedBy: req.user._id,
      patientId: record.patientId,
      hospitalId: req.user.hospitalId,
      resourceId: record._id.toString(),
      ipAddress: req.ip,
    });

    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Upload File to Record ──────────────────────────────────────────
exports.uploadFile = async (req, res) => {
  try {
    const { recordId } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file provided" });

    const record = await MedicalRecord.findById(recordId);
    if (!record) return res.status(404).json({ error: "Record not found" });

    // Upload to IPFS
    const ipfsResult = await ipfsService.uploadFile(
      file.buffer,
      file.originalname,
    );

    // Add to record attachments
    record.attachments.push({
      fileName: file.originalname,
      ipfsHash: ipfsResult.cid,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    });

    await record.save();

    res.json({
      message: "File uploaded successfully",
      ipfsHash: ipfsResult.cid,
      fileName: file.originalname,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Patient Summary (for patient portal) ───────────────────────
exports.getPatientSummary = async (req, res) => {
  try {
    const patientId = req.user.patientId;

    // Patients can only access their own data
    if (req.user.role === "patient" && !patientId) {
      return res.status(400).json({ error: "Patient ID not found" });
    }

    const pid = req.user.role === "patient" ? patientId : req.params.patientId;

    const patient = await User.findOne({
      patientId: pid,
      role: "patient",
    }).select("-password");
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const recordCounts = await MedicalRecord.aggregate([
      { $match: { patientId: pid, isDeleted: false } },
      { $group: { _id: "$recordType", count: { $sum: 1 } } },
    ]);

    const recentRecords = await MedicalRecord.find({
      patientId: pid,
      isDeleted: false,
    })
      .select("recordType title createdAt hospitalName doctorName")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      patient: patient.toSafeObject(),
      recordCounts,
      recentRecords,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Helper: Check Record Access ───────────────────────────────────
async function checkRecordAccess(user, patientId) {
  // Admins see all
  if (user.role === "admin") return true;

  // Patients see only their own records
  if (user.role === "patient") {
    return user.patientId === patientId;
  }

  // Doctors/Hospitals: check if home hospital or has access grant
  const { AccessRequest } = require("../models/index");

  // Get the user's hospital ID as a string for comparison
  // Note: user.hospitalId may be a populated document, so we need to extract _id
  const userHospitalId = user.hospitalId?._id || user.hospitalId;

  // Is this the patient's home hospital?
  const patient = await User.findOne({ patientId, role: "patient" });
  if (!patient) return false;

  if (patient.hospitalId?.toString() === userHospitalId.toString())
    return true;

  // Check if access was granted via inter-hospital request
  const grant = await AccessRequest.findOne({
    patientId,
    requestingHospital: userHospitalId,
    status: "approved",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });

  if (grant) return true;

  // Also check if patient is registered at user's hospital (registeredHospitals)
  if (patient.registeredHospitals && patient.registeredHospitals.length > 0) {
    const isRegisteredAtUserHospital = patient.registeredHospitals.some(
      (h) => h.toString() === userHospitalId.toString()
    );
    if (isRegisteredAtUserHospital) return true;
  }

  return false;
}
