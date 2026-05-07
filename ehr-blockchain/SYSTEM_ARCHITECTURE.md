# EHR Blockchain System - Complete Architecture & Design

## 🏗️ System Overview

This document defines a **production-grade**, **decentralized**, **blockchain-based** Electronic Health Records (EHR) system that prioritizes:

- ✅ **Security**: End-to-end encryption, role-based access control
- ✅ **Decentralization**: Distributed data storage via blockchain & IPFS
- ✅ **Interoperability**: FHIR standard compliance for healthcare data exchange
- ✅ **Immutability**: Blockchain for tamper-proof audit trails
- ✅ **Patient Privacy**: Read-only patient portal with encrypted data access
- ✅ **Real-Time Coordination**: Instant data sharing with proper authorization

---

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PATIENT LAYER                              │
│  (Web/Mobile Client - View-Only Medical Portal)                     │
└──────────────────────────────────────────────────────────────────────┘
                                  ↑↓
        ┌─────────────────────────────────────────────────┐
        │         SECURITY & API LAYER (Backend)          │
        │  ┌─────────────────────────────────────────┐    │
        │  │  Encryption Service (AES-256-GCM)       │    │
        │  │  JWT Auth & RBAC                        │    │
        │  │  API Gateway with Rate Limiting         │    │
        │  │  Access Control & Audit Logging         │    │
        │  └─────────────────────────────────────────┘    │
        └─────────────────────────────────────────────────┘
                        ↑↓                ↑↓                ↑↓
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │   BLOCKCHAIN     │  │    IPFS/STORAGE  │  │    DATABASE      │
    │   LAYER          │  │    LAYER         │  │    LAYER         │
    ├──────────────────┤  ├──────────────────┤  ├──────────────────┤
    │ Smart Contracts: │  │ Encrypted Data:  │  │ MongoDB:         │
    │ • EHRRegistry    │  │ • Medical Data   │  │ • Users          │
    │ • HospitalReg    │  │ • Access Logs    │  │ • Hospitals      │
    │ • Audit Trail    │  │ • FHIR Resources │  │ • Records        │
    │                  │  │ • Media (PDF,    │  │ • Access Grants  │
    │ Immutable Log    │  │   Imaging)       │  │ • Audit Logs     │
    │ of:              │  │ • IPFS Hash:     │  │ • API Keys       │
    │ • Record Creation│  │   QmXxxx...      │  │                  │
    │ • Access Grants  │  │                  │  │                  │
    │ • Revocations    │  │                  │  │                  │
    │ • View Events    │  │                  │  │                  │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
         Ethereum                IPFS              MongoDB Atlas
         (Sepolia/              Pinning           (Encrypted)
         Polygon)               Service
```

---

## 🔐 Security Model

### 1. **Authentication & Authorization**

- JWT-based authentication with refresh tokens
- OAuth2 integration for enterprise SSO
- Multi-factor authentication (optional)
- Session management with expiration

### 2. **Role-Based Access Control (RBAC)**

```
ROLES:
├── Patient
│   └── Can: View own records (READ-ONLY)
│       Cannot: Edit, delete, share
├── Doctor/Clinician
│   └── Can: Create records, request access from other hospitals
│       Cannot: Unilaterally access other hospital data
├── Hospital Admin
│   └── Can: Approve/deny access requests, manage staff
│       Cannot: Override encryption, modify audit logs
├── Blockchain Admin
│   └── Can: Deploy contracts, register hospitals
│       Cannot: Access patient data, modify records
└── System Admin
    └── Can: User management, system configuration
