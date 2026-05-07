#!/usr/bin/env node

/**
 * Test: Verify filtering works correctly
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { AccessRequest } = require("../models/index");
const User = require("../models/User");

const mongoUri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ehr-blockchain";

async function test() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("\n=".repeat(80));
    console.log("FILTERING TEST - Simulating hospital views");
    console.log("=".repeat(80) + "\n");

    // Get hospitals
    const hospitals = await mongoose.model("Hospital").find().lean();

    for (const hospital of hospitals) {
      console.log(`\n${hospital.name} (ID: ${hospital._id})`);
      console.log("-".repeat(60));

      // Simulate getIncomingRequests filter
      const incomingFilter = {
        $or: [
          { targetHospital: hospital._id },
          {
            homeHospital: hospital._id,
            requestingHospital: { $ne: hospital._id },
            targetHospital: { $exists: false },
          },
        ],
      };

      const incoming = await AccessRequest.find(incomingFilter)
        .populate("requestingHospital", "name")
        .populate("homeHospital", "name")
        .lean();

      console.log(`Incoming (${incoming.length}):`);
      if (incoming.length === 0) {
        console.log("  (none)");
      }
      incoming.forEach((req) => {
        console.log(
          `  - PAT${req.patientId} FROM ${req.requestingHospital?.name} (${req.status})`,
        );
      });

      // Simulate getOutgoingRequests filter
      const outgoingFilter = {
        requestingHospital: hospital._id,
      };

      const outgoing = await AccessRequest.find(outgoingFilter)
        .populate("targetHospital", "name")
        .populate("homeHospital", "name")
        .lean();

      console.log(`Outgoing (${outgoing.length}):`);
      if (outgoing.length === 0) {
        console.log("  (none)");
      }
      outgoing.forEach((req) => {
        console.log(
          `  - PAT${req.patientId} TO ${req.homeHospital?.name || "N/A"} (${req.status})`,
        );
      });
    }

    console.log("\n" + "=".repeat(80) + "\n");
    await mongoose.connection.close();
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

test();
