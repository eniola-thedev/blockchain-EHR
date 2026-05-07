// services/ipfsService.js
const crypto = require("crypto");

let ipfs;

const getIPFS = async () => {
  if (!ipfs) {
    const { create } = await import("ipfs-http-client");
    const url = process.env.IPFS_API_URL || "http://localhost:5001";
    ipfs = create({ url });
  }
  return ipfs;
};

/**
 * Upload JSON data to IPFS
 */
const uploadJSON = async (data) => {
  const client = await getIPFS();
  const content = typeof data === "string" ? data : JSON.stringify(data);
  const result = await client.add(content, { pin: true });
  return { cid: result.cid.toString(), size: result.size };
};

/**
 * Upload a file buffer to IPFS
 */
const uploadFile = async (buffer, filename) => {
  const client = await getIPFS();
  const result = await client.add(
    { path: filename, content: buffer },
    { pin: true },
  );
  return { cid: result.cid.toString(), size: result.size };
};

/**
 * Retrieve data from IPFS by CID
 */
const getFromIPFS = async (cid) => {
  const client = await getIPFS();
  const chunks = [];
  for await (const chunk of client.cat(cid)) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

/**
 * Get IPFS gateway URL for a CID (for browser access)
 */
const getGatewayUrl = (cid) => {
  const gateway = process.env.IPFS_GATEWAY || "https://ipfs.io/ipfs";
  return `${gateway}/${cid}`;
};

module.exports = { uploadJSON, uploadFile, getFromIPFS, getGatewayUrl };
