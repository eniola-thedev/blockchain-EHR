# 🏥 EHR Blockchain System - Secure Decentralized Healthcare Records

A **production-grade**, **blockchain-based** Electronic Health Records system designed with security, interoperability, and patient privacy as core principles.

## 🎯 Key Features

### 🔒 **Security & Encryption**

- ✅ AES-256-GCM encrypted storage with PBKDF2 key derivation
- ✅ Per-patient encryption keys derived from master key + patient ID + salt
- ✅ Tamper detection via authentication tags
- ✅ TLS 1.3 for all communications
- ✅ Rate limiting and DDoS protection

### ⛓️ **Blockchain Integration**

- ✅ Immutable audit trails via Ethereum smart contracts
- ✅ Permanent record of all data access and modifications
- ✅ Cryptographic proof of data integrity
- ✅ Smart contract-based access control
- ✅ Emergency access auto-approval with immutable logging

### 🌐 **Decentralized Storage**

- ✅ Encrypted data on IPFS (3+ node redundancy)
- ✅ Only hashes stored on blockchain
- ✅ Full data lives off-chain for scalability
- ✅ Pinata integration for production IPFS pinning
- ✅ Multiple gateway support for reliability

### 👥 **Role-Based Access Control (RBAC)**

- ✅ 7 defined roles with specific permissions
- ✅ Principle of least privilege
- ✅ Patient-only read-only access
- ✅ Hospital-wide authorization management
- ✅ Auditor and regulator oversight

### 🏥 **Interoperability**

- ✅ FHIR R4 standard compliance
- ✅ SNOMED CT medical coding
- ✅ LOINC lab test codes
- ✅ Cross-hospital data interchange
- ✅ Real-time data sharing agreements

### 👨‍⚕️ **Patient Portal**

- ✅ View-only access to medical records
- ✅ See access history and who viewed records
- ✅ Revoke hospital access anytime
- ✅ Request record amendments
- ✅ Download personalized health records

### 📊 **Audit & Compliance**

- ✅ 20+ event types logged
- ✅ HIPAA compliance reporting
- ✅ GDPR data subject access
- ✅ Immutable audit trails
- ✅ 7-year retention policies
- ✅ Unauthorized access incident reporting

### 🔄 **Real-Time Coordination**

- ✅ WebSocket for instant notifications
- ✅ Real-time access request workflow
- ✅ Immediate access revocation
- ✅ Emergency access alerts
- ✅ Data breach incident notifications

---

## 📦 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Patient Web Portal                         │
│          (View-Only Medical Records)                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│         API Gateway & Security Layer                    │
│  • JWT Authentication  • RBAC Enforcement               │
│  • Rate Limiting       • Audit Logging                  │
│  • TLS 1.3             • DDoS Protection                │
└─────────────────────────────────────────────────────────┘
        ↓                   ↓                   ↓
    ┌───────────┐  ┌──────────────┐  ┌──────────────┐
    │Encryption │  │ Access       │  │ Audit Trail  │
    │Service    │  │ Control      │  │ Service      │
    │AES-256-GCM│  │ Smart        │  │ Immutable    │
    │PBKDF2     │  │ Contracts    │  │ Logging      │
    └───────────┘  └──────────────┘  └──────────────┘
        ↓                   ↓                   ↓
    ┌─────────────────────────────────────────────────────┐
    │    Data Layer - Triple Storage                      │
    ├─────────────────────────────────────────────────────┤
    │ MongoDB     │ IPFS            │ Ethereum            │
    │ (Metadata,  │ (Encrypted      │ (Audit Logs,        │
    │ Access      │  Patient Data)   │ Hashes, Proofs)     │
    │ Grants)     │ (Decentralized)  │ (Immutable)         │
    └─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 16+
MongoDB 4.4+
IPFS node or Pinata account
Ethereum wallet with Sepolia testnet ETH
```

### 1. Clone & Setup

```bash
cd ehr-blockchain
npm install

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy to .env
cp .env.example .env
# Edit .env with your configuration
```

### 2. Database Setup

```bash
# MongoDB
mongod --dbpath /path/to/data

# Create indexes
npm run db:migrate
```

### 3. Blockchain Setup

```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
# Save contract addresses to ../.env
```

### 4. IPFS Setup

```bash
# Option 1: Use Pinata (recommended for production)
# Sign up at https://pinata.cloud
# Add API keys to .env

# Option 2: Local IPFS node
ipfs init
ipfs daemon
```

### 5. Start Backend

```bash
npm start
# Server running on http://localhost:5000
```

### 6. Start Frontend

```bash
cd frontend
npm install
npm start
# Client running on http://localhost:3000
```

---

## 🔐 Security Features in Detail

### Encryption Pipeline

```javascript
// 1. Patient data encrypted with AES-256-GCM
const medicalData = { diagnosis: "Type 2 Diabetes" };
const encrypted = encryptionService.encryptData(
  medicalData,
  patientId,
  CLASSIFICATION.MEDICAL
);
// Returns: { ciphertext, iv, authTag, salt, integrityHash }

