// models/Hospital.js
const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    licenseNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    address: String,
    country: { type: String, default: "Nigeria" },
    walletAddress: { type: String, unique: true, sparse: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    adminUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const Hospital = mongoose.model("Hospital", hospitalSchema);

// ─────────────────────────────────────────────────────────────────────

// models/MedicalRecord.js
const medicalRecordSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    patientUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    recordType: {
      type: String,
      enum: [
        "diagnosis",
        "prescription",
        "lab_result",
        "imaging",
        "surgery",
        "vaccination",
        "general",
      ],
      required: true,
    },

    // Core medical data (stored off-chain in MongoDB, encrypted)
    title: { type: String, required: true },
    description: String,
    diagnosis: String,
    medications: [
      {
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
        notes: String,
      },
    ],
    labResults: [
      {
        testName: String,
        value: String,
        unit: String,
        normalRange: String,
        isAbnormal: Boolean,
      },
    ],
    vitalSigns: {
      bloodPressure: String,
      heartRate: Number,
      temperature: Number,
      weight: Number,
      height: Number,
      oxygenSat: Number,
    },

    // IPFS references (files: PDFs, images, etc.)
    attachments: [
      {
        fileName: String,
        ipfsHash: String, // IPFS CID
        mimeType: String,
        size: Number,
        uploadedAt: Date,
        encryptedKey: String, // AES key encrypted with hospital's public key
      },
    ],

    // On-chain reference
    blockchainTxHash: String, // Transaction hash on blockchain
    ipfsDataHash: String, // Hash of the full record JSON on IPFS

    // Metadata
    createdByHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    createdByDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    doctorName: String,
    hospitalName: String,

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const MedicalRecord = mongoose.model("MedicalRecord", medicalRecordSchema);

// ─────────────────────────────────────────────────────────────────────

// models/AccessRequest.js
const accessRequestSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    patientName: String, // Cached for quick display

    // Clearer naming: who is requesting (sending hospital) and who has the records (receiving hospital)
    requestingHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    },
    targetHospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    }, // Hospital that HAS the patient records

    // For backward compatibility
    homeHospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },

    reason: String,
    isEmergency: { type: Boolean, default: false },
    recordTypes: [{ type: String }], // ["all"] or ["diagnosis", "prescription", etc]

    status: {
      type: String,
      enum: ["pending", "approved", "denied", "expired", "revoked"],
      default: "pending",
    },

    grantedAt: Date,
    expiresAt: Date,
    revokedAt: Date,
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Blockchain reference
    blockchainTxHash: String,
  },
  { timestamps: true },
);

const AccessRequest = mongoose.model("AccessRequest", accessRequestSchema);

// ─────────────────────────────────────────────────────────────────────

// models/AuditLog.js
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "LOGIN",
        "LOGOUT",
        "RECORD_CREATED",
        "RECORD_VIEWED",
        "RECORD_UPDATED",
        "ACCESS_REQUESTED",
        "ACCESS_GRANTED",
        "ACCESS_REVOKED",
        "FILE_UPLOADED",
        "PATIENT_REGISTERED",
        "HOSPITAL_REGISTERED",
      ],
      required: true,
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    patientId: String,
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
    resourceId: String,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    blockchainTx: String,
  },
  { timestamps: true },
);

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = { Hospital, MedicalRecord, AccessRequest, AuditLog };
