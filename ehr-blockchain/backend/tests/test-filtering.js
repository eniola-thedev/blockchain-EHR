#!/usr/bin/env node

/**
 * Manual Test: Inter-Hospital Request Filtering
 *
 * Tests whether the $or filtering logic correctly handles both:
 * - Old records (only homeHospital)
 * - New records (targetHospital)
 *
 * Usage: node backend/tests/test-filtering.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { AccessRequest } = require("../models/index");

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
};

async function test() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/ehr-blockchain";
    console.log(
      `${colors.blue}Connecting to MongoDB: ${mongoUri}${colors.reset}`,
    );
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`${colors.green}✓ Connected${colors.reset}\n`);

    // Get all requests
    const allRequests = await AccessRequest.find()
      .populate("requestingHospital", "name _id")
      .populate("targetHospital", "name _id")
      .populate("homeHospital", "name _id")
      .lean();

    console.log(
      `${colors.blue}Found ${allRequests.length} total requests${colors.reset}`,
    );

    if (allRequests.length === 0) {
      console.log(
        `${colors.yellow}No requests in database. Run seed script first.${colors.reset}`,
      );
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log("\n" + "=".repeat(80));
    console.log("REQUEST DETAILS");
    console.log("=".repeat(80) + "\n");

    allRequests.forEach((req, idx) => {
      console.log(`Request ${idx + 1}:`);
      console.log(`  Requesting: ${req.requestingHospital?.name || "N/A"}`);
      console.log(`  Target: ${req.targetHospital?.name || "N/A"}`);
      console.log(`  Home: ${req.homeHospital?.name || "N/A"}`);
      console.log(`  Status: ${req.status}`);
      console.log();
    });

    // Get unique hospital IDs
    const hospitalIds = new Set();
    allRequests.forEach((req) => {
      if (req.requestingHospital?._id)
        hospitalIds.add(req.requestingHospital._id.toString());
      if (req.targetHospital?._id)
        hospitalIds.add(req.targetHospital._id.toString());
      if (req.homeHospital?._id)
        hospitalIds.add(req.homeHospital._id.toString());
    });

    console.log("=".repeat(80));
    console.log("FILTERING TEST");
    console.log("=".repeat(80) + "\n");

    // Test filtering for each hospital
    for (const hospitalId of hospitalIds) {
      const hospitalReq = allRequests.find(
        (r) => r.requestingHospital?._id.toString() === hospitalId,
      );
      const hospitalName = hospitalReq?.requestingHospital?.name || "Unknown";

      console.log(
        `\n${colors.blue}Testing Hospital: ${hospitalName}${colors.reset}`,
      );
      console.log(`ID: ${hospitalId}`);

      // Test INCOMING filter
      const incomingFilter = {
        $or: [
          { targetHospital: mongoose.Types.ObjectId(hospitalId) },
          {
            homeHospital: mongoose.Types.ObjectId(hospitalId),
            targetHospital: { $exists: false },
          },
        ],
      };

      const incoming = await AccessRequest.find(incomingFilter)
        .populate("requestingHospital", "name")
        .populate("targetHospital", "name")
        .lean();

      console.log(`\nIncoming (requests TO this hospital): ${incoming.length}`);
      if (incoming.length === 0) {
        console.log("  (none)");
      }
      incoming.forEach((req) => {
        console.log(
          `  - FROM ${req.requestingHospital?.name} TO ${req.targetHospital?.name}`,
        );
      });

      // Test OUTGOING filter
      const outgoingFilter = {
        requestingHospital: mongoose.Types.ObjectId(hospitalId),
      };

      const outgoing = await AccessRequest.find(outgoingFilter)
        .populate("requestingHospital", "name")
        .populate("targetHospital", "name")
        .lean();

      console.log(
        `\nOutgoing (requests FROM this hospital): ${outgoing.length}`,
      );
      if (outgoing.length === 0) {
        console.log("  (none)");
      }
      outgoing.forEach((req) => {
        console.log(
          `  - FROM ${req.requestingHospital?.name} TO ${req.targetHospital?.name}`,
        );
      });
    }

    console.log("\n" + "=".repeat(80) + "\n");
    await mongoose.connection.close();
    console.log(`${colors.green}Test completed${colors.reset}`);
  } catch (err) {
    console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

test();
