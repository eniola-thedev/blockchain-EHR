/**
 * Supabase Seed Script: Create Test Hospital Admins and Doctors
 * Creates all the test accounts with their credentials
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Test data
const hospitals = [
  {
    name: "Central Hospital",
    email: "admin@central.com",
    password: "Admin@1234",
    license: "LIC-001",
    phone: "+234-01-4545-0000",
    address: "123 Main St, Lagos",
    country: "Nigeria",
  },
  {
    name: "Sunshine Hospital",
    email: "admin@sunshine.com",
    password: "Admin@1234",
    license: "LIC-002",
    phone: "+234-01-4545-0001",
    address: "456 Sunshine Ave, Lagos",
    country: "Nigeria",
  },
  {
    name: "LUTH Hospital",
    email: "admin@luth.com",
    password: "Admin@1234",
    license: "LIC-003",
    phone: "+234-01-4545-0002",
    address: "789 LUTH Rd, Lagos",
    country: "Nigeria",
  },
  {
    name: "FMCA Hospital",
    email: "admin@fmca.com",
    password: "Admin@1234",
    license: "LIC-004",
    phone: "+234-01-4545-0003",
    address: "321 FMCA St, Lagos",
    country: "Nigeria",
  },
  {
    name: "IFTH Hospital",
    email: "admin@ifth.com",
    password: "Admin@1234",
    license: "LIC-005",
    phone: "+234-01-4545-0004",
    address: "654 IFTH Ave, Lagos",
    country: "Nigeria",
  },
  {
    name: "UBTH Hospital",
    email: "admin@ubth.com",
    password: "Admin@1234",
    license: "LIC-006",
    phone: "+234-01-4545-0005",
    address: "987 UBTH Rd, Lagos",
    country: "Nigeria",
  },
  {
    name: "ABUTH Hospital",
    email: "admin@abuth.com",
    password: "Admin@1234",
    license: "LIC-007",
    phone: "+234-01-4545-0006",
    address: "147 ABUTH St, Lagos",
    country: "Nigeria",
  },
  {
    name: "ESUTH Hospital",
    email: "admin@esuth.com",
    password: "Admin@1234",
    license: "LIC-008",
    phone: "+234-01-4545-0007",
    address: "258 ESUTH Ave, Lagos",
    country: "Nigeria",
  },
  {
    name: "UNTH Hospital",
    email: "admin@unth.com",
    password: "Admin@1234",
    license: "LIC-009",
    phone: "+234-01-4545-0008",
    address: "369 UNTH Rd, Lagos",
    country: "Nigeria",
  },
  {
    name: "KTH Hospital",
    email: "admin@kth.com",
    password: "Admin@1234",
    license: "LIC-010",
    phone: "+234-01-4545-0009",
    address: "741 KTH St, Lagos",
    country: "Nigeria",
  },
  {
    name: "UCTH Hospital",
    email: "admin@ucth.com",
    password: "Admin@1234",
    license: "LIC-011",
    phone: "+234-01-4545-0010",
    address: "852 UCTH Ave, Lagos",
    country: "Nigeria",
  },
  {
    name: "FMCPH Hospital",
    email: "admin@fmcph.com",
    password: "Admin@1234",
    license: "LIC-012",
    phone: "+234-01-4545-0011",
    address: "963 FMCPH Rd, Lagos",
    country: "Nigeria",
  },
];

const doctors = [
  {
    name: "Dr. Smith",
    email: "dr.smith@central.com",
    password: "Test@1234",
    licenseNumber: "DOC-001",
    specialty: "General Medicine",
    hospitalEmail: "admin@central.com",
  },
];

async function seedData() {
  try {
    console.log("🌱 Starting Supabase seed...\n");

    // Seed hospitals
    console.log("👥 Creating hospital admins...");
    for (const hospital of hospitals) {
      try {
        // Create auth user
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email: hospital.email,
            password: hospital.password,
            email_confirm: true,
          });

        if (authError) {
          if (authError.message.includes("already registered")) {
            console.log(`⏭️  ${hospital.email} already exists, skipping...`);
            continue;
          }
          throw authError;
        }

        // Create user record FIRST (before hospital)
        const { error: userError } = await supabase.from("users").insert([
          {
            id: authData.user.id,
            email: hospital.email,
            role: "hospital",
          },
        ]);

        if (userError) throw userError;

        // THEN create hospital record (with user reference)
        const { data: hospitalData, error: hospitalError } = await supabase
          .from("hospitals")
          .insert([
            {
              name: hospital.name,
              email: hospital.email,
              license_number: hospital.license,
              phone: hospital.phone,
              address: hospital.address,
              country: hospital.country,
              is_verified: true,
              admin_user_id: authData.user.id,
            },
          ])
          .select()
          .single();

        if (hospitalError) throw hospitalError;

        // Update user with hospital_id
        await supabase
          .from("users")
          .update({ hospital_id: hospitalData.id })
          .eq("id", authData.user.id);

        console.log(`✅ Created: ${hospital.name} (${hospital.email})`);
      } catch (err) {
        console.error(`❌ Error creating ${hospital.email}:`, err.message);
      }
    }

    // Seed doctors
    console.log("\n👨‍⚕️  Creating doctors...");
    for (const doctor of doctors) {
      try {
        // Find the hospital first
        const { data: hospitalData, error: hospitalError } = await supabase
          .from("hospitals")
          .select("id")
          .eq("email", doctor.hospitalEmail)
          .single();

        if (hospitalError) throw hospitalError;

        // Create auth user for doctor
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email: doctor.email,
            password: doctor.password,
            email_confirm: true,
          });

        if (authError) {
          if (authError.message.includes("already registered")) {
            console.log(`⏭️  ${doctor.email} already exists, skipping...`);
            continue;
          }
          throw authError;
        }

        // Create user record
        const { error: userError } = await supabase.from("users").insert([
          {
            id: authData.user.id,
            email: doctor.email,
            role: "doctor",
            hospital_id: hospitalData.id,
            metadata: {
              name: doctor.name,
              specialty: doctor.specialty,
              licenseNumber: doctor.licenseNumber,
            },
          },
        ]);

        if (userError) throw userError;

        console.log(`✅ Created: ${doctor.name} (${doctor.email})`);
      } catch (err) {
        console.error(`❌ Error creating ${doctor.email}:`, err.message);
      }
    }

    console.log("\n✨ Seed completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seedData();