```

### 3. **Encryption Strategy**

```
┌─────────────────────────────────────────┐
│     DATA ENCRYPTION LAYERS              │
├─────────────────────────────────────────┤
│ Layer 1: Patient Data                   │
│ • Algorithm: AES-256-GCM                │
│ • Key: Hospital Master Key + Patient ID │
│ • IV: Random per record                 │
│ • Auth Tag: Tamper detection            │
├─────────────────────────────────────────┤
│ Layer 2: IPFS Storage                   │
│ • CID (Content Identifier): Encrypted   │
│ • Pin to private IPFS nodes             │
│ • Replicate across 3+ nodes             │
├─────────────────────────────────────────┤
│ Layer 3: Blockchain (On-Chain Hashes)   │
│ • SHA-256 hash of encrypted data        │
│ • Timestamp + Hospital signature        │
│ • Immutable audit trail                 │
├─────────────────────────────────────────┤
│ Layer 4: Transport Security             │
│ • TLS 1.3 for all API calls             │
│ • CORS restricted to verified origins   │
│ • Rate limiting & DDoS protection       │
└─────────────────────────────────────────┘
```

---

## 📦 Data Model & Storage Architecture

### 1. **Decentralized Storage Strategy**

```
Patient Medical Record:
├─ Metadata (MongoDB - Unencrypted)
│  ├─ patientId, recordType, timestamp
│  ├─ createdBy, hospitalId
│  ├─ ipfsHash, status
│  └─ accessGrants[]
├─ Encrypted Data (IPFS - Encrypted)
│  ├─ Medical data (diagnosis, treatment, etc.)
│  ├─ Lab results, imaging, vital signs
│  ├─ Medications, allergies, immunizations
│  └─ Encrypted with AES-256-GCM
└─ Blockchain Hash (Immutable)
   ├─ SHA-256(encrypted_data)
   ├─ Timestamp, createdBy signature
   ├─ Immutable audit trail
   └─ Access grant/revocation events
```

### 2. **FHIR Compliance (Interoperability Standard)**

```
All medical data follows FHIR (Fast Healthcare Interoperability Resources):
├─ Patient Resource
├─ Observation Resource (vital signs, lab results)
├─ Condition Resource (diagnoses)
├─ MedicationRequest Resource
├─ Procedure Resource
├─ DocumentReference Resource (files, imaging)
├─ Encounter Resource (hospital visits)
└─ Immunization Resource (vaccines)

Benefits:
✓ Standardized data format across all providers
✓ Easy interoperability between hospitals
✓ Easier integration with third-party systems
✓ Regulatory compliance (HL7 standard)
```

---

## 🔗 Blockchain Contract Architecture

### 1. **EHRRegistry Contract** (Core Data Layer)

```solidity
// Key Functions:
✓ addRecord(patientId, ipfsHash, recordType)
  → Creates immutable record with timestamp
✓ requestAccess(patientId, reason, isEmergency)
  → Hospital requests access, auto-approves if emergency
✓ grantAccess(patientId, hospitalAddr, duration)
  → Home hospital approves, logs on-chain
✓ revokeAccess(patientId, hospitalAddr)
  → Immediately revokes, immutable revocation logged
✓ logRecordAccess(patientId, action)
  → Every view logged on blockchain
✓ getAuditLogs(fromIndex, count)
  → Full transparent audit trail

// Data Immutability Guarantees:
- All record creation timestamps are blockchain-verified
- All access events are timestamped and cryptographically signed
- No record can be deleted (only marked obsolete if needed)
- Revision history is preserved on-chain
```

### 2. **HospitalRegistry Contract** (Hospital Management)

```solidity
// Key Functions:
✓ registerHospital(address, name, license, country)
  → Admin registers new hospital
✓ verifyHospital(address)
  → Check if hospital is verified
✓ revokeHospital(address)
  → Disable compromised hospital (admin)

// Benefits:
- Decentralized hospital directory
- Verifiable credentials on-chain
- Prevents unauthorized hospitals from accessing network
```

### 3. **Audit Trail Contract** (Transparency Layer)

```solidity
// Events Logged:
✓ RecordCreated: who, when, what data
✓ AccessRequested: which hospital, patient, reason
✓ AccessGranted: duration, conditions
✓ AccessRevoked: timestamp, by whom
✓ RecordViewed: every view is logged
✓ RecordModified: revision tracking
✓ ErrorsAndIncidents: security events

// Guarantees:
- Permanent record on blockchain
- Cannot be altered or deleted
- Transparent to authorized parties
- Cryptographic proof of events
```

---

## 🌐 Real-Time Data Sharing Architecture

### 1. **Access Request Flow**

```
Timeline of Events:
─────────────────

1. Doctor at Hospital B needs patient records (Patient at Hospital A)
   └─ Hospital B initiates AccessRequest
      ├─ patientId
      ├─ reason (e.g., "Emergency surgery")
      ├─ recordTypes (diagnosis, lab_result)
      ├─ duration (hours valid)
      ├─ isEmergency flag
      └─ timestamp

2. Request stored in MongoDB with:
   ├─ Status: PENDING
   ├─ Created at: [timestamp]
   ├─ RequestedBy: Hospital B address
   ├─ PatientHomeHospital: Hospital A address
   └─ expiresAt: [timestamp + duration]

