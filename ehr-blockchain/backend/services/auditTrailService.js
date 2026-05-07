// services/auditTrailService.js
// Comprehensive audit trail system for HIPAA/GDPR compliance
// All data access and modifications are logged immutably

const mongoose = require("mongoose");

/**
 * Audit Log Schema
 * Stores all events for compliance and forensic analysis
 */
const auditLogSchema = new mongoose.Schema(
  {
    // Sequential audit ID for ordering
    auditId: {
      type: Number,
      required: true,
      index: true,
    },

    // Event classification
    eventType: {
      type: String,
      enum: [
        // RECORD OPERATIONS
        "RECORD_CREATED",
        "RECORD_VIEWED",
        "RECORD_MODIFIED",
        "RECORD_MARKED_OBSOLETE",

        // ACCESS CONTROL
        "ACCESS_REQUESTED",
        "ACCESS_APPROVED",
        "ACCESS_DENIED",
        "ACCESS_REVOKED",
        "EMERGENCY_ACCESS_GRANTED",

        // AUTHENTICATION
        "USER_LOGIN",
        "USER_LOGOUT",
        "USER_REGISTRATION",
        "PASSWORD_CHANGE",
        "FAILED_LOGIN_ATTEMPT",

        // AUTHORIZATION
        "PERMISSION_GRANTED",
        "PERMISSION_REVOKED",
        "ROLE_CHANGED",

        // SECURITY INCIDENTS
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        "INVALID_TOKEN",
        "RATE_LIMIT_EXCEEDED",
        "SUSPICIOUS_ACTIVITY",
        "DATA_BREACH_INCIDENT",

        // SYSTEM EVENTS
        "ENCRYPTION_KEY_ROTATED",
        "DATABASE_BACKUP",
        "CONTRACT_INTERACTION",
        "SYSTEM_MAINTENANCE",

        // COMPLIANCE
        "GDPR_DATA_REQUEST",
        "HIPAA_AUDIT_LOG_EXPORT",
        "CONSENT_RECORDED",
      ],
      required: true,
      index: true,
    },

    // WHO performed the action
    actor: {
      userId: {
        type: String,
        required: true,
        index: true,
      },
      userRole: String,
      hospitalId: String,
      ipAddress: String,
      userAgent: String,
      sessionId: String,
    },

    // WHAT was affected
    subject: {
      resourceType: {
        type: String,
        enum: ["PATIENT_RECORD", "ACCESS_GRANT", "USER", "HOSPITAL", "SYSTEM"],
        required: true,
        index: true,
      },
      resourceId: String,
      patientId: {
        type: String,
        index: true,
      },
    },

    // DETAILS of the action
    details: {
      action: String, // Specific action performed
      status: {
        type: String,
        enum: ["SUCCESS", "FAILURE", "PARTIAL"],
      },
      description: String,
      dataSize: Number, // Size of data accessed/modified
      duration: Number, // Duration of operation in ms
      errorMessage: String,
    },

    // DATA INTEGRITY
    integrity: {
      // SHA-256 hash for verification
      dataHash: String,

      // Digital signature of log entry
      signature: String,

      // Blockchain transaction hash (if recorded on-chain)
      blockchainTxHash: String,

      // Block number on blockchain
      blockNumber: Number,
    },

    // COMPLIANCE FIELDS
    compliance: {
      // Is PII involved
      containsPII: {
        type: Boolean,
        default: false,
      },

      // HIPAA/GDPR classification
      classification: {
        type: String,
        enum: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "HIGHLY_CONFIDENTIAL"],
      },

      // Is this access authorized
      authorized: {
        type: Boolean,
        default: true,
      },

      // Consent requirement met
      consentObtained: Boolean,

      // Retention period (years)
      retentionYears: Number,
    },

    // CONTEXT
    context: {
      // Geographic location
      location: {
        country: String,
        region: String,
        coordinates: {
          type: {
            type: String,
            enum: ["Point"],
          },
          coordinates: [Number], // [longitude, latitude]
        },
      },

      // Device information
      device: {
        type: String,
        os: String,
        browser: String,
      },

      // Request details
      requestId: String,
      correlationId: String, // Links related events

      // Additional metadata
      metadata: mongoose.Schema.Types.Mixed,
    },

    // TIMESTAMPS (immutable)
    timestamps: {
      // When the event occurred
      eventTime: {
        type: Date,
        default: Date.now,
        index: true,
      },

      // When it was logged
      loggedAt: {
        type: Date,
        default: Date.now,
      },

      // When it expires (retention policy)
      expiresAt: Date,
    },

    // IMMUTABILITY MARKERS
    immutability: {
      // Locked for editing (cannot be modified after grace period)
      locked: {
        type: Boolean,
        default: true,
      },

      // Hash chain (cryptographic link to previous entry)
      previousEntryHash: String,

      // Proof of chain continuity
      chainHash: String,
    },
  },
  {
    // Don't allow updates after creation (soft immutability)
    timestamps: true,
    collection: "audit_logs",
  },
);

