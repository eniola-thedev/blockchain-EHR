// Test script to verify inter-hospital request logic
const mongoose = require("mongoose");
const { AccessRequest } = require("../models/index");

async function testRequestLogic() {
  try {
    // Connect to DB
    await mongoose.connect("mongodb://localhost:27017/ehr-blockchain", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("\n=== TESTING REQUEST FILTERING LOGIC ===\n");

    // Get all requests
    const allRequests = await AccessRequest.find()
      .populate("requestingHospital", "name")
      .populate("targetHospital", "name")
      .populate("homeHospital", "name");

    console.log(`Total requests in database: ${allRequests.length}\n`);

    allRequests.forEach((req, idx) => {
      console.log(`Request ${idx + 1}:`);
      console.log(`  ID: ${req._id}`);
      console.log(
        `  Requesting Hospital: ${req.requestingHospital?.name || "N/A"} (${req.requestingHospital?._id})`,
      );
      console.log(
        `  Target Hospital: ${req.targetHospital?.name || "N/A"} (${req.targetHospital?._id})`,
      );
      console.log(
        `  Home Hospital: ${req.homeHospital?.name || "N/A"} (${req.homeHospital?._id})`,
      );
      console.log(`  Status: ${req.status}`);
      console.log(`  Created: ${req.createdAt}\n`);
    });

    // Test filtering for Central Medical Hospital
    console.log("\n=== FILTERING FOR CENTRAL MEDICAL HOSPITAL ===");
    const centralId = "CENTRAL_ID_HERE"; // Replace with actual ID

    // Incoming
    const incomingFilter = {
      $or: [
        { targetHospital: centralId },
        { homeHospital: centralId, targetHospital: { $exists: false } },
      ],
    };
    const incoming = await AccessRequest.find(incomingFilter)
      .populate("requestingHospital", "name")
      .populate("targetHospital", "name");
    console.log(`\nIncoming requests (SHOULD be TO Central):`);
    incoming.forEach((req) => {
      console.log(
        `  - FROM ${req.requestingHospital?.name} TO ${req.targetHospital?.name}`,
      );
    });

    // Outgoing
    const outgoingFilter = {
      requestingHospital: centralId,
    };
    const outgoing = await AccessRequest.find(outgoingFilter)
      .populate("requestingHospital", "name")
      .populate("targetHospital", "name");
    console.log(`\nOutgoing requests (SHOULD be FROM Central):`);
    outgoing.forEach((req) => {
      console.log(
        `  - FROM ${req.requestingHospital?.name} TO ${req.targetHospital?.name}`,
      );
    });

    await mongoose.connection.close();
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

testRequestLogic();
