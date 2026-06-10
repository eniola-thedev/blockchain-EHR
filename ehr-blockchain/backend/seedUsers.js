const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const hospitalIds = [
  "11111111-1111-1111-1111-111111111111", // 0 - Central
  "22222222-2222-2222-2222-222222222222", // 1 - Sunshine
  "33333333-3333-3333-3333-333333333333", // 2 - LUTH
  "44444444-4444-4444-4444-444444444444", // 3 - FMCA
  "55555555-5555-5555-5555-555555555555", // 4 - IFTH
  "66666666-6666-6666-6666-666666666666", // 5 - UBTH
  "77777777-7777-7777-7777-777777777777", // 6 - ABUTH
  "88888888-8888-8888-8888-888888888888", // 7 - ESUTH
  "99999999-9999-9999-9999-999999999999", // 8 - UNTH
  "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", // 9 - KTH
  "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", // 10 - UCTH
  "cccccccc-cccc-cccc-cccc-cccccccccccc", // 11 - FMCPH
];

const hospitalNames = [
  "Central",
  "Sunshine",
  "LUTH",
  "FMCA",
  "IFTH",
  "UBTH",
  "ABUTH",
  "ESUTH",
  "UNTH",
  "KTH",
  "UCTH",
  "FMCPH",
];

const doctorNames = [
  "Dr. James Smith", // Central
  "Dr. Sarah Johnson", // Sunshine
  "Dr. Chukwuemeka Okafor", // LUTH
  "Dr. Musa Aliyu", // FMCA
  "Dr. Umar Ibrahim", // IFTH
  "Dr. Eghosa Osagie", // UBTH
  "Dr. Abubakar Bello", // ABUTH
  "Dr. Ifeanyi Nwachukwu", // ESUTH
  "Dr. Obiora Eze", // UNTH
  "Dr. Kabiru Sani", // KTH
  "Dr. Bassey Effiong", // UCTH
  "Dr. Goodluck Amadi", // FMCPH
];

const patients = [
  {
    id: "PAT001",
    firstName: "Emeka",
    lastName: "Okonkwo",
    hospital: 0,
    condition: "Malaria",
    age: 34,
  },
  {
    id: "PAT002",
    firstName: "Fatima",
    lastName: "Aliyu",
    hospital: 1,
    condition: "Hypertension",
    age: 45,
  },
  {
    id: "PAT003",
    firstName: "Chidi",
    lastName: "Nwosu",
    hospital: 2,
    condition: "Type 2 Diabetes",
    age: 52,
  },
  {
    id: "PAT004",
    firstName: "Amina",
    lastName: "Musa",
    hospital: 3,
    condition: "Sickle Cell Disease",
    age: 28,
  },
  {
    id: "PAT005",
    firstName: "Taiwo",
    lastName: "Adeyemi",
    hospital: 4,
    condition: "Peptic Ulcer Disease",
    age: 38,
  },
  {
    id: "PAT006",
    firstName: "Ngozi",
    lastName: "Eze",
    hospital: 5,
    condition: "Pneumonia",
    age: 29,
  },
  {
    id: "PAT007",
    firstName: "Bello",
    lastName: "Ibrahim",
    hospital: 6,
    condition: "Appendicitis",
    age: 22,
  },
  {
    id: "PAT008",
    firstName: "Chioma",
    lastName: "Obi",
    hospital: 7,
    condition: "UTI",
    age: 31,
  },
  {
    id: "PAT009",
    firstName: "Yusuf",
    lastName: "Garba",
    hospital: 8,
    condition: "Tuberculosis",
    age: 41,
  },
  {
    id: "PAT010",
    firstName: "Adaeze",
    lastName: "Chukwu",
    hospital: 9,
    condition: "Gestational Diabetes",
    age: 27,
  },
  {
    id: "PAT011",
    firstName: "Segun",
    lastName: "Afolabi",
    hospital: 10,
    condition: "Asthma",
    age: 35,
  },
  {
    id: "PAT012",
    firstName: "Halima",
    lastName: "Suleiman",
    hospital: 11,
    condition: "Typhoid Fever",
    age: 24,
  },
  {
    id: "PAT013",
    firstName: "Obinna",
    lastName: "Ogbu",
    hospital: 0,
    condition: "Lower Back Pain",
    age: 48,
  },
  {
    id: "PAT014",
    firstName: "Kemi",
    lastName: "Bakare",
    hospital: 1,
    condition: "Migraine",
    age: 33,
  },
  {
    id: "PAT015",
    firstName: "Abdullahi",
    lastName: "Usman",
    hospital: 2,
    condition: "Hepatitis B",
    age: 39,
  },
  {
    id: "PAT016",
    firstName: "Ifeoma",
    lastName: "Onuoha",
    hospital: 3,
    condition: "Iron Deficiency Anaemia",
    age: 26,
  },
  {
    id: "PAT017",
    firstName: "Tunde",
    lastName: "Olawale",
    hospital: 4,
    condition: "Hypertensive Emergency",
    age: 55,
  },
  {
    id: "PAT018",
    firstName: "Zainab",
    lastName: "Kwara",
    hospital: 5,
    condition: "Malaria in Pregnancy",
    age: 23,
  },
  {
    id: "PAT019",
    firstName: "Chukwudi",
    lastName: "Aneke",
    hospital: 6,
    condition: "Inguinal Hernia",
    age: 44,
  },
  {
    id: "PAT020",
    firstName: "Blessing",
    lastName: "Effiong",
    hospital: 7,
    condition: "Preeclampsia",
    age: 30,
  },
];

