const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Balance:",
    hre.ethers.formatEther(
      await deployer.provider.getBalance(deployer.address),
    ),
    "ETH",
  );

  // 1. Deploy HospitalRegistry
  console.log("\n📋 Deploying HospitalRegistry...");
  const HospitalRegistry = await hre.ethers.getContractFactory(
    "HospitalRegistry",
  );
  const hospitalRegistry = await HospitalRegistry.deploy();
  await hospitalRegistry.waitForDeployment();
  const hospitalRegistryAddr = await hospitalRegistry.getAddress();
  console.log("✅ HospitalRegistry deployed to:", hospitalRegistryAddr);

  // 2. Deploy EHRRegistry
  console.log("\n🏥 Deploying EHRRegistry...");
  const EHRRegistry = await hre.ethers.getContractFactory("EHRRegistry");
  const ehrRegistry = await EHRRegistry.deploy();
  await ehrRegistry.waitForDeployment();
  const ehrRegistryAddr = await ehrRegistry.getAddress();
  console.log("✅ EHRRegistry deployed to:", ehrRegistryAddr);

  // 3. Save addresses to file (used by backend)
  const addresses = {
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    HospitalRegistry: hospitalRegistryAddr,
    EHRRegistry: ehrRegistryAddr,
  };

  fs.writeFileSync(
    "./deployed-addresses.json",
    JSON.stringify(addresses, null, 2),
  );
  console.log("\n📄 Addresses saved to deployed-addresses.json");

  // 4. Copy ABIs to backend
  const backendAbiDir = "../backend/blockchain/abis";
  if (!fs.existsSync(backendAbiDir)) {
    fs.mkdirSync(backendAbiDir, { recursive: true });
  }

  const ehrAbi = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/EHRRegistry.sol/EHRRegistry.json",
      "utf-8",
    ),
  );
  const hospitalAbi = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/HospitalRegistry.sol/HospitalRegistry.json",
      "utf-8",
    ),
  );

  fs.writeFileSync(
    `${backendAbiDir}/EHRRegistry.json`,
    JSON.stringify(ehrAbi.abi, null, 2),
  );
  fs.writeFileSync(
    `${backendAbiDir}/HospitalRegistry.json`,
    JSON.stringify(hospitalAbi.abi, null, 2),
  );
  fs.writeFileSync(
    `${backendAbiDir}/addresses.json`,
    JSON.stringify(addresses, null, 2),
  );

  console.log("✅ ABIs copied to backend");
  console.log("\n🎉 Deployment complete!\n");
  console.log("Add to your backend .env:");
  console.log(`EHR_REGISTRY_ADDRESS=${ehrRegistryAddr}`);
  console.log(`HOSPITAL_REGISTRY_ADDRESS=${hospitalRegistryAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
