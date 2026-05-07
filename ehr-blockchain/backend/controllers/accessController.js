const { AccessRequest, AuditLog } = require("../models/index");
const User = require("../models/User");
const blockchainService = require("../services/blockchainService");

// ─── Request Access (Hospital B → Hospital A's patient) ─────────────
exports.requestAccess = async (req, res) => {
  try {
    const { patientId, reason, isEmergency = false } = req.body;

    // Verify patient exists
    const patient = await User.findOne({ patientId, role: "patient" });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // Prevent duplicate active requests
    const existing = await AccessRequest.findOne({
      patientId,
      requestingHospital: req.user.hospitalId,
      status: { $in: ["pending", "approved"] },
    });
    if (existing) {
      return res.status(409).json({
        error: "Active request already exists",
        request: existing,
      });
    }

    // Auto-approve emergency requests (24h access)
    const status = isEmergency ? "approved" : "pending";
    const grantedAt = isEmergency ? new Date() : null;
    const expiresAt = isEmergency
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : null;

    // Log on blockchain
    let txHash = null;
    try {
      const tx = await blockchainService.requestAccess(patientId, isEmergency);
      txHash = tx?.hash;
    } catch (e) {
      console.warn("Blockchain log failed:", e.message);
    }

    const accessRequest = await AccessRequest.create({
      patientId,
      requestingHospital: req.user.hospitalId,
      homeHospital: patient.hospitalId,
      reason,
      isEmergency,
      status,
      grantedAt,
      expiresAt,
      blockchainTxHash: txHash,
    });

    await AuditLog.create({
      action: "ACCESS_REQUESTED",
      performedBy: req.user._id,
      patientId,
      hospitalId: req.user.hospitalId,
      details: { reason, isEmergency, status, txHash },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: isEmergency
        ? "Emergency access granted for 24 hours"
        : "Access request submitted. Awaiting approval.",
      requestId: accessRequest._id,
      status,
      expiresAt,
      txHash,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Grant Access (Home Hospital approves request) ──────────────────
exports.grantAccess = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { durationHours = 72 } = req.body;

    const request = await AccessRequest.findById(requestId)
      .populate("requestingHospital")
      .populate("homeHospital");

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ error: `Request is already ${request.status}` });
    }

    // Only the home hospital can approve
    const homeHospitalId =
      request.homeHospital?._id?.toString() || request.homeHospital?.toString();
    const userHospitalId =
      req.user.hospitalId?._id?.toString() || req.user.hospitalId?.toString();

    if (
      !homeHospitalId ||
      !userHospitalId ||
      homeHospitalId !== userHospitalId
    ) {
      return res
        .status(403)
        .json({ error: "Only the home hospital can grant access" });
    }

    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    request.status = "approved";
    request.grantedAt = new Date();
    request.expiresAt = expiresAt;
    await request.save();

    // Log on blockchain
    let txHash = null;
    try {
      const tx = await blockchainService.grantAccess(
        request.patientId,
        request.requestingHospital.walletAddress,
        durationHours * 3600,
      );
      txHash = tx?.hash;
      request.blockchainTxHash = txHash;
      await request.save();
    } catch (e) {
      console.warn("Blockchain failed:", e.message);
    }

    await AuditLog.create({
      action: "ACCESS_GRANTED",
      performedBy: req.user._id,
      patientId: request.patientId,
      hospitalId: req.user.hospitalId,
      details: {
        grantedTo: request.requestingHospital.name,
        durationHours,
        expiresAt,
        txHash,
      },
      ipAddress: req.ip,
    });

    res.json({
      message: `Access granted for ${durationHours} hours`,
      expiresAt,
      txHash,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Revoke Access ──────────────────────────────────────────────────
exports.revokeAccess = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await AccessRequest.findById(requestId);

    if (!request) return res.status(404).json({ error: "Request not found" });

    request.status = "revoked";
    request.revokedAt = new Date();
    request.revokedBy = req.user._id;
    await request.save();

    // Blockchain revoke
    try {
      const hospital = await require("../models/index").Hospital.findById(
        request.requestingHospital,
      );
      if (hospital?.walletAddress) {
        await blockchainService.revokeAccess(
          request.patientId,
          hospital.walletAddress,
        );
      }
    } catch (e) {
      /* non-critical */
    }

    res.json({ message: "Access revoked successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Incoming Requests (for home hospital) ──────────────────────
exports.getIncomingRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { homeHospital: req.user.hospitalId };
    if (status) filter.status = status;

    const requests = await AccessRequest.find(filter)
      .populate("requestingHospital", "name country licenseNumber")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Outgoing Requests (for requesting hospital) ────────────────
exports.getOutgoingRequests = async (req, res) => {
  try {
    const requests = await AccessRequest.find({
      requestingHospital: req.user.hospitalId,
    })
      .populate("homeHospital", "name country")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Check Access Status ────────────────────────────────────────────
exports.checkAccess = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await User.findOne({ patientId, role: "patient" });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // Check if requesting hospital is the home hospital
    const isHome =
      patient.hospitalId?.toString() === req.user.hospitalId?.toString();
    if (isHome) return res.json({ hasAccess: true, type: "home_hospital" });

    // Check grant
    const grant = await AccessRequest.findOne({
      patientId,
      requestingHospital: req.user.hospitalId,
      status: "approved",
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });

    if (grant) {
      return res.json({
        hasAccess: true,
        type: grant.isEmergency ? "emergency" : "granted",
        expiresAt: grant.expiresAt,
        grantedAt: grant.grantedAt,
      });
    }

    res.json({ hasAccess: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Available Hospitals (for sending access requests) ──────────
exports.getAvailableHospitals = async (req, res) => {
  try {
    const { search } = req.query;

    // Get all hospitals except the current user's hospital
    const filter = {
      isActive: true,
      isVerified: true,
      _id: { $ne: req.user.hospitalId },
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { licenseNumber: { $regex: search, $options: "i" } },
      ];
    }

    const hospitals = await require("../models/index")
      .Hospital.find(filter)
      .select("_id name address phone email licenseNumber")
      .sort({ name: 1 });

    res.json({
      hospitals: hospitals.map((h) => ({
        _id: h._id,
        name: h.name,
        address: h.address,
        phone: h.phone,
        email: h.email,
        licenseNumber: h.licenseNumber,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