3. Smart Contract Event Emitted:
   └─ AccessRequested(patientId, hospitalB, isEmergency)
      ├─ Immutably logged on blockchain
      ├─ Timestamp verified by network
      └─ Cannot be altered retroactively

4a. IF EMERGENCY (Auto-Approve):
    ├─ AccessGrant created immediately
    ├─ Recorded in MongoDB
    ├─ Event: AccessGranted emitted on blockchain
    ├─ Patient notification (async)
    └─ Duration: 72 hours (configurable)

4b. IF NOT EMERGENCY (Manual Approval):
    ├─ Hospital A admin reviews request
    ├─ Hospital A can:
    │  ├─ Approve → Grant access
    │  └─ Deny → Add to block list
    └─ Event logged on blockchain

5. Hospital B can now:
   ├─ Retrieve encrypted patient data from IPFS
   ├─ Each access logged on blockchain
   ├─ Duration-limited access (auto-expires)
   └─ Access revoked immediately if needed

6. Expiration/Revocation:
   ├─ Automatic expiration at duration end
   ├─ Manual revocation by Hospital A admin
   ├─ Event: AccessRevoked emitted on blockchain
   └─ Access immediately denied
```

### 2. **Real-Time Synchronization**

```
Technology Stack:
├─ WebSockets (Socket.io) for real-time updates
├─ Message Queue (Redis Pub/Sub) for event propagation
└─ Event Listeners on blockchain

Flow:
1. Hospital A approves access request
   └─ Emits AccessGranted event on blockchain

2. Backend listener detects event
   └─ Updates MongoDB immediately

3. Redis Pub/Sub publishes notification
   └─ All connected clients notified

4. Hospital B interface updated in real-time
   └─ Doctor sees access granted notification

5. Hospital B can now fetch data from IPFS
   └─ Every fetch logged on blockchain
```

---

## 👤 Patient Portal Architecture

### 1. **Patient View-Only Portal Features**

```
Patient Dashboard (READ-ONLY):
├─ Timeline View
│  ├─ All medical events chronologically ordered
│  ├─ Diagnosis, treatments, procedures
│  ├─ Lab results, imaging, vital signs
│  └─ Medications and prescriptions
├─ Medical History
│  ├─ Active conditions
│  ├─ Past medical history
│  ├─ Surgeries and procedures
│  └─ Allergies and reactions
├─ Lab Results
│  ├─ Results with reference ranges
│  ├─ Historical comparisons
│  └─ Graphs for trending data
├─ Medications
│  ├─ Active prescriptions
│  ├─ Past medications
│  ├─ Dosage and schedule
│  └─ Side effects and interactions
├─ Vital Signs
│  ├─ Recent measurements
│  ├─ Historical charts
│  ├─ Trends and alerts
│  └─ Device integrations (Fitbit, etc.)
└─ Access History
   ├─ Who viewed records and when
   ├─ What data was accessed
   ├─ Duration of access
   └─ Reason for access request

Patient Restrictions (ENFORCED):
✗ Cannot edit any data
✗ Cannot delete records
✗ Cannot share directly with others
✗ Cannot download without audit logging
✓ Can request record amendment (flagged for hospital review)
✓ Can revoke access grants
✓ Can download anonymized copy for records
✓ Can see full audit trail of access
```

### 2. **Technical Implementation**

```
Frontend (View-Only Enforcement):
├─ All APIs return read-only data
├─ No edit/delete endpoints exposed
├─ UI buttons grayed out
├─ Client-side validation + server-side enforcement
└─ Audit logging of view events

Backend (Server-Side Enforcement):
├─ Patient role middleware checks all requests
├─ Only GET endpoints allowed for patient
├─ POST/PUT/DELETE blocked with 403 Forbidden
├─ Exception: amendments (create but marked for review)
└─ Every view logged on blockchain
```

---

## 📊 Audit Trail & Compliance

### 1. **Comprehensive Audit Logging**

```
Every Event Logged:
├─ User Authentication
│  ├─ Login attempts (success/failure)
│  ├─ IP address, device fingerprint
│  ├─ Location, timestamp
│  └─ Session duration
├─ Record Operations
│  ├─ Creation: who created, what data
│  ├─ Access: who accessed, when, duration
│  ├─ Modifications: what changed, by whom
│  └─ Deletion attempts (if allowed)
├─ Access Control Changes
│  ├─ Access grants: to which hospital, duration
│  ├─ Revocations: who revoked, when
│  ├─ Permission changes: old vs new permissions
│  └─ Emergency access events
└─ System Events
   ├─ Error events: what failed, why
   ├─ Security incidents: unauthorized attempts
   ├─ Configuration changes: admin actions
   └─ Contract interactions: blockchain calls

