const { ethers } = require("ethers");
const path        = require("path");
const fs          = require("fs");

let provider, signer, ehrContract, hospitalContract;

const initBlockchain = () => {
  try {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
    provider     = new ethers.JsonRpcProvider(rpcUrl);

    if (process.env.PRIVATE_KEY) {
      signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    }

    // Load ABIs and addresses
    const abiDir  = path.join(__dirname, "../blockchain/abis");
    const addrPath = path.join(abiDir, "addresses.json");

    if (fs.existsSync(addrPath)) {
      const addresses  = JSON.parse(fs.readFileSync(addrPath));
      const ehrAbi     = JSON.parse(fs.readFileSync(path.join(abiDir, "EHRRegistry.json")));
      const hospitalAbi = JSON.parse(fs.readFileSync(path.join(abiDir, "HospitalRegistry.json")));

      const signerOrProvider = signer || provider;
      ehrContract      = new ethers.Contract(addresses.EHRRegistry,      ehrAbi,     signerOrProvider);
      hospitalContract = new ethers.Contract(addresses.HospitalRegistry, hospitalAbi, signerOrProvider);

      console.log("✅ Blockchain service initialized");
    } else {
      console.warn("⚠️  Blockchain ABI files not found. Deploy contracts first.");
    }
  } catch (err) {
    console.warn("⚠️  Blockchain init failed:", err.message);
  }
};

// ─── Check Blockchain Available ─────────────────────────────────────
const isAvailable = () => !!ehrContract && !!signer;

// ─── Add Record Hash ─────────────────────────────────────────────────
const addRecord = async (patientId, ipfsHash, recordType, hospitalWallet) => {
  if (!isAvailable()) throw new Error("Blockchain not initialized");
  const tx = await ehrContract.addRecord(patientId, ipfsHash, recordType);
  await tx.wait();
  return tx;
};

// ─── Request Access ──────────────────────────────────────────────────
const requestAccess = async (patientId, isEmergency) => {
  if (!isAvailable()) throw new Error("Blockchain not initialized");
  const tx = await ehrContract.requestAccess(patientId, isEmergency);
  await tx.wait();
  return tx;
};

// ─── Grant Access ────────────────────────────────────────────────────
const grantAccess = async (patientId, hospitalAddress, durationSeconds) => {
  if (!isAvailable()) throw new Error("Blockchain not initialized");
  const tx = await ehrContract.grantAccess(patientId, hospitalAddress, durationSeconds);
  await tx.wait();
  return tx;
};

// ─── Revoke Access ───────────────────────────────────────────────────
const revokeAccess = async (patientId, hospitalAddress) => {
  if (!isAvailable()) throw new Error("Blockchain not initialized");
  const tx = await ehrContract.revokeAccess(patientId, hospitalAddress);
  await tx.wait();
  return tx;
};

// ─── Log Record Access ───────────────────────────────────────────────
const logRecordAccess = async (patientId, action) => {
  if (!isAvailable()) return null;
  const tx = await ehrContract.logRecordAccess(patientId, action);
  await tx.wait();
  return tx;
};

// ─── Get Audit Logs from Blockchain ─────────────────────────────────
const getAuditLogs = async (fromIndex = 0, count = 50) => {
  if (!isAvailable()) throw new Error("Blockchain not initialized");
  return ehrContract.getAuditLogs(fromIndex, count);
};

// ─── Verify Hospital on Chain ────────────────────────────────────────
const verifyHospital = async (hospitalAddress) => {
  if (!isAvailable()) return false;
  return hospitalContract.isVerified(hospitalAddress);
};

// ─── Register Hospital on Chain ──────────────────────────────────────
const registerHospitalOnChain = async (hospitalAddress, name, licenseNumber, country) => {
  if (!isAvailable()) throw new Error("Blockchain not initialized");
  const tx = await hospitalContract.registerHospital(
    hospitalAddress, name, licenseNumber, country
  );
  await tx.wait();
  return tx;
};

// ─── Get Patient Records from Chain ──────────────────────────────────
const getPatientRecordsFromChain = async (patientId) => {
  if (!isAvailable()) throw new Error("Blockchain not initialized");
  return ehrContract.getPatientRecords(patientId);
};

// Initialize on module load
initBlockchain();

module.exports = {
  initBlockchain,
  isAvailable,
  addRecord,
  requestAccess,
  grantAccess,
  revokeAccess,
  logRecordAccess,
  getAuditLogs,
  verifyHospital,
  registerHospitalOnChain,
  getPatientRecordsFromChain,
};
