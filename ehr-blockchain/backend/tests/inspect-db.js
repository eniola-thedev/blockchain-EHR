#!/usr/bin/env node

/**
 * Database Inspection: Check access requests
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { AccessRequest } = require("../models/index");

const mongoUri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ehr-blockchain";

async function inspect() {
  try {
    console.log("Connecting to MongoDB...\n");
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Count requests with and without targetHospital
    const withTarget = await AccessRequest.countDocuments({
      targetHospital: { $exists: true },
    });
    const withoutTarget = await AccessRequest.countDocuments({
      targetHospital: { $exists: false },
    });
    const total = await AccessRequest.countDocuments();

    console.log(`Total requests: ${total}`);
    console.log(`  With targetHospital: ${withTarget}`);
    console.log(`  Without targetHospital (OLD): ${withoutTarget}\n`);

    // Show all requests
    console.log("=".repeat(80));
    console.log("ALL REQUESTS:");
    console.log("=".repeat(80) + "\n");

    const requests = await AccessRequest.find()
      .populate("requestingHospital", "name")
      .populate("targetHospital", "name")
      .populate("homeHospital", "name")
      .lean();

    requests.forEach((req, idx) => {
      console.log(`${idx + 1}. ${req.patientId} | Status: ${req.status}`);
      console.log(`   Requesting: ${req.requestingHospital?.name || "N/A"}`);
      console.log(
        `   Target: ${req.targetHospital?.name || "N/A"} (field exists: ${!!req.targetHospital})`,
      );
      console.log(`   Home: ${req.homeHospital?.name || "N/A"}`);
      console.log();
    });

    await mongoose.connection.close();
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

inspect();
