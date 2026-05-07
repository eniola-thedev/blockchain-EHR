# MedChain — Blockchain-Based EHR System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MEDCHAIN ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────┘

  CLIENTS
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  Hospital A  │  │  Hospital B  │  │   Patient    │
  │  Dashboard   │  │  Dashboard   │  │  Portal      │
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                 │                  │
         └─────────────────┴──────────────────┘
                           │ HTTPS / JWT
                           ▼
  ┌─────────────────────────────────────────────────────┐
  │                  API GATEWAY (Express)               │
  │   /auth  /records  /hospitals  /access  /audit       │
  └─────────────────────┬───────────────────────────────┘
                         │
         ┌───────────────┼────────────────┐
         ▼               ▼                ▼
  ┌────────────┐  ┌────────────┐  ┌──────────────────┐
  │  MongoDB   │  │    IPFS    │  │  Blockchain Node  │
  │ (Off-chain)│  │  Storage   │  │  (Hyperledger /  │
  │            │  │            │  │   Ethereum)       │
  │ - Patient  │  │ - PDFs     │  │                  │
  │   profiles │  │ - Images   │  │ - Record hashes  │
  │ - Metadata │  │ - Lab rpts │  │ - Access control │
  │ - Sessions │  │            │  │ - Audit trail    │
  └────────────┘  └────────────┘  └──────────────────┘

  BLOCKCHAIN SMART CONTRACTS
  ┌──────────────────────────────────────────────────────┐
  │  EHRRegistry.sol                                      │
  │  ├── addRecord(patientID, ipfsHash, hospitalID)       │
  │  ├── requestAccess(patientID, requestingHospital)     │
  │  ├── grantAccess(patientID, hospitalID, expiry)       │
  │  ├── revokeAccess(patientID, hospitalID)              │
  │  └── logAccess(patientID, hospitalID, action)         │
  │                                                       │
  │  HospitalRegistry.sol                                 │
  │  ├── registerHospital(hospitalID, name, publicKey)    │
  │  ├── verifyHospital(hospitalID)                       │
  │  └── revokeHospital(hospitalID)                       │
  └──────────────────────────────────────────────────────┘

  HOSPITAL-TO-HOSPITAL FLOW
  ┌──────────────────────────────────────────────────────┐
  │                                                       │
  │  Hospital A                     Hospital B           │
  │  (Patient registered)           (Emergency visit)    │
  │       │                              │               │
  │       │                              │ 1. Enter PatientID
  │       │                              │ 2. System verifies HospB
  │       │                              │ 3. Smart contract logs req
  │       │◄─────────────────────────────┤               │
  │       │  4. Access check (auto/rules)│               │
  │       │─────────────────────────────►│               │
  │       │  5. IPFS hash returned       │               │
  │       │                              │ 6. Fetch records from IPFS
  │       │                              │ 7. Decrypt & display       │
  └──────────────────────────────────────────────────────┘
```

## Folder Structure

```
ehr-blockchain/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── recordController.js
│   │   ├── accessController.js
│   │   └── auditController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rbac.js
│   │   └── rateLimit.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Hospital.js
│   │   ├── MedicalRecord.js
│   │   └── AccessRequest.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── records.js
│   │   ├── hospitals.js
│   │   └── access.js
│   ├── services/
│   │   ├── blockchainService.js
│   │   ├── ipfsService.js
│   │   └── encryptionService.js
│   └── server.js
├── blockchain/
│   ├── contracts/
│   │   ├── EHRRegistry.sol
│   │   └── HospitalRegistry.sol
│   ├── scripts/
│   │   └── deploy.js
│   └── hardhat.config.js
└── frontend/
    └── src/
        ├── components/
        ├── pages/
        ├── hooks/
        └── services/
```

## Setup Instructions

See SETUP.md for full installation guide.
