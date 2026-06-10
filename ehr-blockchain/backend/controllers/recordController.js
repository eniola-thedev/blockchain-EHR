// controllers/recordController.js (Supabase version)
const { supabase } = require("../services/supabaseClient");
const blockchainService = require("../services/blockchainService");
const crypto = require("crypto");

// ─── Create Medical Record ──────────────────────────────────────────
exports.createRecord = async (req, res) => {
  try {
    const {
      patientId,
      recordType,
      title,
      description,
      diagnosis,
      medications,
      labResults,
      vitalSigns,
    } = req.body;

    const { data: patient } = await supabase
      .from("users")
      .select("*")
      .eq("patient_id", patientId)
      .eq("role", "patient")
      .maybeSingle();

    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const recordData = {
      patientId,
      recordType,
      title,
      description,
      diagnosis,
      medications,
      labResults,
      vitalSigns,
      createdAt: new Date().toISOString(),
    };
    const dataHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(recordData))
      .digest("hex");

    let txHash = null;
    try {
      const tx = await blockchainService.addRecord(
        patientId,
        dataHash,
        recordType,
        null,
      );
      txHash = tx.hash;
    } catch (e) {
      console.warn("Blockchain write failed (non-critical):", e.message);
    }

    const { data: record, error } = await supabase
      .from("medical_records")
      .insert([
        {
          patient_id: patientId,
          patient_user_id: patient.id,
          record_type: recordType,
          title,
          description,
          diagnosis,
          medications: medications || [],
          lab_results: labResults || [],
          vital_signs: vitalSigns || {},
          blockchain_tx_hash: txHash,
          created_by_hospital_id: req.user.hospital_id,
          created_by_doctor_id: req.user.id,
          doctor_name:
            `${req.user.first_name || ""} ${req.user.last_name || ""}`.trim(),
          hospital_name: req.user.hospital_name || "Unknown",
        },
      ])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await supabase.from("audit_logs").insert([
      {
        action: "RECORD_CREATED",
        performed_by_id: req.user.id,
        hospital_id: req.user.hospital_id,
        details: { recordType, title, txHash, patientId },
        ip_address: req.ip,
      },
    ]);

    res.status(201).json({
      message: "Medical record created successfully",
      recordId: record.id,
      txHash,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Patient Records ────────────────────────────────────────────
exports.getPatientRecords = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { type, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from("medical_records")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (type) query = query.eq("record_type", type);

    const { data: records, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    await supabase.from("audit_logs").insert([
      {
        action: "RECORD_VIEWED",
        performed_by_id: req.user.id,
        hospital_id: req.user.hospital_id,
        details: { patientId, recordCount: records.length },
        ip_address: req.ip,
      },
    ]);

    res.json({
      records,
      pagination: { page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Single Record ──────────────────────────────────────────────
exports.getRecord = async (req, res) => {
  try {
    const { data: record, error } = await supabase
      .from("medical_records")
      .select("*")
      .eq("id", req.params.recordId)
      .maybeSingle();

    if (!record) return res.status(404).json({ error: "Record not found" });
    if (error) return res.status(400).json({ error: error.message });

    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Upload File to Record ──────────────────────────────────────────
exports.uploadFile = async (req, res) => {
  try {
    const { recordId } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file provided" });

    const { data: record } = await supabase
      .from("medical_records")
      .select("*")
      .eq("id", recordId)
      .maybeSingle();

    if (!record) return res.status(404).json({ error: "Record not found" });

    const fileName = `${recordId}/${Date.now()}_${file.originalname}`;
    const { error: uploadError } = await supabase.storage
      .from("medical-files")
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError)
      return res.status(400).json({ error: uploadError.message });

    res.json({ message: "File uploaded successfully", path: fileName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Patient Summary ────────────────────────────────────────────
exports.getPatientSummary = async (req, res) => {
  try {
    const patientId =
      req.user.role === "patient" ? req.user.patient_id : req.params.patientId;

    if (!patientId)
      return res.status(400).json({ error: "Patient ID not found" });

    const { data: patient } = await supabase
      .from("users")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const { data: records } = await supabase
      .from("medical_records")
      .select("id, record_type, title, created_at, hospital_name, doctor_name")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    const recordCounts = (records || []).reduce((acc, r) => {
      acc[r.record_type] = (acc[r.record_type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      patient: {
        id: patient.id,
        patientId: patient.patient_id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        bloodGroup: patient.blood_group,
        genotype: patient.genotype,
        gender: patient.gender,
        dateOfBirth: patient.date_of_birth,
      },
      recordCounts,
      recentRecords: (records || []).slice(0, 5),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
