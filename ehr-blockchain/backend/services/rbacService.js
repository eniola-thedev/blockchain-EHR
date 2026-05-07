// services/rbacService.js
// Role-Based Access Control (RBAC) service
// Implements principle of least privilege for healthcare data access

/**
 * Role Definitions with Permissions
 * Each role defines what actions a user can perform
 */
const ROLES = {
  PATIENT: {
    name: "Patient",
    level: 1,
    permissions: [
      "VIEW_OWN_RECORDS", // View only their own records
      "VIEW_RECORD_ACCESS_HISTORY", // See who accessed their records
      "REVOKE_ACCESS", // Revoke hospital access
      "REQUEST_AMENDMENT", // Request data amendment
      "DOWNLOAD_RECORDS", // Download own records
      "EXPORT_RECORDS", // Export to another hospital
    ],
  },

  DOCTOR: {
    name: "Doctor",
    level: 20,
    permissions: [
      "CREATE_RECORDS", // Create new medical records
      "VIEW_PATIENT_RECORDS", // View records with proper authorization
      "REQUEST_ACCESS", // Request access from other hospitals
      "VIEW_RECORD_ACCESS_HISTORY", // See access logs
      "REQUEST_AMENDMENT", // Request data amendment
    ],
  },

  CLINICIAN: {
    name: "Clinician",
    level: 15,
    permissions: [
      "CREATE_RECORDS", // Create medical records
      "VIEW_PATIENT_RECORDS", // View authorized records
      "MODIFY_RECORDS", // Create record amendments
      "REQUEST_ACCESS", // Request access
      "VIEW_RECORD_ACCESS_HISTORY", // See access logs
    ],
  },

  HOSPITAL_ADMIN: {
    name: "Hospital Administrator",
    level: 50,
    permissions: [
      "CREATE_RECORDS",
      "VIEW_PATIENT_RECORDS",
      "MODIFY_RECORDS",
      "REQUEST_ACCESS",
      "APPROVE_ACCESS", // Approve access requests from other hospitals
      "REVOKE_ACCESS", // Revoke hospital access
      "VIEW_RECORD_ACCESS_HISTORY",
      "GENERATE_AUDIT_REPORTS", // Generate compliance reports
      "MANAGE_HOSPITAL_USERS", // Manage hospital staff
      "VIEW_HOSPITAL_AUDIT_LOGS", // View hospital-level audit logs
    ],
  },

  SYSTEM_ADMIN: {
    name: "System Administrator",
    level: 100,
    permissions: [
      // All permissions
      "*",
    ],
  },

  AUDITOR: {
    name: "Auditor (Compliance)",
    level: 40,
    permissions: [
      "VIEW_ALL_AUDIT_LOGS", // View all system audit logs
      "GENERATE_COMPLIANCE_REPORTS", // Generate HIPAA/GDPR reports
      "VIEW_PATIENT_RECORDS", // View for audit purposes
      "VIEW_ACCESS_LOGS", // See all access events
      "EXPORT_AUDIT_DATA", // Export audit trails
    ],
  },

  REGULATOR: {
    name: "Regulatory Authority",
    level: 80,
    permissions: [
      "VIEW_ALL_AUDIT_LOGS",
      "GENERATE_COMPLIANCE_REPORTS",
      "VIEW_PATIENT_RECORDS",
      "VIEW_ACCESS_LOGS",
      "EXPORT_AUDIT_DATA",
      "SUSPEND_HOSPITAL", // Suspend hospitals from network
    ],
  },
};

/**
 * Resource-Based Access Rules
 * Defines who can access what resources
 */
