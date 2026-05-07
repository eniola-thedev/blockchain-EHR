#!/usr/bin/env node

/**
 * End-to-End Test: Complete inter-hospital request flow
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { Hospital, AccessRequest } = require("../models/index");

const mongoUri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ehr-blockchain";

async function test() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("\n=".repeat(80));
    console.log("FINDING TEST DATA");
    console.log("=".repeat(80) + "\n");

    // Find two hospitals
    const hospitals = await Hospital.find({ isActive: true }).lean();
    const hospital1 = hospitals.find(
      (h) => h.name === "Central Medical Hospital",
    );
    const hospital2 = hospitals.find(
      (h) => h.name === "Sunshine Medical Center",
    );

    console.log(`Hospital 1: ${hospital1.name} (${hospital1._id})`);
    console.log(`Hospital 2: ${hospital2.name} (${hospital2._id})\n`);

    // Find a patient at hospital2
    const patient = await User.findOne({
      role: "patient",
      hospitalId: hospital2._id,
    }).lean();

    if (!patient) {
      console.log("No patient found at hospital 2. Creating test patient...\n");
      // Would need to create patient, skip for now
      throw new Error("No test patient available");
    }

    console.log(
      `Test Patient: ${patient.firstName} ${patient.lastName} (${patient.patientId})`,
    );
    console.log(`  Registered at: ${hospital2.name}\n`);

    // Simulate the API flow
    console.log("=".repeat(80));
    console.log("SIMULATING API CALLS");
    console.log("=".repeat(80) + "\n");

    const baseURL = "http://localhost:5000/api";

    // Step 1: Login as hospital1 doctor
    console.log("1. Logging in as dr.smith@central.com (Hospital 1)...");
    let res = await fetch(`${baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dr.smith@central.com",
        password: "Test@1234",
      }),
    });
    const hospital1Data = await res.json();
    const token1 = hospital1Data.token;
    console.log("✓ Logged in\n");

    // Step 2: Create inter-hospital request
    console.log(
      `2. Creating request for patient ${patient.patientId} from Hospital 1 to Hospital 2...`,
    );
    res = await fetch(`${baseURL}/inter-hospital/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        patientId: patient.patientId,
        targetHospitalId: hospital2._id.toString(),
        reason: "E2E Test: Cross-hospital request",
      }),
    });
    const requestData = await res.json();

    if (!res.ok) {
      throw new Error(`Request creation failed: ${requestData.error}`);
    }

    const requestId = requestData.requestId;
    console.log(`✓ Request created: ${requestId}\n`);

    // Step 3: Check Hospital 1 OUTGOING
    console.log("3. Checking Hospital 1 OUTGOING requests...");
    res = await fetch(`${baseURL}/inter-hospital/outgoing`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const outgoingData = await res.json();
    const inOutgoing = outgoingData.requests.find((r) => r._id === requestId);
    if (inOutgoing) {
      console.log(`✓ CORRECT: Request appears in Hospital 1 OUTGOING\n`);
    } else {
      console.log(`✗ ERROR: Request NOT in Hospital 1 OUTGOING\n`);
    }

    // Step 4: Check Hospital 1 INCOMING
    console.log("4. Checking Hospital 1 INCOMING requests...");
    res = await fetch(`${baseURL}/inter-hospital/incoming`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const incomingData1 = await res.json();
    const wrongPlace = incomingData1.requests.find((r) => r._id === requestId);
    if (!wrongPlace) {
      console.log(`✓ CORRECT: Request NOT in Hospital 1 INCOMING\n`);
    } else {
      console.log(`✗ ERROR: Request incorrectly in Hospital 1 INCOMING\n`);
    }

    // Step 5: Login as Hospital 2 doctor
    console.log("5. Logging in as dr.johnson@sunshine.com (Hospital 2)...");
    res = await fetch(`${baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dr.johnson@sunshine.com",
        password: "Test@1234",
      }),
    });
    const hospital2Data = await res.json();
    const token2 = hospital2Data.token;
    console.log("✓ Logged in\n");

    // Step 6: Check Hospital 2 INCOMING
    console.log("6. Checking Hospital 2 INCOMING requests...");
    res = await fetch(`${baseURL}/inter-hospital/incoming`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const incomingData2 = await res.json();
    const inIncoming = incomingData2.requests.find((r) => r._id === requestId);
    if (inIncoming) {
      console.log(`✓ CORRECT: Request appears in Hospital 2 INCOMING\n`);
    } else {
      console.log(`✗ ERROR: Request NOT in Hospital 2 INCOMING\n`);
    }

    // Step 7: Approve the request
    console.log("7. Hospital 2 approving the request...");
    res = await fetch(`${baseURL}/inter-hospital/${requestId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({}),
    });
    const approveData = await res.json();

    if (!res.ok) {
      throw new Error(`Approval failed: ${approveData.error}`);
    }

    console.log(`✓ Request approved\n`);

    // Step 8: Verify status changed
    console.log("8. Verifying request status changed to 'approved'...");
    res = await fetch(`${baseURL}/inter-hospital/outgoing`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const updatedData = await res.json();
    const updatedRequest = updatedData.requests.find(
      (r) => r._id === requestId,
    );
    if (updatedRequest && updatedRequest.status === "approved") {
      console.log(`✓ CORRECT: Request status is 'approved'\n`);
    } else {
      console.log(`✗ ERROR: Request status is '${updatedRequest?.status}'\n`);
    }

    console.log("=".repeat(80));
    console.log("✅ END-TO-END TEST COMPLETE");
    console.log("=".repeat(80) + "\n");

    await mongoose.connection.close();
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  }
}

test();
