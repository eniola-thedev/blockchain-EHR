// controllers/accessController.js (Supabase version)
const { supabase } = require("../services/supabaseClient");
const blockchainService = require("../services/blockchainService");

// ─── Request Access ──────────────────────────────────────────────────
exports.requestAccess = async (req, res) => {
  try {
    const { patientId, reason, isEmergency = false } = req.body;

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
      .eq("requesting_hospital_id", req.user.hospitalId)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (existing)
      return res
        .status(409)
        .json({ error: "Active request already exists", request: existing });

    const status = isEmergency ? "approved" : "pending";
    const grantedAt = isEmergency ? new Date().toISOString() : null;
    const expiresAt = isEmergency
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: accessRequest, error } = await supabase
      .from("access_requests")
      .insert([
        {
          patient_id: patientId,
          requesting_hospital_id: req.user.hospitalId,
          home_hospital_id: patient.hospital_id,
          reason,
          is_emergency: isEmergency,
          status,
          granted_at: grantedAt,
          expires_at: expiresAt,
        },
      ])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await supabase.from("audit_logs").insert([
      {
        action: "ACCESS_REQUESTED",
        performed_by_id: req.user.id,
        hospital_id: req.user.hospitalId,
        details: { reason, isEmergency, status, patientId },
        ip_address: req.ip,
      },
    ]);

    res.status(201).json({
      message: isEmergency
        ? "Emergency access granted for 24 hours"
        : "Access request submitted.",
      requestId: accessRequest.id,
      status,
      expiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Grant Access ────────────────────────────────────────────────────
exports.grantAccess = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { durationHours = 72 } = req.body;

    const { data: request } = await supabase
      .from("access_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "pending")
      return res
        .status(400)
        .json({ error: `Request is already ${request.status}` });

    const expiresAt = new Date(
      Date.now() + durationHours * 60 * 60 * 1000,
    ).toISOString();

    const { error } = await supabase
      .from("access_requests")
      .update({
        status: "approved",
        granted_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .eq("id", requestId);

    if (error) return res.status(400).json({ error: error.message });

    await supabase.from("audit_logs").insert([
      {
        action: "ACCESS_GRANTED",
        performed_by_id: req.user.id,
        hospital_id: req.user.hospitalId,
        details: { durationHours, expiresAt, patientId: request.patient_id },
        ip_address: req.ip,
      },
    ]);

    res.json({
      message: `Access granted for ${durationHours} hours`,
      expiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Revoke Access ───────────────────────────────────────────────────
exports.revokeAccess = async (req, res) => {
  try {
    const { requestId } = req.params;

    const { error } = await supabase
      .from("access_requests")
      .update({ status: "revoked" })
      .eq("id", requestId);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "Access revoked successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Incoming Requests ───────────────────────────────────────────
exports.getIncomingRequests = async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from("access_requests")
      .select("*")
      .eq("home_hospital_id", req.user.hospitalId)
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);

    const { data: requests, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Outgoing Requests ───────────────────────────────────────────
exports.getOutgoingRequests = async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from("access_requests")
      .select("*")
      .eq("requesting_hospital_id", req.user.hospitalId)
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);

    const { data: requests, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Check Access ────────────────────────────────────────────────────
exports.checkAccess = async (req, res) => {
  try {
    const { patientId } = req.params;

    const { data: patient } = await supabase
      .from("users")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (!patient) return res.status(404).json({ error: "Patient not found" });

    if (patient.hospital_id === req.user.hospitalId) {
      return res.json({ hasAccess: true, type: "home_hospital" });
    }

    const { data: grant } = await supabase
      .from("access_requests")
      .select("*")
      .eq("patient_id", patientId)
      .eq("requesting_hospital_id", req.user.hospitalId)
      .eq("status", "approved")
      .maybeSingle();

    if (grant) {
      return res.json({
        hasAccess: true,
        type: grant.is_emergency ? "emergency" : "granted",
        expiresAt: grant.expires_at,
        grantedAt: grant.granted_at,
      });
    }

    res.json({ hasAccess: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Available Hospitals ─────────────────────────────────────────
exports.getAvailableHospitals = async (req, res) => {
  try {
    const { search } = req.query;

    let query = supabase
      .from("hospitals")
      .select("id, name, address, phone, email, license_number")
      .eq("is_active", true)
      .eq("is_verified", true)
      .neq("id", req.user.hospitalId)
      .order("name");

    if (search) query = query.ilike("name", `%${search}%`);

    const { data: hospitals, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    res.json({ hospitals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