const RESOURCE_RULES = {
  PATIENT_RECORDS: {
    // Patients can only view their own
    PATIENT: ["VIEW_OWN"],
    // Doctors with access grant can view
    DOCTOR: ["VIEW_IF_AUTHORIZED"],
    // Clinicians with authorization
    CLINICIAN: ["VIEW_IF_AUTHORIZED", "CREATE"],
    // Hospital admins can view all hospital records
    HOSPITAL_ADMIN: ["VIEW_ALL_HOSPITAL_RECORDS"],
    // Auditors for compliance
    AUDITOR: ["VIEW_ALL"],
    // Regulators for oversight
    REGULATOR: ["VIEW_ALL"],
  },

  ACCESS_REQUESTS: {
    // Patients can see requests for their data
    PATIENT: ["VIEW_OWN_REQUESTS"],
    // Hospital admins can approve/deny for their hospital
    HOSPITAL_ADMIN: ["VIEW_HOSPITAL_REQUESTS", "APPROVE", "DENY"],
    // Auditors can view
    AUDITOR: ["VIEW_ALL"],
  },

  AUDIT_LOGS: {
    // Hospital admins see hospital logs
    HOSPITAL_ADMIN: ["VIEW_HOSPITAL_LOGS"],
    // Auditors see all
    AUDITOR: ["VIEW_ALL", "EXPORT"],
    // Regulators see all
    REGULATOR: ["VIEW_ALL", "EXPORT"],
    // System admin sees all
    SYSTEM_ADMIN: ["VIEW_ALL", "EXPORT"],
  },

  USER_MANAGEMENT: {
    // Hospital admins manage their staff
    HOSPITAL_ADMIN: ["MANAGE_HOSPITAL_USERS"],
    // System admin manages all
    SYSTEM_ADMIN: ["MANAGE_ALL_USERS"],
  },
};

/**
 * RBAC Service
 */
class RBACService {
  constructor() {
    this.roles = ROLES;
    this.resourceRules = RESOURCE_RULES;
  }

  /**
   * Check if user has specific permission
   * @param {string} userRole - User's role (PATIENT, DOCTOR, etc.)
   * @param {string} permission - Permission to check
   * @returns {boolean} True if user has permission
   */
  hasPermission(userRole, permission) {
    if (!this.roles[userRole]) {
      throw new Error(`Unknown role: ${userRole}`);
    }

    const role = this.roles[userRole];

    // System admin has all permissions
    if (role.permissions.includes("*")) {
      return true;
    }

    return role.permissions.includes(permission);
  }

  /**
   * Check if user can access a specific resource
   * @param {string} userRole - User's role
   * @param {string} resourceType - Type of resource
   * @param {string} action - Action to perform
   * @param {object} context - Additional context (patientId, hospitalId, etc.)
   * @returns {boolean} True if access allowed
   */
  canAccess(userRole, resourceType, action, context = {}) {
    if (!this.roles[userRole]) {
      throw new Error(`Unknown role: ${userRole}`);
    }

    const role = this.roles[userRole];

    // System admin can access everything
    if (role.permissions.includes("*")) {
      return true;
    }

    // Get resource rules for this role
    if (!this.resourceRules[resourceType]) {
      return false;
    }

    if (!this.resourceRules[resourceType][userRole]) {
      return false;
    }

    const allowedActions = this.resourceRules[resourceType][userRole];

    // Check exact action
    if (allowedActions.includes(action)) {
      return true;
    }

    // Check conditional access
    if (action === "VIEW" && allowedActions.includes("VIEW_IF_AUTHORIZED")) {
      // Authorization must be checked separately with access grants
      return true;
    }

    if (action === "VIEW_OWN" && allowedActions.includes("VIEW_OWN")) {
      // Patient viewing their own data
      return context.patientId === context.userId;
    }

    return false;
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(userRole) {
    if (!this.roles[userRole]) {
      throw new Error(`Unknown role: ${userRole}`);
    }

    return this.roles[userRole].permissions;
  }

  /**
   * Get role level (higher = more permissions)
   */
  getRoleLevel(userRole) {
    if (!this.roles[userRole]) {
      throw new Error(`Unknown role: ${userRole}`);
    }

    return this.roles[userRole].level;
  }

  /**
   * Check if one role is senior to another
   */
  isRoleSenior(role1, role2) {
    return this.getRoleLevel(role1) > this.getRoleLevel(role2);
  }

  /**
   * Get all available roles
   */
  getAllRoles() {
    return Object.keys(this.roles).map((roleKey) => ({
      key: roleKey,
      ...this.roles[roleKey],
    }));
  }

  /**
   * Verify patient can only view their own records
   * This is a specific security check for patient portal
   */
  verifyPatientCanViewRecord(patientId, requestingUserId, userRole) {
    if (userRole !== "PATIENT") {
      throw new Error("This check is only for PATIENT role");
    }

    // Patient can only view their own records
    if (patientId !== requestingUserId) {
      return false;
    }

    // Must have permission
    return this.hasPermission(userRole, "VIEW_OWN_RECORDS");
  }

  /**
   * Verify hospital can access patient records
   */
  verifyHospitalCanAccessRecords(
    hospitalId,
    patientId,
    userRole,
    hasAccessGrant,
    isEmergency,
  ) {
    // Must be doctor, clinician, or admin
    if (!["DOCTOR", "CLINICIAN", "HOSPITAL_ADMIN"].includes(userRole)) {
      return false;
    }

    // Hospital must have either:
    // 1. Patient's home hospital (created the record)
    // 2. Active access grant
    // 3. Emergency authorization
    if (!hasAccessGrant && !isEmergency) {
      return false;
    }

    return this.hasPermission(userRole, "VIEW_PATIENT_RECORDS");
  }

  /**
   * Check if user can create records
   */
  canCreateRecord(userRole) {
    return this.hasPermission(userRole, "CREATE_RECORDS");
  }

  /**
   * Check if user can approve access
   */
  canApproveAccess(userRole) {
    return this.hasPermission(userRole, "APPROVE_ACCESS");
  }

  /**
   * Check if user can view audit logs
   */
  canViewAuditLogs(userRole, logScope) {
    if (userRole === "HOSPITAL_ADMIN" && logScope === "HOSPITAL") {
      return this.hasPermission(userRole, "VIEW_HOSPITAL_AUDIT_LOGS");
    }

    if (["AUDITOR", "REGULATOR", "SYSTEM_ADMIN"].includes(userRole)) {
      return this.hasPermission(userRole, "VIEW_ALL_AUDIT_LOGS");
    }

    return false;
  }

  /**
   * Check if user can export data
   */
  canExportData(userRole) {
    return (
      this.hasPermission(userRole, "EXPORT_AUDIT_DATA") ||
      this.hasPermission(userRole, "EXPORT_RECORDS")
    );
  }

  /**
   * Get role description
   */
  getRoleDescription(userRole) {
    if (!this.roles[userRole]) {
      throw new Error(`Unknown role: ${userRole}`);
    }

    return this.roles[userRole].name;
  }
}

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE: RBAC Authorization Check
// ─────────────────────────────────────────────────────────────

const rbacService = new RBACService();

/**
 * Express middleware for RBAC checks
 */
const rbacMiddleware = (
  requiredPermission,
  resourceType = null,
  actionType = null,
) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;

