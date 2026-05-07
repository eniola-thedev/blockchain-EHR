const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { Hospital, AuditLog, AccessRequest } = require("../models/index");

const generateToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });

const generatePatientId = () => {
  const prefix = "PAT";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const createApprovedAccessRequestsForAllHospitals = async ({
  patientId,
  patientName,
  homeHospitalId,
}) => {
  // Create "approved" off-chain access entries for every verified+active hospital
  // so `checkAccess` returns hasAccess=true.
  const hospitals = await Hospital.find({ isActive: true, isVerified: true }).select(
    "_id"
  );

  if (!homeHospitalId) return;

  const existing = await AccessRequest.find({
    patientId,
    status: "approved",
    requestingHospital: { $in: hospitals.map((h) => h._id) },
  }).select("requestingHospital");

  const existingSet = new Set(existing.map((r) => r.requestingHospital?.toString()));

  const now = new Date();
  const toCreate = hospitals
    .filter((h) => h._id.toString() !== undefined)
    .filter((h) => !existingSet.has(h._id.toString()))
    .map((h) => ({
      patientId,
      patientName,
      requestingHospital: h._id,
      targetHospital: homeHospitalId,
      homeHospital: homeHospitalId,
      reason: "Auto-registered for all hospitals",
      isEmergency: false,
      recordTypes: ["all"],
      status: "approved",
      grantedAt: now,
      expiresAt: null,
    }));

  if (toCreate.length) {
    await AccessRequest.insertMany(toCreate);
  }
};

// ─── Register Hospital ──────────────────────────────────────────────
exports.registerHospital = async (req, res) => {
  try {
    const { name, email, password, licenseNumber, phone, address, country } =
      req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already registered" });

    const hospital = await Hospital.create({
      name,
      licenseNumber,
      email,
      phone,
      address,
      country,
      isVerified: true, // Auto-verified on registration
    });

    const user = await User.create({
      email,
      password,
      role: "hospital",
      hospitalId: hospital._id,
    });

    hospital.adminUser = user._id;
    await hospital.save();

    await AuditLog.create({
      action: "HOSPITAL_REGISTERED",
      performedBy: user._id,
      hospitalId: hospital._id,
      details: { name, licenseNumber },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: "Hospital registered and verified successfully.",
      hospitalId: hospital._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Register Doctor ────────────────────────────────────────────────
exports.registerDoctor = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      doctorLicense,
      specialization,
      department,
    } = req.body;

    // Only hospital admins can register doctors
    if (!["admin", "hospital"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Only hospital admins can register doctors" });
    }

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already registered" });

    const doctor = await User.create({
      email,
      password,
      role: "doctor",
      hospitalId: req.user.hospitalId,
      firstName,
      lastName,
      doctorLicense,
      specialization,
      department,
    });

    await AuditLog.create({
      action: "DOCTOR_REGISTERED",
      performedBy: req.user._id,
      hospitalId: req.user.hospitalId,
      details: { email, doctorLicense },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: "Doctor registered successfully",
      doctorId: doctor._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Register Patient (By Doctor) ───────────────────────────────────
exports.registerPatientByDoctor = async (req, res) => {
  try {
    // Only doctors can register patients
    if (req.user.role !== "doctor") {
      return res
        .status(403)
        .json({ error: "Only doctors can register patients" });
    }

    const {
      firstName,
      lastName,
      email,
      dateOfBirth,
      gender,
      bloodGroup,
      genotype,
      phone,
      address,
      emergencyContact,
    } = req.body;

    // Check if email already exists (if provided)
    if (email) {
      const existing = await User.findOne({ email });
      if (existing)
        return res.status(400).json({ error: "Email already registered" });
    }

    const patientId = generatePatientId();

    // Generate temporary password if no email provided (will be set later)
    const tempPassword = crypto.randomBytes(8).toString("hex");

    const patient = await User.create({
      email: email || `${patientId}@temp.medchain`,
      password: tempPassword,
      role: "patient",
      patientId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup,
      genotype,
      phone,
      address,
      emergencyContact,
      hospitalId: req.user.hospitalId, // Home hospital is the doctor's hospital
      isActive: true,
    });

    await AuditLog.create({
      action: "PATIENT_REGISTERED",
      performedBy: req.user._id,
      patientId,
      hospitalId: req.user.hospitalId,
      details: {
        firstName,
        lastName,
        bloodGroup,
        genotype,
        registeredByDoctor: true,
      },
      ipAddress: req.ip,
    });

    // Auto-register/enable access for all verified+active hospitals
    try {
      await createApprovedAccessRequestsForAllHospitals({
        patientId: patient.patientId,
        patientName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
        homeHospitalId: req.user.hospitalId,
      });
    } catch (e) {
      console.warn("Auto AccessRequest creation failed:", e.message);
    }

    res.status(201).json({
      message: "Patient registered successfully by doctor",
      patientId: patient.patientId,
      userId: patient._id,
      email: patient.email,
      tempPassword: !email ? tempPassword : null,
      note: !email
        ? "Share temporary password with patient. They should update it on first login."
        : "Patient can now login with their email",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Register Patient ───────────────────────────────────────────────
exports.registerPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      gender,
      bloodGroup,
      genotype,
      phone,
      address,
      emergencyContact,
    } = req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already registered" });

    const patientId = generatePatientId();

    const patient = await User.create({
      email,
      password,
      role: "patient",
      patientId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup,
      genotype,
      phone,
      address,
      emergencyContact,
      hospitalId: req.user?.hospitalId, // Home hospital
    });

    await AuditLog.create({
      action: "PATIENT_REGISTERED",
      performedBy: req.user?._id,
      patientId,
      hospitalId: req.user?.hospitalId,
      details: { firstName, lastName, bloodGroup, genotype },
      ipAddress: req.ip,
    });

    // Auto-register/enable access for all verified+active hospitals
    try {
      await createApprovedAccessRequestsForAllHospitals({
        patientId: patient.patientId,
        patientName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
        homeHospitalId: req.user?.hospitalId,
      });
    } catch (e) {
      console.warn("Auto AccessRequest creation failed:", e.message);
    }

    res.status(201).json({
      message: "Patient registered successfully",
      patientId: patient.patientId,
      userId: patient._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Login ──────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email })
      .select("+password")
      .populate("hospitalId");
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.isActive)
      return res.status(401).json({ error: "Account deactivated" });

    const isValid = await user.comparePassword(password);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(user._id, user.role);

    await AuditLog.create({
      action: "LOGIN",
      performedBy: user._id,
      hospitalId: user.hospitalId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Current User ───────────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
};
