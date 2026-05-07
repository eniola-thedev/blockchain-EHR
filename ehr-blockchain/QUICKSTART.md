# Quick Start Guide - EHR Enhanced Features

## 🚀 Quick Setup (5 minutes)

### Step 1: Generate Dummy Data

```bash
cd backend
node scripts/seedData.js
```

✅ Creates 10 patients with 50 medical records ready to test

### Step 2: Add Frontend Routes

Edit `frontend/src/App.js`:

```javascript
import EnhancedPatientDashboard from './pages/EnhancedPatientDashboard';
import InterHospitalRecordRequest from './pages/InterHospitalRecordRequest';

// In your route configuration:
<Route path="/dashboard/patient" element={<EnhancedPatientDashboard />} />
<Route path="/hospital/records/request" element={<InterHospitalRecordRequest />} />
```

### Step 3: Add Navigation Links

Update your sidebar/navigation component:

```javascript
// For Patient View
<NavLink to="/dashboard/patient">📊 My Medical Records</NavLink>

// For Hospital View
<NavLink to="/hospital/records/request">🏥 Request Records</NavLink>
```

### Step 4: Start the Application

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm start
```

---

## 👤 Feature 1: Patient Medical Records Portal

### What It Does

Patients can view all their medical records in an organized, read-only interface.

### How to Test

1. **Login** with your patient credentials
2. **Navigate** to "My Medical Records" (dashboard/patient)
3. **View** your profile info, blood group, genotype
4. **Explore tabs:**
   - 📅 **Timeline** - Chronological record view with date filters
   - 🧪 **Lab Results** - All lab tests with normal ranges
   - 💊 **Medications** - Complete medication history
   - ❤️ **Vital Trends** - Blood pressure and vital signs

### Key Features

✅ View-only access (cannot edit)
✅ Filter by date range and record type
✅ Search for specific tests
✅ Export medical summary
✅ Responsive mobile design
✅ Beautiful timeline visualization

---

## 🏥 Feature 2: Inter-Hospital Record Sharing

### What It Does

Hospitals can request and manage access to patient medical records from other hospitals. Perfect for:

- Patient transfer between hospitals
- Specialist referrals
- Emergency care situations
- Reducing duplicate testing

### How to Test

#### Hospital 1 (Requesting): Your Hospital

1. **Login** with your doctor credentials
2. **Navigate** to "Request Records" (hospital/records/request)
3. **Fill the form:**
   - Patient ID: Enter the patient ID you want to request records for
   - Reason: Specify the clinical reason for the request
   - Record Types: Select "diagnosis" and "lab_result"
   - Duration: 72 hours
4. **Click** "Submit Request"
5. **See** confirmation with request ID

#### Hospital 2 (Approving): Patient's Home Hospital

1. **Logout** from the requesting hospital user
2. **Login** with the patient's home hospital credentials
3. **Navigate** to "Request Records"
4. **Click** on "📥 Incoming Requests" tab
5. **Find** the request from Central Medical Hospital
6. **Review** patient info and reason
7. **Click** ✅ Approve (or ❌ Deny)

#### Back to Hospital 1

1. **Click** "📤 My Requests" tab
2. **See** request status changed to "Approved"
3. **Click** 🔒 "Revoke Access" to end sharing

### Key Features

✅ Easy patient identification
✅ Hospital directory discovery
✅ Emergency auto-approval option
✅ Customizable access duration
✅ Granular record type selection
✅ Real-time status tracking
✅ Revocation capability

---

## 📊 Feature 3: Dummy Medical Records

### What You Get

**50 realistic medical records** across **10 patients**

#### Patients Created

```
PAT001 - John Doe (O+, AA)        PAT006 - Emma Davis (A-, AA)
PAT002 - Jane Smith (A+, AS)      PAT007 - James Wilson (B-, AC)
PAT003 - Michael Johnson (B+, AA) PAT008 - Lisa Anderson (AB-, AA)
PAT004 - Sarah Williams (AB+, AS) PAT009 - Robert Martinez (O+, AS)
PAT005 - David Brown (O-, SS)     PAT010 - Mary Thompson (A+, AA)
```

#### Hospitals

- **Central Medical Hospital** (License: HOS001)
  - Doctor: Dr. Smith (Internal Medicine)
  - Address: 123 Medical Avenue, Lagos

- **Sunshine Medical Center** (License: HOS002)
  - Doctor: Dr. Johnson (Cardiology)
  - Address: 456 Health Street, Ibadan

#### Record Types

- 🔍 Diagnoses (Hypertension, Diabetes, Asthma, etc.)
- 💊 Prescriptions with medications and dosages
- 🧪 Lab results with normal ranges and abnormal flags
- 🖼️ Imaging reports
- 💉 Vaccination records
- 📋 General medical notes

---

## 🔑 Test Credentials

### Doctors (Can create records & request access)

```
Email: dr.smith@central.com
Password: Test@1234
Hospital: Central Medical Hospital
Specialization: Internal Medicine
```

```
Email: dr.johnson@sunshine.com
Password: Test@1234
Hospital: Sunshine Medical Center
Specialization: Cardiology
```

### Patients (Can view own records only)

```
Email: PAT001@patient.com
Password: Patient@1234
Name: John Doe
ID: PAT001
```

Try PAT001 through PAT010 (all with password `Patient@1234`)

---

## 📱 Mobile Testing

All features are **fully responsive**:

- ✅ Works on phones (320px+)
- ✅ Works on tablets (768px+)
- ✅ Works on desktop (1024px+)

Test on mobile:

1. Open DevTools (F12)
2. Click device toggle (Ctrl+Shift+M)
3. Select "iPhone 12" or "iPad"
4. Refresh and test

---

## 🔍 Searching Records

### Search by Patient ID

```
URL: /api/portal/search?patientId=PAT001
```

### Search by Record Type

```
URL: /api/portal/search?recordType=diagnosis
```

### Search by Doctor Name

```
URL: /api/portal/search?doctorName=Smith
```

### Combined Search

```
URL: /api/portal/search?patientId=PAT001&recordType=lab_result&doctorName=Smith
```

---

## 🚨 Emergency Access

### How It Works

1. Hospital checks "🚨 Emergency Access" when submitting request
2. Access is **automatically approved** (no waiting)
3. Patient record access logs emergency flag
4. Audit trail records emergency usage

### Test It

1. On request form, check "Emergency Access"
2. Submit request
3. See message: "✅ Emergency access auto-approved"
4. Access immediately available

---

## 📊 API Endpoints Reference

### Patient Portal (Read-Only)

```
GET  /api/portal/profile           - Get patient profile
GET  /api/portal/timeline          - Get chronological records
GET  /api/portal/lab-results       - Get lab test results
GET  /api/portal/medications       - Get prescription history
GET  /api/portal/vital-trends      - Get vital signs
GET  /api/portal/search            - Search records
GET  /api/portal/export            - Export summary
```

### Inter-Hospital Communication

```
POST /api/inter-hospital/request                 - Submit request
GET  /api/inter-hospital/incoming               - View incoming requests
GET  /api/inter-hospital/outgoing               - View my requests
POST /api/inter-hospital/:requestId/approve     - Approve request
POST /api/inter-hospital/:requestId/deny        - Deny request
POST /api/inter-hospital/:requestId/revoke      - Revoke access
GET  /api/inter-hospital/status/:patientId     - Check access status
GET  /api/inter-hospital/hospitals/verified    - Hospital directory
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Patient not found"

