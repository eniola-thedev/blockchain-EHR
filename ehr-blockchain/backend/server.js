// server.js (Supabase version)
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { supabase } = require("./services/supabaseClient");
const { authenticate } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const recordRoutes = require("./routes/records");
const hospitalRoutes = require("./routes/hospitals");
const accessRoutes = require("./routes/access");
const auditRoutes = require("./routes/audit");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.set("trust proxy", 1);

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

app.get("/", (req, res) =>
  res.json({ message: "🏥 MedChain EHR API", status: "running" }),
);
app.get("/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

app.use("/api/auth", authRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/audit", auditRoutes);

// ─── Inter-Hospital Routes ──────────────────────────────────────────
app.get(
  "/api/inter-hospital/hospitals/verified",
  authenticate,
  async (req, res) => {
    try {
      const { data: hospitals, error } = await supabase
        .from("hospitals")
        .select("id, name, address, phone, email, license_number, country")
        .eq("is_active", true)
        .eq("is_verified", true)
        .neq("id", req.user.hospital_id)
        .order("name");
      if (error) return res.status(400).json({ error: error.message });
      res.json({ hospitals });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.get("/api/inter-hospital/outgoing", authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from("access_requests")
      .select("*")
      .eq("requesting_hospital_id", req.user.hospital_id)
      .order("created_at", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);
    const { data: requests, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json({ requests: requests || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/inter-hospital/incoming", authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from("access_requests")
      .select("*")
      .eq("target_hospital_id", req.user.hospital_id)
      .order("created_at", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);
    const { data: requests, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json({ requests: requests || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/inter-hospital/request", authenticate, async (req, res) => {
  try {
    const {
      patientId,
      targetHospitalId,
      reason,
      isEmergency = false,
      duration = 72,
    } = req.body;

    // Verify patient exists
    const { data: patient } = await supabase
      .from("users")
      .select("*")
      .eq("patient_id", patientId)
      .eq("role", "patient")
      .maybeSingle();

    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // Check for duplicate
    const { data: existing } = await supabase
      .from("access_requests")
      .select("*")
      .eq("patient_id", patientId)
      .eq("requesting_hospital_id", req.user.hospital_id)
      .eq("target_hospital_id", targetHospitalId)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (existing)
      return res.status(409).json({ error: "Active request already exists" });

    const status = isEmergency ? "approved" : "pending";
    const expiresAt = isEmergency
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();

    const { data: request, error } = await supabase
      .from("access_requests")
      .insert([
        {
          patient_id: patientId,
          requesting_hospital_id: req.user.hospital_id,
          target_hospital_id: targetHospitalId,
          home_hospital_id: patient.hospital_id,
          reason,
          is_emergency: isEmergency,
          status,
          granted_at: isEmergency ? new Date().toISOString() : null,
          expires_at: expiresAt,
        },
      ])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({
      message: isEmergency
        ? "Emergency access granted for 24 hours"
        : "Access request submitted successfully",
      requestId: request.id,
      status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/inter-hospital/:requestId/approve",
  authenticate,
  async (req, res) => {
    try {
      const { duration = 72 } = req.body;
      const expiresAt = new Date(
        Date.now() + duration * 60 * 60 * 1000,
      ).toISOString();
      const { error } = await supabase
        .from("access_requests")
        .update({
          status: "approved",
          granted_at: new Date().toISOString(),
          expires_at: expiresAt,
        })
        .eq("id", req.params.requestId);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ message: "Request approved successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.post(
  "/api/inter-hospital/:requestId/deny",
  authenticate,
  async (req, res) => {
    try {
      const { error } = await supabase
        .from("access_requests")
        .update({ status: "rejected" })
        .eq("id", req.params.requestId);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ message: "Request denied" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.post(
  "/api/inter-hospital/:requestId/revoke",
  authenticate,
  async (req, res) => {
    try {
      const { error } = await supabase
        .from("access_requests")
        .update({ status: "revoked" })
        .eq("id", req.params.requestId);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ message: "Access revoked successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
