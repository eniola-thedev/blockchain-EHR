// services/ipfsService.js
// Decentralized storage service using IPFS
// Handles encrypted medical data storage and retrieval

const axios = require("axios");

/**
 * IPFS Service - Manages decentralized data storage
 * Uses IPFS for redundant, decentralized storage of encrypted medical records
 */
class IPFSService {
  constructor() {
    this.ipfsGateway = process.env.IPFS_GATEWAY || "http://127.0.0.1:5001";
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
    this.useIPFS = process.env.USE_IPFS !== "false";

    if (!this.useIPFS) {
      console.log("⚠️  IPFS disabled. Using fallback storage.");
    } else {
      console.log("✓ IPFS Service initialized");
    }
  }

  /**
   * Upload encrypted medical record to IPFS
   * @param {object} encryptedData - Encrypted data from advancedEncryptionService
   * @param {string} patientId - Patient identifier
   * @param {string} recordType - Type of medical record
   * @returns {object} IPFS storage result with CID
   */
  async uploadRecord(encryptedData, patientId, recordType) {
    if (!this.useIPFS) {
      return this._fallbackUpload(encryptedData, patientId, recordType);
    }

    try {
      // Create metadata envelope
      const recordEnvelope = {
        // Content
        encryptedContent: encryptedData,

        // Metadata (unencrypted, searchable)
        metadata: {
          patientId: patientId,
          recordType: recordType,
          uploadedAt: new Date().toISOString(),
          version: "1.0",
          format: "application/json",

          // For discoverability (without exposing sensitive data)
          contentHash: this._computeHash(encryptedData),
          dataSize: JSON.stringify(encryptedData).length,

          // HIPAA required metadata
          encryptionAlgorithm: encryptedData.algorithm,
          classification: encryptedData.classification,
        },

        // Audit trail (stored on IPFS)
        auditTrail: {
          createdAt: new Date().toISOString(),
          uploadedVia: "IPFSService",
          redundancyLevel: "medium",
          backupCount: 0,
        },
      };

      // Try Pinata first (recommended for production)
      if (this.pinataApiKey && this.pinataSecretKey) {
        return await this._uploadToPinata(recordEnvelope);
      }

      // Fall back to local IPFS node
      return await this._uploadToLocalIPFS(recordEnvelope);
    } catch (err) {
      console.error("❌ IPFS upload failed:", err.message);
      throw new Error(`IPFS upload failed: ${err.message}`);
    }
  }

  /**
   * Retrieve encrypted record from IPFS
   * @param {string} ipfsHash - IPFS content identifier (CID)
   * @returns {object} Retrieved encrypted data
   */
  async retrieveRecord(ipfsHash) {
    if (!this.useIPFS) {
      return this._fallbackRetrieve(ipfsHash);
    }

    try {
      // Try Pinata first
      if (this.pinataApiKey) {
        try {
          return await this._retrieveFromPinata(ipfsHash);
        } catch (err) {
          console.warn(
            "Pinata retrieval failed, trying local IPFS:",
            err.message,
          );
        }
      }

      // Fall back to local IPFS gateway
      return await this._retrieveFromLocalIPFS(ipfsHash);
    } catch (err) {
      throw new Error(`IPFS retrieval failed: ${err.message}`);
    }
  }

  /**
   * Pin record to multiple nodes for redundancy
   */
  async pinRecordRedundant(ipfsHash, redundancyLevel = 3) {
    if (!this.useIPFS) {
      return { pinned: false, reason: "IPFS disabled" };
    }

    try {
      const nodes = [];

      // Pin to Pinata (if available)
      if (this.pinataApiKey) {
        nodes.push(
          await this._pinToPinata(ipfsHash)
            .then(() => ({
              provider: "Pinata",
              status: "pinned",
            }))
            .catch((err) => ({
              provider: "Pinata",
              status: "failed",
              error: err.message,
            })),
        );
      }

      // Pin to local IPFS
      nodes.push(
        await this._pinToLocalIPFS(ipfsHash)
          .then(() => ({
            provider: "Local IPFS",
            status: "pinned",
          }))
          .catch((err) => ({
            provider: "Local IPFS",
            status: "failed",
            error: err.message,
          })),
      );

      const successfulPins = nodes.filter((n) => n.status === "pinned").length;

      return {
        ipfsHash: ipfsHash,
        totalNodes: nodes.length,
        successfulPins: successfulPins,
        redundancyAchieved:
          successfulPins >= Math.min(redundancyLevel, nodes.length),
        nodes: nodes,
      };
    } catch (err) {
      throw new Error(`Redundant pinning failed: ${err.message}`);
    }
  }

  /**
   * Verify record integrity
   * Checks if stored record matches expected hash
   */
  async verifyRecordIntegrity(ipfsHash, expectedHash) {
    try {
      const record = await this.retrieveRecord(ipfsHash);
      const computedHash = this._computeHash(record.encryptedContent);

      return {
        ipfsHash: ipfsHash,
        verified: computedHash === expectedHash,
        computedHash: computedHash,
        expectedHash: expectedHash,
      };
    } catch (err) {
      throw new Error(`Integrity verification failed: ${err.message}`);
    }
  }

