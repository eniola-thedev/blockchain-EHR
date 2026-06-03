const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const recordRoutes = require("./routes/records");
const hospitalRoutes = require("./routes/hospitals");
const accessRoutes = require("./routes/access");
const auditRoutes = require("./routes/audit");
const patientPortalRoutes = require("./routes/patientPortal");
const enhancedAccessRoutes = require("./routes/enhancedAccess");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ────────────────────────────────────────────
app.use(helmet());

// Configure CORS - Allow all origins in production
app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true,
  }),
);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Trust proxy (required for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Stricter limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ─── Database ──────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/medchain")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

// ─── Routes ────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/portal", patientPortalRoutes);
app.use("/api/inter-hospital", enhancedAccessRoutes);

// Root route
app.get("/", (req, res) =>
  res.json({
    message: "🏥 MedChain EHR Blockchain Backend API",
    status: "running",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      records: "/api/records",
      hospitals: "/api/hospitals",
      access: "/api/access",
      audit: "/api/audit",
      portal: "/api/portal",
      interHospital: "/api/inter-hospital",
    },
  }),
);

// Health check
app.get("/health", (req, res) =>
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  }),
);

// ─── Error Handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`🚀 MedChain API running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