// Generate all 5 record types for each patient
function generateRecords(patient) {
  const h = patient.hospital;
  const doctor = doctorNames[h];
  const hospital = hospitalNames[h];
  const name = `${patient.firstName} ${patient.lastName}`;

  return [
    // 1. DIAGNOSIS
    {
      patient_id: patient.id,
      record_type: "diagnosis",
      title: `${patient.condition} - Diagnosis`,
      description: `Patient ${name} presented with symptoms consistent with ${patient.condition}. Full clinical assessment performed. Diagnosis confirmed after examination and investigations.`,
      diagnosis: patient.condition,
      medications: [],
      lab_results: [],
      vital_signs: {
        bloodPressure: `${110 + Math.floor(Math.random() * 40)}/${70 + Math.floor(Math.random() * 20)}`,
        pulse: `${68 + Math.floor(Math.random() * 30)}`,
        temperature: `${36 + Math.random().toFixed(1) * 2}`,
        weight: `${55 + Math.floor(Math.random() * 40)}kg`,
      },
      doctor_name: doctor,
      hospital_name: hospital,
      created_by_hospital_id: hospitalIds[h],
    },

    // 2. PRESCRIPTION
    {
      patient_id: patient.id,
      record_type: "prescription",
      title: `${patient.condition} - Prescription`,
      description: `Prescription issued for ${name} following diagnosis of ${patient.condition}. Medication regimen tailored to patient's weight, age and renal function.`,
      diagnosis: patient.condition,
      medications: [
        {
          name: getMedication(patient.condition, 0),
          dosage: "500mg",
          frequency: "Twice daily",
          duration: "7 days",
          route: "Oral",
        },
        {
          name: getMedication(patient.condition, 1),
          dosage: "200mg",
          frequency: "Once daily",
          duration: "30 days",
          route: "Oral",
        },
        {
          name: "Vitamin C",
          dosage: "500mg",
          frequency: "Once daily",
          duration: "30 days",
          route: "Oral",
        },
      ],
      lab_results: [],
      vital_signs: {},
      doctor_name: doctor,
      hospital_name: hospital,
      created_by_hospital_id: hospitalIds[h],
    },

    // 3. LAB RESULT
    {
      patient_id: patient.id,
      record_type: "lab_result",
      title: `${patient.condition} - Laboratory Results`,
      description: `Laboratory investigations for ${name}. Samples collected and processed by the hospital laboratory.`,
      diagnosis: patient.condition,
      medications: [],
      lab_results: getLabResults(patient.condition),
      vital_signs: {},
      doctor_name: doctor,
      hospital_name: hospital,
      created_by_hospital_id: hospitalIds[h],
    },

    // 4. IMAGING
    {
      patient_id: patient.id,
      record_type: "imaging",
      title: `${patient.condition} - Imaging Report`,
      description: `Radiological investigation for ${name}. ${getImaging(patient.condition)} performed and reported by radiologist.`,
      diagnosis: getImagingFinding(patient.condition),
      medications: [],
      lab_results: [],
      vital_signs: {},
      doctor_name: doctor,
      hospital_name: hospital,
      created_by_hospital_id: hospitalIds[h],
    },

    // 5. VACCINATION
    {
      patient_id: patient.id,
      record_type: "vaccination",
      title: `Routine Vaccination - ${name}`,
      description: `Vaccination administered to ${name} as part of routine immunisation schedule. Patient tolerated vaccine well with no immediate adverse reactions.`,
      diagnosis: "Vaccination - Preventive Care",
      medications: [
        {
          name: getVaccine(h),
          dosage: "0.5mL",
          frequency: "Single dose",
          route: "Intramuscular",
          site: "Left deltoid",
        },
      ],
      lab_results: [],
      vital_signs: {},
      doctor_name: doctor,
      hospital_name: hospital,
      created_by_hospital_id: hospitalIds[h],
    },
  ];
}

