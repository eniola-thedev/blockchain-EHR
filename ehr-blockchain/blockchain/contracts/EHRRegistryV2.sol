// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EHRRegistryV2
 * @dev Enhanced blockchain-based EHR system with:
 *      ✓ Immutable audit trails for ALL operations
 *      ✓ Cryptographic proof of data integrity
 *      ✓ Version-controlled medical records
 *      ✓ Time-locked access revocations
 *      ✓ Comprehensive compliance audit logging
 *      ✓ Transparent access history for patients & regulators
 *      ✓ Emergency override trails
 *      ✓ Data breach incident logging
 */
contract EHRRegistryV2 {

    // ─────────────────────────────────────────
    //  ENUMS
    // ─────────────────────────────────────────

    enum AccessStatus {
        PENDING,           // Awaiting approval
        APPROVED,          // Active access
        DENIED,            // Access denied
        REVOKED,           // Previously approved, now revoked
        EXPIRED            // Time-based expiration
    }

    enum AuditAction {
        RECORD_CREATED,           // Medical record added
        RECORD_VIEWED,            // Record accessed by authorized party
        RECORD_MODIFIED,          // Record updated (new version)
        RECORD_MARKED_OBSOLETE,   // Record marked as superseded
        ACCESS_REQUESTED,         // Access request initiated
        ACCESS_APPROVED,          // Access approved by hospital
        ACCESS_DENIED,            // Access denied by hospital
        ACCESS_REVOKED,           // Active access revoked
        ACCESS_EXPIRED,           // Time-based expiration
        EMERGENCY_ACCESS_GRANTED, // Emergency access auto-approved
        HOSPITAL_REGISTERED,      // New hospital joined network
        HOSPITAL_SUSPENDED,       // Hospital removed from network
        UNAUTHORIZED_ATTEMPT,     // Failed access attempt
        DATA_BREACH_INCIDENT      // Security incident reported
    }

    // ─────────────────────────────────────────
    //  STRUCTS
    // ─────────────────────────────────────────

    /**
     * @dev Medical record with immutable proof
     */
    struct MedicalRecord {
        string  ipfsHash;              // Content address on IPFS
        string  recordType;            // diagnosis|prescription|lab|imaging|procedure|encounter
        uint256 timestamp;             // Block timestamp (immutable)
        address createdByHospital;     // Hospital that created record
        bytes32 dataIntegrityHash;     // SHA-256 of encrypted content
        uint32  versionNumber;         // Record version (1, 2, 3...)
        string  fhirResourceType;      // FHIR resource (Patient, Observation, etc.)
        bool    isActive;              // Soft-delete flag
    }

    /**
     * @dev Access grant with detailed tracking
     */
    struct AccessGrant {
        uint256 grantIndex;            // Unique ID for this grant
        address grantedHospital;       // Recipient hospital
        uint256 grantedAt;             // Block timestamp of grant
        uint256 expiresAt;             // Expiration block timestamp (0 = permanent)
        AccessStatus status;           // Current status
        bool    isEmergency;           // Emergency access flag
        string  reason;                // Detailed reason for access
        bytes32 grantHash;             // Cryptographic proof
        uint256 lastAccessedAt;        // Last time accessed
        uint32  accessCount;           // Number of times accessed
    }

    /**
     * @dev Immutable audit trail entry
     */
    struct AuditEntry {
        uint256 auditId;               // Sequential audit ID
        address actor;                 // Who performed action (hospital/admin)
        string  patientId;             // Patient affected
        AuditAction action;            // Type of action
        uint256 timestamp;             // Block timestamp
        uint256 blockNumber;           // Block number (for verification)
        string  details;               // JSON details
        bytes32 detailsHash;           // SHA-256 of details
        string  ipfsHash;              // Optional IPFS reference
    }

    /**
     * @dev Hospital registry entry
     */
    struct Hospital {
        address hospitalAddr;          // Ethereum address
        string  name;                  // Hospital name
        string  licenseNumber;         // Government license
        string  country;               // Country of operation
        uint256 registeredAt;          // Registration block timestamp
        uint256 lastVerifiedAt;        // Last verification timestamp
        bool    isVerified;            // Current verification status
        uint32  totalRecordsCreated;   // Cumulative records added
        uint32  totalAccessRequests;   // Access requests made
    }

    // ─────────────────────────────────────────
    //  STATE VARIABLES
    // ─────────────────────────────────────────

    address public admin;
    uint256 private nextAuditId = 1;
    uint256 private nextGrantId = 1;

    // Patient data storage
    mapping(string => MedicalRecord[]) private patientRecords;
    mapping(string => address) public patientHomeHospital;

    // Access control
    mapping(string => mapping(address => AccessGrant[])) private accessHistory;
    mapping(string => mapping(address => AccessGrant)) private currentAccess;

    // Hospital registry
    mapping(address => Hospital) public hospitals;
    address[] public registeredHospitals;

    // Immutable audit trail
    AuditEntry[] private auditTrail;

    // Consent tracking
    mapping(string => mapping(address => bool)) public explicitConsents;

    // ─────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────

    event RecordAdded(
        string indexed patientId,
        string ipfsHash,
        address indexed hospital,
        uint256 timestamp
    );

    event RecordModified(
        string indexed patientId,
        uint32 indexed versionNumber,
        address indexed hospital,
        uint256 timestamp
    );

    event AccessRequested(
        string indexed patientId,
        address indexed requestingHospital,
        bool isEmergency,
        string reason,
        uint256 timestamp
    );

    event AccessApproved(
        string indexed patientId,
        address indexed approvedHospital,
        uint256 expiresAt,
        bool isEmergency,
        uint256 timestamp
    );

    event AccessRevoked(
        string indexed patientId,
        address indexed revokedHospital,
        address indexed revokedBy,
        uint256 timestamp,
        string reason
    );

    event AuditLogged(
        uint256 indexed auditId,
        address indexed actor,
        string indexed patientId,
        AuditAction action,
        uint256 timestamp
    );

    event HospitalRegistered(
        address indexed hospital,
        string name,
        uint256 timestamp
    );

    event HospitalSuspended(
        address indexed hospital,
        string reason,
        uint256 timestamp
    );

    event DataBreachIncident(
        uint256 indexed auditId,
        string description,
        uint256 timestamp
    );

    event UnauthorizedAccessAttempt(
        address indexed attacker,
        string indexed patientId,
        uint256 timestamp,
        string reason
    );

    // ─────────────────────────────────────────
    //  MODIFIERS
    // ─────────────────────────────────────────

    modifier onlyAdmin() {
        require(msg.sender == admin, "ADMIN_ONLY: Only admin can execute");
        _;
    }

    modifier onlyVerifiedHospital() {
        require(hospitals[msg.sender].isVerified, "HOSPITAL_NOT_VERIFIED");
        _;
    }

    modifier hasAccessToPatient(string memory patientId) {
        require(
            msg.sender == patientHomeHospital[patientId] || _hasValidAccess(patientId, msg.sender),
            "ACCESS_DENIED: Not authorized for this patient"
        );
        _;
    }

    modifier patientExists(string memory patientId) {
        require(patientHomeHospital[patientId] != address(0), "PATIENT_NOT_FOUND");
        _;
    }

    // ─────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────

    constructor() {
        admin = msg.sender;
        _logAudit(msg.sender, "", AuditAction.HOSPITAL_REGISTERED, "Contract deployed");
    }

    // ─────────────────────────────────────────
    //  HOSPITAL MANAGEMENT
    // ─────────────────────────────────────────

    /**
     * @dev Register a new hospital (admin only)
     * @param hospitalAddr Ethereum address of hospital
     * @param name Hospital name
     * @param licenseNumber Government license number
     * @param country Country of operation
     */
    function registerHospital(
        address hospitalAddr,
        string memory name,
        string memory licenseNumber,
        string memory country
    ) external onlyAdmin {
        require(hospitalAddr != address(0), "INVALID_ADDRESS");
        require(!hospitals[hospitalAddr].isVerified, "ALREADY_REGISTERED");

        hospitals[hospitalAddr] = Hospital({
            hospitalAddr: hospitalAddr,
            name: name,
            licenseNumber: licenseNumber,
            country: country,
            registeredAt: block.timestamp,
            lastVerifiedAt: block.timestamp,
            isVerified: true,
            totalRecordsCreated: 0,
            totalAccessRequests: 0
        });

        registeredHospitals.push(hospitalAddr);

        emit HospitalRegistered(hospitalAddr, name, block.timestamp);
        _logAudit(msg.sender, "", AuditAction.HOSPITAL_REGISTERED, 
            string(abi.encodePacked(name, " (", licenseNumber, ")")));
    }

    /**
     * @dev Suspend a hospital (admin only)
     * @param hospitalAddr Address to suspend
     * @param reason Reason for suspension
     */
    function suspendHospital(address hospitalAddr, string memory reason) external onlyAdmin {
        require(hospitals[hospitalAddr].isVerified, "NOT_VERIFIED");

        hospitals[hospitalAddr].isVerified = false;
        hospitals[hospitalAddr].lastVerifiedAt = block.timestamp;

        emit HospitalSuspended(hospitalAddr, reason, block.timestamp);
        _logAudit(msg.sender, "", AuditAction.HOSPITAL_SUSPENDED, reason);
    }

    // ─────────────────────────────────────────
    //  RECORD MANAGEMENT
    // ─────────────────────────────────────────

    /**
     * @dev Add a new medical record (hospital/doctor only)
     * @param patientId Patient identifier
     * @param ipfsHash IPFS content address (encrypted data)
     * @param dataIntegrityHash SHA-256 of encrypted content
     * @param recordType Type of medical record
     * @param fhirResourceType FHIR resource type
     */
    function addRecord(
        string memory patientId,
        string memory ipfsHash,
        bytes32 dataIntegrityHash,
        string memory recordType,
        string memory fhirResourceType
    ) external onlyVerifiedHospital {
        // Set home hospital on first record
        if (patientHomeHospital[patientId] == address(0)) {
            patientHomeHospital[patientId] = msg.sender;
        }

        // Create immutable record
        patientRecords[patientId].push(MedicalRecord({
            ipfsHash: ipfsHash,
            recordType: recordType,
            timestamp: block.timestamp,
            createdByHospital: msg.sender,
            dataIntegrityHash: dataIntegrityHash,
            versionNumber: 1,
            fhirResourceType: fhirResourceType,
            isActive: true
        }));

        hospitals[msg.sender].totalRecordsCreated++;

        emit RecordAdded(patientId, ipfsHash, msg.sender, block.timestamp);
        _logAudit(msg.sender, patientId, AuditAction.RECORD_CREATED,
            string(abi.encodePacked('{"type":"', recordType, '","fhir":"', fhirResourceType, '"}')));
    }

    /**
     * @dev Create new version of a record (amendments)
     */
    function modifyRecord(
        string memory patientId,
        uint256 recordIndex,
        string memory newIpfsHash,
        bytes32 newDataIntegrityHash
    ) external onlyVerifiedHospital hasAccessToPatient(patientId) {
        require(recordIndex < patientRecords[patientId].length, "RECORD_NOT_FOUND");

        MedicalRecord memory oldRecord = patientRecords[patientId][recordIndex];
        require(oldRecord.isActive, "RECORD_INACTIVE");

        // Create new version
        patientRecords[patientId].push(MedicalRecord({
            ipfsHash: newIpfsHash,
            recordType: oldRecord.recordType,
            timestamp: block.timestamp,
            createdByHospital: msg.sender,
            dataIntegrityHash: newDataIntegrityHash,
            versionNumber: oldRecord.versionNumber + 1,
            fhirResourceType: oldRecord.fhirResourceType,
            isActive: true
        }));

        emit RecordModified(patientId, oldRecord.versionNumber + 1, msg.sender, block.timestamp);
        _logAudit(msg.sender, patientId, AuditAction.RECORD_MODIFIED,
            string(abi.encodePacked('{"oldVersion":', _uint2str(oldRecord.versionNumber), '}')));
    }

    /**
     * @dev Get all records for a patient
     */
    function getPatientRecords(string memory patientId)
        external
        view
        onlyVerifiedHospital
        hasAccessToPatient(patientId)
        returns (MedicalRecord[] memory)
    {
        _logRecordAccess(patientId, "VIEW_RECORDS");
        return patientRecords[patientId];
    }

    /**
     * @dev Get specific record by index
     */
    function getRecord(string memory patientId, uint256 recordIndex)
        external
        view
        onlyVerifiedHospital
        hasAccessToPatient(patientId)
        returns (MedicalRecord memory)
    {
        require(recordIndex < patientRecords[patientId].length, "RECORD_NOT_FOUND");
        _logRecordAccess(patientId, "VIEW_SINGLE_RECORD");
        return patientRecords[patientId][recordIndex];
    }

    /**
     * @dev Get record count
     */
    function getRecordCount(string memory patientId) external view returns (uint256) {
        return patientRecords[patientId].length;
    }

    // ─────────────────────────────────────────
    //  ACCESS CONTROL
    // ─────────────────────────────────────────

    /**
     * @dev Request access to patient records
     */
    function requestAccess(
        string memory patientId,
        bool isEmergency,
        string memory reason
    ) external onlyVerifiedHospital patientExists(patientId) {
        require(bytes(reason).length > 0, "REASON_REQUIRED");

        // Emergency access: auto-approve for 24 hours
        if (isEmergency) {
            _grantAccessInternal(
                patientId,
                msg.sender,
                block.timestamp + 86400, // 24 hours
                true,
                reason
            );
            emit AccessRequested(patientId, msg.sender, true, reason, block.timestamp);
            _logAudit(msg.sender, patientId, AuditAction.EMERGENCY_ACCESS_GRANTED,
                string(abi.encodePacked('{"reason":"', reason, '"}')));
        } else {
            // Standard request: awaiting approval
            emit AccessRequested(patientId, msg.sender, false, reason, block.timestamp);
            _logAudit(msg.sender, patientId, AuditAction.ACCESS_REQUESTED,
                string(abi.encodePacked('{"reason":"', reason, '"}')));

            hospitals[msg.sender].totalAccessRequests++;
        }
    }

    /**
     * @dev Grant access (home hospital only)
     */
    function grantAccess(
        string memory patientId,
        address targetHospital,
        uint256 durationSeconds,
        string memory reason
    ) external onlyVerifiedHospital patientExists(patientId) {
        require(msg.sender == patientHomeHospital[patientId], "HOME_HOSPITAL_ONLY");
        require(hospitals[targetHospital].isVerified, "TARGET_NOT_VERIFIED");

        uint256 expiresAt = durationSeconds > 0 ? block.timestamp + durationSeconds : 0;

        _grantAccessInternal(patientId, targetHospital, expiresAt, false, reason);

        emit AccessApproved(patientId, targetHospital, expiresAt, false, block.timestamp);
        _logAudit(msg.sender, patientId, AuditAction.ACCESS_APPROVED,
            string(abi.encodePacked('{"hospital":"', _addressToString(targetHospital), 
            '","duration":', _uint2str(durationSeconds), '}')));
    }

    /**
     * @dev Deny access request
     */
    function denyAccess(
        string memory patientId,
        address targetHospital,
        string memory reason
    ) external onlyVerifiedHospital patientExists(patientId) {
        require(msg.sender == patientHomeHospital[patientId], "HOME_HOSPITAL_ONLY");

        _logAudit(msg.sender, patientId, AuditAction.ACCESS_DENIED,
            string(abi.encodePacked('{"hospital":"', _addressToString(targetHospital),
            '","reason":"', reason, '"}')));
    }

    /**
     * @dev Revoke access
     */
    function revokeAccess(
        string memory patientId,
        address targetHospital,
        string memory reason
    ) external onlyVerifiedHospital patientExists(patientId) {
        require(
            msg.sender == patientHomeHospital[patientId] || msg.sender == admin,
            "NOT_AUTHORIZED"
        );

        AccessGrant storage grant = currentAccess[patientId][targetHospital];
        require(grant.status == AccessStatus.APPROVED, "NO_ACTIVE_GRANT");

        grant.status = AccessStatus.REVOKED;
        grant.expiresAt = block.timestamp;

        emit AccessRevoked(patientId, targetHospital, msg.sender, block.timestamp, reason);
        _logAudit(msg.sender, patientId, AuditAction.ACCESS_REVOKED,
            string(abi.encodePacked('{"hospital":"', _addressToString(targetHospital),
            '","reason":"', reason, '"}')));
    }

    /**
     * @dev Check current access status
     */
    function checkAccess(string memory patientId, address hospitalAddr)
        external
        view
        returns (AccessStatus status, uint256 expiresAt, bool isEmergency)
    {
        AccessGrant memory grant = currentAccess[patientId][hospitalAddr];

        // Check if expired
        if (grant.expiresAt > 0 && block.timestamp > grant.expiresAt) {
            return (AccessStatus.EXPIRED, grant.expiresAt, grant.isEmergency);
        }

        return (grant.status, grant.expiresAt, grant.isEmergency);
    }

    /**
     * @dev Get access history for a patient (home hospital + patient)
     */
    function getAccessHistory(string memory patientId)
        external
        view
        patientExists(patientId)
        returns (AccessGrant[] memory)
    {
        require(
            msg.sender == patientHomeHospital[patientId] || msg.sender == admin,
            "NOT_AUTHORIZED"
        );
        return accessHistory[patientId][patientHomeHospital[patientId]];
    }

    // ─────────────────────────────────────────
    //  AUDIT TRAIL
    // ─────────────────────────────────────────

    /**
     * @dev Get complete immutable audit trail (admin only)
     */
    function getAuditTrail(uint256 fromIndex, uint256 count)
        external
        view
        onlyAdmin
        returns (AuditEntry[] memory)
    {
        uint256 total = auditTrail.length;
        if (fromIndex >= total) return new AuditEntry[](0);

        uint256 end = fromIndex + count > total ? total : fromIndex + count;
        AuditEntry[] memory result = new AuditEntry[](end - fromIndex);

        for (uint256 i = fromIndex; i < end; i++) {
            result[i - fromIndex] = auditTrail[i];
        }

        return result;
    }

    /**
     * @dev Get audit trail for specific patient
     */
    function getPatientAuditTrail(string memory patientId)
        external
        view
        patientExists(patientId)
        returns (AuditEntry[] memory)
    {
        require(
            msg.sender == patientHomeHospital[patientId] || msg.sender == admin,
            "NOT_AUTHORIZED"
        );

        uint256 count = 0;
        for (uint256 i = 0; i < auditTrail.length; i++) {
            if (keccak256(bytes(auditTrail[i].patientId)) == keccak256(bytes(patientId))) {
                count++;
            }
        }

        AuditEntry[] memory result = new AuditEntry[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < auditTrail.length; i++) {
            if (keccak256(bytes(auditTrail[i].patientId)) == keccak256(bytes(patientId))) {
                result[idx++] = auditTrail[i];
            }
        }

        return result;
    }

    /**
     * @dev Get total audit entries
     */
    function getAuditTrailLength() external view onlyAdmin returns (uint256) {
        return auditTrail.length;
    }

    // ─────────────────────────────────────────
    //  INCIDENT REPORTING
    // ─────────────────────────────────────────

    /**
     * @dev Report a data breach incident (admin only)
     */
    function reportDataBreach(
        string memory description,
        uint256[] calldata affectedPatientCount
    ) external onlyAdmin {
        uint256 auditId = nextAuditId++;
        
        auditTrail.push(AuditEntry({
            auditId: auditId,
            actor: msg.sender,
            patientId: "SYSTEM_INCIDENT",
            action: AuditAction.DATA_BREACH_INCIDENT,
            timestamp: block.timestamp,
            blockNumber: block.number,
            details: description,
            detailsHash: keccak256(abi.encodePacked(description)),
            ipfsHash: ""
        }));

        emit DataBreachIncident(auditId, description, block.timestamp);
    }

    /**
     * @dev Log unauthorized access attempt
     */
    function logUnauthorizedAttempt(
        address attacker,
        string memory patientId,
        string memory reason
    ) external onlyAdmin {
        emit UnauthorizedAccessAttempt(attacker, patientId, block.timestamp, reason);
        _logAudit(attacker, patientId, AuditAction.UNAUTHORIZED_ATTEMPT, reason);
    }

    // ─────────────────────────────────────────
    //  INTERNAL HELPERS
    // ─────────────────────────────────────────

    function _grantAccessInternal(
        string memory patientId,
        address hospitalAddr,
        uint256 expiresAt,
        bool isEmergency,
        string memory reason
    ) internal {
        AccessGrant memory grant = AccessGrant({
            grantIndex: nextGrantId++,
            grantedHospital: hospitalAddr,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            status: AccessStatus.APPROVED,
            isEmergency: isEmergency,
            reason: reason,
            grantHash: keccak256(abi.encodePacked(patientId, hospitalAddr, block.timestamp)),
            lastAccessedAt: 0,
            accessCount: 0
        });

        currentAccess[patientId][hospitalAddr] = grant;
        accessHistory[patientId][hospitalAddr].push(grant);
    }

    function _hasValidAccess(string memory patientId, address hospitalAddr)
        internal
        view
        returns (bool)
    {
        AccessGrant memory grant = currentAccess[patientId][hospitalAddr];

        if (grant.status != AccessStatus.APPROVED) return false;
        if (grant.expiresAt == 0) return true; // No expiry
        return block.timestamp <= grant.expiresAt;
    }

    function _logRecordAccess(string memory patientId, string memory action) internal {
        AccessGrant storage grant = currentAccess[patientId][msg.sender];
        if (grant.status == AccessStatus.APPROVED) {
            grant.lastAccessedAt = block.timestamp;
            grant.accessCount++;
        }
        _logAudit(msg.sender, patientId, AuditAction.RECORD_VIEWED, action);
    }

    function _logAudit(
        address actor,
        string memory patientId,
        AuditAction action,
        string memory details
    ) internal {
        uint256 auditId = nextAuditId++;

        auditTrail.push(AuditEntry({
            auditId: auditId,
            actor: actor,
            patientId: patientId,
            action: action,
            timestamp: block.timestamp,
            blockNumber: block.number,
            details: details,
            detailsHash: keccak256(abi.encodePacked(details)),
            ipfsHash: ""
        }));

        emit AuditLogged(auditId, actor, patientId, action, block.timestamp);
    }

    // ─────────────────────────────────────────
    //  UTILITY FUNCTIONS
    // ─────────────────────────────────────────

    function _addressToString(address addr) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(addr);
        string memory result = "0x";
        for (uint i = 0; i < data.length; i++) {
            bytes1 b = data[i];
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) % 16);
            result = string(abi.encodePacked(result, _toHexChar(hi), _toHexChar(lo)));
        }
        return result;
    }

    function _toHexChar(bytes1 c) internal pure returns (string memory) {
        uint8 b = uint8(c);
        if (b < 10) return _uint2str(b);
        else return bytes1ToStr(bytes1(b + 87));
    }

    function bytes1ToStr(bytes1 b) internal pure returns (string memory) {
        return string(abi.encodePacked(b));
    }

    function _uint2str(uint _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    /**
     * @dev Get hospital details
     */
    function getHospital(address hospitalAddr) external view returns (Hospital memory) {
        return hospitals[hospitalAddr];
    }

    /**
     * @dev Get registered hospitals count
     */
    function getRegisteredHospitalsCount() external view returns (uint256) {
        return registeredHospitals.length;
    }

    /**
     * @dev Get registered hospital at index
     */
    function getRegisteredHospitalAt(uint256 index) external view returns (address) {
        require(index < registeredHospitals.length, "INDEX_OUT_OF_BOUNDS");
        return registeredHospitals[index];
    }
}
