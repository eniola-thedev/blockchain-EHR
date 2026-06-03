# Supabase Migration - Complete Setup Guide

## Phase 1: Create Supabase Project ✅

### Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
   - **Name**: medchain-ehr
   - **Database Password**: Save this securely!
   - **Region**: Choose closest to Nigeria or your region
3. Wait for project to be created (1-2 minutes)

### Step 2: Get API Keys

1. Once created, go to **Settings → API**
2. Copy and save:
   - `Project URL` → Put in `SUPABASE_URL`
   - `anon public` key → Put in `SUPABASE_ANON_KEY`
   - `service_role` key → Put in `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Create Database Schema

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy-paste the SQL from `SUPABASE_MIGRATION.md` (Phase 1: Database Tables)
4. Click **Run**

### Step 4: Set Up Authentication

1. Go to **Authentication → Providers**
2. Email/Password should already be enabled ✅
3. Go to **Authentication → URL Configuration**
4. Add **Redirect URLs**:
   ```
   https://your-vercel-domain.vercel.app/
   http://localhost:3000/
   ```
5. Save

---

## Phase 2: Update Backend

### Step 1: Install Supabase Package

```bash
npm install --prefix ehr-blockchain/backend @supabase/supabase-js
```

### Step 2: Replace Files

The following new files have been created:

- `backend/services/supabaseClient.js` ✅
- `backend/controllers/authController.supabase.js` ✅
- `backend/middleware/auth.supabase.js` ✅
- `backend/server.supabase.js` ✅

### Step 3: Backup and Swap Files

```bash
cd ehr-blockchain/backend

# Backup originals
cp server.js server.mongodb.js
cp controllers/authController.js controllers/authController.mongodb.js
cp middleware/auth.js middleware/auth.mongodb.js

# Use Supabase versions
cp server.supabase.js server.js
cp controllers/authController.supabase.js controllers/authController.js
cp middleware/auth.supabase.js middleware/auth.js
```

### Step 4: Update package.json

Add to `ehr-blockchain/backend/package.json` dependencies:

```json
"@supabase/supabase-js": "^2.38.0"
```

---

## Phase 3: Set Environment Variables

### On Render:

1. Go to [render.com](https://render.com) → Your service → **Environment**
2. Add these:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJ0eXAi...
   SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAi...
   JWT_SECRET=your-secret-key-here
   NODE_ENV=production
   ```

---

## Phase 4: Update Frontend

### Step 1: Update API Service

Replace `frontend/src/services/api.js`:

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api",
  timeout: 30000,
});

// JWT interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("medchain_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("medchain_token");
      localStorage.removeItem("medchain_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  registerHospital: (data) => api.post("/auth/register/hospital", data),
  registerPatient: (data) => api.post("/auth/register/patient", data),
  registerDoctor: (data) => api.post("/auth/register/doctor", data),
  getMe: () => api.get("/auth/me"),
};

export const recordsAPI = {
  create: (data) => api.post("/records", data),
  getByPatient: (patientId, params) =>
    api.get(`/records/patient/${patientId}`, { params }),
  getById: (id) => api.get(`/records/${id}`),
};

export const hospitalsAPI = {
  getAll: () => api.get("/hospitals"),
  getById: (id) => api.get(`/hospitals/${id}`),
};

export const accessAPI = {
  request: (data) => api.post("/access/request", data),
  grant: (requestId, data) => api.post(`/access/${requestId}/grant`, data),
  revoke: (requestId) => api.post(`/access/${requestId}/revoke`),
  getIncoming: (params) => api.get("/access/incoming", { params }),
  getOutgoing: () => api.get("/access/outgoing"),
  checkAccess: (patientId) => api.get(`/access/check/${patientId}`),
};

export const auditAPI = {
  getLogs: (params) => api.get("/audit", { params }),
  getPatientLogs: (patientId) => api.get(`/audit/patient/${patientId}`),
};

export default api;
```

### Step 2: AuthContext remains the same ✅

No changes needed to `frontend/src/context/AuthContext.js`

### Step 3: Vercel Environment Variable

1. Go to [vercel.com](https://vercel.com) → Your Project → **Settings** → **Environment Variables**
2. Update `REACT_APP_API_URL`:
   ```
   https://blockchain-ehr-4.onrender.com
   ```

---

## Phase 5: Deploy

### Backend:

```bash
git add .
git commit -m "Migrate to Supabase - fresh start"
git push
```

Wait for Render to redeploy (2-3 minutes)

### Frontend:

1. Go to Vercel Dashboard
2. Click **Deployments** → Latest → **Redeploy**
3. Wait for deployment (1-2 minutes)

---

## Phase 6: Test

1. Go to your Vercel frontend
2. Try to register a hospital account
3. Try to login
4. Check Render logs for any errors: `https://render.com` → Your service → **Logs**

---

## Common Issues & Fixes

### "Supabase connection failed"

- Check `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set on Render
- Wait 2-3 minutes for Render to finish deployment

### "Invalid credentials on login"

- Make sure the user was created in Supabase (check Supabase Auth tab)
- Verify the password is correct

### "CORS error"

- Already fixed in server.js with `cors({ origin: true })`
- If persists, restart Render service

---

## What's Next?

After login works:

1. ✅ Backend routes need updating to use Supabase queries
2. ✅ Records, Access, Audit features work as-is (same API)
3. ✅ Blockchain integration untouched
4. ✅ IPFS integration untouched

Want me to update the other routes (records, access, etc.) to work with Supabase?
