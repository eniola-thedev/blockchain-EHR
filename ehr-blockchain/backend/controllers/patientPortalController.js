/**
 * Patient Portal Controller
 * Enhanced patient record viewing with timeline, filtering, and downloads
 */

const { MedicalRecord, AuditLog, Hospital } = require("../models/index");
const User = require("../models/User");

// ─── Get Complete Patient Profile ───────────────────────────────────
exports.getPatientProfile = async (req, res) => {
  try {
    // Patients can only view their own profile
    if (req.user.role !== "admin" && req.user.role !== "patient") {
      return res.status(403).json({ error: "Only patients can view profiles" });
    }

    const patientId =
      req.user.role === "patient" ? req.user.patientId : req.params.patientId;

    const patient = await User.findOne({ patientId, role: "patient" })
      .select("-password")
      .populate("hospitalId", "name address phone email");

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Get total records count by type
    const recordStats = await MedicalRecord.aggregate([
      { $match: { patientId, isDeleted: false } },
      { $group: { _id: "$recordType", count: { $sum: 1 } } },
    ]);

    // Convert to object for easy access
    const recordCounts = {};
    recordStats.forEach((stat) => {
      recordCounts[stat._id] = stat.count;
    });

    // Get last access timestamp
    const lastAccess = await AuditLog.findOne({
      patientId,
      action: "RECORD_VIEWED",
    })
      .sort({ createdAt: -1 })
      .select("createdAt");

    res.json({
      profile: {
        id: patient.patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        address: patient.address,
        bloodGroup: patient.bloodGroup,
        genotype: patient.genotype,
        emergencyContact: patient.emergencyContact,
        homeHospital: patient.hospitalId,
      },
      recordStats: {
        total: Object.values(recordCounts).reduce((a, b) => a + b, 0),
        byType: recordCounts,
      },
      lastAccessed: lastAccess?.createdAt || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Patient Record Timeline (Chronological View) ────────────────
exports.getRecordTimeline = async (req, res) => {
  try {
    const patientId =
      req.user.role === "patient" ? req.user.patientId : req.params.patientId;
    const { startDate, endDate, type } = req.query;

    // Access check
    if (req.user.role === "patient" && req.user.patientId !== patientId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const filter = { patientId, isDeleted: false };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (type) filter.recordType = type;

    const timeline = await MedicalRecord.find(filter)
      .select(
        "recordType title diagnosis medications labResults vitalSigns createdAt doctorName hospitalName",
      )
      .sort({ createdAt: -1 })
      .populate("createdByHospital", "name")
      .lean();

    // Format timeline with enriched data
    const formattedTimeline = timeline.map((record) => ({
      id: record._id,
      date: record.createdAt,
      type: record.recordType,
      title: record.title,
      diagnosis: record.diagnosis,
      doctor: record.doctorName,
      hospital: record.hospitalName || record.createdByHospital?.name,
      hasMedications: record.medications && record.medications.length > 0,
      hasLabResults: record.labResults && record.labResults.length > 0,
      hasVitals: record.vitalSigns && Object.keys(record.vitalSigns).length > 0,
    }));

    // Log access
    await AuditLog.create({
      action: "RECORD_VIEWED",
      performedBy: req.user._id,
      patientId,
      details: { viewType: "timeline", recordCount: formattedTimeline.length },
      ipAddress: req.ip,
    });

    res.json({
      timeline: formattedTimeline,
      totalRecords: formattedTimeline.length,
      dateRange: {
        from: startDate || null,
        to: endDate || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Lab Results for Comparison ──────────────────────────────────
exports.getLabResults = async (req, res) => {
  try {
    const patientId =
      req.user.role === "patient" ? req.user.patientId : req.params.patientId;
    const { testName, limit = 20 } = req.query;

    // Access check
    if (req.user.role === "patient" && req.user.patientId !== patientId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    let filter = { patientId, isDeleted: false, recordType: "lab_result" };
    if (testName) {
      filter["labResults.testName"] = new RegExp(testName, "i");
    }

    const labRecords = await MedicalRecord.find(filter)
      .select("labResults createdAt doctorName hospitalName")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Flatten lab results with dates
    const allLabResults = [];
    labRecords.forEach((record) => {
      if (record.labResults && record.labResults.length > 0) {
        record.labResults.forEach((lab) => {
          allLabResults.push({
            testName: lab.testName,
            value: lab.value,
            unit: lab.unit,
            normalRange: lab.normalRange,
            isAbnormal: lab.isAbnormal || false,
            date: record.createdAt,
            doctor: record.doctorName,
            hospital: record.hospitalName,
          });
        });
      }
    });

    // Sort by date descending
    allLabResults.sort((a, b) => new Date(b.date) - new Date(a.date));

    await AuditLog.create({
      action: "RECORD_VIEWED",
      performedBy: req.user._id,
      patientId,
      details: { viewType: "lab_results", testName: testName || "all" },
      ipAddress: req.ip,
    });

    res.json({
      labResults: allLabResults,
      totalResults: allLabResults.length,
      filters: { testName: testName || null },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Current Medications ────────────────────────────────────────
exports.getCurrentMedications = async (req, res) => {
  try {
    const patientId =
      req.user.role === "patient" ? req.user.patientId : req.params.patientId;

    // Access check
    if (req.user.role === "patient" && req.user.patientId !== patientId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const filter = {
      patientId,
      isDeleted: false,
      recordType: "prescription",
    };

    const prescriptions = await MedicalRecord.find(filter)
      .select("medications title createdAt doctorName hospitalName")
      .sort({ createdAt: -1 })
      .lean();

    // Extract and flatten medications
    const allMedications = [];
    prescriptions.forEach((record) => {
      if (record.medications && record.medications.length > 0) {
        record.medications.forEach((med) => {
          allMedications.push({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            notes: med.notes,
            prescribedBy: record.doctorName,
            hospital: record.hospitalName,
            prescribedDate: record.createdAt,
          });
        });
      }
    });

    // Sort by date (recent first)
    allMedications.sort(
      (a, b) => new Date(b.prescribedDate) - new Date(a.prescribedDate),
    );

    await AuditLog.create({
      action: "RECORD_VIEWED",
      performedBy: req.user._id,
      patientId,
      details: { viewType: "medications" },
      ipAddress: req.ip,
    });

    res.json({
      medications: allMedications,
      totalMedications: allMedications.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Get Vital Signs Trends ─────────────────────────────────────────
exports.getVitalSignsTrends = async (req, res) => {
  try {
    const patientId =
      req.user.role === "patient" ? req.user.patientId : req.params.patientId;
    const { metric = "bloodPressure", days = 30 } = req.query;

    // Access check
    if (req.user.role === "patient" && req.user.patientId !== patientId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const records = await MedicalRecord.find({
      patientId,
      isDeleted: false,
      createdAt: { $gte: startDate },
    })
      .select("vitalSigns createdAt doctorName hospitalName")
      .sort({ createdAt: 1 })
      .lean();

    // Extract vital sign data
    const trends = records
      .filter((r) => r.vitalSigns && r.vitalSigns[metric])
      .map((r) => ({
        date: r.createdAt,
        value: r.vitalSigns[metric],
        doctor: r.doctorName,
        hospital: r.hospitalName,
      }));

    await AuditLog.create({
      action: "RECORD_VIEWED",
      performedBy: req.user._id,
      patientId,
      details: { viewType: "vital_trends", metric, days: Number(days) },
      ipAddress: req.ip,
    });

    res.json({
      metric,
      trends,
      totalDataPoints: trends.length,
      dateRange: {
        from: startDate,
        to: new Date(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Search Records by ID and Filters ────────────────────────────────
exports.searchRecords = async (req, res) => {
  try {
    const {
      patientId,
      recordType,
      doctorName,
      hospitalName,
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter
    const filter = { isDeleted: false };

    if (patientId) filter.patientId = patientId;
    if (recordType) filter.recordType = recordType;
    if (doctorName) filter.doctorName = new RegExp(doctorName, "i");
    if (hospitalName) filter.hospitalName = new RegExp(hospitalName, "i");

    const total = await MedicalRecord.countDocuments(filter);
    const records = await MedicalRecord.find(filter)
      .select(
        "patientId recordType title diagnosis createdAt doctorName hospitalName",
      )
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    res.json({
      records,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
      filters: {
        patientId: patientId || null,
        recordType: recordType || null,
        doctorName: doctorName || null,
        hospitalName: hospitalName || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Export Patient Records as Summary ───────────────────────────────
exports.exportRecordsSummary = async (req, res) => {
  try {
    const patientId =
      req.user.role === "patient" ? req.user.patientId : req.params.patientId;

    // Access check
    if (req.user.role === "patient" && req.user.patientId !== patientId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const patient = await User.findOne({ patientId, role: "patient" }).populate(
      "hospitalId",
      "name email phone address",
    );

    const records = await MedicalRecord.find({
      patientId,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    // Build summary object
    const summary = {
      exportDate: new Date().toISOString(),
      patient: {
        id: patient.patientId,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        bloodGroup: patient.bloodGroup,
        genotype: patient.genotype,
        homeHospital: patient.hospitalId?.name,
      },
      recordsCount: records.length,
      recordsByType: {},
      recentRecords: records.slice(0, 10).map((r) => ({
        type: r.recordType,
        title: r.title,
        date: r.createdAt,
        doctor: r.doctorName,
        hospital: r.hospitalName,
      })),
    };

    // Group by type
    records.forEach((record) => {
      if (!summary.recordsByType[record.recordType]) {
        summary.recordsByType[record.recordType] = 0;
      }
      summary.recordsByType[record.recordType]++;
    });

    // Log access
    await AuditLog.create({
      action: "RECORD_VIEWED",
      performedBy: req.user._id,
      patientId,
      details: { viewType: "export_summary" },
      ipAddress: req.ip,
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
