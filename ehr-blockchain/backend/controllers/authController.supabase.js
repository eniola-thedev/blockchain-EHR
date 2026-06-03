// controllers/authController.js (Supabase version)
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

    // Create hospital
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

    if (hospitalError) {
      return res.status(400).json({ error: hospitalError.message });
    }

    // Create user account in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      // Rollback hospital creation
      await supabase.from("hospitals").delete().eq("id", hospitalData.id);
      return res.status(400).json({ error: authError.message });
    }

    // Create user record in users table
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
      // Rollback
      await supabase.auth.admin.deleteUser(authData.user.id);
      await supabase.from("hospitals").delete().eq("id", hospitalData.id);
      return res.status(400).json({ error: userError.message });
    }

    // Update hospital with admin user
    await supabase
      .from("hospitals")
      .update({ admin_user_id: userData.id })
      .eq("id", hospitalData.id);

    // Create audit log
    await supabase.from("audit_logs").insert([
      {
        action: "HOSPITAL_REGISTERED",
        performed_by_id: userData.id,
        hospital_id: hospitalData.id,
        details: { name, licenseNumber },
        ip_address: req.ip,
      },
    ]);

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

    // Get current user info
    const userId = req.user.id;

    // Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create doctor record
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

    // Audit log
    await supabase.from("audit_logs").insert([
      {
        action: "DOCTOR_REGISTERED",
        performed_by_id: userId,
        hospital_id: req.user.hospital_id,
        details: { email, doctorLicense },
        ip_address: req.ip,
      },
    ]);

    res.status(201).json({
      message: "Doctor registered successfully",
      doctor: doctorData,
    });
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

    // Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create patient record
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

    // Authenticate with Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: "Account deactivated" });
    }

    // Create JWT token for consistency with frontend
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    // Audit log
    await supabase.from("audit_logs").insert([
      {
        action: "LOGIN",
        performed_by_id: user.id,
        hospital_id: user.hospital_id,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      },
    ]);

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
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: "User not found" });
    }

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
