import React, { useState, useEffect } from "react";
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
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({ status: "all", page: 1 });
  const [showViewRecordsModal, setShowViewRecordsModal] = useState(false);
  const [recordsModalData, setRecordsModalData] = useState(null);

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

  const fetchIncomingRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/inter-hospital/incoming?status=${filters.status}&page=${filters.page}`,
      );
      setIncomingRequests(response.data.requests || []);
    } catch (error) {
      setMessage("❌ Failed to fetch incoming requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchOutgoingRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/inter-hospital/outgoing?status=${filters.status}&page=${filters.page}`,
      );
      setOutgoingRequests(response.data.requests || []);
    } catch (error) {
      setMessage("❌ Failed to fetch outgoing requests");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!formData.patientId.trim())
      return setMessage("❌ Please enter a patient ID");
    if (!formData.targetHospitalId)
      return setMessage("❌ Please select a target hospital");
    if (!formData.reason.trim())
      return setMessage("❌ Please provide a reason");

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
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      setMessage(
        `❌ ${error.response?.data?.error || "Failed to submit request"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId, patientId) => {
    try {
      setLoading(true);
      await api.post(`/inter-hospital/${requestId}/approve`, { duration: 72 });
      setMessage("✅ Request approved successfully");
      setRecordsModalData({ patientId, requestId });
      setShowViewRecordsModal(true);
      fetchIncomingRequests();
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  const handleRevokeAccess = async (requestId) => {
    if (!window.confirm("Are you sure you want to revoke this access?")) return;
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

              <div className="form-group">
                <label>Patient ID *</label>
                <input
                  type="text"
                  placeholder="Enter patient ID (e.g. PAT001)"
                  value={formData.patientId}
                  onChange={(e) =>
                    setFormData({ ...formData, patientId: e.target.value })
                  }
                  required
                />
                <small>
                  Enter the patient's ID exactly (e.g. PAT001, PAT002)
                </small>
              </div>

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
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
                <small>
                  Choose the hospital that holds the patient's records
                </small>
              </div>

              <div className="form-group">
                <label>Reason for Request *</label>
                <textarea
                  placeholder="Explain why you need these medical records..."
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
                        (o) => o.value,
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

            <div className="hospital-directory">
              <h3>📍 Available Hospitals</h3>
              <div className="hospitals-grid">
                {hospitals.length === 0 ? (
                  <p>No hospitals available</p>
                ) : (
                  hospitals.map((hospital) => (
                    <div key={hospital.id} className="hospital-card">
                      <h4>{hospital.name}</h4>
                      <p>📧 {hospital.email}</p>
                      {hospital.phone && <p>📞 {hospital.phone}</p>}
                      {hospital.address && <p>📍 {hospital.address}</p>}
                      <p>🌍 {hospital.country}</p>
                      <p className="license">
                        License: {hospital.license_number}
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
                <option value="rejected">❌ Denied</option>
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
                    key={request.id}
                    className={`request-card ${request.status}`}
                  >
                    <div className="request-header">
                      <h3>🏥 Request for Patient: {request.patient_id}</h3>
                      <span className={`status-badge ${request.status}`}>
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="request-body">
                      <p>
                        <strong>Patient ID:</strong> {request.patient_id}
                      </p>
                      <p>
                        <strong>Reason:</strong> {request.reason}
                      </p>
                      <p>
                        <strong>Requested:</strong>{" "}
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                      {request.is_emergency && (
                        <p className="emergency">🚨 EMERGENCY REQUEST</p>
                      )}
                    </div>
                    {request.status === "pending" && (
                      <div className="request-actions">
                        <button
                          onClick={() =>
                            handleApproveRequest(request.id, request.patient_id)
                          }
                          className="btn-approve"
                          disabled={loading}
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleDenyRequest(request.id)}
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
                          onClick={() =>
                            navigate(`/records/${request.patient_id}`)
                          }
                          className="btn-view-records"
                          style={{
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          📋 View Records
                        </button>
                        <button
                          onClick={() => handleRevokeAccess(request.id)}
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
                <option value="rejected">❌ Denied</option>
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
                    key={request.id}
                    className={`request-card ${request.status}`}
                  >
                    <div className="request-header">
                      <h3>🏥 Request for Patient: {request.patient_id}</h3>
                      <span className={`status-badge ${request.status}`}>
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="request-body">
                      <p>
                        <strong>Patient ID:</strong> {request.patient_id}
                      </p>
                      <p>
                        <strong>Reason:</strong> {request.reason}
                      </p>
                      <p>
                        <strong>Requested:</strong>{" "}
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                      {request.granted_at && (
                        <p>
                          <strong>Approved:</strong>{" "}
                          {new Date(request.granted_at).toLocaleDateString()}
                        </p>
                      )}
                      {request.expires_at && request.status === "approved" && (
                        <p>
                          <strong>Expires:</strong>{" "}
                          {new Date(request.expires_at).toLocaleDateString()} (
                          {Math.max(
                            0,
                            Math.floor(
                              (new Date(request.expires_at) - new Date()) /
                                (1000 * 60 * 60),
                            ),
                          )}{" "}
                          hours remaining)
                        </p>
                      )}
                      {request.is_emergency && (
                        <p className="emergency">🚨 EMERGENCY REQUEST</p>
                      )}
                    </div>
                    {request.status === "pending" && (
                      <div className="request-status">
                        <p className="info">
                          ⏳ Waiting for hospital to respond
                        </p>
                      </div>
                    )}
                    {request.status === "approved" && (
                      <div className="request-actions">
                        <button
                          onClick={() =>
                            navigate(`/records/${request.patient_id}`)
                          }
                          style={{
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          📋 View Records
                        </button>
                        <button
                          onClick={() => handleRevokeAccess(request.id)}
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
