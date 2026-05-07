#!/usr/bin/env node

/**
 * API Test: Verify Inter-Hospital Request Filtering
 * Tests the fixed backend endpoints directly
 */

const baseURL = "http://localhost:5000/api";

// Test data - get these IDs from database
const testData = {
  centralHospitalId: null,
  sunshineHospitalId: null,
  drSmithToken: null,
};

async function test() {
  try {
    console.log("=".repeat(60));
    console.log("INTER-HOSPITAL REQUEST TEST");
    console.log("=".repeat(60) + "\n");

    // Step 1: Login as doctor from Central
    console.log("Step 1: Logging in as dr.smith@central.com...");
    let res = await fetch(`${baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dr.smith@central.com",
        password: "Test@1234",
      }),
    });
    let data = await res.json();

    if (!res.ok) {
      throw new Error(`Login failed: ${data.error || res.statusText}`);
    }

    testData.drSmithToken = data.token;
    console.log(
      `✓ Logged in. Token: ${testData.drSmithToken.substring(0, 20)}...\n`,
    );

    // Step 2: Get user info to find hospital ID
    console.log("Step 2: Getting user info...");
    res = await fetch(`${baseURL}/auth/me`, {
      headers: { Authorization: `Bearer ${testData.drSmithToken}` },
    });
    data = await res.json();
    testData.centralHospitalId = data.hospitalId;
    console.log(`✓ Central Hospital ID: ${testData.centralHospitalId}\n`);

    // Step 3: Get available hospitals
    console.log("Step 3: Getting available hospitals...");
    res = await fetch(`${baseURL}/inter-hospital/hospitals/verified`, {
      headers: { Authorization: `Bearer ${testData.drSmithToken}` },
    });
    data = await res.json();
    testData.sunshineHospitalId = data.hospitals.find((h) =>
      h.name.includes("Sunshine"),
    )?._id;
    console.log(`✓ Found hospitals:`);
    data.hospitals.forEach((h) => console.log(`  - ${h.name} (${h._id})`));
    console.log(`✓ Sunshine Hospital ID: ${testData.sunshineHospitalId}\n`);

    // Step 4: Create a new inter-hospital request
    console.log("Step 4: Creating inter-hospital request...");
    res = await fetch(`${baseURL}/inter-hospital/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testData.drSmithToken}`,
      },
      body: JSON.stringify({
        patientId: "PAT001",
        targetHospitalId: testData.sunshineHospitalId,
        reason: "Test: Cardiac assessment",
      }),
    });
    data = await res.json();

    if (!res.ok) {
      throw new Error(
        `Request creation failed: ${data.error || res.statusText}`,
      );
    }

    const newRequestId = data.requestId;
    console.log(`✓ Created request: ${newRequestId}\n`);

    // Step 5: Check OUTGOING for Central Hospital
    console.log("Step 5: Checking Central's OUTGOING requests...");
    res = await fetch(`${baseURL}/inter-hospital/outgoing`, {
      headers: { Authorization: `Bearer ${testData.drSmithToken}` },
    });
    data = await res.json();
    console.log(`Total outgoing: ${data.requests.length}`);
    const newRequestInOutgoing = data.requests.find(
      (r) => r._id === newRequestId,
    );
    if (newRequestInOutgoing) {
      console.log(`✓ CORRECT: New request appears in Central's OUTGOING`);
    } else {
      console.log(`✗ ERROR: New request NOT in Central's OUTGOING`);
    }
    console.log();

    // Step 6: Check INCOMING for Central Hospital
    console.log("Step 6: Checking Central's INCOMING requests...");
    res = await fetch(`${baseURL}/inter-hospital/incoming`, {
      headers: { Authorization: `Bearer ${testData.drSmithToken}` },
    });
    data = await res.json();
    console.log(`Total incoming: ${data.requests.length}`);
    const newRequestInIncoming = data.requests.find(
      (r) => r._id === newRequestId,
    );
    if (!newRequestInIncoming) {
      console.log(`✓ CORRECT: New request NOT in Central's INCOMING`);
    } else {
      console.log(
        `✗ ERROR: New request appears in Central's INCOMING (WRONG!)`,
      );
    }
    console.log();

    // Step 7: Login as Sunshine doctor and check INCOMING
    console.log("Step 7: Logging in as dr.johnson@sunshine.com...");
    res = await fetch(`${baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dr.johnson@sunshine.com",
        password: "Test@1234",
      }),
    });
    data = await res.json();

    if (!res.ok) {
      throw new Error(`Login failed: ${data.error || res.statusText}`);
    }

    const sunshineToken = data.token;
    console.log(`✓ Logged in\n`);

    // Step 8: Check INCOMING for Sunshine Hospital
    console.log("Step 8: Checking Sunshine's INCOMING requests...");
    res = await fetch(`${baseURL}/inter-hospital/incoming`, {
      headers: { Authorization: `Bearer ${sunshineToken}` },
    });
    data = await res.json();
    console.log(`Total incoming: ${data.requests.length}`);
    const newRequestInSunshineIncoming = data.requests.find(
      (r) => r._id === newRequestId,
    );
    if (newRequestInSunshineIncoming) {
      console.log(`✓ CORRECT: New request appears in Sunshine's INCOMING`);
    } else {
      console.log(`✗ ERROR: New request NOT in Sunshine's INCOMING`);
    }
    console.log();

    console.log("=".repeat(60));
    console.log("TEST COMPLETE");
    console.log("=".repeat(60));
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  }
}

test();
