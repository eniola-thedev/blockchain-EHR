// src/pages/HospitalDashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import { useAuth } from "../context/AuthContext";
import { hospitalsAPI, auditAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  Building2,
  ShieldCheck,
  Activity,
  Clock,
  X,
  ClipboardList,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import AddDoctorModal from "../components/hospital/AddDoctorModal";

const ACTION_COLORS = {
  RECORD_CREATED: "var(--primary)",
  RECORD_VIEWED: "var(--accent)",
  ACCESS_REQUESTED: "var(--warning)",
  ACCESS_GRANTED: "var(--success)",
  ACCESS_REVOKED: "var(--danger)",
  LOGIN: "var(--text-3)",
  PATIENT_REGISTERED: "var(--primary)",
  HOSPITAL_REGISTERED: "var(--accent)",
};

export default function HospitalDashboard() {
  const { user, isRole } = useAuth();
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddDoctor, setShowAddDoctor] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const hosRes = await hospitalsAPI.getAll();
        setHospitals(hosRes.data.hospitals || []);
        if (isRole("admin")) {
          const auditRes = await auditAPI.getLogs({ limit: 50 });
          setAuditLogs(auditRes.data.logs || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const verifyHospital = async (id) => {
    try {
      await hospitalsAPI.verify(id);
      setHospitals((prev) =>
        prev.map((h) => (h._id === id ? { ...h, isVerified: true } : h)),
      );
      toast.success("Hospital verified on blockchain network");
    } catch (e) {
      toast.error("Verification failed");
    }
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "hospitals", label: "Hospitals", icon: Building2 },
    { key: "audit", label: "Audit Trail", icon: ClipboardList },
  ];

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

  const verified = hospitals.filter((h) => h.isVerified).length;
  const unverified = hospitals.filter((h) => !h.isVerified).length;

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
            <h1 className="page-title">
              {isRole("admin") ? "Network Admin" : "Hospital Dashboard"}
            </h1>
            <p className="page-subtitle">
              {user.hospitalId?.name || "MedChain Network"}
            </p>
          </div>
          {isRole("hospital", "admin") && (
            <button
              className="btn btn-primary"
              onClick={() => setShowAddDoctor(true)}
            >
              <UserPlus size={16} /> Add Doctor
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Building2 size={20} />
            </div>
            <div className="stat-value">{hospitals.length}</div>
            <div className="stat-label">Network Hospitals</div>
          </div>
          <div className="stat-card accent">
            <div className="stat-icon">
              <ShieldCheck size={20} />
            </div>
            <div className="stat-value">{verified}</div>
            <div className="stat-label">Verified Nodes</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">
              <Clock size={20} />
            </div>
            <div className="stat-value">{unverified}</div>
            <div className="stat-label">Pending Verification</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-icon">
              <ClipboardList size={20} />
            </div>
            <div className="stat-value">{auditLogs.length}</div>
            <div className="stat-label">Audit Events</div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 24,
            borderBottom: "1px solid var(--border)",
            paddingBottom: 0,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  color:
                    activeTab === t.key ? "var(--primary)" : "var(--text-2)",
                  borderBottom:
                    activeTab === t.key
                      ? "2px solid var(--primary)"
                      : "2px solid transparent",
                  marginBottom: -1,
                  transition: "all 0.15s",
                }}
              >
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>

          {isRole("hospital", "admin") && (
            <button
              className="btn btn-small"
              onClick={() => navigate("/inter-hospital")}
              title="Request medical records from other hospitals"
              style={{ marginRight: 4 }}
            >
              🏥 Inter-Hospital Requests
            </button>
          )}
        </div>

        {/* Overview Tab */}

        {activeTab === "overview" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              {/* Blockchain Status */}
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>
                  Blockchain Network
                </h3>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {[
                    {
                      label: "Network",
                      value: "Ethereum / Hardhat Local",
                      ok: true,
                    },
                    { label: "EHR Contract", value: "Deployed", ok: true },
                    { label: "Hospital Registry", value: "Deployed", ok: true },
                    { label: "IPFS Node", value: "Connected", ok: true },
                    { label: "Encryption", value: "AES-256-GCM", ok: true },
                  ].map((row) => (
                    <div
                      key={row.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ fontSize: 14, color: "var(--text-2)" }}>
                        {row.label}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          color: row.ok ? "var(--primary)" : "var(--danger)",
                        }}
                      >
                        {row.ok ? (
                          <CheckCircle size={14} />
                        ) : (
                          <AlertCircle size={14} />
                        )}{" "}
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>
                  Recent Activity
                </h3>
                {auditLogs.length === 0 ? (
                  <div className="empty-state" style={{ padding: "30px 20px" }}>
                    <ClipboardList size={32} />
                    <p style={{ marginTop: 8 }}>No audit events yet</p>
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {auditLogs.slice(0, 8).map((log, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 0",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background:
                              ACTION_COLORS[log.action] || "var(--text-3)",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: "var(--text-1)" }}>
                            {log.action.replace(/_/g, " ")}
                            {log.patientId && (
                              <span style={{ color: "var(--text-3)" }}>
                                {" "}
                                · {log.patientId}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                            {log.performedBy?.email} ·{" "}
                            {log.createdAt
                              ? format(new Date(log.createdAt), "dd MMM HH:mm")
                              : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hospitals Tab */}
        {activeTab === "hospitals" && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                Registered Hospitals ({hospitals.length})
              </h3>
            </div>
            {hospitals.length === 0 ? (
              <div className="empty-state">
                <Building2 size={40} />
                <p>No hospitals registered</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Hospital</th>
                      <th>Country</th>
                      <th>License</th>
                      <th>Status</th>
                      {isRole("admin") && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {hospitals.map((h) => (
                      <tr key={h._id}>
                        <td style={{ color: "var(--text-1)", fontWeight: 500 }}>
                          {h.name}
                        </td>
                        <td>{h.country || "—"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                          {h.licenseNumber}
                        </td>
                        <td>
                          {h.isVerified ? (
                            <span className="badge badge-success">
                              <CheckCircle size={12} /> Verified
                            </span>
                          ) : (
                            <span className="badge badge-warning">
                              <Clock size={12} /> Pending
                            </span>
                          )}
                        </td>
                        {isRole("admin") && (
                          <td>
                            {!h.isVerified && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => verifyHospital(h._id)}
                              >
                                <ShieldCheck size={14} /> Verify
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === "audit" && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Full Audit Trail</h3>
              <span className="badge badge-accent">
                {auditLogs.length} events
              </span>
            </div>
            {auditLogs.length === 0 ? (
              <div className="empty-state">
                <ClipboardList size={40} />
                <p>No audit logs yet</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Performed By</th>
                      <th>Patient ID</th>
                      <th>Hospital</th>
                      <th>IP Address</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, i) => (
                      <tr key={i}>
                        <td>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 13,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background:
                                  ACTION_COLORS[log.action] || "var(--text-3)",
                                display: "inline-block",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                color:
                                  ACTION_COLORS[log.action] || "var(--text-2)",
                              }}
                            >
                              {log.action.replace(/_/g, " ")}
                            </span>
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {log.performedBy?.email || "System"}
                        </td>
                        <td
                          style={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            color: "var(--primary)",
                          }}
                        >
                          {log.patientId || "—"}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {log.hospitalId?.name || "—"}
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                          {log.ipAddress || "—"}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-3)" }}>
                          {log.createdAt
                            ? format(
                                new Date(log.createdAt),
                                "dd MMM yyyy HH:mm:ss",
                              )
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {showAddDoctor && (
          <AddDoctorModal
            onClose={() => setShowAddDoctor(false)}
            onSuccess={() => {
              setShowAddDoctor(false);
              toast.success("Doctor registered successfully");
            }}
          />
        )}
      </main>
    </div>
  );
}
