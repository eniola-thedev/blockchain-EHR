# Supabase Migration Guide

## Phase 1: Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create account
3. Click "New Project"
   - **Name**: medchain-ehr
   - **Database Password**: Save this!
   - **Region**: Choose closest to you
4. Click "Create new project" (takes 1-2 min)
5. Once created, go to **Settings → Database** and copy:
   - `Connection String` (PostgreSQL)
   - `API URL`
   - `API Key` (anon key)

### Step 2: Create Tables in Supabase

Go to **SQL Editor** → **New Query** and run this:

```sql
-- Users table (handles hospitals, doctors, patients)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'hospital', 'doctor', 'patient')) NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Hospital fields
  hospital_id UUID REFERENCES hospitals(id),
  wallet_address TEXT,

  -- Doctor fields
  doctor_license TEXT,
  specialization TEXT,
  department TEXT,

  -- Patient fields
  patient_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  genotype TEXT CHECK (genotype IN ('AA', 'AS', 'SS', 'AC', 'SC')),
  phone TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Hospitals table
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  country TEXT DEFAULT 'Nigeria',
  wallet_address TEXT UNIQUE,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  admin_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Medical Records table
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL,
  patient_user_id UUID REFERENCES users(id),
  record_type TEXT CHECK (record_type IN ('diagnosis', 'prescription', 'lab_result', 'imaging', 'surgery', 'vaccination', 'general')) NOT NULL,

  title TEXT NOT NULL,
  description TEXT,
  diagnosis TEXT,
  medications JSONB,
  lab_results JSONB,
  vital_signs JSONB,

  created_by_hospital_id UUID REFERENCES hospitals(id),
  created_by_doctor_id UUID REFERENCES users(id),
  doctor_name TEXT,
  hospital_name TEXT,

  blockchain_tx_hash TEXT,
  ipfs_data_hash TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Access Requests table
CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  requesting_hospital_id UUID REFERENCES hospitals(id),
  target_hospital_id UUID REFERENCES hospitals(id),
  home_hospital_id UUID REFERENCES hospitals(id),
  reason TEXT,
  is_emergency BOOLEAN DEFAULT false,
  record_types TEXT[] DEFAULT ARRAY['all'],
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')) DEFAULT 'pending',
  granted_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  performed_by_id UUID REFERENCES users(id),
  hospital_id UUID REFERENCES hospitals(id),
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX idx_medical_records_hospital_id ON medical_records(created_by_hospital_id);
CREATE INDEX idx_access_requests_patient_id ON access_requests(patient_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by_id);
```

### Step 3: Enable Auth in Supabase

1. Go to **Authentication → Providers**
2. Email/Password is already enabled ✅
3. Go to **Authentication → URL Configuration**
4. Add **Redirect URL**: `https://your-vercel-domain.vercel.app/`
5. Save

---

## Environment Variables for Render

Add these to Render Backend Settings:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ0eXA...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXA...
```

Get these from Supabase Settings → API
