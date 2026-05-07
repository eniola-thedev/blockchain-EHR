# EHR Blockchain System - Enhanced Features Documentation

## Overview

This document describes the three major features added to the EHR Blockchain system:

1. **Inter-Hospital Communication & Record Sharing** - Enable hospitals to communicate and securely share patient medical records
2. **Dummy Medical Records** - 50 sample medical records for testing and demonstration
3. **Patient Record Viewing Portal** - Comprehensive patient-facing interface for viewing medical records

---

## Feature 1: Inter-Hospital Communication & Record Sharing

### Overview

Hospitals can now request and manage access to patient medical records from other hospitals. This enables seamless continuity of care when patients travel or seek treatment across different healthcare facilities.

### Architecture

#### Backend Components

**New Controllers:**

- `enhancedAccessController.js` - Handles inter-hospital communication logic

**New Routes:**

- `enhancedAccess.js` - API endpoints for inter-hospital features

**Updated Server:**

- `server.js` - Integrated new routes under `/api/inter-hospital`

#### Key Features

1. **Medical Record Requests**
   - Hospitals can request patient records by Patient ID
   - Support for emergency auto-approval
   - Customizable access duration (hours)
   - Selective record type filtering
   - Request reason documentation

2. **Request Management**
   - Incoming requests view (for home hospitals)
   - Outgoing requests tracking (for requesting hospitals)
   - Approve/Deny/Revoke functionality
   - Real-time status updates
   - Blockchain integration for immutable audit trails

3. **Hospital Directory**
   - View all verified hospitals
   - Hospital discovery and contact information
   - License verification status

### API Endpoints

#### Request Medical Records

```http
POST /api/inter-hospital/request
```

**Body:**

```json
{
  "patientId": "PAT001",
  "reason": "Patient admitted for emergency surgery",
  "recordTypes": ["diagnosis", "lab_result"],
  "isEmergency": true,
  "duration": 72
}
```

#### Get Incoming Requests

```http
GET /api/inter-hospital/incoming?status=pending&page=1
```

#### Get Outgoing Requests

```http
GET /api/inter-hospital/outgoing?status=all&page=1
```

#### Approve Request

```http
POST /api/inter-hospital/:requestId/approve
```

#### Deny Request

```http
POST /api/inter-hospital/:requestId/deny
```

#### Revoke Access

```http
POST /api/inter-hospital/:requestId/revoke
```

#### Check Access Status

```http
GET /api/inter-hospital/status/:patientId
```

#### Get Verified Hospitals

```http
GET /api/inter-hospital/hospitals/verified
```

### Frontend Components

**New Page:**

- `InterHospitalRecordRequest.js` - Complete UI for inter-hospital communication

**Features:**

- Request form with patient ID and reason
- Emergency request flag
- Record type filtering
- Hospital directory display
- Incoming requests management dashboard
- Outgoing requests tracking
- Real-time request status updates
- Approve/Deny/Revoke actions

**Styles:**

- `interHospitalRequest.css` - Responsive styling

### Database Schema Changes

**AccessRequest Model Extended:**

```javascript
{
  patientId: String,                    // Patient identifier
  requestingHospital: ObjectId,        // Hospital requesting access
  homeHospital: ObjectId,              // Patient's home hospital
  reason: String,                      // Request reason
  recordTypes: [String],               // Types of records requested
  isEmergency: Boolean,                // Emergency flag for auto-approval
  status: String,                      // pending/approved/denied/expired/revoked
  grantedAt: Date,                     // When access was granted
  expiresAt: Date,                     // When access expires
  revokedAt: Date,                     // When access was revoked
  revokedBy: ObjectId,                 // User who revoked access
  blockchainTxHash: String             // Blockchain transaction reference
}
```

---

## Feature 2: Dummy Medical Records (Seed Data)

### Overview

50 realistic medical records across 10 patients created by the seed script for testing, demonstration, and development purposes.

### Seed Script

**Location:** `backend/scripts/seedData.js`

**Features:**

- Creates 10 sample patients with realistic data
- Generates 50 medical records (5 per patient)
- Creates 2 hospitals: "Central Medical Hospital" and "Sunshine Medical Center"
- Creates 2 doctor users
- All records include:
  - Multiple diagnoses
  - Medications with dosage information
  - Lab results with normal ranges
  - Vital signs
  - Realistic timestamps (within last 30 days)