// 2. Encrypted data uploaded to IPFS
const ipfsResult = await ipfsService.uploadRecord(encrypted, patientId, "diagnosis");
// Returns: { ipfsHash: "QmXxxx..." }

// 3. IPFS hash stored on blockchain with proof
await ehrContract.addRecord(
  patientId,
  ipfsResult.ipfsHash,
  encryptionService.hashDataBinary(encrypted),  // Proof
  "diagnosis",
  "Condition"  // FHIR type
);

// 4. Access logged immutably on blockchain & database
await auditTrailService.logRecordCreation(...);
```

### Access Control Flow

```javascript
// 1. Hospital B requests access to patient at Hospital A
// 2. Request logged on blockchain immediately
// 3. Hospital A admin reviews request
// 4. If approved:
//    - Access grant created on blockchain
//    - IPFS data becomes accessible to Hospital B
//    - Real-time notification via WebSocket
// 5. Patient can revoke anytime (immutately)
```

---

## 📊 Data Model

### Medical Record Structure

```
MedicalRecord {
  patientId: string
  recordType: "diagnosis" | "lab_result" | "prescription" | "imaging"
  ipfsHash: string  # Encrypted data location
  dataIntegrityHash: bytes32  # SHA-256(encrypted_data)
  versionNumber: uint32  # For amendments
  fhirResourceType: string  # Condition, Observation, etc.
  createdBy: address  # Hospital/doctor
  timestamp: uint256  # Block timestamp
}

AccessGrant {
  patientId: string
  grantedTo: address  # Hospital
  grantedBy: address  # Home hospital
  grantedAt: uint256  # Timestamp
  expiresAt: uint256  # Time-based expiration
  isEmergency: bool  # Auto-approved flag
  status: "ACTIVE" | "REVOKED" | "EXPIRED"
  reason: string  # Justification
}

AuditLog {
  auditId: uint256  # Sequential ID
  eventType: AuditAction  # 20+ types
  actor: address  # Who performed action
  patientId: string  # Patient affected
  timestamp: uint256  # When it happened
  blockNumber: uint256  # Blockchain verification
  integrityHash: bytes32  # Tamper detection
}
```

---

## 🏥 Inter-Hospital Data Sharing

### Real-Time Access Request Workflow

```
Timeline:
─────────

Hospital B initiates request
  ↓
Request logged on blockchain (immutable)
  ↓
Hospital A admin notified via WebSocket (real-time)
  ↓
Hospital A reviews request
  ├─ Approve (72 hours)
  │  ↓
  │  Hospital B gets access to IPFS data
  │  All views logged on blockchain
  │  Automatic expiration after 72h
  │
  └─ Deny
     ↓
     Request marked denied on blockchain
     Hospital B cannot access data

Hospital A can revoke anytime
  ↓
Access immediately revoked on blockchain
  ↓
Hospital B loses access (cached data ignored)
  ↓
Revocation logged immutably
```

---

## 👥 Role Permissions

| Role               | View Records | Create Records | Approve Access | View Audit Logs | Manage Users |
| ------------------ | :----------: | :------------: | :------------: | :-------------: | :----------: |
| **Patient**        |   Own Only   |       ✗        |       ✗        |    Own Only     |      ✗       |
| **Doctor**         |   If Auth    |       ✓        |       ✗        |        ✗        |      ✗       |
| **Clinician**      |   If Auth    |       ✓        |       ✗        |        ✗        |      ✗       |
| **Hospital Admin** | All Hospital |       ✓        |       ✓        |    Hospital     |      ✓       |
| **Auditor**        |     All      |       ✗        |       ✗        |       All       |      ✗       |
| **Regulator**      |     All      |       ✗        |       ✗        |       All       |   Suspend    |
| **System Admin**   |     All      |       ✓        |       ✓        |       All       |      ✓       |

---

## 🔗 Smart Contracts

### EHRRegistryV2.sol

- **Functions**: addRecord, requestAccess, grantAccess, revokeAccess, logRecordAccess
- **Safety**: Permissioned system, verified hospitals only
- **Immutability**: All events logged on blockchain
- **Emergency Access**: Auto-approve with 24h duration
- **Audit Trail**: Complete event history with timestamps

### HospitalRegistry.sol

- **Functions**: registerHospital, verifyHospital, revokeHospital
- **Verification**: Admin-controlled hospital network
- **License Tracking**: Government license storage
- **Suspension Capability**: Remove compromised hospitals

---

## 📱 API Endpoints

### Authentication

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
POST   /api/auth/logout
```

### Patient Portal (Read-Only)

```
GET    /api/patient/records              All patient's records
GET    /api/patient/records/:id          Specific record
GET    /api/patient/timeline             Medical timeline
GET    /api/patient/access-history       Who accessed records
POST   /api/patient/revoke-access/:id    Revoke hospital access
```

### Medical Records

```
POST   /api/records/create              Create new record
GET    /api/records/:id                 Get record (with auth)
GET    /api/records/patient/:id         Patient's all records
GET    /api/records/audit-trail         Full audit trail
```

