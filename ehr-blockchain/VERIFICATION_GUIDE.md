# Quick Verification Guide

## 🧪 Testing the Fix

### Test Scenario 1: Inter-Hospital Request Flow

**Setup:**

- Hospital A = "Central Hospital" (ID: `hosp_001`)
- Hospital B = "Sunshine Central" (ID: `hosp_002`)
- Patient = "PAT001" (registered at Sunshine Central)

**Steps:**

1. Login as doctor from Central Hospital
2. Navigate to "Inter-Hospital Record Request"
3. Fill form:
   - Patient ID: `PAT001`
   - **SELECT "Sunshine Central"** from hospital dropdown
   - Reason: "Patient needs care continuation"
   - Click "Submit Request"

**Expected Results:**

- ✅ Request succeeds
- ✅ Central Hospital sees it in "Outgoing (Sent)" tab
- ✅ Sunshine Central admin sees it in "Incoming (To Review)" tab
- ✅ Status shows "Pending"

### Test Scenario 2: Approve Request

**Steps:**

1. Login as admin from Sunshine Central
2. Navigate to "Inter-Hospital Record Request"
3. Go to "Incoming (To Review)" tab
4. Click "✅ Approve" button on request from Central Hospital
5. Set duration (default 72 hours)

**Expected Results:**

- ✅ Request status changes to "Approved"
- ✅ Central Hospital sees status as "Approved" in Outgoing tab
- ✅ Shows "72 hours remaining"
- ✅ Sunshine Central can see "🔒 Revoke Access" button

### Test Scenario 3: Patient Registration

**Steps:**

1. Go to Doctor Dashboard
2. Click "Register Patient"
3. **Step 1:** Enter basic info
   - First Name, Last Name, Email, DOB, Gender
   - Click "Next →"
4. **Step 2:** Enter health info
   - Blood Group, Genotype, Phone
   - Click "Register Patient"

**Expected Results:**

- ✅ Step indicator shows progress
- ✅ Can go back with "← Back" button
- ✅ Patient registered successfully
- ✅ Patient searchable immediately

### Test Scenario 4: Doctor Dashboard Features

**Steps:**

1. Go to Doctor Dashboard
2. Check if "Pending Inter-Hospital Requests" alert shows
3. Search for a patient
4. Review displayed patient info
5. Click "Add Record" button
6. Create a record and save

**Expected Results:**

- ✅ Alert shows count of pending requests
- ✅ Patient info displays (name, blood group, genotype, DOB)
- ✅ Medical records list updates
- ✅ Record modal opens and saves successfully

---

## 🔍 Database Verification

### Check AccessRequest Schema

```javascript
// In MongoDB, check one AccessRequest:
db.accessrequests.findOne({})

// Should show:
{
  _id: ObjectId(...),
  patientId: "PAT001",
  requestingHospital: ObjectId("hosp_001"),  // Central (SENDING)
  targetHospital: ObjectId("hosp_002"),      // Sunshine (HAS RECORDS)
  homeHospital: ObjectId("hosp_002"),        // (backward compat)
  status: "pending",
  reason: "Patient needs care continuation",
  recordTypes: ["all"],
  createdAt: 2024-...,
  ...
}
```

---

## 🛠️ Common Issues & Fixes

### Issue: "Patient is not registered at target hospital"

**Fix:** Ensure patient's `hospitalId` matches the selected target hospital

### Issue: Request appears in both incoming AND outgoing

**Fix:** Check database - verify `targetHospital` is different from `requestingHospital`

### Issue: Can't approve request

**Fix:** Ensure you're logged in as user from the target hospital (`req.user.hospitalId` must match `targetHospital`)

### Issue: Patient registration modal doesn't proceed

**Fix:** Ensure first name, last name, and valid email are filled in step 1

---

## 📊 API Endpoints Verification

### Create Request

```bash
POST /api/inter-hospital/request
{
  "patientId": "PAT001",
  "targetHospitalId": "hosp_002",  # NEW: explicit target
  "reason": "Care continuation",
  "recordTypes": ["all"],
  "isEmergency": false,
  "duration": 72
}
```

### Get Incoming (To This Hospital)

```bash
GET /api/inter-hospital/incoming?status=pending
# Returns: requests where targetHospital = req.user.hospitalId
```

### Get Outgoing (From This Hospital)

```bash
GET /api/inter-hospital/outgoing?status=pending
# Returns: requests where requestingHospital = req.user.hospitalId
```

---

## ✅ Pre-Deployment Checklist

- [ ] Backend files updated
  - [ ] `/backend/models/index.js`
  - [ ] `/backend/controllers/enhancedAccessController.js`
- [ ] Frontend files updated
  - [ ] `/frontend/src/pages/InterHospitalRecordRequest.js`
  - [ ] `/frontend/src/pages/DoctorDashboard.js`
  - [ ] `/frontend/src/styles/doctorDashboard.css`

- [ ] Environment variables set correctly
  - [ ] REACT_APP_API_URL points to backend
  - [ ] JWT_SECRET configured

- [ ] Database ready
  - [ ] MongoDB connected
  - [ ] Existing AccessRequests have `targetHospital` set

- [ ] Test scenarios completed
  - [ ] Request creation works
  - [ ] Incoming/outgoing tabs show correctly
  - [ ] Approve/deny functionality works
  - [ ] Patient registration works

---

## 🎉 Deployment Complete!

Once all checks pass, the inter-hospital data sharing system should work perfectly with:

- Clear request direction
- Correct hospital showing pending requests
- Professional dashboard UI
- Multi-step patient registration
