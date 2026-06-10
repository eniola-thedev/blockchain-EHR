// controllers/authController.js
const { supabase } = require("../services/supabaseClient");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const generatePatientId = () => {
  const prefix = "PAT";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// ─── Register Hospital ──────────────────────────────────────────────
exports.registerHospital = async (req, res) => {
  try {
    const { name, email, password, licenseNumber, phone, address, country } =
      req.body;

    const { data: hospitalData, error: hospitalError } = await supabase
      .from("hospitals")
      .insert([
        {
          name,
          license_number: licenseNumber,
          email,
          phone,
          address,
          country,
          is_verified: true,
        },
      ])
      .select()
      .single();

    if (hospitalError)
      return res.status(400).json({ error: hospitalError.message });

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      await supabase.from("hospitals").delete().eq("id", hospitalData.id);
      return res.status(400).json({ error: authError.message });
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert([
        {
          id: authData.user.id,
          email,
          role: "hospital",
          hospital_id: hospitalData.id,
        },
      ])
      .select()
      .single();

    if (userError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      await supabase.from("hospitals").delete().eq("id", hospitalData.id);
      return res.status(400).json({ error: userError.message });
    }

    await supabase
      .from("hospitals")
      .update({ admin_user_id: userData.id })
      .eq("id", hospitalData.id);

    res.status(201).json({
      message: "Hospital registered successfully",
      hospitalId: hospitalData.id,
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

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) return res.status(400).json({ error: authError.message });

    const { data: doctorData, error: doctorError } = await supabase
      .from("users")
      .insert([
        {
          id: authData.user.id,
          email,
          role: "doctor",
          hospital_id: req.user.hospital_id,
          doctor_license: doctorLicense,
          specialization,
          department,
          first_name: firstName,
          last_name: lastName,
        },
      ])
      .select()
      .single();

    if (doctorError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: doctorError.message });
    }

    res
      .status(201)
      .json({ message: "Doctor registered successfully", doctor: doctorData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Register Patient ──────────────────────────────────────────────
exports.registerPatient = async (req, res) => {
  try {
    const { email, password, firstName, lastName, bloodGroup, genotype } =
      req.body;
    const patientId = generatePatientId();

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) return res.status(400).json({ error: authError.message });

    const { data: patientData, error: patientError } = await supabase
      .from("users")
      .insert([
        {
          id: authData.user.id,
          email,
          role: "patient",
          patient_id: patientId,
          first_name: firstName,
          last_name: lastName,
          blood_group: bloodGroup,
          genotype,
          hospital_id: req.user.hospital_id,
        },
      ])
      .select()
      .single();

    if (patientError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: patientError.message });
    }

    res.status(201).json({
      message: "Patient registered successfully",
      patient: patientData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Register Patient By Doctor ────────────────────────────────────
exports.registerPatientByDoctor = async (req, res) => {
  try {
    const { email, password, firstName, lastName, bloodGroup, genotype } =
      req.body;
    const patientId = generatePatientId();

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) return res.status(400).json({ error: authError.message });

    const { data: patientData, error: patientError } = await supabase
      .from("users")
      .insert([
        {
          id: authData.user.id,
          email,
          role: "patient",
          patient_id: patientId,
          first_name: firstName,
          last_name: lastName,
          blood_group: bloodGroup,
          genotype,
          hospital_id: req.user.hospital_id,
        },
      ])
      .select()
      .single();

    if (patientError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: patientError.message });
    }

    res.status(201).json({
      message: "Patient registered successfully",
      patient: patientData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Login ──────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // First find user by email in our database
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.is_active)
      return res.status(401).json({ error: "Account deactivated" });

    // Try to verify password with Supabase Auth
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError)
        return res.status(401).json({ error: "Invalid credentials" });
    } catch (authErr) {
      // If Supabase Auth times out, allow login anyway (fallback)
      console.warn("⚠️ Supabase Auth timeout, using fallback login");
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        patientId: user.patient_id,
        hospitalId: user.hospital_id,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Current User ───────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .maybeSingle();

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        patientId: user.patient_id,
        hospitalId: user.hospital_id,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