### Inter-Hospital Access

```
POST   /api/access/request              Request access
GET    /api/access/incoming             Pending requests (home hospital)
GET    /api/access/outgoing             Requests we sent
POST   /api/access/:id/approve          Approve request
POST   /api/access/:id/deny             Deny request
POST   /api/access/:id/revoke           Revoke active access
```

### Compliance & Audit

```
GET    /api/audit/logs                  Get audit logs
GET    /api/audit/reports/hipaa         HIPAA compliance report
GET    /api/audit/reports/gdpr          GDPR data export
```

---

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Security tests
npm run test:security

# Smart contract tests
cd blockchain && npx hardhat test

# Load testing
npm run test:load

# Coverage report
npm run test:coverage
```

---

## 🚢 Production Deployment

### Prerequisites

- [ ] SSL/TLS certificates installed
- [ ] Encryption key stored in AWS KMS / HashiCorp Vault
- [ ] MongoDB Atlas with encryption at rest
- [ ] Pinata account with enterprise plan
- [ ] Ethereum mainnet (or Polygon) node access
- [ ] CDN for static assets

### Deployment Steps

```bash
# 1. Set production environment variables
export NODE_ENV=production
export BLOCKCHAIN_RPC_URL=https://mainnet.infura.io/...
export ENCRYPTION_KEY=$(aws kms decrypt ...)

# 2. Build frontend
cd frontend && npm run build

# 3. Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# 4. Run migrations
npm run migrate:prod

# 5. Verify deployment
curl https://yourhospital.com/health
```

### Monitoring

```bash
# View logs
docker-compose logs -f backend

# Check health
curl https://yourhospital.com/health

# Monitor blockchain
etherscan.io/address/0x...
```

---

## 📚 Documentation Files

- **SYSTEM_ARCHITECTURE.md** - Complete system design and architecture
- **COMPLETE_IMPLEMENTATION_GUIDE.md** - Step-by-step implementation
- **SETUP.md** - Initial setup instructions
- **QUICKSTART.md** - Quick start guide
- **FEATURES.md** - Detailed feature documentation

---

## 🔍 Compliance & Standards

- ✅ **HIPAA** - Healthcare data privacy
- ✅ **GDPR** - EU data protection
- ✅ **FHIR R4** - Healthcare data interchange
- ✅ **AES-256-GCM** - NIST-approved encryption
- ✅ **OAuth2** - Industry-standard authentication
- ✅ **TLS 1.3** - Modern transport security

---

## 🐛 Troubleshooting

### Encryption Key Issues

```bash
# Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### IPFS Connection Failed

```bash
# Verify IPFS is running
ipfs daemon

# Check connectivity
curl http://127.0.0.1:5001/api/v0/id
```

### Blockchain Transaction Failed

```bash
# Check account balance
cast balance 0x...

# View transaction status
etherscan.io/tx/0x...
```

### Audit Logs Not Appearing

```bash
# Initialize service
npm run init:audit

# Verify database
mongo
> use ehr
> db.audit_logs.count()
```

---

## 📞 Support

For issues, questions, or suggestions:

1. Check the documentation files
2. Review the implementation guide
3. Check the troubleshooting section
4. Open an issue with detailed logs

---

## 📄 License

MIT License - See LICENSE file for details

---

## ✨ Features at a Glance

| Component              | Implementation           | Status      |
| ---------------------- | ------------------------ | ----------- |
| Encryption Service     | AES-256-GCM + PBKDF2     | ✅ Complete |
| Blockchain Contracts   | EHRRegistryV2.sol        | ✅ Complete |
| IPFS Integration       | Pinata + Local nodes     | ✅ Complete |
| Access Control         | RBAC with 7 roles        | ✅ Complete |
| Audit Trail            | Immutable logging        | ✅ Complete |
| FHIR Compliance        | R4 standard              | ✅ Complete |
| Patient Portal         | Read-only access         | ✅ Complete |
| Real-Time Updates      | WebSocket + events       | ✅ Complete |
| Inter-Hospital Sharing | Request/approve workflow | ✅ Complete |
| Compliance Reports     | HIPAA/GDPR               | ✅ Complete |

---

## 🎓 Architecture Benefits

1. **Security**
   - Multiple layers of encryption
   - Tamper detection and verification
   - Role-based access control
   - Real-time audit logging

2. **Decentralization**
   - No single point of failure
   - Blockchain immutability
   - Distributed IPFS storage
   - Hospital autonomy

3. **Interoperability**
   - FHIR standard compliance
   - Cross-hospital data sharing
   - API-first design
   - Easy integration

4. **Patient Privacy**
   - Patient-only read-only access
   - Explicit consent tracking
   - Access revocation anytime
   - Full audit trail transparency

5. **Regulatory Compliance**
   - HIPAA audit trails
   - GDPR data subject rights
   - Incident reporting
   - 7-year retention

---

**This system represents the future of healthcare records: secure, decentralized, interoperable, and patient-centric.**
