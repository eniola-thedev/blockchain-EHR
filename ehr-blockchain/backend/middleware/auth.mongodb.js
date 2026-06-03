// middleware/auth.js
const jwt  = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).populate("hospitalId");
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Account not found or deactivated" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ─────────────────────────────────────────────────────────────────────

// middleware/rbac.js — Role-Based Access Control

/**
 * Restrict to specific roles
 * Usage: requireRole("doctor", "admin")
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Access denied. Required role: ${roles.join(" or ")}`,
      yourRole: req.user.role,
    });
  }
  next();
};

/**
 * Block patient write access (patients are read-only)
 */
const blockPatientWrite = (req, res, next) => {
  if (req.user?.role === "patient") {
    return res.status(403).json({
      error: "Patients have read-only access. Medical records can only be created/modified by hospital staff.",
    });
  }
  next();
};

/**
 * Ensure hospital staff only access their own hospital's data
 * (unless they are admin)
 */
const sameHospitalOnly = (req, res, next) => {
  if (req.user.role === "admin") return next();
  const requestedHospitalId = req.params.hospitalId || req.body.hospitalId;
  if (requestedHospitalId && req.user.hospitalId?.toString() !== requestedHospitalId) {
    return res.status(403).json({ error: "Access denied to other hospital's data" });
  }
  next();
};

module.exports = { authenticate, requireRole, blockPatientWrite, sameHospitalOnly };
