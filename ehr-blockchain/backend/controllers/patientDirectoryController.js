const { User } = require("../models/index");

// List all patients registered across all hospitals (network-wide)
// Supports simple search by patientId / name.
exports.listNetworkPatients = async (req, res) => {
  try {
    const { query = "", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

    const filter = { role: "patient" };

    const q = String(query).trim();
    if (q) {
      filter.$or = [
        { patientId: { $regex: q, $options: "i" } },
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(filter);

    const patients = await User.find(filter)
      .select(
        "patientId firstName lastName dateOfBirth bloodGroup genotype phone hospitalId email",
      )
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // De-dupe by patientId (defensive: if seed data created duplicates)
    const seen = new Set();
    const deduped = [];
    for (const p of patients) {
      if (seen.has(p.patientId)) continue;
      seen.add(p.patientId);
      deduped.push(p);
    }

    res.json({
      patients: deduped.map((p) => ({
        patientId: p.patientId,
        name: `${p.firstName || ""} ${p.lastName || ""}`.trim(),
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dateOfBirth,
        bloodGroup: p.bloodGroup,
        genotype: p.genotype,
        phone: p.phone,
        homeHospitalId: p.hospitalId,
        email: p.email,
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("listNetworkPatients error:", err);
    res.status(500).json({ error: err.message });
  }
};