function getMedication(condition, index) {
  const meds = {
    Malaria: ["Artemether-Lumefantrine", "Paracetamol"],
    Hypertension: ["Amlodipine", "Lisinopril"],
    "Type 2 Diabetes": ["Metformin", "Glibenclamide"],
    "Sickle Cell Disease": ["Folic Acid", "Hydroxyurea"],
    "Peptic Ulcer Disease": ["Omeprazole", "Amoxicillin"],
    Pneumonia: ["Amoxicillin-Clavulanate", "Azithromycin"],
    Appendicitis: ["Metronidazole", "Ceftriaxone"],
    UTI: ["Nitrofurantoin", "Trimethoprim"],
    Tuberculosis: ["Rifampicin", "Isoniazid"],
    "Gestational Diabetes": ["Insulin Glargine", "Folic Acid"],
    Asthma: ["Salbutamol Inhaler", "Budesonide Inhaler"],
    "Typhoid Fever": ["Ciprofloxacin", "Paracetamol"],
    "Lower Back Pain": ["Ibuprofen", "Diclofenac"],
    Migraine: ["Sumatriptan", "Paracetamol"],
    "Hepatitis B": ["Tenofovir", "Lamivudine"],
    "Iron Deficiency Anaemia": ["Ferrous Sulphate", "Folic Acid"],
    "Hypertensive Emergency": ["Labetalol", "Nifedipine"],
    "Malaria in Pregnancy": ["Quinine", "Folic Acid"],
    "Inguinal Hernia": ["Paracetamol", "Ibuprofen"],
    Preeclampsia: ["Magnesium Sulphate", "Labetalol"],
  };
  return (meds[condition] || ["Paracetamol", "Vitamin C"])[index];
}

function getLabResults(condition) {
  const labs = {
    Malaria: [
      {
        test: "Malaria RDT",
        result: "Positive - P. falciparum",
        normal: "Negative",
        flag: "POSITIVE",
      },
      {
        test: "Haemoglobin",
        result: "9.2 g/dL",
        normal: "12.0-17.5 g/dL",
        flag: "LOW",
      },
      {
        test: "WBC",
        result: "11.2 x10^9/L",
        normal: "4.5-11.0 x10^9/L",
        flag: "HIGH",
      },
    ],
    Hypertension: [
      {
        test: "Total Cholesterol",
        result: "6.2 mmol/L",
        normal: "<5.2 mmol/L",
        flag: "HIGH",
      },
      {
        test: "Fasting Glucose",
        result: "5.8 mmol/L",
        normal: "3.9-5.5 mmol/L",
        flag: "BORDERLINE",
      },
      {
        test: "Creatinine",
        result: "88 umol/L",
        normal: "60-110 umol/L",
        flag: "NORMAL",
      },
    ],
    "Type 2 Diabetes": [
      { test: "HbA1c", result: "8.9%", normal: "<6.5%", flag: "HIGH" },
      {
        test: "Fasting Glucose",
        result: "12.4 mmol/L",
        normal: "3.9-5.5 mmol/L",
        flag: "HIGH",
      },
      {
        test: "Urine Albumin",
        result: "45 mg/L",
        normal: "<30 mg/L",
        flag: "HIGH",
      },
    ],
    "Sickle Cell Disease": [
      {
        test: "Haemoglobin",
        result: "6.8 g/dL",
        normal: "12.0-16.0 g/dL",
        flag: "CRITICAL LOW",
      },
      {
        test: "Haemoglobin Electrophoresis",
        result: "HbSS pattern",
        normal: "HbAA",
        flag: "ABNORMAL",
      },
      {
        test: "Reticulocytes",
        result: "8.2%",
        normal: "0.5-1.5%",
        flag: "HIGH",
      },
    ],
    Tuberculosis: [
      {
        test: "AFB Smear",
        result: "2+ positive",
        normal: "Negative",
        flag: "POSITIVE",
      },
      {
        test: "GeneXpert MTB/RIF",
        result: "MTB Detected, RIF Sensitive",
        normal: "Not detected",
        flag: "POSITIVE",
      },
      { test: "ESR", result: "88 mm/hr", normal: "<20 mm/hr", flag: "HIGH" },
    ],
  };
  return (
    labs[condition] || [
      {
        test: "Full Blood Count",
        result: "Within normal limits",
        normal: "Normal",
        flag: "NORMAL",
      },
      {
        test: "Liver Function Test",
        result: "Within normal limits",
        normal: "Normal",
        flag: "NORMAL",
      },
      {
        test: "Urea & Electrolytes",
        result: "Within normal limits",
        normal: "Normal",
        flag: "NORMAL",
      },
    ]
  );
}

