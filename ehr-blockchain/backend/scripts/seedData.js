/**
 * Seed Script: Generate Dummy Medical Records
 * Creates 50 realistic medical records for testing inter-hospital searches
 * Usage: node scripts/seedData.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { Hospital, MedicalRecord, AccessRequest } = require("../models/index");
const User = require("../models/User");
// FIX 1: Removed unused `id` import from ethers

const DB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/medchain";

// ──── DUMMY DATA ─────────────────────────────────────────────────────

const samplePatients = [
  {
    id: "PAT001",
    name: "John Doe",
    dob: "1985-03-15",
    bg: "O+",
    genotype: "AA",
  },
  {
    id: "PAT002",
    name: "Jane Smith",
    dob: "1990-07-22",
    bg: "A+",
    genotype: "AS",
  },
  {
    id: "PAT003",
    name: "Michael Johnson",
    dob: "1978-11-08",
    bg: "B+",
    genotype: "AA",
  },
  {
    id: "PAT004",
    name: "Sarah Williams",
    dob: "1992-02-14",
    bg: "AB+",
    genotype: "AS",
  },
  {
    id: "PAT005",
    name: "David Brown",
    dob: "1988-05-30",
    bg: "O-",
    genotype: "SS",
  },
  {
    id: "PAT006",
    name: "Emma Davis",
    dob: "1995-09-18",
    bg: "A-",
    genotype: "AA",
  },
  {
    id: "PAT007",
    name: "James Wilson",
    dob: "1980-12-25",
    bg: "B-",
    genotype: "AC",
  },
  {
    id: "PAT008",
    name: "Lisa Anderson",
    dob: "1987-04-10",
    bg: "AB-",
    genotype: "AA",
  },
  {
    id: "PAT009",
    name: "Robert Martinez",
    dob: "1993-06-17",
    bg: "O+",
    genotype: "AS",
  },
  {
    id: "PAT010",
    name: "Mary Thompson",
    dob: "1989-08-09",
    bg: "A+",
    genotype: "AA",
  },
  {
    id: "PAT011",
    name: "William Garcia",
    dob: "1982-10-05",
    bg: "B+",
    genotype: "SS",
  },
];

const diagnoses = [
  "Hypertension",
  "Type 2 Diabetes",
  "Asthma",
  "Pneumonia",
  "Urinary Tract Infection",
  "Migraine",
  "Gastroenteritis",
  "Bronchitis",
  "Hyperlipidemia",
  "Anemia",
  "COVID-19",
  "Allergy Rhinitis",
  "Eczema",
  "Arthritis",
  "Thyroid Disorder",
];

const medications = [
  {
    name: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    duration: "30 days",
    notes: "ACE inhibitor for hypertension",
  },
  {
    name: "Metformin",
    dosage: "500mg",
    frequency: "Twice daily",
    duration: "30 days",
    notes: "First-line treatment for Type 2 Diabetes",
  },
  {
    name: "Albuterol",
    dosage: "100mcg",
    frequency: "As needed",
    duration: "Ongoing",
    notes: "Bronchodilator for asthma",
  },
  {
    name: "Amoxicillin",
    dosage: "500mg",
    frequency: "Three times daily",
    duration: "7 days",
    notes: "Antibiotic for bacterial infections",
  },
  {
    name: "Ibuprofen",
    dosage: "400mg",
    frequency: "Every 6 hours",
    duration: "5 days",
    notes: "Anti-inflammatory pain relief",
  },
  {
    name: "Omeprazole",
    dosage: "20mg",
    frequency: "Once daily",
    duration: "14 days",
    notes: "Proton pump inhibitor for GERD",
  },
  {
    name: "Atorvastatin",
    dosage: "20mg",
    frequency: "Once daily",
    duration: "30 days",
    notes: "Statin for cholesterol management",
  },
  {
    name: "Sertraline",
    dosage: "50mg",
    frequency: "Once daily",
    duration: "30 days",
    notes: "SSRI for anxiety and depression",
  },
  {
    name: "Azithromycin",
    dosage: "250mg",
    frequency: "Once daily",
    duration: "5 days",
    notes: "Antibiotic for respiratory infections",
  },
  {
    name: "Paracetamol",
    dosage: "500mg",
    frequency: "Every 4-6 hours",
    duration: "As needed",
    notes: "Analgesic and antipyretic",
  },
  {
    name: "Aspirin",
    dosage: "75mg",
    frequency: "Once daily",
    duration: "30 days",
    notes: "Antiplatelet therapy",
  },
  {
    name: "Levothyroxine",
    dosage: "50mcg",
    frequency: "Once daily",
    duration: "30 days",
    notes: "Thyroid hormone replacement",
  },
];

const labTests = [
  {
    testName: "Complete Blood Count (CBC)",
    value: "Normal",
    unit: "cells/µL",
    normalRange: "4.5-11.0 x10^9/L",
    isAbnormal: false,
  },
  {
    testName: "Fasting Blood Sugar",
    value: "110",
    unit: "mg/dL",
    normalRange: "70-100",
    isAbnormal: true,
  },
  {
    testName: "Hemoglobin A1C",
    value: "6.8",
    unit: "%",
    normalRange: "<5.7",
    isAbnormal: true,
  },
  {
    testName: "Total Cholesterol",
    value: "225",
    unit: "mg/dL",
    normalRange: "<200",
    isAbnormal: true,
  },
  {
    testName: "LDL Cholesterol",
    value: "145",
    unit: "mg/dL",
    normalRange: "<100",
    isAbnormal: true,
  },
  {
    testName: "HDL Cholesterol",
    value: "35",
    unit: "mg/dL",
    normalRange: ">40",
    isAbnormal: true,
  },
  {
    testName: "Triglycerides",
    value: "180",
    unit: "mg/dL",
    normalRange: "<150",
    isAbnormal: true,
  },
  {
    testName: "Serum Creatinine",
    value: "0.9",
    unit: "mg/dL",
    normalRange: "0.7-1.3",
    isAbnormal: false,
  },
  {
    testName: "Blood Urea Nitrogen",
    value: "18",
    unit: "mg/dL",
    normalRange: "7-20",
    isAbnormal: false,
  },
  {
    testName: "Serum Sodium",
    value: "138",
    unit: "mEq/L",
    normalRange: "136-145",
    isAbnormal: false,
  },
  {
    testName: "Serum Potassium",
    value: "4.2",
    unit: "mEq/L",
    normalRange: "3.5-5.0",
    isAbnormal: false,
  },
  {
    testName: "TSH (Thyroid Stimulating Hormone)",
    value: "2.5",
    unit: "mIU/L",
    normalRange: "0.4-4.0",
    isAbnormal: false,
  },
  {
    testName: "Albumin",
    value: "3.8",
    unit: "g/dL",
    normalRange: "3.5-5.0",
    isAbnormal: false,
  },
  {
    testName: "Hemoglobin",
    value: "13.2",
    unit: "g/dL",
    normalRange: "12-17",
    isAbnormal: false,
  },
  {
    testName: "White Blood Cell Count",
    value: "7.2",
    unit: "x10^9/L",
    normalRange: "4.5-11.0",
    isAbnormal: false,
  },
  {
    testName: "Platelet Count",
    value: "250",
    unit: "x10^9/L",
    normalRange: "150-400",
    isAbnormal: false,
  },
  {
    testName: "ALT (Alanine Aminotransferase)",
    value: "28",
    unit: "U/L",
    normalRange: "<33",
    isAbnormal: false,
  },
  {
    testName: "AST (Aspartate Aminotransferase)",
    value: "32",
    unit: "U/L",
    normalRange: "<32",
    isAbnormal: true,
  },
  {
    testName: "Alkaline Phosphatase",
    value: "68",
    unit: "U/L",
    normalRange: "44-147",
    isAbnormal: false,
  },
  {
    testName: "Bilirubin (Total)",
    value: "0.8",
    unit: "mg/dL",
    normalRange: "0.1-1.2",
    isAbnormal: false,
  },
];

const recordTypes = [
  "diagnosis",
  "prescription",
  "lab_result",
  "imaging",
  "vaccination",
  "general",
];

// ──── SEED FUNCTION ──────────────────────────────────────────────────

async function seedDatabase() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Create or get hospitals
    console.log("📋 Setting up hospitals...");
    const hospitalsData = [
      {
        name: "Central Medical Hospital",
        licenseNumber: "HOS001",
        email: "central@hospital.com",
        phone: "+234-1-234-5678",
        address: "123 Medical Avenue, Lagos",
        adminEmail: "admin@central.com",
      },
      {
        name: "Sunshine Medical Center",
        licenseNumber: "HOS002",
        email: "sunshine@hospital.com",
        phone: "+234-1-987-6543",
        address: "456 Health Street, Ibadan",
        adminEmail: "admin@sunshine.com",
      },
      {
        name: "Lagos State Teaching Hospital",
        licenseNumber: "HOS003",
        email: "luth@hospital.com",
        phone: "+234-1-555-8901",
        address: "789 Academic Lane, Lagos",
        adminEmail: "admin@luth.com",
      },
      {
        name: "Federal Medical Center Abuja",
        licenseNumber: "HOS004",
        email: "fmca@hospital.com",
        phone: "+234-9-456-7890",
        address: "321 Government Road, Abuja",
        adminEmail: "admin@fmca.com",
      },
      {
        name: "Ile-Ife Teaching Hospital",
        licenseNumber: "HOS005",
        email: "ifth@hospital.com",
        phone: "+234-36-230-5678",
        address: "654 University Street, Ile-Ife",
        adminEmail: "admin@ifth.com",
      },
      {
        name: "University of Benin Teaching Hospital",
        licenseNumber: "HOS006",
        email: "ubth@hospital.com",
        phone: "+234-52-600-8910",
        address: "PMB 1111, Benin City",
        adminEmail: "admin@ubth.com",
      },
      {
        name: "Ahmadu Bello University Teaching Hospital",
        licenseNumber: "HOS007",
        email: "abuth@hospital.com",
        phone: "+234-69-331-0456",
        address: "Shika, Zaria",
        adminEmail: "admin@abuth.com",
      },
      {
        name: "Enugu State University Teaching Hospital",
        licenseNumber: "HOS008",
        email: "esuth@hospital.com",
        phone: "+234-42-457-0123",
        address: "New Haven, Enugu",
        adminEmail: "admin@esuth.com",
      },
      {
        name: "University of Nigeria Teaching Hospital",
        licenseNumber: "HOS009",
        email: "unth@hospital.com",
        phone: "+234-42-776-5432",
        address: "Enugu Road, Nsukka",
        adminEmail: "admin@unth.com",
      },
      {
        name: "Kano Teaching Hospital",
        licenseNumber: "HOS010",
        email: "kth@hospital.com",
        phone: "+234-64-661-2345",
        address: "Nassarawa, Kano",
        adminEmail: "admin@kth.com",
      },
      {
        name: "University of Calabar Teaching Hospital",
        licenseNumber: "HOS011",
        email: "ucth@hospital.com",
        phone: "+234-87-226-7890",
        address: "PMB 1278, Calabar",
        adminEmail: "admin@ucth.com",
      },
      {
        name: "Federal Medical Center Port Harcourt",
        licenseNumber: "HOS012",
        email: "fmcph@hospital.com",
        phone: "+234-84-231-4567",
        address: "East-West Road, Port Harcourt",
        adminEmail: "admin@fmcph.com",
      },
    ];

    const hospitals = [];
    for (const hospData of hospitalsData) {
      let hospital = await Hospital.findOne({
        licenseNumber: hospData.licenseNumber,
      });
      if (!hospital) {
        hospital = await Hospital.create({
          name: hospData.name,
          licenseNumber: hospData.licenseNumber,
          email: hospData.email,
          phone: hospData.phone,
          address: hospData.address,
          country: "Nigeria",
          walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
          isVerified: true,
          isActive: true,
        });
        console.log(`✅ Created ${hospital.name}`);
      } else {
        // Ensure existing hospitals are verified and active
        if (!hospital.isVerified || !hospital.isActive) {
          hospital.isVerified = true;
          hospital.isActive = true;
          await hospital.save();
        }
      }
      hospitals.push(hospital);
    }

    // Create hospital admins
    console.log("\n👨‍💼 Setting up hospital admins...");
    for (let i = 0; i < hospitals.length; i++) {
      const hospital = hospitals[i];
      let admin = await User.findOne({ email: hospitalsData[i].adminEmail });
      if (!admin) {
        admin = await User.create({
          email: hospitalsData[i].adminEmail,
          password: "Admin@1234",
          role: "hospital",
          hospitalId: hospital._id,
          isActive: true,
        });
        hospital.adminUser = admin._id;
        await hospital.save();
        console.log(`✅ Created admin for ${hospital.name}`);
      }
    }

    // Create doctor users
    console.log("\n👨‍⚕️ Setting up doctors...");
    const doctorsData = [
      {
        email: "dr.smith@central.com",
        specialization: "Internal Medicine",
        department: "General Medicine",
        hospitalIndex: 0,
      },
      {
        email: "dr.johnson@sunshine.com",
        specialization: "Cardiology",
        department: "Cardiology",
        hospitalIndex: 1,
      },
      {
        email: "dr.williams@luth.com",
        specialization: "Pediatrics",
        department: "Pediatrics",
        hospitalIndex: 2,
      },
      {
        email: "dr.brown@fmca.com",
        specialization: "Surgery",
        department: "General Surgery",
        hospitalIndex: 3,
      },
      {
        email: "dr.davis@ifth.com",
        specialization: "Orthopedics",
        department: "Orthopedic Surgery",
        hospitalIndex: 4,
      },
      {
        email: "dr.okonkwo@ubth.com",
        specialization: "Obstetrics & Gynecology",
        department: "O&G",
        hospitalIndex: 5,
      },
      {
        email: "dr.muhammed@abuth.com",
        specialization: "Neurology",
        department: "Neurology",
        hospitalIndex: 6,
      },
      {
        email: "dr.nwosu@esuth.com",
        specialization: "Emergency Medicine",
        department: "Emergency Care",
        hospitalIndex: 7,
      },
      {
        email: "dr.eze@unth.com",
        specialization: "Psychiatry",
        department: "Mental Health",
        hospitalIndex: 8,
      },
      {
        email: "dr.zainab@kth.com",
        specialization: "Radiology",
        department: "Radiology & Imaging",
        hospitalIndex: 9,
      },
      {
        email: "dr.edem@ucth.com",
        specialization: "Infectious Diseases",
        department: "Infectious Diseases",
        hospitalIndex: 10,
      },
      {
        email: "dr.okafor@fmcph.com",
        specialization: "Oncology",
        department: "Cancer Care",
        hospitalIndex: 11,
      },
    ];

    const doctors = [];
    for (const docData of doctorsData) {
      let doctor = await User.findOne({ email: docData.email });
      if (!doctor) {
        doctor = await User.create({
          email: docData.email,
          password: "Test@1234",
          role: "doctor",
          hospitalId: hospitals[docData.hospitalIndex]._id,
          doctorLicense: `LIC${docData.hospitalIndex + 1}`,
          specialization: docData.specialization,
          department: docData.department,
          isActive: true,
        });
        console.log(`✅ Created Dr. ${docData.email.split("@")[0]}`);
      }
      doctors.push(doctor);
    }

    // Create patient users and medical records
    console.log("\n🩺 Creating medical records...");
    let recordCount = 0;

    // FIX 2: Added missing closing brace for the inner hospital loop
    for (let i = 0; i < samplePatients.length; i++) {
      const patient = samplePatients[i];

      let patientUser = await User.findOne({
        email: `${patient.id}@patient.com`,
      });
      if (!patientUser) {
        patientUser = await User.create({
          email: `${patient.id}@patient.com`,
          password: "Patient@1234",
          role: "patient",
          patientId: patient.id,
          hospitalId: hospitals[0]._id, // Primary hospital
          registeredHospitals: hospitals.map(h => h._id), // Registered at ALL hospitals
          firstName: patient.name.split(" ")[0],
          lastName: patient.name.split(" ")[1],
          dateOfBirth: new Date(patient.dob),
          bloodGroup: patient.bg,
          genotype: patient.genotype,
          phone: `+234-${Math.random().toString().slice(2, 12)}`,
          isActive: true,
        });
      } else {
        // Update existing patient to be registered at all hospitals
        patientUser.registeredHospitals = hospitals.map(h => h._id);
        await patientUser.save();
      }

      const recordsPerPatient = 8 + Math.floor(Math.random() * 3);
      for (let h = 0; h < hospitals.length; h++) {
        const selectedHospital = hospitals[h];
        const selectedDoctor = doctors[h] || doctors[0];

        for (let j = 0; j < recordsPerPatient; j++) {
          const recordType =
            recordTypes[Math.floor(Math.random() * recordTypes.length)];

          const numMeds = ["prescription", "diagnosis"].includes(recordType)
            ? 2 + Math.floor(Math.random() * 3)
            : Math.floor(Math.random() * 2);
          const numLabTests =
            recordType === "lab_result"
              ? 2 + Math.floor(Math.random() * 5)
              : Math.floor(Math.random() * 2);

          const selectedMeds = [];
          for (let k = 0; k < numMeds; k++) {
            selectedMeds.push(
              medications[Math.floor(Math.random() * medications.length)],
            );
          }

          const selectedLabTests = [];
          for (let k = 0; k < numLabTests; k++) {
            selectedLabTests.push(
              labTests[Math.floor(Math.random() * labTests.length)],
            );
          }

          const medicalRecord = {
            patientId: patient.id,
            patientUser: patientUser._id,
            recordType: recordType,
            title: `${recordType.replace("_", " ").toUpperCase()}: ${diagnoses[Math.floor(Math.random() * diagnoses.length)]}`,
            description: `Medical record for patient ${patient.name}. Created by ${selectedDoctor.email.split("@")[0]} at ${selectedHospital.name}`,
            diagnosis: diagnoses[Math.floor(Math.random() * diagnoses.length)],
            medications: selectedMeds.length > 0 ? selectedMeds : undefined,
            labResults:
              selectedLabTests.length > 0 ? selectedLabTests : undefined,
            vitalSigns: {
              bloodPressure: `${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 20)}`,
              heartRate: 55 + Math.floor(Math.random() * 50),
              temperature: 36.4 + Math.random() * 1.2,
              weight: 55 + Math.floor(Math.random() * 50),
              height: 155 + Math.floor(Math.random() * 35),
              oxygenSat: 94 + Math.floor(Math.random() * 6),
            },
            attachments: [],
            createdByHospital: selectedHospital._id,
            createdByDoctor: selectedDoctor._id,
            doctorName: `Dr. ${selectedDoctor.email.split("@")[0].split(".")[1]}`,
            hospitalName: selectedHospital.name,
            isDeleted: false,
            createdAt: new Date(
              Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000,
            ),
          };

          await MedicalRecord.create(medicalRecord);
          recordCount++;
          process.stdout.write(`\r   📄 Records created: ${recordCount}`);
        } // end j loop (recordsPerPatient)
      } // FIX 2: end h loop (hospitals) — was missing in original
    } // end i loop (samplePatients)

    // Create dedicated demo patient with lots of records
    let demoPatient = await User.findOne({ email: "patient@demo.com" });
    if (!demoPatient) {
      demoPatient = await User.create({
        email: "patient@demo.com",
        password: "Patient@1234",
        role: "patient",
        patientId: "PAT-DEMO-001",
        hospitalId: hospitals[0]._id,
        registeredHospitals: hospitals.map(h => h._id), // Registered at ALL hospitals
        firstName: "Demo",
        lastName: "Patient",
        dateOfBirth: new Date("1990-01-01"),
        bloodGroup: "O+",
        genotype: "AA",
        phone: "+234-800-000-0000",
        isActive: true,
      });
      console.log("\n✅ Created Demo Patient");

      // Add 15 diverse records for demo patient
      for (let i = 0; i < 15; i++) {
        const recordType = recordTypes[i % recordTypes.length];
        const selectedDoctor = doctors[0];
        const selectedHospital = hospitals[0];

        const numMeds = ["prescription", "diagnosis"].includes(recordType)
          ? 2 + Math.floor(Math.random() * 3)
          : 0;
        const numLabTests =
          recordType === "lab_result" ? 3 + Math.floor(Math.random() * 4) : 0;

        const selectedMeds = [];
        for (let k = 0; k < numMeds; k++) {
          selectedMeds.push(medications[k % medications.length]);
        }

        const selectedLabTests = [];
        for (let k = 0; k < numLabTests; k++) {
          selectedLabTests.push(labTests[k % labTests.length]);
        }

        await MedicalRecord.create({
          patientId: "PAT-DEMO-001",
          patientUser: demoPatient._id,
          recordType: recordType,
          title: `${recordType.replace("_", " ").toUpperCase()}: ${diagnoses[i % diagnoses.length]}`,
          description: `Sample medical record for demonstration purposes`,
          diagnosis: diagnoses[i % diagnoses.length],
          medications: selectedMeds.length > 0 ? selectedMeds : undefined,
          labResults:
            selectedLabTests.length > 0 ? selectedLabTests : undefined,
          vitalSigns: {
            bloodPressure: `${115 + (i % 10)}/${75 + (i % 8)}`,
            heartRate: 60 + (i % 30),
            temperature: 36.5 + (i % 10) * 0.1,
            weight: 70,
            height: 175,
            oxygenSat: 97,
          },
          attachments: [],
          createdByHospital: selectedHospital._id,
          createdByDoctor: selectedDoctor._id,
          doctorName: `Dr. ${selectedDoctor.email.split("@")[0].split(".")[1]}`,
          hospitalName: selectedHospital.name,
          isDeleted: false,
          createdAt: new Date(Date.now() - (15 - i) * 3 * 24 * 60 * 60 * 1000),
        });
      }
    } else {
      // Update existing demo patient to be registered at all hospitals
      demoPatient.registeredHospitals = hospitals.map(h => h._id);
      await demoPatient.save();
    }

    console.log("\n✅ Seed completed successfully!");
    console.log(`\n📊 Summary:`);
    console.log(`   • ${samplePatients.length} patients created`);
    console.log(
      `   • ${recordCount + 15} medical records created (${recordCount} + 15 demo records)`,
    );
    console.log(
      `   • ${hospitals.length} hospitals: ${hospitals.map((h) => h.name).join(", ")}`,
    );
    console.log(`   • ${hospitals.length} hospital admins setup`);
    console.log(`   • ${doctors.length} doctors setup`);
    console.log(`\n🔑 Test Credentials:`);
    hospitalsData.forEach((h, i) => {
      console.log(`   Hospital ${i + 1} Admin: ${h.adminEmail} / Admin@1234`);
    });
    console.log(`   Doctor: dr.smith@central.com / Test@1234`);
    console.log(
      `   Patient Demo: patient@demo.com / Patient@1234 (PAT-DEMO-001)`,
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error.message);
    process.exit(1);
  }
}

// Run seed
seedDatabase();