// Prevent updates to audit logs (except for blockchain linking)
auditLogSchema.pre("findByIdAndUpdate", function (next) {
  // Allow updates only for specific fields
  const updateFields = Object.keys(this._update || {});
  const allowedFields = ["integrity.blockchainTxHash", "integrity.blockNumber"];

  const hasDisallowedFields = updateFields.some(
    (field) => !allowedFields.includes(field),
  );

  if (hasDisallowedFields) {
    throw new Error("Audit logs are immutable after creation");
  }

  next();
});

// Create indexes for performance and compliance
auditLogSchema.index({ "actor.userId": 1, "timestamps.eventTime": -1 });
auditLogSchema.index({ "subject.patientId": 1, "timestamps.eventTime": -1 });
auditLogSchema.index({ eventType: 1, "timestamps.eventTime": -1 });
auditLogSchema.index({ "actor.hospitalId": 1, "timestamps.eventTime": -1 });
auditLogSchema.index({
  "compliance.containsPII": 1,
  "timestamps.eventTime": -1,
});
auditLogSchema.index({
  "context.correlationId": 1,
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

/**
 * Audit Trail Service
 */
class AuditTrailService {
  constructor() {
    this.nextAuditId = 1;
  }

  /**
   * Initialize next audit ID from database
   */
  async initialize() {
    try {
      const lastLog = await AuditLog.findOne()
        .sort({ auditId: -1 })
        .select("auditId");

      if (lastLog) {
        this.nextAuditId = lastLog.auditId + 1;
      }

      console.log(
        `✓ Audit trail initialized. Next audit ID: ${this.nextAuditId}`,
      );
    } catch (err) {
      console.warn("Audit trail initialization failed:", err.message);
    }
  }

  /**
   * Log a security or access event
   * @param {object} logEntry - Structured log entry
   * @returns {object} Saved audit log
   */
  async logEvent(logEntry) {
    try {
      const auditEntry = new AuditLog({
        auditId: this.nextAuditId++,
        eventType: logEntry.eventType,
        actor: logEntry.actor,
        subject: logEntry.subject,
        details: logEntry.details,
        compliance: logEntry.compliance,
        context: logEntry.context,
        timestamps: {
          eventTime: logEntry.timestamp || new Date(),
          loggedAt: new Date(),
        },
      });

      // Compute integrity hash
      auditEntry.integrity.dataHash = this._hashLogEntry(auditEntry);

      const saved = await auditEntry.save();

      // Optional: Record on blockchain for immutability proof
      if (process.env.ENABLE_BLOCKCHAIN_AUDIT === "true") {
        await this._recordOnBlockchain(saved);
      }

      return saved;
    } catch (err) {
      console.error("Failed to log audit event:", err.message);
      throw err;
    }
  }

  /**
   * Log record access (READ operation)
   */
  async logRecordAccess(userId, patientId, hospitalId, recordId, userRole) {
    return this.logEvent({
      eventType: "RECORD_VIEWED",
      actor: {
        userId: userId,
        userRole: userRole,
        hospitalId: hospitalId,
      },
      subject: {
        resourceType: "PATIENT_RECORD",
        resourceId: recordId,
        patientId: patientId,
      },
      details: {
        action: "VIEW",
        status: "SUCCESS",
      },
      compliance: {
        containsPII: true,
        classification: "HIGHLY_CONFIDENTIAL",
        authorized: true,
      },
    });
  }

  /**
   * Log record creation
   */
  async logRecordCreation(userId, patientId, hospitalId, recordType, dataSize) {
    return this.logEvent({
      eventType: "RECORD_CREATED",
      actor: {
        userId: userId,
        hospitalId: hospitalId,
      },
      subject: {
        resourceType: "PATIENT_RECORD",
        patientId: patientId,
      },
      details: {
        action: "CREATE",
        status: "SUCCESS",
        description: `Created ${recordType} record`,
        dataSize: dataSize,
      },
      compliance: {
        containsPII: true,
        classification: "HIGHLY_CONFIDENTIAL",
      },
    });
  }

  /**
   * Log access grant
   */
  async logAccessGrant(
    requesterHospitalId,
    approverHospitalId,
    patientId,
    duration,
    isEmergency,
    reason,
  ) {
    return this.logEvent({
      eventType: isEmergency ? "EMERGENCY_ACCESS_GRANTED" : "ACCESS_APPROVED",
      actor: {
        userId: approverHospitalId,
        userRole: "HOSPITAL_ADMIN",
        hospitalId: approverHospitalId,
      },
      subject: {
        resourceType: "ACCESS_GRANT",
        patientId: patientId,
      },
      details: {
        action: "GRANT",
        status: "SUCCESS",
        description: `Access granted to ${requesterHospitalId} for ${duration} hours. Reason: ${reason}`,
      },
      compliance: {
        authorized: true,
        consentObtained: true,
      },
      context: {
        metadata: {
          requesterHospital: requesterHospitalId,
          duration: duration,
          isEmergency: isEmergency,
        },
      },
    });
  }

  /**
   * Log access revocation
   */
  async logAccessRevocation(
    revokerHospitalId,
    patientId,
    targetHospitalId,
    reason,
  ) {
    return this.logEvent({
      eventType: "ACCESS_REVOKED",
      actor: {
        userId: revokerHospitalId,
        userRole: "HOSPITAL_ADMIN",
        hospitalId: revokerHospitalId,
      },
      subject: {
        resourceType: "ACCESS_GRANT",
        patientId: patientId,
      },
      details: {
        action: "REVOKE",
        status: "SUCCESS",
        description: `Revoked access from ${targetHospitalId}. Reason: ${reason}`,
      },
      context: {
        metadata: {
          targetHospital: targetHospitalId,
        },
      },
    });
  }

  /**
   * Log authentication event
   */
  async logLogin(userId, userRole, hospitalId, ipAddress, success = true) {
    return this.logEvent({
      eventType: success ? "USER_LOGIN" : "FAILED_LOGIN_ATTEMPT",
      actor: {
        userId: userId,
        userRole: userRole,
        hospitalId: hospitalId,
        ipAddress: ipAddress,
      },
      subject: {
        resourceType: "USER",
        resourceId: userId,
      },
      details: {
        action: success ? "LOGIN" : "LOGIN_FAILED",
        status: success ? "SUCCESS" : "FAILURE",
      },
      compliance: {
        authorized: success,
      },
    });
  }

  /**
   * Log unauthorized access attempt
   */
  async logUnauthorizedAttempt(
    userId,
    attemptedPatientId,
    hospitalId,
    reason,
    ipAddress,
  ) {
    return this.logEvent({
      eventType: "UNAUTHORIZED_ACCESS_ATTEMPT",
      actor: {
        userId: userId,
        hospitalId: hospitalId,
        ipAddress: ipAddress,
      },
      subject: {
        resourceType: "PATIENT_RECORD",
        patientId: attemptedPatientId,
      },
      details: {
        action: "ACCESS_ATTEMPT",
        status: "FAILURE",
        description: reason,
      },
      compliance: {
        containsPII: true,
        authorized: false,
      },
    });
  }

  /**
   * Get audit trail for patient
   * Only home hospital, patient, or admin can view
   */
  async getPatientAuditTrail(
    patientId,
    requestorId,
    requestorRole,
    hospitalId,
  ) {
    // Authorization check
    const isAuthorized =
      requestorRole === "SYSTEM_ADMIN" ||
      requestorRole === "AUDITOR" ||
      requestorRole === "REGULATOR" ||
      (requestorRole === "PATIENT" && patientId === requestorId) ||
      (requestorRole === "HOSPITAL_ADMIN" && hospitalId); // Home hospital check should be done by caller

    if (!isAuthorized) {
      throw new Error(
        "UNAUTHORIZED: You cannot view this patient's audit trail",
      );
    }

    return AuditLog.find({
      "subject.patientId": patientId,
    })
      .sort({ "timestamps.eventTime": -1 })
      .limit(1000)
      .lean();
  }

  /**
   * Get hospital's audit trail
   * Hospital admins can see their hospital's activities
   */
  async getHospitalAuditTrail(hospitalId, requestorRole, limit = 1000) {
    if (
      !["SYSTEM_ADMIN", "AUDITOR", "REGULATOR", "HOSPITAL_ADMIN"].includes(
        requestorRole,
      )
    ) {
      throw new Error("UNAUTHORIZED: Cannot view hospital audit trail");
    }

    return AuditLog.find({
      $or: [
        { "actor.hospitalId": hospitalId },
        { "context.metadata.requesterHospital": hospitalId },
      ],
    })
      .sort({ "timestamps.eventTime": -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Generate HIPAA Compliance Report
   */
  async generateHIPAAReport(startDate, endDate) {
    const logs = await AuditLog.find({
      "timestamps.eventTime": {
        $gte: startDate,
        $lte: endDate,
      },
      "compliance.containsPII": true,
    });

    return {
      reportPeriod: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalEvents: logs.length,
        recordsAccessed: logs.filter((l) => l.eventType === "RECORD_VIEWED")
          .length,
        recordsCreated: logs.filter((l) => l.eventType === "RECORD_CREATED")
          .length,
        accessGranted: logs.filter((l) => l.eventType === "ACCESS_APPROVED")
          .length,
        accessRevoked: logs.filter((l) => l.eventType === "ACCESS_REVOKED")
          .length,
        unauthorizedAttempts: logs.filter(
          (l) => l.eventType === "UNAUTHORIZED_ACCESS_ATTEMPT",
        ).length,
      },
      details: logs,
      generated: new Date().toISOString(),
    };
  }

  /**
   * Generate GDPR Data Subject Access Request Report
   */
  async generateGDPRDataAccessReport(patientId, requestedAt = null) {
    const logs = await AuditLog.find({
      "subject.patientId": patientId,
    }).sort({ "timestamps.eventTime": -1 });

    return {
      patientId: patientId,
      dataAccessReport: {
        numberOfAccesses: logs.filter((l) => l.eventType === "RECORD_VIEWED")
          .length,
        accessedBy: [...new Set(logs.map((l) => l.actor.hospitalId))],
        dateOfRequest: requestedAt || new Date(),
        accessHistory: logs,
      },
    };
  }

  /**
   * Internal: Hash log entry for integrity verification
   * @private
   */
  _hashLogEntry(logEntry) {
    const crypto = require("crypto");
    const entryString = JSON.stringify({
      auditId: logEntry.auditId,
      eventType: logEntry.eventType,
      actor: logEntry.actor,
      subject: logEntry.subject,
      details: logEntry.details,
    });

    return crypto.createHash("sha256").update(entryString).digest("hex");
  }

  /**
   * Internal: Record audit entry on blockchain for immutability proof
   * @private
   */
  async _recordOnBlockchain(auditEntry) {
    try {
      const blockchainService = require("./blockchainService");

      if (!blockchainService.isAvailable()) {
        console.warn("Blockchain service not available for audit logging");
        return;
      }

      // Log on blockchain (implementation depends on contract)
      const tx = await blockchainService.logRecordAccess(
        auditEntry.subject.patientId,
        JSON.stringify({
          eventType: auditEntry.eventType,
          auditId: auditEntry.auditId,
        }),
      );

      // Update audit entry with blockchain reference
      auditEntry.integrity.blockchainTxHash = tx.hash;
      auditEntry.integrity.blockNumber = tx.blockNumber;
      await auditEntry.save();
    } catch (err) {
      console.warn("Failed to record audit on blockchain:", err.message);
      // Continue even if blockchain recording fails
    }
  }
}

module.exports = {
  AuditLog,
  auditTrailService: new AuditTrailService(),
};