### Running the Seed Script

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already done)
npm install

# Run the seed script
node scripts/seedData.js
```

**Output:**

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📋 Setting up hospitals...
✅ Created Central Medical Hospital
✅ Created Sunshine Medical Center

👨‍⚕️ Setting up doctors...
✅ Created Doctor Smith
✅ Created Doctor Johnson

🩺 Creating medical records...
   📄 Record 1/50 created for John Doe
   📄 Record 2/50 created for John Doe
   ...
   📄 Record 50/50 created for Mary Thompson

✅ Seed completed successfully!
📊 Summary:
   • 10 patients created
   • 50 medical records created
   • 2 hospitals: Central Medical Hospital, Sunshine Medical Center
   • 2 doctors setup

🔑 Test Credentials:
   Doctor 1: dr.smith@central.com / Test@1234
   Doctor 2: dr.johnson@sunshine.com / Test@1234
   Patient Sample: PAT001@patient.com / Patient@1234
```

### Sample Data Included

**Patients:**

- PAT001-PAT010 with varied blood groups and genotypes
- Complete personal information
- Emergency contact details

**Diagnoses:**

- Hypertension, Diabetes, Asthma, Pneumonia, UTI
- Migraine, Gastroenteritis, Bronchitis, Hyperlipidemia, Anemia
- COVID-19, Allergy Rhinitis, Eczema, Arthritis, Thyroid Disorders

**Record Types:**

- Diagnosis records
- Prescriptions with medications
- Lab results with normal ranges
- Imaging reports
- Vaccination records
- General medical notes

### Resetting Data

To clear and reseed the database:

```bash
# In MongoDB:
use medchain
db.users.deleteMany({})
db.hospitals.deleteMany({})
db.medicalrecords.deleteMany({})
db.accessrequests.deleteMany({})

# Then run the seed script again
node scripts/seedData.js
```

---

## Feature 3: Patient Record Viewing Portal

### Overview

Comprehensive patient-facing interface for viewing medical records with timeline, lab results, medications, and vital signs trends. Patients can view but NOT edit their records.

### Architecture

#### Backend Components

**New Controller:**

- `patientPortalController.js` - Handles all patient viewing operations

**New Routes:**

- `patientPortal.js` - API endpoints for patient portal

**Updated Server:**

- `server.js` - Integrated new routes under `/api/portal`

### Key Features

#### 1. Patient Profile View

**Endpoint:** `GET /api/portal/profile`

Shows:

- Patient demographics (name, DOB, gender)
- Blood group and genotype
- Home hospital information
- Contact information
- Record statistics by type
- Last access timestamp

#### 2. Timeline View

**Endpoint:** `GET /api/portal/timeline?startDate=...&endDate=...&type=...`

Features:

- Chronological record display
- Date range filtering
- Record type filtering
- Rich timeline visualization
- Doctor and hospital attribution
- Indication of medications, lab results, vitals

#### 3. Lab Results

**Endpoint:** `GET /api/portal/lab-results?testName=...&limit=20`

Shows:

- All lab test results
- Test values and units
- Normal ranges
- Abnormal result indicators
- Test dates
- Ordering doctor information

#### 4. Medications

**Endpoint:** `GET /api/portal/medications`

Displays:

- Current and past medications
- Dosage information
- Frequency of administration
- Duration of treatment
- Notes from prescribing doctor
- Prescription dates

#### 5. Vital Signs Trends

**Endpoint:** `GET /api/portal/vital-trends?metric=bloodPressure&days=30`

Features:

- Blood pressure trends (30-day view)
- Heart rate, temperature, weight, height, oxygen saturation
- Historical comparisons
- Doctor/hospital attribution
- Customizable date ranges

#### 6. Record Search

**Endpoint:** `GET /api/portal/search?patientId=...&recordType=...&doctorName=...`

Allows searching by:

- Patient ID
- Record type
- Doctor name
- Hospital name
- Pagination support

#### 7. Export Summary

**Endpoint:** `GET /api/portal/export`

Generates exportable summary including:

- Patient demographics
- Record count by type
- Recent records overview
- Export date for audit