Storage:
├─ MongoDB (searchable, indexed)
├─ Blockchain (immutable proof)
├─ Syslog (compliance/archival)
└─ All retained for 7 years minimum
```

### 2. **HIPAA/GDPR Compliance**

```
Requirement: Where Implemented
├─ Encryption at rest
│  └─ AES-256-GCM for all data
├─ Encryption in transit
│  └─ TLS 1.3 for all connections
├─ Access controls
│  └─ RBAC with principle of least privilege
├─ Audit trails
│  └─ Blockchain + database logging
├─ Data retention/purge
│  └─ Automated retention policies
├─ Breach notification
│  └─ Alert system + notification templates
├─ Patient rights
│  └─ Access, amendment, deletion requests
├─ Consent management
│  └─ Explicit approval tracking
└─ Third-party vendor management
   └─ Hospital verification contracts
```

---

## 🚀 API Endpoints & Real-Time Communication

### 1. **RESTful API Endpoints**

```
Authentication:
POST   /api/auth/register          Create new user account
POST   /api/auth/login             Authenticate and receive JWT
POST   /api/auth/refresh-token     Refresh expired JWT
POST   /api/auth/logout            Revoke token

Patient Portal:
GET    /api/patient/records        Get all patient's records
GET    /api/patient/records/:id    Get specific record (READ-ONLY)
GET    /api/patient/timeline       Get medical timeline
GET    /api/patient/access-history Get who accessed records
POST   /api/patient/revoke-access/:grantId  Revoke a grant

Medical Records:
POST   /api/records/create         Create new record (Doctor)
GET    /api/records/:id            Retrieve record (with auth check)
GET    /api/records/patient/:pid   Get all patient records
GET    /api/records/audit-trail    Get complete audit trail

Inter-Hospital Access:
POST   /api/access/request         Request access to patient data
GET    /api/access/incoming        Get pending requests (home hospital)
GET    /api/access/outgoing        Get requests we sent
POST   /api/access/:id/approve     Approve request
POST   /api/access/:id/deny        Deny request
POST   /api/access/:id/revoke      Revoke active access

Hospital Management:
GET    /api/hospitals              List all verified hospitals
GET    /api/hospitals/:id          Get hospital details
POST   /api/hospitals/register     Register new hospital (admin)

Audit & Compliance:
GET    /api/audit/logs             Get audit logs
GET    /api/audit/reports/:type    Generate compliance report
```

### 2. **WebSocket Real-Time Events**

```
Connections:
ws://api.ehr.local/socket

Events Subscribed:
├─ patient:records-updated
│  └─ New records added to patient
├─ access:request-received
│  └─ New access request from another hospital
├─ access:request-approved
│  └─ Your access request was approved
├─ access:granted-revoked
│  └─ Access grant was revoked
├─ audit:record-accessed
│  └─ Someone accessed patient's records
└─ notification:alert
   └─ System alerts and messages

Example:
socket.on('access:request-received', (data) => {
  // {
  //   requestId: 'req_xyz',
  //   patientId: 'PAT001',
  //   requestingHospital: { name: 'Hospital B', address: '0x...' },
  //   reason: 'Emergency surgery',
  //   timestamp: 1234567890,
  //   isEmergency: true
  // }
});
```

---

## 🏥 System Interoperability Standards

### 1. **Data Interchange Format (FHIR Bundle)**

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "PAT001",
        "name": [{ "given": ["John"], "family": "Doe" }],
        "birthDate": "1980-01-01"
      }
    },
    {
      "resource": {
        "resourceType": "Observation",
        "id": "OBS001",
        "subject": { "reference": "Patient/PAT001" },
        "code": {
          "coding": [{ "system": "http://loinc.org", "code": "2085-9" }]
        },
        "valueQuantity": {
          "value": 95,
          "unit": "mmol/L"
        }
      }
    }
  ]
}
```

### 2. **Cross-Hospital Communication Protocol**

