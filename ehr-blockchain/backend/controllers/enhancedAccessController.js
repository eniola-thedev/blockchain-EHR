/**
 * Enhanced Access Control & Inter-Hospital Communication
 * REDESIGNED: Fixed inter-hospital request flow
 *
 * KEY PRINCIPLES:
 * - requestingHospital = hospital making the request (wants records)
 * - targetHospital = hospital that HAS the records (being requested from)
 * - INCOMING = requests TO this hospital (this hospital has records being requested)
 * - OUTGOING = requests FROM this hospital (this hospital is requesting records)
 */

const {
  AccessRequest,
  MedicalRecord,
  Hospital,
  AuditLog,
} = require("../models/index");
const User = require("../models/User");
const blockchainService = require("../services/blockchainService");

// ─── Request Medical Records (Hospital to Hospital) ──────────────────
exports.requestMedicalRecords = async (req, res) => {
  try {
    const {
      patientId,
      targetHospitalId,
      reason,
      recordTypes,
      isEmergency = false,
      duration = 72,
    } = req.body;

    if (!patientId || !targetHospitalId || !reason) {
      return res.status(400).json({
        error: "patientId, targetHospitalId, and reason are required",
      });
    }

    // Verify user's hospital
    if (!req.user.hospitalId) {
      return res
        .status(403)
        .json({ error: "User not affiliated with a hospital" });
    }

    const requestingHospitalId = req.user.hospitalId;

    // Prevent same-hospital requests
    if (requestingHospitalId.toString() === targetHospitalId.toString()) {
      return res.status(400).json({
        error:
          "Cannot request records from your own hospital. Use internal record access instead.",
      });
    }

    // Verify target hospital exists
    const targetHospital = await Hospital.findById(targetHospitalId);
    if (!targetHospital) {
      return res.status(404).json({ error: "Target hospital not found" });
    }

    // Verify patient exists
    const patient = await User.findOne({
      patientId,
      role: "patient",
    });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Check if patient is allowed at target hospital.
    // Patient can access records at target hospital if:
    // 1. Patient is registered at the target hospital (registeredHospitals includes targetHospitalId), OR
    // 2. There's an approved AccessRequest between requesting and target hospitals
    const isRegisteredAtTarget =
      patient.registeredHospitals &&
      patient.registeredHospitals.some(
        (h) => h.toString() === targetHospitalId.toString(),
      );

    const approvedAccess = await AccessRequest.findOne({
      patientId,
      requestingHospital: requestingHospitalId,
      targetHospital: targetHospitalId,
      status: "approved",
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });

    if (!isRegisteredAtTarget && !approvedAccess) {
      return res.status(403).json({
        error: "Patient is not registered at target hospital",
        patientHospital: patient.hospitalId?.toString?.() ?? patient.hospitalId,
        targetHospital: targetHospitalId,
        registeredHospitals: patient.registeredHospitals?.length || 0,
      });
    }

    // Check for existing active request
    const existingRequest = await AccessRequest.findOne({
      patientId,
      requestingHospital: requestingHospitalId,
      targetHospital: targetHospitalId,
      status: { $in: ["pending", "approved"] },
    });

    if (existingRequest) {
      return res.status(409).json({
        error:
          "Active request already exists for this patient from this hospital",
        requestId: existingRequest._id,
      });
    }

    // Calculate expiry date
    const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);

    // Create access request
    const accessRequest = await AccessRequest.create({
      patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      requestingHospital: requestingHospitalId,
      targetHospital: targetHospitalId,
      homeHospital: targetHospitalId, // For backward compatibility
      reason,
      recordTypes: recordTypes || ["all"],
      isEmergency,
      status: isEmergency ? "approved" : "pending", // Auto-approve emergency
      expiresAt,
      grantedAt: isEmergency ? new Date() : null,
    });

    // Log on blockchain
    let txHash = null;
    try {
      const tx = await blockchainService.requestAccess(patientId, isEmergency);
      txHash = tx.hash;
      await AccessRequest.findByIdAndUpdate(accessRequest._id, {
        blockchainTxHash: txHash,
      });
    } catch (blockchainErr) {
      console.warn(
        "Blockchain write failed (non-critical):",
        blockchainErr.message,
      );
    }

    // Audit log
    await AuditLog.create({
      action: "ACCESS_REQUESTED",
      performedBy: req.user._id,
      patientId,
      hospitalId: req.user.hospitalId,
      resourceId: accessRequest._id.toString(),
      details: {
        reason,
        isEmergency,
        duration,
        recordTypes: recordTypes || ["all"],
        txHash,
        requestingHospital: requestingHospitalId.toString(),
        targetHospital: targetHospitalId,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: isEmergency
        ? "Emergency access auto-approved"
        : "Access request submitted successfully",
      requestId: accessRequest._id,
      status: accessRequest.status,
      expiresAt,
      txHash,
    });
  } catch (err) {
    console.error("Error requesting medical records:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Incoming Requests (requests TO this hospital) ─────────────────
exports.getIncomingRequests = async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;

    if (!req.user.hospitalId) {
      return res
        .status(403)
        .json({ error: "User not affiliated with a hospital" });
    }

    // Filter requests WHERE THIS HOSPITAL IS THE TARGET (has the records)
    // Use $or to handle both new records (targetHospital) and old records (homeHospital)
    // For old records: must ALSO check that requestingHospital ≠ this hospital
    //   (to exclude self-requests where both requesting and home are the same hospital)
    const filter = {
      $or: [
        { targetHospital: req.user.hospitalId },
        {
          homeHospital: req.user.hospitalId,
          requestingHospital: { $ne: req.user.hospitalId },
          targetHospital: { $exists: false },
        },
      ],
    };

    if (status !== "all") {
      filter.status = status;
    }

    const total = await AccessRequest.countDocuments(filter);
    const requests = await AccessRequest.find(filter)
      .populate("requestingHospital", "name email phone address")
      .populate("targetHospital", "name")
      .select("-blockchainTxHash")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Enrich with patient info (limited fields)
    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        const patient = await User.findOne({
          patientId: req.patientId,
          role: "patient",
        }).select("firstName lastName dateOfBirth bloodGroup genotype phone");

        return {
          ...req.toObject(),
          patient: patient
            ? {
                id: patient.patientId,
                name: `${patient.firstName} ${patient.lastName}`,
                dateOfBirth: patient.dateOfBirth,
                bloodGroup: patient.bloodGroup,
                genotype: patient.genotype,
                phone: patient.phone,
              }
            : null,
          requestingHospitalName: req.requestingHospital?.name,
          action: req.status === "pending" ? "NEEDS_ACTION" : "VIEWED",
        };
      }),
    );

    res.json({
      requests: enrichedRequests,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
      filters: { status: status !== "all" ? status : null },
    });
  } catch (err) {
    console.error("Error fetching incoming requests:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Outgoing Requests (requests FROM this hospital) ────────────────
exports.getOutgoingRequests = async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;

    if (!req.user.hospitalId) {
      return res
        .status(403)
        .json({ error: "User not affiliated with a hospital" });
    }

    // Filter requests WHERE THIS HOSPITAL IS THE REQUESTER (sending hospital)
    const filter = {
      requestingHospital: req.user.hospitalId,
    };

    if (status !== "all") {
      filter.status = status;
    }

    const total = await AccessRequest.countDocuments(filter);
    const requests = await AccessRequest.find(filter)
      .populate("requestingHospital", "name")
      .populate("targetHospital", "name email phone address")
      .select("-blockchainTxHash")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Enrich with patient info
    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        return {
          ...req.toObject(),
          targetHospitalName: req.targetHospital?.name,
          canRevoke: req.status === "approved",
        };
      }),
    );

    res.json({
      requests: enrichedRequests,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
      filters: { status: status !== "all" ? status : null },
    });
  } catch (err) {
    console.error("Error fetching outgoing requests:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Approve Access Request ──────────────────────────────────────────
exports.approveAccessRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { duration = 72 } = req.body;

    if (!req.user.hospitalId) {
      return res
        .status(403)
        .json({ error: "User not affiliated with a hospital" });
    }

    const accessRequest = await AccessRequest.findById(requestId);
    if (!accessRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Only target hospital (record owner) can approve
    // Use targetHospital if it exists, otherwise use homeHospital (for old records)
    const targetHospitalId =
      accessRequest.targetHospital || accessRequest.homeHospital;

    if (req.user.hospitalId.toString() !== targetHospitalId.toString()) {
      return res.status(403).json({
        error: "Only the hospital with the records can approve this request",
      });
    }

    if (accessRequest.status !== "pending") {
      return res.status(400).json({
        error: `Cannot approve request with status: ${accessRequest.status}`,
      });
    }

    // Update request
    const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);
    accessRequest.status = "approved";
    accessRequest.grantedAt = new Date();
    accessRequest.expiresAt = expiresAt;

    // Log on blockchain
    let txHash = null;
    try {
      const tx = await blockchainService.grantAccess(
        accessRequest.patientId,
        accessRequest.requestingHospital,
      );
      txHash = tx.hash;
      accessRequest.blockchainTxHash = txHash;
    } catch (blockchainErr) {
      console.warn(
        "Blockchain write failed (non-critical):",
        blockchainErr.message,
      );
    }

    await accessRequest.save();

    // Audit log
    await AuditLog.create({
      action: "ACCESS_GRANTED",
      performedBy: req.user._id,
      patientId: accessRequest.patientId,
      hospitalId: req.user.hospitalId,
      resourceId: requestId,
      details: {
        requestingHospital: accessRequest.requestingHospital.toString(),
        duration,
        expiresAt,
        txHash,
      },
      ipAddress: req.ip,
    });

    res.json({
      message: "Access approved successfully",
      requestId,
      status: "approved",
      expiresAt,
      txHash,
    });
  } catch (err) {
    console.error("Error approving request:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Deny Access Request ─────────────────────────────────────────────
exports.denyAccessRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { denialReason } = req.body;

    if (!req.user.hospitalId) {
      return res
        .status(403)
        .json({ error: "User not affiliated with a hospital" });
    }

    const accessRequest = await AccessRequest.findById(requestId);
    if (!accessRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Only target hospital can deny
    const targetHospitalId =
      accessRequest.targetHospital || accessRequest.homeHospital;

    if (req.user.hospitalId.toString() !== targetHospitalId.toString()) {
      return res.status(403).json({
        error: "Only the hospital with the records can deny this request",
      });
    }

    if (accessRequest.status !== "pending") {
      return res.status(400).json({
        error: `Cannot deny request with status: ${accessRequest.status}`,
      });
    }

    accessRequest.status = "denied";
    await accessRequest.save();

    // Audit log
    await AuditLog.create({
      action: "ACCESS_DENIED",
      performedBy: req.user._id,
      patientId: accessRequest.patientId,
      hospitalId: req.user.hospitalId,
      resourceId: requestId,
      details: { denialReason: denialReason || "Not specified" },
      ipAddress: req.ip,
    });

    res.json({
      message: "Access request denied",
      requestId,
      status: "denied",
    });
  } catch (err) {
    console.error("Error denying request:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Revoke Access ──────────────────────────────────────────────────
exports.revokeAccess = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!req.user.hospitalId) {
      return res
        .status(403)
        .json({ error: "User not affiliated with a hospital" });
    }

    const accessRequest = await AccessRequest.findById(requestId);
    if (!accessRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Only target hospital can revoke
    const targetHospitalId =
      accessRequest.targetHospital || accessRequest.homeHospital;

    if (req.user.hospitalId.toString() !== targetHospitalId.toString()) {
      return res.status(403).json({
        error: "Only the hospital with the records can revoke access",
      });
    }

    if (accessRequest.status !== "approved") {
      return res.status(400).json({
        error: `Cannot revoke access for request with status: ${accessRequest.status}`,
      });
    }

    accessRequest.status = "revoked";
    accessRequest.revokedAt = new Date();
    accessRequest.revokedBy = req.user._id;

    // Log on blockchain
    let txHash = null;
    try {
      const tx = await blockchainService.revokeAccess(
        accessRequest.patientId,
        accessRequest.requestingHospital,
      );
      txHash = tx.hash;
      accessRequest.blockchainTxHash = txHash;
    } catch (blockchainErr) {
      console.warn(
        "Blockchain write failed (non-critical):",
        blockchainErr.message,
      );
    }

    await accessRequest.save();

    // Audit log
    await AuditLog.create({
      action: "ACCESS_REVOKED",
      performedBy: req.user._id,
      patientId: accessRequest.patientId,
      hospitalId: req.user.hospitalId,
      resourceId: requestId,
      details: { txHash },
      ipAddress: req.ip,
    });

    res.json({
      message: "Access revoked successfully",
      requestId,
      status: "revoked",
      txHash,
    });
  } catch (err) {
    console.error("Error revoking access:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Access Status for a Patient ─────────────────────────────────
exports.getAccessStatus = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Get all active access requests for this patient
    const activeAccess = await AccessRequest.find({
      patientId,
      status: "approved",
      expiresAt: { $gt: new Date() },
    })
      .populate("requestingHospital", "name email")
      .select("requestingHospital grantedAt expiresAt");

    // Get access history (last 10 requests)
    const history = await AccessRequest.find({
      patientId,
      status: { $in: ["approved", "denied", "revoked"] },
    })
      .populate("requestingHospital", "name")
      .populate("targetHospital", "name")
      .select(
        "status createdAt grantedAt expiresAt requestingHospital targetHospital reason",
      )
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      patientId,
      activeAccessCount: activeAccess.length,
      activeAccess: activeAccess.map((a) => ({
        hospital: a.requestingHospital?.name,
        grantedAt: a.grantedAt,
        expiresAt: a.expiresAt,
        hoursRemaining: Math.max(
          0,
          Math.floor((a.expiresAt - new Date()) / (1000 * 60 * 60)),
        ),
      })),
      accessHistory: history.map((h) => ({
        status: h.status,
        requestedAt: h.createdAt,
        grantedAt: h.grantedAt,
        expiresAt: h.expiresAt,
        requestingHospital: h.requestingHospital?.name,
        targetHospital: h.targetHospital?.name,
        reason: h.reason,
      })),
    });
  } catch (err) {
    console.error("Error getting access status:", err);
    res.status(500).json({ error: err.message });
  }
};

// ─── List All Hospitals (for hospital discovery) ──────────────────────
// Returns all active hospitals EXCEPT the user's own hospital
// (users cannot request records from their own hospital)
exports.getVerifiedHospitals = async (req, res) => {
  try {
    // Build filter: exclude own hospital if user belongs to one
    const filter = { isActive: true };

    if (req.user.hospitalId) {
      filter._id = { $ne: req.user.hospitalId };
    }

    const hospitals = await Hospital.find(filter).select(
      "_id name email phone address country licenseNumber walletAddress",
    );

    res.json({
      hospitals,
      totalCount: hospitals.length,
    });
  } catch (err) {
    console.error("Error fetching hospitals:", err);
    res.status(500).json({ error: err.message });
  }
};
