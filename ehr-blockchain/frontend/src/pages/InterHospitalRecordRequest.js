/**
 * Inter-Hospital Record Request Component
 * Clear separation between INCOMING (requests TO this hospital)
 * and OUTGOING (requests FROM this hospital)
 */

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import "../styles/interHospitalRequest.css";

const InterHospitalRecordRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("request");
  const [formData, setFormData] = useState({
    patientId: "",
    targetHospitalId: "",
    reason: "",
    recordTypes: ["all"],
    isEmergency: false,
    duration: 72,
  });
  const [hospitals, setHospitals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const formPatientId = selectedPatient?.patientId || formData.patientId;

  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({ status: "all", page: 1 });
  const [showViewRecordsModal, setShowViewRecordsModal] = useState(false);
  const [recordsModalData, setRecordsModalData] = useState(null);

  const searchDebounceRef = useRef(null);
  const searchWrapperRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch verified hospitals
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await api.get("/inter-hospital/hospitals/verified");
        setHospitals(response.data.hospitals || []);
      } catch (error) {
        console.error("Failed to fetch hospitals:", error);
      }
    };
    fetchHospitals();
  }, []);

  // Debounced patient search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(async () => {
      if (
        patientSearch.trim().length === 0 ||
        patientSearch.trim().length >= 2
      ) {
        try {
          setPatientsLoading(true);
          const response = await api.get("/inter-hospital/patients", {
            params: { query: patientSearch.trim(), limit: 50 },
          });
          setPatients(response.data.patients || []);
          setShowSuggestions(true);
        } catch (error) {
          console.error("Failed to fetch patients:", error);
          setPatients([]);
        } finally {
          setPatientsLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(searchDebounceRef.current);
  }, [patientSearch]);

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setFormData((prev) => ({ ...prev, patientId: patient.patientId }));
    setPatientSearch(
      patient.name ||
        `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
    );
    setShowSuggestions(false);
  };

  const handlePatientSearchChange = (e) => {
    setPatientSearch(e.target.value);
    if (selectedPatient) {
      setSelectedPatient(null);
      setFormData((prev) => ({ ...prev, patientId: "" }));
    }
  };

  // Fetch incoming requests
  const fetchIncomingRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/inter-hospital/incoming?status=${filters.status}&page=${filters.page}`,
      );
      setIncomingRequests(response.data.requests || []);
    } catch (error) {
      console.error("Failed to fetch incoming requests:", error);
      setMessage("❌ Failed to fetch incoming requests");
    } finally {
      setLoading(false);
    }
  };

  // Fetch outgoing requests
  const fetchOutgoingRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/inter-hospital/outgoing?status=${filters.status}&page=${filters.page}`,
      );
      setOutgoingRequests(response.data.requests || []);
    } catch (error) {
      console.error("Failed to fetch outgoing requests:", error);
      setMessage("❌ Failed to fetch outgoing requests");
    } finally {
      setLoading(false);
    }
  };

  // Handle request submission
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    // Allow direct submit only if patientId exists.
    // With typeahead, patientId is set when selecting a patient.
    if (!formPatientId?.trim()) {
      setMessage("❌ Please search for and select a patient");
      return;
    }

    // If user typed something but didn't click a suggestion, patientId won't be set.
    // Require an actual selection rather than allowing free text.
    if (!selectedPatient && formPatientId !== formData.patientId) {
      setMessage("❌ Please search for and select a patient");
      return;
    }

    // Ensure formData uses the currently selected/typeahead patient.
    if (formPatientId !== formData.patientId) {
      setFormData((prev) => ({ ...prev, patientId: formPatientId }));
    }

    if (!formData.targetHospitalId) {
      setMessage("❌ Please select a target hospital");
      return;
    }
    if (!formData.reason.trim()) {
      setMessage("❌ Please provide a reason for the request");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/inter-hospital/request", formData);
      setMessage(
        `✅ ${response.data.message} (Request ID: ${response.data.requestId})`,
      );
      setFormData({
        patientId: "",
        targetHospitalId: "",
        reason: "",
        recordTypes: ["all"],
        isEmergency: false,
        duration: 72,
      });
      setSelectedPatient(null);
      setPatientSearch("");
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      setMessage(
        `❌ ${error.response?.data?.error || "Failed to submit request"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle approve request
  const handleApproveRequest = async (requestId, patientId) => {
    try {
      setLoading(true);
      const request = incomingRequests.find((r) => r._id === requestId);
      await api.post(`/inter-hospital/${requestId}/approve`, { duration: 72 });
      setMessage("✅ Request approved successfully");
      setRecordsModalData({
        patientId,
        requestId,
        requestingHospitalName:
          request?.requestingHospital?.name || "Unknown Hospital",
      });
      setShowViewRecordsModal(true);
      fetchIncomingRequests();
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle deny request
  const handleDenyRequest = async (requestId) => {
    const reason = prompt("Enter denial reason (optional):");
    if (reason === null) return;
    try {
      setLoading(true);
      await api.post(`/inter-hospital/${requestId}/deny`, {
        denialReason: reason || "Not specified",
      });
      setMessage("✅ Request denied");
      fetchIncomingRequests();
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle revoke access
  const handleRevokeAccess = async (requestId) => {
    if (window.confirm("Are you sure you want to revoke this access?")) {
      try {
        setLoading(true);
        await api.post(`/inter-hospital/${requestId}/revoke`);
        setMessage("✅ Access revoked successfully");
        fetchOutgoingRequests();
        setTimeout(() => setMessage(""), 5000);
      } catch (error) {
        setMessage(`❌ ${error.response?.data?.error || error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "incoming") fetchIncomingRequests();
    if (tab === "outgoing") fetchOutgoingRequests();
  };

  return (
    <div className="inter-hospital-request">
      <h1>🏥 Inter-Hospital Record Sharing</h1>

      {message && <div className="message">{message}</div>}

      <div className="tabs">
        <button
          className={`tab ${activeTab === "request" ? "active" : ""}`}
          onClick={() => handleTabChange("request")}
        >
          📤 Request Records
        </button>
        <button
          className={`tab ${activeTab === "incoming" ? "active" : ""}`}
          onClick={() => handleTabChange("incoming")}
        >
          📥 Incoming (To Review)
        </button>
        <button
          className={`tab ${activeTab === "outgoing" ? "active" : ""}`}
          onClick={() => handleTabChange("outgoing")}
        >
          📤 Outgoing (Sent)
        </button>
      </div>

      <div className="tab-content">
        {/* ── Request Tab ── */}
        {activeTab === "request" && (
          <div className="request-form-container">
            <form onSubmit={handleSubmitRequest} className="request-form">
              <h2>Request Medical Records from Another Hospital</h2>

              {/* Patient Search — typeahead only, no separate dropdown */}
              <div className="form-group">
                <label>Search Patient *</label>
                <div ref={searchWrapperRef} style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Type patient ID or name (e.g. PAT001 or John Doe)"
                    value={patientSearch}
                    onChange={handlePatientSearchChange}
                    onFocus={() =>
                      patients.length > 0 && setShowSuggestions(true)
                    }
                    autoComplete="off"
                    style={{
                      borderColor: selectedPatient ? "#68d391" : undefined,
                    }}
                  />

                  {patientsLoading && (
                    <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                      🔄 Searching...
                    </div>
                  )}

                  {/* Typeahead suggestions */}
                  {showSuggestions &&
                    !patientsLoading &&
                    patients.length > 0 && (
                      <ul
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          background: "#fff",
                          border: "1px solid #d1d5db",
                          borderRadius: 6,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          maxHeight: 240,
                          overflowY: "auto",
                          zIndex: 100,
                          margin: 0,
                          padding: 0,
                          listStyle: "none",
                        }}
                      >
                        {patients.map((p) => {
                          const displayName =
                            p.name ||
                            `${p.firstName || ""} ${p.lastName || ""}`.trim() ||
                            "(unknown)";
                          return (
                            <li
                              key={p.patientId}
                              onMouseDown={() => handlePatientSelect(p)}
                              style={{
                                padding: "10px 14px",
                                cursor: "pointer",
                                borderBottom: "1px solid #f3f4f6",
                                fontSize: 14,
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#f0f9ff")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                            >
                              <span style={{ fontWeight: 600 }}>
                                {p.patientId}
                              </span>
                              {" — "}
                              {displayName}
                              {p.bloodGroup && (
                                <span
                                  style={{ color: "#6b7280", marginLeft: 8 }}
                                >
                                  · {p.bloodGroup}
                                </span>
                              )}
                              {p.genotype && (
                                <span
                                  style={{ color: "#6b7280", marginLeft: 4 }}
                                >
                                  · {p.genotype}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                  {/* No results state */}
                  {showSuggestions &&
                    !patientsLoading &&
                    patientSearch.trim().length >= 2 &&
                    patients.length === 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          background: "#fff",
                          border: "1px solid #d1d5db",
                          borderRadius: 6,
                          padding: "10px 14px",
                          fontSize: 14,
                          color: "#6b7280",
                          zIndex: 100,
                        }}
                      >
                        No patients found for "{patientSearch}"
                      </div>
                    )}
                </div>

                {/* Selected patient confirmation chip */}
                {selectedPatient && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "#f0fff4",
                      border: "1px solid #68d391",
                      borderRadius: 6,
                      fontSize: 13,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      ✅{" "}
                      <strong>
                        {selectedPatient.name ||
                          `${selectedPatient.firstName} ${selectedPatient.lastName}`}
                      </strong>{" "}
                      ({selectedPatient.patientId})
                      {selectedPatient.bloodGroup &&
                        ` · Blood: ${selectedPatient.bloodGroup}`}
                      {selectedPatient.genotype &&
                        ` · Genotype: ${selectedPatient.genotype}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatient(null);
                        setFormData((prev) => ({ ...prev, patientId: "" }));
                        setPatientSearch("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#e53e3e",
                        fontWeight: 600,
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                <small>
                  All patients registered across the network are searchable
                </small>
              </div>

              {/* Target Hospital */}
              <div className="form-group">
                <label>Request Records FROM Hospital *</label>
                <select
                  value={formData.targetHospitalId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetHospitalId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">-- Select Hospital --</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital._id} value={hospital._id}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
                <small>
                  Choose the hospital that holds the patient's records
                </small>
              </div>

              {/* Reason */}
              <div className="form-group">
                <label>Reason for Request *</label>
                <textarea
                  placeholder="Explain why you need these medical records (e.g., Patient is being treated for acute condition, needs continuation of care, etc.)"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  required
                  rows="4"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Record Types</label>
                  <select
                    multiple
                    value={formData.recordTypes}
                    onChange={(e) => {
                      const selected = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value,
                      );
                      setFormData({
                        ...formData,
                        recordTypes: selected.length > 0 ? selected : ["all"],
                      });
                    }}
                  >
                    <option value="all">All Records</option>
                    <option value="diagnosis">Diagnosis</option>
                    <option value="prescription">Prescriptions</option>
                    <option value="lab_result">Lab Results</option>
                    <option value="imaging">Imaging</option>
                    <option value="vaccination">Vaccinations</option>
                  </select>
                  <small>Hold Ctrl to select multiple</small>
                </div>

                <div className="form-group">
                  <label>Access Duration (hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: parseInt(e.target.value) || 72,
                      })
                    }
                  />
                  <small>Max 30 days (720 hours)</small>
                </div>
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isEmergency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isEmergency: e.target.checked,
                      })
                    }
                  />
                  🚨 Emergency Access (Auto-approved for urgent patient care)
                </label>
              </div>

              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "⏳ Submitting..." : "📤 Submit Request"}
              </button>
            </form>

            {/* Hospital Directory */}
            <div className="hospital-directory">
              <h3>📍 Available Hospitals</h3>
              <div className="hospitals-grid">
                {hospitals.length === 0 ? (
                  <p>No hospitals available</p>
                ) : (
                  hospitals.map((hospital) => (
                    <div key={hospital._id} className="hospital-card">
                      <h4>{hospital.name}</h4>
                      <p>📧 {hospital.email}</p>
                      {hospital.phone && <p>📞 {hospital.phone}</p>}
                      {hospital.address && <p>📍 {hospital.address}</p>}
                      <p>🌍 {hospital.country}</p>
                      <p className="license">
                        License: {hospital.licenseNumber}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Incoming Requests Tab ── */}
        {activeTab === "incoming" && (
          <div className="requests-container">
            <h2>📥 Incoming Requests (Action Required)</h2>
            <div className="filter-bar">
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value, page: 1 })
                }
              >
                <option value="all">All Status</option>
                <option value="pending">⏳ Pending</option>
                <option value="approved">✅ Approved</option>
                <option value="denied">❌ Denied</option>
                <option value="revoked">🔒 Revoked</option>
              </select>
            </div>

            {loading ? (
              <p className="loading">Loading requests...</p>
            ) : incomingRequests.length === 0 ? (
              <p className="empty">No incoming requests found</p>
            ) : (
              <div className="requests-list">
                {incomingRequests.map((request) => (
                  <div
                    key={request._id}
                    className={`request-card ${request.status}`}
                  >
                    <div className="request-header">
                      <h3>
                        🏥{" "}
                        {request.requestingHospital?.name || "Unknown Hospital"}
                      </h3>
                      <span className={`status-badge ${request.status}`}>
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="request-body">
                      <p>
                        <strong>Patient:</strong> {request.patientId}
                      </p>
                      {request.patient && (
                        <>
                          <p>
                            <strong>Name:</strong> {request.patient.name}
                          </p>
                          <p>
                            <strong>Blood Group:</strong>{" "}
                            {request.patient.bloodGroup || "N/A"}
                          </p>
                          <p>
                            <strong>Genotype:</strong>{" "}
                            {request.patient.genotype || "N/A"}
                          </p>
                        </>
                      )}
                      <p>
                        <strong>Reason:</strong> {request.reason}
                      </p>
                      <p>
                        <strong>Records Requested:</strong>{" "}
                        {request.recordTypes?.join(", ") || "all"}
                      </p>
                      <p>
                        <strong>Requested:</strong>{" "}
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                      {request.isEmergency && (
                        <p className="emergency">🚨 EMERGENCY REQUEST</p>
                      )}
                    </div>
                    {request.status === "pending" && (
                      <div className="request-actions">
                        <button
                          onClick={() =>
                            handleApproveRequest(request._id, request.patientId)
                          }
                          className="btn-approve"
                          disabled={loading}
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleDenyRequest(request._id)}
                          className="btn-deny"
                          disabled={loading}
                        >
                          ❌ Deny
                        </button>
                      </div>
                    )}
                    {request.status === "approved" && (
                      <div className="request-actions">
                        <button
                          onClick={() => handleRevokeAccess(request._id)}
                          className="btn-revoke"
                          disabled={loading}
                        >
                          🔒 Revoke Access
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Outgoing Requests Tab ── */}
        {activeTab === "outgoing" && (
          <div className="requests-container">
            <h2>📤 Outgoing Requests (Requests We Sent)</h2>
            <div className="filter-bar">
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value, page: 1 })
                }
              >
                <option value="all">All Status</option>
                <option value="pending">⏳ Pending</option>
                <option value="approved">✅ Approved</option>
                <option value="denied">❌ Denied</option>
                <option value="revoked">🔒 Revoked</option>
              </select>
            </div>

            {loading ? (
              <p className="loading">Loading requests...</p>
            ) : outgoingRequests.length === 0 ? (
              <p className="empty">No outgoing requests found</p>
            ) : (
              <div className="requests-list">
                {outgoingRequests.map((request) => (
                  <div
                    key={request._id}
                    className={`request-card ${request.status}`}
                  >
                    <div className="request-header">
                      <h3>
                        🏥 {request.targetHospital?.name || "Unknown Hospital"}
                      </h3>
                      <span className={`status-badge ${request.status}`}>
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="request-body">
                      <p>
                        <strong>Patient:</strong> {request.patientId}
                        {request.patientName ? ` (${request.patientName})` : ""}
                      </p>
                      <p>
                        <strong>Reason:</strong> {request.reason}
                      </p>
                      <p>
                        <strong>Records Requested:</strong>{" "}
                        {request.recordTypes?.join(", ") || "all"}
                      </p>
                      <p>
                        <strong>Requested:</strong>{" "}
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                      {request.grantedAt && (
                        <p>
                          <strong>Approved:</strong>{" "}
                          {new Date(request.grantedAt).toLocaleDateString()}
                        </p>
                      )}
                      {request.expiresAt && request.status === "approved" && (
                        <>
                          <p>
                            <strong>Expires:</strong>{" "}
                            {new Date(request.expiresAt).toLocaleDateString()}
                          </p>
                          <p className="remaining">
                            (
                            {Math.max(
                              0,
                              Math.floor(
                                (new Date(request.expiresAt) - new Date()) /
                                  (1000 * 60 * 60),
                              ),
                            )}{" "}
                            hours remaining)
                          </p>
                        </>
                      )}
                    </div>
                    {request.status === "pending" && (
                      <div className="request-status">
                        <p className="info">
                          ⏳ Waiting for {request.targetHospital?.name} to
                          respond
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── View Records Modal ── */}
        {showViewRecordsModal && recordsModalData && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-header">
                <h3>✅ Access Approved!</h3>
              </div>
              <div className="modal-content">
                <p>
                  <strong>Patient ID:</strong> {recordsModalData.patientId}
                </p>
                <p>
                  <strong>Requested by:</strong>{" "}
                  {recordsModalData.requestingHospitalName}
                </p>
                <p>
                  <strong>Access granted at:</strong>{" "}
                  {new Date().toLocaleDateString()}{" "}
                  {new Date().toLocaleTimeString()}
                </p>
                <p className="modal-subtitle">
                  You can now view the patient's medical records.
                </p>
              </div>
              <div className="modal-buttons">
                <button
                  className="btn-primary"
                  onClick={() => {
                    navigate(`/records/${recordsModalData.patientId}`);
                    setShowViewRecordsModal(false);
                  }}
                >
                  📋 View Records
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowViewRecordsModal(false)}
                >
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterHospitalRecordRequest;