### Frontend Components

**New Page:**

- `EnhancedPatientDashboard.js` - Complete patient portal UI

**Features:**

- Profile header with key statistics
- Four-tab interface:
  1. **Timeline** - Chronological record view with filters
  2. **Lab Results** - Tabular view of all lab tests
  3. **Medications** - Card-based medication display
  4. **Vital Trends** - Blood pressure and vitals tracking

**Styles:**

- `patientDashboard.css` - Modern, responsive styling

### API Endpoints

#### Get Patient Profile

```http
GET /api/portal/profile
```

#### Get Record Timeline

```http
GET /api/portal/timeline?startDate=2024-01-01&endDate=2024-01-31&type=diagnosis
```

#### Get Lab Results

```http
GET /api/portal/lab-results?testName=Blood Sugar&limit=20
```

#### Get Current Medications

```http
GET /api/portal/medications
```

#### Get Vital Signs Trends

```http
GET /api/portal/vital-trends?metric=bloodPressure&days=30
```

#### Search Records

```http
GET /api/portal/search?patientId=PAT001&recordType=diagnosis&doctorName=Smith
```

#### Export Records Summary

```http
GET /api/portal/export
```

### Security & Access Control

**Middleware Enforcement:**

- Patients can only view their own records
- Doctors/admins can view patient records if they have authorization
- All access attempts are logged in audit trail
- Blockchain logging for immutable record

**View-Only Enforcement:**

- `blockPatientWrite` middleware prevents patient record modifications
- UI disables all edit/delete functions for patients
- API endpoints reject write operations from patient role

### Database Schema Changes

**MedicalRecord Model Utilization:**

- Leverages existing structure with full data access
- Enhanced filtering and pagination
- Optimized queries for timeline views

### UI/UX Features

**Visual Enhancements:**

- Gradient headers with patient statistics
- Timeline visualization with dots and connections
- Color-coded record types and statuses
- Card-based layout for medications
- Table formats for lab results and vitals
- Responsive grid design

**User Experience:**

- Tab-based navigation for organized content
- Date range filtering for timeline
- Search by test name for lab results
- Customizable vital trends duration
- Loading states and error handling
- Success/error messages

**Accessibility:**

- Semantic HTML structure
- Responsive design (mobile, tablet, desktop)
- Color contrast compliance
- Keyboard navigation support
- ARIA labels where appropriate

---

## Integration Instructions

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Ensure all dependencies are installed
npm install

# Create .env if not exists (copy from .env.example)
cp .env.example .env

# Run MongoDB (ensure it's running)
# Then start the server
npm start
```

### 2. Seed Data

```bash
# Run the seed script to populate dummy data
node scripts/seedData.js
```

### 3. Frontend Integration

Add the new pages to your React routing:

```javascript
// In frontend/src/App.js
import EnhancedPatientDashboard from './pages/EnhancedPatientDashboard';
import InterHospitalRecordRequest from './pages/InterHospitalRecordRequest';

// Add routes
<Route path="/dashboard/patient" element={<EnhancedPatientDashboard />} />
<Route path="/hospital/records/request" element={<InterHospitalRecordRequest />} />
```

### 4. Update Navigation

Add links to the sidebar or main navigation:

```javascript
// For patients
{ path: '/dashboard/patient', label: '📊 My Medical Records', icon: 'chart' },

