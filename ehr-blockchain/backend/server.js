// server.js (Supabase version)
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { supabase } = require("./services/supabaseClient");
const authRoutes = require("./routes/auth");
// TODO: Update these routes to use Supabase instead of MongoDB
// const recordRoutes = require("./routes/records");
// const hospitalRoutes = require("./routes/hospitals");
// const accessRoutes = require("./routes/access");
// const auditRoutes = require("./routes/audit");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: true, // Allow all origins (can restrict later)
    credentials: true,
  }),
);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Trust proxy
app.set("trust proxy", 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests",
});
app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts",
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ─── Check Supabase Connection ──────────────────────────────────────
const checkSupabase = async () => {
  try {
    const { error } = await supabase
      .from("users")
      .select("count", { count: "exact" })
      .limit(1);
    if (error) throw error;
    console.log("✅ Supabase connected");
  } catch (err) {
    console.error("❌ Supabase connection failed:", err.message);
    process.exit(1);
  }
};

checkSupabase();

// ─── Routes ────────────────────────────────────────────────────────
app.get("/", (req, res) =>
  res.json({
    message: "🏥 MedChain EHR Blockchain Backend API (Supabase)",
    status: "running",
    version: "2.0.0",
    endpoints: {
      auth: "/api/auth",
      records: "/api/records",
      hospitals: "/api/hospitals",
      access: "/api/access",
      audit: "/api/audit",
    },
  }),
);

app.get("/health", (req, res) =>
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  }),
);

app.use("/api/auth", authRoutes);
// TODO: Update these routes to use Supabase
// app.use("/api/records", recordRoutes);
// app.use("/api/hospitals", hospitalRoutes);
// app.use("/api/access", accessRoutes);
// app.use("/api/audit", auditRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