```
1. Standardized Medical Data Exchange
   ├─ All data must conform to FHIR standard
   ├─ XML or JSON serialization
   ├─ Versioning: Always include FHIR version in header
   └─ Validation: All records validated before storage

2. API Gateway Integration
   ├─ RESTful endpoints for data exchange
   ├─ OAuth2 for inter-hospital authentication
   ├─ Digital signatures on requests
   └─ Rate limiting per hospital

3. Error Handling & Resilience
   ├─ Retry logic with exponential backoff
   ├─ Circuit breakers for failing hospitals
   ├─ Dead letter queues for failed messages
   └─ Comprehensive error logging
```

---

## 🔧 Deployment & Infrastructure

### 1. **Production Deployment Architecture**

```
┌──────────────────────────────────────────────────────────┐
│                  Load Balancer (nginx)                   │
│                   SSL/TLS Termination                    │
└──────────────────────────────────────────────────────────┘
           ↓↓↓           ↓↓↓           ↓↓↓
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Backend #1     │ │  Backend #2     │ │  Backend #3     │
│  Node.js/Expr   │ │  Node.js/Expr   │ │  Node.js/Expr   │
│  PM2 Daemon     │ │  PM2 Daemon     │ │  PM2 Daemon     │
│  Docker         │ │  Docker         │ │  Docker         │
└─────────────────┘ └─────────────────┘ └─────────────────┘
           ↓                ↓                ↓
┌──────────────────────────────────────────────────────────┐
│         Redis (Caching + Pub/Sub + Sessions)             │
│         Master-Slave Replication                         │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│              MongoDB Cluster (Replica Set)               │
│  Primary (Writes) + 2 Secondaries (Read Replicas)        │
│  Encrypted at rest, TLS between nodes                    │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│         IPFS Nodes (Private Network)                     │
│  3+ nodes for redundancy                                 │
│  Pinning service for permanent storage                   │
└──────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────┐
│      Blockchain Nodes (Ethereum Polygon/Sepolia)         │
│  Full nodes for contract interaction                     │
│  Historical data retention                               │
└──────────────────────────────────────────────────────────┘
```

### 2. **CI/CD Pipeline**

```
GitHub Workflow:
├─ Push to main branch
├─ Run tests (Jest + Mocha)
├─ Security scanning (SonarQube)
├─ Build Docker images
├─ Push to Docker registry
├─ Deploy to staging
├─ Run integration tests
├─ Deploy to production (blue-green)
└─ Monitor & rollback if needed
```

---

## 📋 Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

- [x] Smart contracts for core data layer
- [ ] Enhanced encryption system
- [ ] IPFS integration
- [ ] Database schema for audit trails

### Phase 2: Security & Access (Weeks 3-4)

- [ ] Role-based access control (RBAC)
- [ ] Real-time access control system
- [ ] Comprehensive audit logging
- [ ] JWT token management

### Phase 3: Interoperability (Weeks 5-6)

- [ ] FHIR compliance layer
- [ ] Data interchange standards
- [ ] Cross-hospital API integration
- [ ] Version management

### Phase 4: Patient Portal (Weeks 7-8)

- [ ] Read-only portal UI
- [ ] Medical timeline visualization
- [ ] Lab results display
- [ ] Access history tracking

### Phase 5: Testing & Deployment (Weeks 9-10)

- [ ] Comprehensive testing (unit, integration, security)
- [ ] Load testing & performance optimization
- [ ] Security audit & penetration testing
- [ ] Production deployment

---

## 📚 References & Standards

- **FHIR R4**: https://www.hl7.org/fhir/
- **HIPAA Compliance**: https://www.hhs.gov/hipaa/
- **GDPR**: https://gdpr-info.eu/
- **AES-256-GCM**: https://nvlpubs.nist.gov/nistpubs/
- **OAuth2**: https://tools.ietf.org/html/rfc6749
- **IPFS**: https://ipfs.io/
- **Ethereum Smart Contracts**: https://ethereum.org/

---

## ✅ Success Metrics

- ✓ 99.99% system uptime
- ✓ <100ms access request approval time
- ✓ <500ms data retrieval time
- ✓ Zero unauthorized access incidents
- ✓ Full HIPAA/GDPR compliance
- ✓ 100% audit trail completeness
- ✓ 7-year data retention compliance

---

This architecture ensures a **secure**, **interoperable**, **transparent**, and **patient-centric** healthcare records system built on blockchain technology.