function getImaging(condition) {
  const imaging = {
    Pneumonia: "Chest X-Ray (PA view)",
    Tuberculosis: "Chest X-Ray (PA and Lateral)",
    Appendicitis: "Abdominal Ultrasound",
    "Inguinal Hernia": "Abdominal Ultrasound",
    "Peptic Ulcer Disease": "Upper GI Endoscopy",
    "Lower Back Pain": "Lumbar Spine X-Ray",
    "Gestational Diabetes": "Obstetric Ultrasound",
    Preeclampsia: "Obstetric Ultrasound",
    "Malaria in Pregnancy": "Obstetric Ultrasound",
  };
  return imaging[condition] || "Chest X-Ray (PA view)";
}

function getImagingFinding(condition) {
  const findings = {
    Pneumonia: "Right lower lobe consolidation consistent with pneumonia",
    Tuberculosis:
      "Bilateral upper lobe infiltrates with cavitation - consistent with TB",
    Appendicitis:
      "Enlarged appendix 9mm diameter with periappendiceal fat stranding",
    "Inguinal Hernia": "Right inguinal hernia containing omentum, reducible",
    "Peptic Ulcer Disease":
      "Gastric ulcer lesser curvature 1.2cm, no active bleeding",
    "Lower Back Pain":
      "Mild L4/L5 disc degeneration, no nerve root compression",
    "Gestational Diabetes":
      "Single live fetus, cephalic presentation, AFI normal",
    Preeclampsia:
      "Single live fetus, reduced fetal movements, placenta grade II",
  };
  return findings[condition] || "No significant abnormality detected";
}

function getVaccine(hospitalIndex) {
  const vaccines = [
    "Hepatitis B Vaccine",
    "Yellow Fever Vaccine",
    "Meningococcal Vaccine",
    "Pneumococcal Vaccine",
    "Tetanus Toxoid",
    "Influenza Vaccine",
    "HPV Vaccine",
    "Typhoid Vaccine",
    "Hepatitis A Vaccine",
    "COVID-19 Vaccine (AstraZeneca)",
    "Varicella Vaccine",
    "MMR Vaccine",
  ];
  return vaccines[hospitalIndex];
}

(async () => {
  console.log("🏥 Seeding medical records for all 20 patients...\n");
  console.log(
    "Each patient will get: Diagnosis + Prescription + Lab Result + Imaging + Vaccination\n",
  );

  let totalCreated = 0;
  let totalFailed = 0;

  for (const patient of patients) {
    // Get patient user id
    const { data: patientUser } = await supabase
      .from("users")
      .select("id")
      .eq("patient_id", patient.id)
      .maybeSingle();

    if (!patientUser) {
      console.log(`❌ Patient ${patient.id} not found in database — skipping`);
      totalFailed += 5;
      continue;
    }

    const records = generateRecords(patient);

    for (const record of records) {
      const { error } = await supabase
        .from("medical_records")
        .insert([{ ...record, patient_user_id: patientUser.id }]);

      if (error) {
        console.log(
          `❌ ${patient.id} - ${record.record_type}: ${error.message}`,
        );
        totalFailed++;
      } else {
        totalCreated++;
      }
    }

    console.log(
      `✅ ${patient.id} - ${patient.firstName} ${patient.lastName}: 5 records created (diagnosis, prescription, lab_result, imaging, vaccination)`,
    );
  }

  console.log(
    `\n🎉 Done! ${totalCreated} records created, ${totalFailed} failed.`,
  );
  console.log(
    `📊 Total: ${patients.length} patients × 5 record types = ${patients.length * 5} records`,
  );
})();