**Solution:** Use correct Patient ID format (PAT001, PAT002, etc.)

### Issue: Records not showing up

**Solution:** Run seed script: `node backend/scripts/seedData.js`

### Issue: Cannot approve request

**Solution:** Login as hospital that OWNS the patient (Sunshine for PAT002)

### Issue: UI components not loading

**Solution:**

1. Clear browser cache (Ctrl+Shift+Delete)
2. Rebuild frontend: `npm start`
3. Check browser console for errors

### Issue: API 403 Forbidden

**Solution:** Check you have right role:

- Patients: need "patient" role
- Hospitals: need "hospital" or "admin" role

---

## 🎯 Testing Workflows

### Complete User Journey 1: Patient

```
1. Seed data: node scripts/seedData.js
2. Login as PAT001@patient.com
3. View dashboard, timeline, labs
4. Logout
```

### Complete User Journey 2: Inter-Hospital

```
1. Login as dr.smith@central.com
2. Request records for PAT002
3. Logout → Login as dr.johnson@sunshine.com
4. Approve request
5. View in "My Requests" → Revoke if needed
```

### Complete User Journey 3: Emergency

```
1. Login as dr.smith@central.com
2. Check "Emergency Access" checkbox
3. Submit request
4. See auto-approval
5. Logout and verify in other hospital
```

---

## 📈 Expected Output When Seeding

The seed script will create sample medical records for testing:

```
✅ MongoDB connected
✅ Created hospitals
✅ Created doctors
📄 Record 1/50 created
...
📄 Record 50/50 created

📊 Summary:
   • Medical records created
   • Sample hospitals configured
   • Test data ready

✅ Seed completed successfully!
```

---

## 🆘 Need Help?

1. **Check** [FEATURES.md](./FEATURES.md) for detailed documentation
2. **Check** [API responses](./FEATURES.md#api-response-examples) for expected data format
3. **Check** [Troubleshooting](./FEATURES.md#troubleshooting) section
4. **Review** console errors in browser DevTools
5. **Check** backend logs for server errors

---

## Next Steps

After testing these features:

1. **Customize** hospital names/licenses for your use case
2. **Add** email notifications when requests are approved/denied
3. **Integrate** with your existing dashboards
4. **Deploy** to production environment
5. **Train** hospital staff on inter-hospital sharing workflow

---

**Happy Testing! 🎉**