      if (!userRole) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "User role not found",
        });
      }

      // Check permission
      if (resourceType && actionType) {
        const context = {
          patientId: req.params.patientId || req.body.patientId,
          userId: req.user.id,
          hospitalId: req.user.hospitalId,
        };

        if (
          !rbacService.canAccess(userRole, resourceType, actionType, context)
        ) {
          return res.status(403).json({
            error: "FORBIDDEN",
            message: `User role '${userRole}' cannot perform ${actionType} on ${resourceType}`,
          });
        }
      } else if (!rbacService.hasPermission(userRole, requiredPermission)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: `User role '${userRole}' does not have permission: ${requiredPermission}`,
        });
      }

      // Log the authorization check
      req.auditLog = {
        userRole: userRole,
        userId: req.user.id,
        permission: requiredPermission,
        resource: resourceType,
        action: actionType,
        timestamp: new Date().toISOString(),
      };

      next();
    } catch (err) {
      return res.status(500).json({
        error: "AUTHORIZATION_ERROR",
        message: err.message,
      });
    }
  };
};

/**
 * Specific middleware for patient portal (read-only enforcement)
 */
const patientPortalMiddleware = (req, res, next) => {
  try {
    const userRole = req.user?.role;

    // Only patients can access patient portal
    if (userRole !== "PATIENT") {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Only patients can access patient portal",
      });
    }

    // Patient can only view their own data
    if (req.user.id !== req.params.patientId) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Patients can only view their own records",
      });
    }

    // Enforce read-only
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return res.status(405).json({
        error: "METHOD_NOT_ALLOWED",
        message: "Patient portal is read-only",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      error: "AUTHORIZATION_ERROR",
      message: err.message,
    });
  }
};

/**
 * Middleware to enforce read-only for patients
 */
const readOnlyForPatients = (req, res, next) => {
  const userRole = req.user?.role;

  if (
    userRole === "PATIENT" &&
    !["GET", "HEAD", "OPTIONS"].includes(req.method)
  ) {
    return res.status(403).json({
      error: "READ_ONLY",
      message: "Patients cannot modify medical records",
    });
  }

  next();
};

module.exports = {
  rbacService,
  ROLES,
  RESOURCE_RULES,
  rbacMiddleware,
  patientPortalMiddleware,
  readOnlyForPatients,
};