// For hospitals
{ path: '/hospital/records/request', label: '🏥 Request Records', icon: 'share' },
```

---

## Testing & Usage Guide

### Test Scenario 1: Patient Views Own Records

1. Login as `PAT001@patient.com` / `Patient@1234`
2. Navigate to Patient Dashboard
3. View timeline of all records
4. Filter by date range and record type
5. View lab results with abnormal indicators
6. Check medications list
7. Review vital signs trends

### Test Scenario 2: Inter-Hospital Record Request

1. Login as `dr.smith@central.com` / `Test@1234`
2. Go to Inter-Hospital Record Request page
3. Enter patient ID: `PAT002`
4. Enter reason: "Patient referred for cardiology consultation"
5. Select record types (e.g., "diagnosis", "lab_result")
6. Click "Submit Request"
7. Login as `dr.johnson@sunshine.com` (patient's home hospital)
8. View incoming request
9. Approve/Deny the request
10. Check access status on timeline

### Test Scenario 3: Emergency Access

1. Login as hospital doctor
2. Submit request with Emergency flag checked
3. Access automatically approved
4. Hospital gets immediate access to patient records
5. Can revoke access after emergency resolved

---

## API Response Examples

### Get Patient Profile Response

```json
{
  "profile": {
    "id": "PAT001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "pat001@patient.com",
    "bloodGroup": "O+",
    "genotype": "AA",
    "homeHospital": {
      "_id": "...",
      "name": "Central Medical Hospital"
    }
  },
  "recordStats": {
    "total": 5,
    "byType": {
      "diagnosis": 1,
      "prescription": 1,
      "lab_result": 1,
      "imaging": 1,
      "vaccination": 1
    }
  }
}
```

### Get Timeline Response

```json
{
  "timeline": [
    {
      "id": "...",
      "date": "2024-01-15T10:30:00Z",
      "type": "diagnosis",
      "title": "DIAGNOSIS: Hypertension",
      "diagnosis": "Essential Hypertension",
      "doctor": "Dr. Smith",
      "hospital": "Central Medical Hospital",
      "hasMedications": true,
      "hasLabResults": false,
      "hasVitals": true
    }
  ],
  "totalRecords": 1
}
```

### Request Medical Records Response

```json
{
  "message": "Access request submitted",
  "requestId": "...",
  "status": "pending",
  "expiresAt": "2024-01-20T10:00:00Z",
  "txHash": "0x..."
}
```

---

## Troubleshooting

### Issue: Seed script fails

**Solution:**

- Ensure MongoDB is running
- Check MONGODB_URI in .env
- Run `npm install` in backend directory

### Issue: Patient cannot view own records

**Solution:**

- Verify user role is "patient"
- Check patientId is set in user profile
- Ensure authentication token is valid

### Issue: Inter-hospital request not appearing

**Solution:**

- Verify both hospitals are verified (isVerified: true)
- Check requestingHospital and homeHospital match user's hospital
- Ensure user has hospital/admin role

### Issue: Frontend components not loading

**Solution:**

- Verify API routes are added to server.js
- Check CORS settings in server.js
- Test API endpoints with Postman
- Verify frontend service/api.js includes new endpoints

---

## Performance Considerations

### Optimization Tips

1. **Timeline Queries:**
   - Use date range filtering to reduce result set
   - Implement pagination (default 20 per page)
   - Index on patientId and createdAt

2. **Lab Results:**
   - Cache common test result ranges
   - Batch fetch tests by patient
   - Use aggregation for statistics

3. **Access Requests:**
   - Implement request expiry cleanup job
   - Archive old requests to separate collection
   - Index on patientId and status

---

## Security Considerations

1. **View-Only Access:**
   - `blockPatientWrite` middleware enforces read-only
   - All write operations rejected at API level
   - Frontend UI has no edit/delete buttons for patients

2. **Audit Logging:**
   - Every record view logged with timestamp and user
   - Blockchain integration for immutable records
   - IP address logging for suspicious activity detection

3. **Access Control:**
   - AccessRequest model validates home hospital ownership
   - Emergency requests auto-approved only for authorized users
   - Revocation immediately revokes blockchain access

4. **Data Privacy:**
   - Patient data encrypted in IPFS
   - Hospital wallet addresses protect identity
   - Patient IDs used instead of names in logs

---

## Future Enhancements

1. **Email Notifications:**
   - Request approval/denial alerts
   - Record access notifications
   - Expiry reminders

2. **Advanced Search:**
   - Full-text search across all records
   - Diagnosis/symptom search
   - Doctor/hospital reputation scoring

3. **Analytics Dashboard:**
   - Hospital-level access request analytics
   - Response time metrics
   - Popular record types

4. **Patient Consent:**
   - Granular record sharing consent
   - Revocation history
   - Consent audit trail

5. **Mobile App:**
   - Native mobile interface
   - Push notifications
   - Offline record access

---

## Support & Documentation

For more information, see:

- [Main README](./README.md)
- [Setup Guide](./SETUP.md)
- API Documentation (Postman collection)
- Blockchain Contract Documentation

---

**Last Updated:** January 2024
**Version:** 1.0.0
