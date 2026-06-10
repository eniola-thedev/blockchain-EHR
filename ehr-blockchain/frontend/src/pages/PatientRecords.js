// src/pages/PatientRecords.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import { recordsAPI, auditAPI } from "../services/api";
import {
  ArrowLeft,
  FileText,
  Shield,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

const safeFormat = (dateStr, fmt) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt);
  } catch {
    return "—";
  }
};

export default function PatientRecords() {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [patient, setPatient] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("records");
  const [error, setError] = useState(null);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [filteredRecordTypes, setFilteredRecordTypes] = useState([]);

  useEffect(() => {
    const typesParam = searchParams.get("types");
    if (typesParam && typesParam !== "all") {
      setFilteredRecordTypes(typesParam.split(","));
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        const [sumRes, recRes, logRes] = await Promise.all([
          recordsAPI.getPatientSummary(patientId),
          recordsAPI.getByPatient(patientId),
          auditAPI.getPatientLogs(patientId),
        ]);
        setPatient(sumRes.data.patient);

        let allRecords = recRes.data.records || [];
        if (
          filteredRecordTypes.length > 0 &&
          !filteredRecordTypes.includes("all")
        ) {
          allRecords = allRecords.filter((r) =>
            filteredRecordTypes.includes(r.record_type),
          );
        }

        setRecords(allRecords);
        setLogs(logRes.data.logs || []);
        setError(null);
      } catch (e) {
        setError(e.response?.data?.error || "Failed to load records");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId, filteredRecordTypes]);

  const toggleExpand = (recordId) => {
    setExpandedRecord(expandedRecord === recordId ? null : recordId);
  };

  const getRecordTypeLabel = (type) => {
    const labels = {
      diagnosis: "Diagnosis",
      prescription: "Prescription",
      lab_result: "Lab Result",
      imaging: "Imaging",
      surgery: "Surgery",
      vaccination: "Vaccination",
      general: "General",
    };
    return labels[type] || type;
  };

  const getRecordTypeColor = (type) => {
    const colors = {
      diagnosis: { bg: "var(--primary-bg)", text: "var(--primary)" },
      prescription: { bg: "var(--accent-bg)", text: "var(--accent)" },
      lab_result: { bg: "var(--success-bg)", text: "var(--success)" },
      imaging: { bg: "var(--warning-bg)", text: "var(--warning)" },
      surgery: { bg: "var(--danger-bg)", text: "var(--danger)" },
      vaccination: { bg: "#e0e7ff", text: "#4f46e5" },
      general: { bg: "var(--bg-2)", text: "var(--text-2)" },
    };
    return colors[type] || colors.general;
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

  if (error)
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: 20 }}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div
            className="card"
            style={{ textAlign: "center", padding: "40px 20px" }}
          >
            <div style={{ color: "var(--danger)", marginBottom: 16 }}>
              <AlertCircle size={48} />
            </div>
            <h3 style={{ marginBottom: 8, color: "var(--danger)" }}>Error</h3>
            <p style={{ color: "var(--text-2)", marginBottom: 20 }}>{error}</p>
            <button className="btn btn-primary" onClick={() => navigate(-1)}>
              Go Back
            </button>
          </div>
        </main>
      </div>
    );

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 20 }}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {patient && (
          <div className="card mb-6">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "var(--primary-bg)",
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText size={22} />
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {patient.firstName} {patient.lastName}
                </h2>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-2)",
                    display: "flex",
                    gap: 16,
                  }}
                >
                  <span>
                    ID:{" "}
                    <span
                      style={{
                        color: "var(--primary)",
                        fontFamily: "monospace",
                      }}
                    >
                      {patient.patientId}
                    </span>
                  </span>
                  <span>
                    Blood:{" "}
                    <strong style={{ color: "var(--text-1)" }}>
                      {patient.bloodGroup}
                    </strong>
                  </span>
                  <span>
                    Genotype:{" "}
                    <strong style={{ color: "var(--text-1)" }}>
                      {patient.genotype}
                    </strong>
                  </span>
                </div>
                {filteredRecordTypes.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "var(--primary)",
                    }}
                  >
                    📋 Filtering by:{" "}
                    {filteredRecordTypes
                      .map((t) => getRecordTypeLabel(t))
                      .join(", ")}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 20,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {[
            { key: "records", label: `Records (${records.length})` },
            { key: "audit", label: `Audit (${logs.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                marginBottom: -1,
                color: tab === t.key ? "var(--primary)" : "var(--text-2)",
                borderBottom:
                  tab === t.key
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "records" && (
          <div className="card">
            {records.length === 0 ? (
              <div className="empty-state">
                <FileText size={40} />
                <p>No records found</p>
              </div>
            ) : (
              <div>
                {records.map((r) => {
                  const colors = getRecordTypeColor(r.record_type);
                  const isExpanded = expandedRecord === r.id;
                  const isVerified = r.blockchain_tx_hash;

                  return (
                    <div
                      key={r.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: isExpanded ? 16 : 0,
                        marginBottom: isExpanded ? 16 : 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 0",
                          cursor: "pointer",
                        }}
                        onClick={() => toggleExpand(r.id)}
                      >
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            color: "var(--text-3)",
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>

                        <span
                          style={{
                            background: colors.bg,
                            color: colors.text,
                            padding: "4px 12px",
                            borderRadius: 20,
                            fontSize: 12,
                            textTransform: "capitalize",
                            fontWeight: 500,
                          }}
                        >
                          {getRecordTypeLabel(r.record_type)}
                        </span>

                        <span
                          style={{
                            color: "var(--text-1)",
                            fontWeight: 500,
                            flex: 1,
                          }}
                        >
                          {r.title}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--text-2)",
                            minWidth: 120,
                          }}
                        >
                          {r.doctor_name || "—"}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--text-2)",
                            minWidth: 120,
                          }}
                        >
                          {r.hospital_name || "—"}
                        </span>

                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 12,
                            color: isVerified
                              ? "var(--success)"
                              : "var(--text-3)",
                          }}
                        >
                          {isVerified ? (
                            <>
                              <CheckCircle size={12} /> Verified
                            </>
                          ) : (
                            "Pending"
                          )}
                        </span>

                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--text-3)",
                            minWidth: 100,
                          }}
                        >
                          {safeFormat(r.created_at, "dd MMM yyyy")}
                        </span>
                      </div>

                      {isExpanded && (
                        <div
                          style={{
                            background: "var(--bg-2)",
                            borderRadius: 8,
                            padding: 20,
                            marginLeft: 30,
                          }}
                        >
                          {r.description && (
                            <div style={{ marginBottom: 16 }}>
                              <h4
                                style={{
                                  fontSize: 13,
                                  color: "var(--text-3)",
                                  marginBottom: 4,
                                }}
                              >
                                Description
                              </h4>
                              <p
                                style={{ fontSize: 14, color: "var(--text-1)" }}
                              >
                                {r.description}
                              </p>
                            </div>
                          )}

                          {r.diagnosis && (
                            <div style={{ marginBottom: 16 }}>
                              <h4
                                style={{
                                  fontSize: 13,
                                  color: "var(--text-3)",
                                  marginBottom: 4,
                                }}
                              >
                                Diagnosis
                              </h4>
                              <p
                                style={{ fontSize: 14, color: "var(--text-1)" }}
                              >
                                {r.diagnosis}
                              </p>
                            </div>
                          )}

                          {r.medications && r.medications.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <h4
                                style={{
                                  fontSize: 13,
                                  color: "var(--text-3)",
                                  marginBottom: 8,
                                }}
                              >
                                Medications
                              </h4>
                              <div style={{ display: "grid", gap: 8 }}>
                                {r.medications.map((med, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: "8px 12px",
                                      background: "var(--card-bg)",
                                      borderRadius: 6,
                                      border: "1px solid var(--border)",
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        color: "var(--text-1)",
                                        marginBottom: 4,
                                      }}
                                    >
                                      {med.name} — {med.dosage}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: "var(--text-2)",
                                      }}
                                    >
                                      {med.frequency}
                                      {med.duration ? ` · ${med.duration}` : ""}
                                      {med.route ? ` · ${med.route}` : ""}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.lab_results && r.lab_results.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <h4
                                style={{
                                  fontSize: 13,
                                  color: "var(--text-3)",
                                  marginBottom: 8,
                                }}
                              >
                                Lab Results
                              </h4>
                              <table style={{ width: "100%", fontSize: 13 }}>
                                <thead>
                                  <tr
                                    style={{
                                      color: "var(--text-3)",
                                      textAlign: "left",
                                    }}
                                  >
                                    <th style={{ padding: "4px 8px" }}>Test</th>
                                    <th style={{ padding: "4px 8px" }}>
                                      Result
                                    </th>
                                    <th style={{ padding: "4px 8px" }}>
                                      Normal Range
                                    </th>
                                    <th style={{ padding: "4px 8px" }}>Flag</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.lab_results.map((lab, idx) => (
                                    <tr key={idx}>
                                      <td
                                        style={{
                                          padding: "6px 8px",
                                          color: "var(--text-1)",
                                        }}
                                      >
                                        {lab.test || lab.testName}
                                      </td>
                                      <td
                                        style={{
                                          padding: "6px 8px",
                                          fontFamily: "monospace",
                                        }}
                                      >
                                        {lab.result || lab.value}
                                      </td>
                                      <td
                                        style={{
                                          padding: "6px 8px",
                                          color: "var(--text-2)",
                                        }}
                                      >
                                        {lab.normal || lab.normalRange || "—"}
                                      </td>
                                      <td style={{ padding: "6px 8px" }}>
                                        <span
                                          style={{
                                            color:
                                              lab.flag === "NORMAL"
                                                ? "var(--success)"
                                                : "var(--danger)",
                                            fontSize: 12,
                                          }}
                                        >
                                          {lab.flag ||
                                            (lab.isAbnormal
                                              ? "⚠️ Abnormal"
                                              : "✓ Normal")}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {r.vital_signs &&
                            Object.keys(r.vital_signs).some(
                              (k) => r.vital_signs[k],
                            ) && (
                              <div style={{ marginBottom: 16 }}>
                                <h4
                                  style={{
                                    fontSize: 13,
                                    color: "var(--text-3)",
                                    marginBottom: 8,
                                  }}
                                >
                                  Vital Signs
                                </h4>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fill, minmax(150px, 1fr))",
                                    gap: 12,
                                  }}
                                >
                                  {Object.entries(r.vital_signs).map(
                                    ([key, value]) =>
                                      value && (
                                        <div
                                          key={key}
                                          style={{
                                            padding: "8px 12px",
                                            background: "var(--card-bg)",
                                            borderRadius: 6,
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontSize: 11,
                                              color: "var(--text-3)",
                                              textTransform: "capitalize",
                                            }}
                                          >
                                            {key.replace(/([A-Z])/g, " $1")}
                                          </div>
                                          <div
                                            style={{
                                              fontSize: 14,
                                              color: "var(--text-1)",
                                              fontFamily: "monospace",
                                            }}
                                          >
                                            {value}
                                          </div>
                                        </div>
                                      ),
                                  )}
                                </div>
                              </div>
                            )}

                          {r.blockchain_tx_hash && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "10px 16px",
                                background: "var(--success-bg)",
                                borderRadius: 6,
                                border: "1px solid var(--success)",
                              }}
                            >
                              <CheckCircle size={16} color="var(--success)" />
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--success)",
                                  fontWeight: 600,
                                }}
                              >
                                Blockchain Verified
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-3)",
                                  fontFamily: "monospace",
                                }}
                              >
                                Tx: {r.blockchain_tx_hash.slice(0, 10)}...
                                {r.blockchain_tx_hash.slice(-8)}
                              </span>
                            </div>
                          )}

                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-3)",
                              marginTop: 12,
                              display: "flex",
                              gap: 16,
                            }}
                          >
                            <span>
                              Created:{" "}
                              {safeFormat(r.created_at, "dd MMM yyyy HH:mm")}
                            </span>
                            {r.updated_at && r.updated_at !== r.created_at && (
                              <span>
                                Updated:{" "}
                                {safeFormat(r.updated_at, "dd MMM yyyy HH:mm")}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "audit" && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Patient Audit Trail</h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--primary)",
                }}
              >
                <Shield size={14} /> Tamper-proof blockchain log
              </div>
            </div>
            {logs.length === 0 ? (
              <div className="empty-state">
                <Shield size={40} />
                <p>No audit events</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>By</th>
                      <th>Hospital</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 13, color: "var(--text-1)" }}>
                          {log.action?.replace(/_/g, " ")}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {log.performed_by_id || "System"}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {log.hospital_id || "—"}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-3)" }}>
                          {safeFormat(log.created_at, "dd MMM yyyy HH:mm:ss")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
