#!/usr/bin/env node

/**
 * Simple Test: Check filtering for both hospitals
 */

const baseURL = "http://localhost:5000/api";

async function test() {
  try {
    // Login as Hospital 1 (Central)
    console.log("\n1. Login as Central doctor...");
    let res = await fetch(`${baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dr.smith@central.com",
        password: "Test@1234",
      }),
    });
    let data = await res.json();
    const token1 = data.token;
    console.log("✓ Logged in");

    // Check Hospital 1 INCOMING
    console.log("\n2. Fetching Hospital 1 (Central) INCOMING requests...");
    res = await fetch(`${baseURL}/inter-hospital/incoming`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    data = await res.json();
    console.log(`Response status: ${res.status}`);
    console.log(`Response: ${JSON.stringify(data).substring(0, 200)}...`);
    if (data.requests) {
      console.log(`Incoming count: ${data.requests.length}`);
    } else {
      console.log(`ERROR: No 'requests' field in response`);
    }

    // Check Hospital 1 OUTGOING
    console.log("\n3. Fetching Hospital 1 (Central) OUTGOING requests...");
    res = await fetch(`${baseURL}/inter-hospital/outgoing`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    data = await res.json();
    console.log(`Response status: ${res.status}`);
    if (data.requests) {
      console.log(`Outgoing count: ${data.requests.length}`);
      data.requests.slice(0, 3).forEach((req, idx) => {
        console.log(
          `  ${idx + 1}. Patient ${req.patientId}, Status: ${req.status}`,
        );
      });
    }

    // Login as Hospital 2 (Sunshine)
    console.log("\n4. Login as Sunshine doctor...");
    res = await fetch(`${baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dr.johnson@sunshine.com",
        password: "Test@1234",
      }),
    });
    data = await res.json();
    const token2 = data.token;
    console.log("✓ Logged in");

    // Check Hospital 2 INCOMING
    console.log("\n5. Fetching Hospital 2 (Sunshine) INCOMING requests...");
    res = await fetch(`${baseURL}/inter-hospital/incoming`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    data = await res.json();
    console.log(`Response status: ${res.status}`);
    if (data.requests) {
      console.log(`Incoming count: ${data.requests.length}`);
      data.requests.slice(0, 3).forEach((req, idx) => {
        console.log(
          `  ${idx + 1}. Patient ${req.patientId}, FROM ${req.requestingHospital?.name}, Status: ${req.status}`,
        );
      });
    } else {
      console.log(`ERROR: ${JSON.stringify(data)}`);
    }

    // Check Hospital 2 OUTGOING
    console.log("\n6. Fetching Hospital 2 (Sunshine) OUTGOING requests...");
    res = await fetch(`${baseURL}/inter-hospital/outgoing`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    data = await res.json();
    console.log(`Response status: ${res.status}`);
    if (data.requests) {
      console.log(`Outgoing count: ${data.requests.length}`);
    } else {
      console.log(`ERROR: ${JSON.stringify(data)}`);
    }

    console.log("\n✅ Test complete\n");
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  }
}

test();
