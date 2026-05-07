// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HospitalRegistry
 * @dev Manages verified hospitals on the MedChain network.
 *      Acts as a source of truth for hospital verification.
 */
contract HospitalRegistry {

    struct Hospital {
        string  name;
        string  licenseNumber;
        string  country;
        address walletAddress;
        uint256 registeredAt;
        bool    verified;
        bool    exists;
    }

    address public admin;
    mapping(address => Hospital) public hospitals;
    address[] public hospitalList;

    event HospitalRegistered(address indexed addr, string name, string licenseNumber);
    event HospitalVerified(address indexed addr);
    event HospitalRevoked(address indexed addr, string reason);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerHospital(
        address hospitalAddr,
        string memory name,
        string memory licenseNumber,
        string memory country
    ) external onlyAdmin {
        require(!hospitals[hospitalAddr].exists, "Already registered");

        hospitals[hospitalAddr] = Hospital({
            name:          name,
            licenseNumber: licenseNumber,
            country:       country,
            walletAddress: hospitalAddr,
            registeredAt:  block.timestamp,
            verified:      true,
            exists:        true
        });

        hospitalList.push(hospitalAddr);
        emit HospitalRegistered(hospitalAddr, name, licenseNumber);
    }

    function revokeHospital(address hospitalAddr, string memory reason)
        external
        onlyAdmin
    {
        require(hospitals[hospitalAddr].exists, "Not registered");
        hospitals[hospitalAddr].verified = false;
        emit HospitalRevoked(hospitalAddr, reason);
    }

    function isVerified(address hospitalAddr) external view returns (bool) {
        return hospitals[hospitalAddr].verified;
    }

    function getHospital(address hospitalAddr)
        external
        view
        returns (Hospital memory)
    {
        require(hospitals[hospitalAddr].exists, "Not found");
        return hospitals[hospitalAddr];
    }

    function getAllHospitals() external view returns (address[] memory) {
        return hospitalList;
    }
}
