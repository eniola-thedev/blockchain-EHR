#!/usr/bin/env node

/**
 * Quick Test: Find available patients and test inter-hospital flow
 */

const baseURL = "http://localhost:5000/api";

async function test() {
  try {
    console.log("Logging in as admin@sunshine.com to find their patients...\n");

    let res = await fetch(`${baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@sunshine.com",
        password: "Admin@1234",
      }),
    });
    let data = await res.json();
    const sunshineToken = data.token;

    res = await fetch(`${baseURL}/auth/me`, {
      headers: { Authorization: `Bearer ${sunshineToken}` },
    });
    data = await res.json();
    const sunshineHospitalId = data.hospitalId;
    console.log(`Sunshine Hospital ID: ${sunshineHospitalId}\n`);

    // Try to get patient list from records
    res = await fetch(`${baseURL}/records`, {
      headers: { Authorization: `Bearer ${sunshineToken}` },
    });
    data = await res.json();
    console.log(`Records found: ${data.records?.length || 0}`);
    if (data.records && data.records.length > 0) {
      const uniquePatients = [...new Set(data.records.map((r) => r.patientId))];
      console.log(
        `Unique patients at Sunshine: ${uniquePatients.join(", ")}\n`,
      );
    }

    // Now test as Central doctor requesting from Sunshine
    console.log("Logging in as dr.smith@central.com...\n");

    res = await fetch(`${baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dr.smith@central.com",
        password: "Test@1234",
      }),
    });
    data = await res.json();
    const centralToken = data.token;

    res = await fetch(`${baseURL}/auth/me`, {
      headers: { Authorization: `Bearer ${centralToken}` },
    });
    data = await res.json();
    const centralHospitalId = data.hospitalId;
    console.log(`Central Hospital ID: ${centralHospitalId}\n`);

    if (data.records && data.records.length > 0) {
      const firstPatient = data.records[0].patientId;
      console.log(`Testing request for patient: ${firstPatient}\n`);

      // Try the request
      res = await fetch(`${baseURL}/inter-hospital/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${centralToken}`,
        },
        body: JSON.stringify({
          patientId: firstPatient,
          targetHospitalId: sunshineHospitalId,
          reason: "Test request",
        }),
      });
      data = await res.json();

      if (!res.ok) {
        console.log(`❌ Request failed: ${data.error}`);
      } else {
        console.log(`✓ Request created: ${data.requestId}`);
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

test();
