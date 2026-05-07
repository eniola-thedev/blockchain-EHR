# MedChain EHR — Setup Instructions

## Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- Git

---

## 1. Clone & Install Dependencies

```bash
# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install

# Install blockchain tools
cd ../blockchain
npm install
```

---

## 2. Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/medchain
JWT_SECRET=your-super-secret-min-32-chars-change-this
ENCRYPTION_KEY=<generate below>
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=<from hardhat account below>
```

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Deploy Smart Contracts (Local)

### Terminal 1 — Start local blockchain node:
```bash
cd blockchain
npx hardhat node
```

Copy one of the printed private keys into your backend `.env` as `PRIVATE_KEY`.

### Terminal 2 — Deploy contracts:
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

This will:
- Deploy `HospitalRegistry.sol` and `EHRRegistry.sol`
- Save ABIs + addresses to `backend/blockchain/abis/`
- Print addresses to add to your `.env`

Add the printed addresses to `backend/.env`:
```env
EHR_REGISTRY_ADDRESS=0x...
HOSPITAL_REGISTRY_ADDRESS=0x...
```

---

## 4. Start Backend

```bash
cd backend
npm run dev
```

API will be running at: http://localhost:5000

---

## 5. Start Frontend

```bash
cd frontend
npm start
```

Frontend will be running at: http://localhost:3000

---

## 6. Initial Setup (First Run)

### Register the first hospital (via API or frontend /register):
```bash
curl -X POST http://localhost:5000/api/auth/register/hospital \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lagos General Hospital",
    "email": "admin@lagosgeneral.com",
    "password": "Demo1234!",
    "licenseNumber": "HOSP-2024-001",
    "country": "Nigeria"
  }'
```

### Login as admin and verify the hospital:
You'll need to manually set `isVerified: true` in MongoDB for the first hospital, 
or create an admin user directly:

```js
// In MongoDB shell or Compass:
db.users.updateOne({ email: "admin@lagosgeneral.com" }, { $set: { role: "admin" } })
db.hospitals.updateOne({ email: "admin@lagosgeneral.com" }, { $set: { isVerified: true } })
```

---

## 7. Hospital-to-Hospital Workflow Demo

### Hospital A registers a patient:
1. Login as Hospital A admin → Doctor Dashboard
2. Register patient via POST /api/auth/register/patient
3. Create medical records for the patient

### Hospital B requests access:
1. Register Hospital B via /register
2. Login as Hospital B
3. Go to Access Requests → Request Access
4. Enter patient ID and submit (or tick Emergency for instant 24h access)

### Hospital A approves:
1. Login as Hospital A
2. Go to Access Requests → Incoming
3. Click Grant → select duration → confirm

### Hospital B views records:
1. Go to Doctor Dashboard
2. Search the patient ID
3. View full records (now accessible)

All steps are logged on blockchain with tx hashes.

---

## 8. Deploy to Production

### Smart Contracts (Polygon Mumbai testnet):
```bash
# Add to blockchain/.env
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
PRIVATE_KEY=your-wallet-private-key

npx hardhat run scripts/deploy.js --network mumbai
```

### Backend:
- Deploy to Railway, Render, or AWS EC2
- Use MongoDB Atlas for database
- Use Pinata or Infura for IPFS (replace ipfs-http-client with Pinata SDK)
- Set all environment variables

### Frontend:
```bash
cd frontend
REACT_APP_API_URL=https://your-backend.com/api npm run build
```
Deploy `build/` folder to Netlify, Vercel, or S3.

---

## API Reference

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | All | Login |
| POST | /api/auth/register/hospital | Public | Register hospital |
| POST | /api/auth/register/patient | Hospital/Doctor | Register patient |
| POST | /api/auth/register/doctor | Hospital | Add doctor |
| POST | /api/records | Doctor/Hospital | Create medical record |
| GET | /api/records/patient/:id | Auth | Get patient records |
| GET | /api/records/my-summary | Patient | Patient self-view |
| POST | /api/access/request | Hospital | Request inter-hospital access |
| POST | /api/access/:id/grant | Hospital | Grant access |
| POST | /api/access/:id/revoke | Hospital | Revoke access |
| GET | /api/access/incoming | Hospital | Incoming requests |
| GET | /api/access/check/:patientId | Hospital | Check access status |
| GET | /api/audit | Admin | Full audit trail |
| PATCH | /api/hospitals/:id/verify | Admin | Verify hospital |

---

## Smart Contract Functions

```solidity
// EHRRegistry.sol
addRecord(patientId, ipfsHash, recordType)     // Hospital adds record hash
requestAccess(patientId, isEmergency)          // Hospital requests access
grantAccess(patientId, hospitalAddr, duration) // Home hospital grants access
revokeAccess(patientId, hospitalAddr)          // Revoke access
logRecordAccess(patientId, action)             // Log view events
getPatientRecords(patientId)                   // Get all record hashes
checkAccess(patientId, hospitalAddr)           // Verify access status
getAuditLogs(fromIndex, count)                 // Get audit trail (admin)

// HospitalRegistry.sol
registerHospital(addr, name, license, country) // Register hospital
revokeHospital(addr, reason)                   // Revoke hospital
isVerified(addr)                               // Check verification
```

---

## Security Architecture

```
Data Flow:
Medical Data → AES-256-GCM Encrypt → Upload to IPFS → Get CID
CID + SHA-256 Hash → Write to Blockchain → Get Tx Hash
Tx Hash + CID → Save to MongoDB

Access Verification:
Request → Check JWT → Check RBAC Role → Check Blockchain Access Grant
→ Fetch MongoDB record → Decrypt → Return to authorized user

Tamper Detection:
On read: Hash MongoDB data → Compare with blockchain hash
Mismatch → Alert + flag record as potentially tampered
```

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router, Axios |
| Backend | Node.js, Express, JWT, bcrypt |
| Database | MongoDB + Mongoose |
| Blockchain | Ethereum (Hardhat), Solidity 0.8.19 |
| File Storage | IPFS (ipfs-http-client) |
| Encryption | AES-256-GCM |
| Auth | JWT + RBAC |