  /**
   * Delete record from IPFS (unpin from all nodes)
   * Note: IPFS data is immutable, so we unpin it
   */
  async unpinRecord(ipfsHash) {
    try {
      const results = [];

      // Unpin from Pinata
      if (this.pinataApiKey) {
        results.push(
          await this._unpinFromPinata(ipfsHash)
            .then(() => ({
              provider: "Pinata",
              unpinned: true,
            }))
            .catch((err) => ({
              provider: "Pinata",
              unpinned: false,
              error: err.message,
            })),
        );
      }

      // Unpin from local IPFS
      results.push(
        await this._unpinFromLocalIPFS(ipfsHash)
          .then(() => ({
            provider: "Local IPFS",
            unpinned: true,
          }))
          .catch((err) => ({
            provider: "Local IPFS",
            unpinned: false,
            error: err.message,
          })),
      );

      return {
        ipfsHash: ipfsHash,
        unpinResults: results,
        fullyUnpinned: results.every((r) => r.unpinned),
      };
    } catch (err) {
      throw new Error(`Unpin operation failed: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  PINATA METHODS (Production IPFS Pinning Service)
  // ─────────────────────────────────────────────────────────────

  async _uploadToPinata(recordEnvelope) {
    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

    const response = await axios.post(url, recordEnvelope, {
      headers: {
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretKey,
        "Content-Type": "application/json",
      },
    });

    return {
      success: true,
      ipfsHash: response.data.IpfsHash,
      provider: "Pinata",
      timestamp: new Date().toISOString(),
    };
  }

  async _retrieveFromPinata(ipfsHash) {
    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    const response = await axios.get(url, {
      timeout: 30000,
    });

    return response.data;
  }

  async _pinToPinata(ipfsHash) {
    const url = "https://api.pinata.cloud/pinning/pinByHash";

    await axios.post(
      url,
      {
        hashToPin: ipfsHash,
      },
      {
        headers: {
          pinata_api_key: this.pinataApiKey,
          pinata_secret_api_key: this.pinataSecretKey,
        },
      },
    );
  }

  async _unpinFromPinata(ipfsHash) {
    const url = `https://api.pinata.cloud/pinning/unpin/${ipfsHash}`;

    await axios.delete(url, {
      headers: {
        pinata_api_key: this.pinataApiKey,
        pinata_secret_api_key: this.pinataSecretKey,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  LOCAL IPFS NODE METHODS
  // ─────────────────────────────────────────────────────────────

  async _uploadToLocalIPFS(recordEnvelope) {
    const url = `${this.ipfsGateway}/api/v0/add`;

    const response = await axios.post(url, JSON.stringify(recordEnvelope), {
      headers: {
        "Content-Type": "application/octet-stream",
      },
      params: {
        wrap: "true",
        progress: "false",
      },
      timeout: 30000,
    });

    // Parse response (line-delimited JSON)
    const lines = response.data.trim().split("\n");
    const lastLine = JSON.parse(lines[lines.length - 1]);

    return {
      success: true,
      ipfsHash: lastLine.Hash,
      provider: "Local IPFS",
      timestamp: new Date().toISOString(),
    };
  }

  async _retrieveFromLocalIPFS(ipfsHash) {
    const url = `${this.ipfsGateway}/api/v0/cat?arg=${ipfsHash}`;

    const response = await axios.get(url, {
      timeout: 30000,
      responseType: "arraybuffer",
    });

    return JSON.parse(response.data.toString("utf-8"));
  }

  async _pinToLocalIPFS(ipfsHash) {
    const url = `${this.ipfsGateway}/api/v0/pin/add?arg=${ipfsHash}`;

    await axios.post(url, null, {
      timeout: 30000,
    });
  }

  async _unpinFromLocalIPFS(ipfsHash) {
    const url = `${this.ipfsGateway}/api/v0/pin/rm?arg=${ipfsHash}`;

    await axios.post(url, null, {
      timeout: 30000,
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  FALLBACK STORAGE (When IPFS disabled)
  // ─────────────────────────────────────────────────────────────

  _fallbackUpload(encryptedData, patientId, recordType) {
    // Generate pseudo-IPFS hash for testing
    const crypto = require("crypto");
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ patientId, recordType, timestamp: Date.now() }))
      .digest("hex");

    return {
      success: true,
      ipfsHash: `Qm${hash.substring(0, 44)}`,
      provider: "Fallback",
      timestamp: new Date().toISOString(),
      warning: "Using fallback storage. IPFS not configured.",
    };
  }

  _fallbackRetrieve(ipfsHash) {
    throw new Error(
      "Cannot retrieve from fallback storage. Enable IPFS or check database.",
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  UTILITIES
  // ─────────────────────────────────────────────────────────────

  _computeHash(data) {
    const crypto = require("crypto");
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
  }

  /**
   * Generate IPFS gateway URLs for different providers
   */
  getGatewayURLs(ipfsHash) {
    return {
      official: `https://gateway.ipfs.io/ipfs/${ipfsHash}`,
      cloudflare: `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      pinata: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      local: `http://127.0.0.1:8080/ipfs/${ipfsHash}`,
    };
  }
}

module.exports = new IPFSService();
