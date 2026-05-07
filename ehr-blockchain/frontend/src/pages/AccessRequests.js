// src/pages/AccessRequests.js
import React, { useState, useEffect } from "react";
import Sidebar from "../components/shared/Sidebar";
import { useAuth } from "../context/AuthContext";
import { accessAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  X,
  Shield,
  Search,
  Loader,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const STATUS_BADGE = {
  pending: { cls: "badge-warning", icon: Clock, label: "Pending" },
  approved: { cls: "badge-success", icon: CheckCircle, label: "Approved" },
  denied: { cls: "badge-danger", icon: XCircle, label: "Denied" },
  revoked: { cls: "badge-neutral", icon: XCircle, label: "Revoked" },
  expired: { cls: "badge-neutral", icon: Clock, label: "Expired" },
};

export default function AccessRequests() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("incoming");
  const [showRequest, setShowRequest] = useState(false);
  const [granting, setGranting] = useState(null); // request being granted

  const load = async () => {
    try {
      const [inRes, outRes] = await Promise.all([
        accessAPI.getIncoming(),
        accessAPI.getOutgoing(),
      ]);
      setIncoming(inRes.data.requests || []);
      setOutgoing(outRes.data.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grantAccess = async (requestId, durationHours = 72) => {
    try {
      await accessAPI.grant(requestId, { durationHours });
      toast.success(`Access granted for ${durationHours} hours`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed");
    }
    setGranting(null);
  };

  const revokeAccess = async (requestId) => {
    try {
      await accessAPI.revoke(requestId);
      toast.success("Access revoked");
      load();
    } catch (e) {
      toast.error("Failed to revoke");
    }
  };

  if (loading)
    return (
      <div className="app-shell">
        <Sidebar />
        <main
          className="main-content"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </main>
      </div>
    );

  const pendingCount = incoming.filter((r) => r.status === "pending").length;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 28,
          }}
        >
          <div>
            <h1 className="page-title">Access Requests</h1>
            <p className="page-subtitle">
              Manage hospital-to-hospital record access
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowRequest(true)}
          >
            <Plus size={16} /> Request Access
          </button>
        </div>

        {/* Pending alert */}
        {pendingCount > 0 && (
          <div
            style={{
              background: "var(--warning-bg)",
              border: "1px solid rgba(245,166,35,0.2)",
              borderRadius: "var(--radius)",
              padding: "12px 16px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
            }}
          >
            <AlertTriangle
              size={16}
              style={{ color: "var(--warning)", flexShrink: 0 }}
            />
            <span style={{ color: "var(--text-2)" }}>
              <strong style={{ color: "var(--warning)" }}>
                {pendingCount} pending
              </strong>{" "}
              access request{pendingCount > 1 ? "s" : ""} require your approval.
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card warning">
            <div className="stat-icon">
              <Clock size={20} />
            </div>
            <div className="stat-value">
              {incoming.filter((r) => r.status === "pending").length}
            </div>
            <div className="stat-label">Pending Incoming</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <CheckCircle size={20} />
            </div>
            <div className="stat-value">
              {incoming.filter((r) => r.status === "approved").length}
            </div>
            <div className="stat-label">Active Grants</div>
          </div>
          <div className="stat-card accent">
            <div className="stat-icon">
              <ArrowLeftRight size={20} />
            </div>
            <div className="stat-value">
              {outgoing.filter((r) => r.status === "approved").length}
            </div>
            <div className="stat-label">Outgoing Approved</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-icon">
              <Shield size={20} />
            </div>
            <div className="stat-value">
              {[...incoming, ...outgoing].filter((r) => r.isEmergency).length}
            </div>
            <div className="stat-label">Emergency Access</div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 20,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {[
            { key: "incoming", label: `Incoming (${incoming.length})` },
            { key: "outgoing", label: `Outgoing (${outgoing.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "10px 16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                marginBottom: -1,
                color: activeTab === t.key ? "var(--primary)" : "var(--text-2)",
                borderBottom:
                  activeTab === t.key
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Incoming requests */}
        {activeTab === "incoming" && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Incoming Access Requests</h3>
            </div>
            {incoming.length === 0 ? (
              <div className="empty-state">
                <ArrowLeftRight size={40} />
                <p>No incoming requests</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {incoming.map((req) => {
                  const badge =
                    STATUS_BADGE[req.status] || STATUS_BADGE.pending;
                  return (
                    <div
                      key={req._id}
                      style={{
                        background: "var(--bg-3)",
                        border: `1px solid ${req.isEmergency ? "rgba(240,82,82,0.3)" : "var(--border)"}`,
                        borderRadius: "var(--radius)",
                        padding: "16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 600,
                                color: "var(--text-1)",
                                fontSize: 14,
                              }}
                            >
                              {req.requestingHospital?.name ||
                                "Unknown Hospital"}
                            </span>
                            <span className={`badge ${badge.cls}`}>
                              <badge.icon size={12} /> {badge.label}
                            </span>
                            {req.isEmergency && (
                              <span className="badge badge-danger">
                                <AlertTriangle size={12} /> Emergency
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                            Patient ID:{" "}
                            <span
                              style={{
                                color: "var(--primary)",
                                fontFamily: "monospace",
                              }}
                            >
                              {req.patientId}
                            </span>
                          </div>
                          {req.reason && (
                            <div
                              style={{
                                fontSize: 13,
                                color: "var(--text-3)",
                                marginTop: 4,
                              }}
                            >
                              Reason: {req.reason}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-3)",
                              marginTop: 4,
                            }}
                          >
                            Requested{" "}
                            {formatDistanceToNow(new Date(req.createdAt), {
                              addSuffix: true,
                            })}
                            {req.expiresAt && req.status === "approved" && (
                              <span>
                                {" "}
                                · Expires{" "}
                                {format(
                                  new Date(req.expiresAt),
                                  "dd MMM yyyy HH:mm",
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {req.status === "pending" && (
                          <div
                            style={{ display: "flex", gap: 8, flexShrink: 0 }}
                          >
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => setGranting(req)}
                            >
                              <CheckCircle size={14} /> Grant
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => revokeAccess(req._id)}
                            >
                              <XCircle size={14} /> Deny
                            </button>
                          </div>
                        )}
                        {req.status === "approved" && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => revokeAccess(req._id)}
                          >
                            <X size={14} /> Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Outgoing requests */}
        {activeTab === "outgoing" && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Outgoing Access Requests</h3>
            </div>
            {outgoing.length === 0 ? (
              <div className="empty-state">
                <ArrowLeftRight size={40} />
                <p>No outgoing requests</p>
                <button
                  className="btn btn-primary mt-4"
                  onClick={() => setShowRequest(true)}
                >
                  <Plus size={16} /> Request Access
                </button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Home Hospital</th>
                      <th>Patient ID</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Expires</th>
                      <th>Requested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outgoing.map((req) => {
                      const badge =
                        STATUS_BADGE[req.status] || STATUS_BADGE.pending;
                      return (
                        <tr key={req._id}>
                          <td
                            style={{ fontWeight: 500, color: "var(--text-1)" }}
                          >
                            {req.homeHospital?.name || "Unknown"}
                          </td>
                          <td
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              color: "var(--primary)",
                            }}
                          >
                            {req.patientId}
                          </td>
                          <td>
                            {req.isEmergency ? (
                              <span className="badge badge-danger">
                                <AlertTriangle size={12} /> Emergency
                              </span>
                            ) : (
                              <span className="badge badge-neutral">
                                Standard
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${badge.cls}`}>
                              <badge.icon size={12} /> {badge.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, color: "var(--text-3)" }}>
                            {req.expiresAt
                              ? format(new Date(req.expiresAt), "dd MMM HH:mm")
                              : "—"}
                          </td>
                          <td style={{ fontSize: 12, color: "var(--text-3)" }}>
                            {formatDistanceToNow(new Date(req.createdAt), {
                              addSuffix: true,
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Grant Duration Modal */}
        {granting && (
          <div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setGranting(null)}
          >
            <div className="modal" style={{ maxWidth: 400 }}>
              <h2 className="modal-title">Grant Access</h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-2)",
                  marginBottom: 20,
                }}
              >
                Grant{" "}
                <strong style={{ color: "var(--text-1)" }}>
                  {granting.requestingHospital?.name}
                </strong>{" "}
                access to patient{" "}
                <span
                  style={{ color: "var(--primary)", fontFamily: "monospace" }}
                >
                  {granting.patientId}
                </span>
              </p>
              <GrantDurationPicker
                onGrant={(h) => grantAccess(granting._id, h)}
                onCancel={() => setGranting(null)}
              />
            </div>
          </div>
        )}

        {/* New Request Modal */}
        {showRequest && (
          <NewRequestModal
            onClose={() => setShowRequest(false)}
            onSuccess={() => {
              setShowRequest(false);
              load();
            }}
          />
        )}
      </main>
    </div>
  );
}

function GrantDurationPicker({ onGrant, onCancel }) {
  const [hours, setHours] = useState(72);
  const options = [
    { label: "6 hours", value: 6 },
    { label: "24 hours", value: 24 },
    { label: "72 hours", value: 72 },
    { label: "7 days", value: 168 },
    { label: "30 days", value: 720 },
    { label: "Permanent", value: 0 },
  ];
  return (
    <div>
      <div className="form-group">
        <label className="form-label">Access Duration</label>
        <select
          className="form-select"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => onGrant(hours)}
        >
          <CheckCircle size={16} /> Grant Access
        </button>
        <button className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function NewRequestModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    patientId: "",
    hospitalId: "",
    reason: "",
    isEmergency: false,
  });
  const [hospitals, setHospitals] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);

  // Load hospitals on mount
  useEffect(() => {
    loadHospitals("");
  }, []);

  const loadHospitals = async (search = "") => {
    setLoading(true);
    try {
      const res = await accessAPI.getAvailableHospitals(search);
      setHospitals(res.data.hospitals || []);
    } catch (e) {
      console.error("Failed to load hospitals:", e);
      toast.error("Failed to load hospitals");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    loadHospitals(value);
  };

  const selectedHospital = hospitals.find((h) => h._id === form.hospitalId);

  const submit = async () => {
    if (!form.patientId) return toast.error("Patient ID is required");
    if (!form.hospitalId) return toast.error("Hospital is required");
    setSaving(true);
    try {
      await accessAPI.request({
        patientId: form.patientId,
        reason: form.reason,
        isEmergency: form.isEmergency,
      });
      toast.success(
        form.isEmergency
          ? "Emergency access granted (24h)"
          : "Request submitted",
      );
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to submit request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: 500 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2 className="modal-title" style={{ marginBottom: 0 }}>
            Request Record Access
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Hospital Selection */}
        <div className="form-group">
          <label className="form-label">Target Hospital *</label>
          <div style={{ position: "relative" }}>
            <div
              className="form-input"
              onClick={() => setShowHospitalDropdown(!showHospitalDropdown)}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                minHeight: "44px",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {selectedHospital ? (
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>
                      {selectedHospital.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-3)",
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {selectedHospital.address}
                    </div>
                  </div>
                ) : (
                  <span style={{ color: "var(--text-3)" }}>
                    Select a hospital...
                  </span>
                )}
              </div>
              <ChevronIcon isOpen={showHospitalDropdown} />
            </div>

            {showHospitalDropdown && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                  background: "rgba(0,0,0,0.3)",
                }}
                onClick={() => setShowHospitalDropdown(false)}
              />
            )}

            {showHospitalDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: 8,
                  background: "var(--bg-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  maxHeight: "calc(100vh - 300px)",
                  minWidth: "280px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Search input in dropdown */}
                <div
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--bg-1)",
                    flexShrink: 0,
                  }}
                >
                  <input
                    type="text"
                    placeholder="🔍 Search hospitals..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      fontSize: 14,
                      background: "var(--bg-2)",
                      color: "var(--text-1)",
                      transition: "all 0.2s",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--primary)";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(var(--primary-rgb), 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--border)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Hospital list */}
                <div
                  style={{
                    overflowY: "auto",
                    overflowX: "hidden",
                    flex: 1,
                  }}
                >
                  {loading ? (
                    <div
                      style={{
                        padding: "20px 16px",
                        textAlign: "center",
                        color: "var(--text-3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        minHeight: "100px",
                      }}
                    >
                      <Loader
                        size={18}
                        style={{
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      <span>Loading hospitals...</span>
                    </div>
                  ) : hospitals.length === 0 ? (
                    <div
                      style={{
                        padding: "20px 16px",
                        textAlign: "center",
                        color: "var(--text-3)",
                        minHeight: "100px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, marginBottom: 4 }}>
                          No hospitals found
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-4)" }}>
                          Try a different search term
                        </div>
                      </div>
                    </div>
                  ) : (
                    hospitals.map((hosp, idx) => (
                      <div
                        key={hosp._id}
                        onClick={() => {
                          setForm({ ...form, hospitalId: hosp._id });
                          setShowHospitalDropdown(false);
                          setSearchTerm("");
                        }}
                        style={{
                          padding: "12px 16px",
                          borderBottom:
                            idx < hospitals.length - 1
                              ? "1px solid var(--border)"
                              : "none",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          background:
                            selectedHospital?._id === hosp._id
                              ? "var(--primary)"
                              : "transparent",
                          color:
                            selectedHospital?._id === hosp._id
                              ? "white"
                              : "inherit",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedHospital?._id !== hosp._id) {
                            e.currentTarget.style.background = "var(--bg-2)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedHospital?._id !== hosp._id) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 500,
                            marginBottom: 4,
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {selectedHospital?._id === hosp._id && (
                            <span style={{ fontSize: 16 }}>✓</span>
                          )}
                          <span
                            style={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {hosp.name}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.8,
                            marginBottom: 3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          📍 {hosp.address}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            opacity: 0.7,
                          }}
                        >
                          License: <strong>{hosp.licenseNumber}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Patient ID */}
        <div className="form-group">
          <label className="form-label">Patient ID *</label>
          <input
            className="form-input"
            placeholder="PAT-XXXXXX-XXX"
            value={form.patientId}
            onChange={(e) =>
              setForm({ ...form, patientId: e.target.value.toUpperCase() })
            }
          />
        </div>

        {/* Reason */}
        <div className="form-group">
          <label className="form-label">Reason for Access</label>
          <textarea
            className="form-textarea"
            placeholder="Clinical reason for requesting access…"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            style={{ minHeight: 80 }}
          />
        </div>

        {/* Emergency checkbox */}
        <div
          style={{
            background: "var(--danger-bg)",
            border: "1px solid rgba(240,82,82,0.2)",
            borderRadius: "var(--radius)",
            padding: "12px 14px",
            marginBottom: 20,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.isEmergency}
              onChange={(e) =>
                setForm({ ...form, isEmergency: e.target.checked })
              }
              style={{ width: 16, height: 16 }}
            />
            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--danger)",
                  fontSize: 14,
                }}
              >
                Emergency Access
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                Auto-grants 24-hour access. Logged on blockchain. Use only for
                genuine emergencies.
              </div>
            </div>
          </label>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={submit}
            disabled={saving || !form.hospitalId}
          >
            {saving ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} />{" "}
                Submitting…
              </>
            ) : (
              "Submit Request"
            )}
          </button>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronIcon({ isOpen }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      style={{
        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s",
      }}
    >
      <path
        d="M7 8L10 11L13 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
