// src/pages/PatientRecords.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import { recordsAPI, auditAPI } from "../services/api";
import { ArrowLeft, FileText, Shield, AlertCircle, ChevronDown, ChevronUp, CheckCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";

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
  const [showTypeFilter, setShowTypeFilter] = useState(false);

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
        
        // Filter by record types if specified
        if (filteredRecordTypes.length > 0 && !filteredRecordTypes.includes("all")) {
          allRecords = allRecords.filter(r => filteredRecordTypes.includes(r.recordType));
        }
        
        setRecords(allRecords);
        setLogs(logRes.data.logs || []);
        setError(null);
      } catch (e) {
        console.error("Error loading patient records:", e);
        const errorMessage = e.response?.data?.error || e.response?.data?.message || "Failed to load records";
        setError(errorMessage);
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

  if (loading) return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div className="spinner" style={{ width:40, height:40 }} />
      </main>
    </div>
  );

  if (error) return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <button className="btn btn-ghost btn-sm" style={{ marginBottom:20 }} onClick={() => navigate(-1)}>
          <ArrowLeft size={16}/> Back
        </button>
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ color: "var(--danger)", marginBottom: 16 }}>
            <AlertCircle size={48} />
          </div>
          <h3 style={{ marginBottom: 8, color: "var(--danger)" }}>Access Denied</h3>
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
        <button className="btn btn-ghost btn-sm" style={{ marginBottom:20 }} onClick={() => navigate(-1)}>
          <ArrowLeft size={16}/> Back
        </button>

        {patient && (
          <div className="card mb-6">
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:52, height:52, borderRadius:12, background:"var(--primary-bg)", color:"var(--primary)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <FileText size={22}/>
              </div>
              <div>
                <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700 }}>
                  {patient.firstName} {patient.lastName}
                </h2>
                <div style={{ fontSize:13, color:"var(--text-2)", display:"flex", gap:16 }}>
                  <span>ID: <span style={{ color:"var(--primary)", fontFamily:"monospace" }}>{patient.patientId}</span></span>
                  <span>Blood: <strong style={{ color:"var(--text-1)" }}>{patient.bloodGroup}</strong></span>
                  <span>Genotype: <strong style={{ color:"var(--text-1)" }}>{patient.genotype}</strong></span>
                </div>
                {filteredRecordTypes.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--primary)" }}>
                    📋 Filtering by: {filteredRecordTypes.map(t => getRecordTypeLabel(t)).join(", ")}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:"1px solid var(--border)" }}>
          {[{ key:"records", label:`Records (${records.length})` }, { key:"audit", label:`Audit (${logs.length})` }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:"10px 16px", background:"none", border:"none", cursor:"pointer",
              fontSize:14, fontWeight:500, marginBottom:-1,
              color: tab===t.key ? "var(--primary)" : "var(--text-2)",
              borderBottom: tab===t.key ? "2px solid var(--primary)" : "2px solid transparent",
            }}>{t.label}</button>
          ))}
        </div>

        {tab === "records" && (
          <div className="card">
            {records.length === 0 ? (
              <div className="empty-state"><FileText size={40}/><p>No records found</p></div>
            ) : (
              <div>
                {records.map(r => {
                  const colors = getRecordTypeColor(r.recordType);
                  const isExpanded = expandedRecord === r._id;
                  const isVerified = r.blockchainTxHash;

                  return (
                    <div key={r._id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: isExpanded ? 16 : 0, marginBottom: isExpanded ? 16 : 0 }}>
                      {/* Record Summary Row */}
                      <div 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 12, 
                          padding: "12px 0",
                          cursor: "pointer",
                        }}
                        onClick={() => toggleExpand(r._id)}
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
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        
                        <span style={{ 
                          background: colors.bg, 
                          color: colors.text, 
                          padding: "4px 12px", 
                          borderRadius: 20, 
                          fontSize: 12, 
                          textTransform: "capitalize",
                          fontWeight: 500,
                        }}>
                          {getRecordTypeLabel(r.recordType)}
                        </span>
                        
                        <span style={{ color: "var(--text-1)", fontWeight: 500, flex: 1 }}>
                          {r.title}
                        </span>
                        
                        <span style={{ fontSize: 13, color: "var(--text-2)", minWidth: 120 }}>
                          {r.doctorName || "—"}
                        </span>
                        
                        <span style={{ fontSize: 13, color: "var(--text-2)", minWidth: 120 }}>
                          {r.hospitalName || "—"}
                        </span>
                        
                        <span style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 4,
                          fontSize: 12, 
                          color: isVerified ? "var(--success)" : "var(--text-3)",
                          fontFamily: "monospace",
                        }}>
                          {isVerified ? (
                            <>
                              <CheckCircle size={12} />
                              Verified
                            </>
                          ) : (
                            "Pending"
                          )}
                        </span>
                        
                        <span style={{ fontSize: 12, color: "var(--text-3)", minWidth: 100 }}>
                          {format(new Date(r.createdAt), "dd MMM yyyy")}
                        </span>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div style={{ 
                          background: "var(--bg-2)", 
                          borderRadius: 8, 
                          padding: 20,
                          marginLeft: 30,
                        }}>
                          {r.description && (
                            <div style={{ marginBottom: 16 }}>
                              <h4 style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 4 }}>Description</h4>
                              <p style={{ fontSize: 14, color: "var(--text-1)" }}>{r.description}</p>
                            </div>
                          )}

                          {r.diagnosis && (
                            <div style={{ marginBottom: 16 }}>
                              <h4 style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 4 }}>Diagnosis</h4>
                              <p style={{ fontSize: 14, color: "var(--text-1)" }}>{r.diagnosis}</p>
                            </div>
                          )}

                          {r.medications && r.medications.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <h4 style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 8 }}>Medications</h4>
                              <div style={{ display: "grid", gap: 8 }}>
                                {r.medications.map((med, idx) => (
                                  <div key={idx} style={{ padding: "8px 12px", background: "var(--card-bg)", borderRadius: 6, border: "1px solid var(--border)" }}>
                                    <div style={{ fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>{med.name} {med.dosage}</div>
                                    <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                                      {med.frequency} · {med.duration}
                                    </div>
                                    {med.notes && (
                                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{med.notes}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.labResults && r.labResults.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <h4 style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 8 }}>Lab Results</h4>
                              <table style={{ width: "100%", fontSize: 13 }}>
                                <thead>
                                  <tr style={{ color: "var(--text-3)", textAlign: "left" }}>
                                    <th style={{ padding: "4px 8px" }}>Test</th>
                                    <th style={{ padding: "4px 8px" }}>Value</th>
                                    <th style={{ padding: "4px 8px" }}>Unit</th>
                                    <th style={{ padding: "4px 8px" }}>Normal Range</th>
                                    <th style={{ padding: "4px 8px" }}>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.labResults.map((lab, idx) => (
                                    <tr key={idx}>
                                      <td style={{ padding: "6px 8px", color: "var(--text-1)" }}>{lab.testName}</td>
                                      <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{lab.value}</td>
                                      <td style={{ padding: "6px 8px", color: "var(--text-2)" }}>{lab.unit}</td>
                                      <td style={{ padding: "6px 8px", color: "var(--text-2)" }}>{lab.normalRange}</td>
                                      <td style={{ padding: "6px 8px" }}>
                                        {lab.isAbnormal ? (
                                          <span style={{ color: "var(--danger)", fontSize: 12 }}>⚠️ Abnormal</span>
                                        ) : (
                                          <span style={{ color: "var(--success)", fontSize: 12 }}>✓ Normal</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {r.vitalSigns && Object.keys(r.vitalSigns).some(k => r.vitalSigns[k]) && (
                            <div style={{ marginBottom: 16 }}>
                              <h4 style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 8 }}>Vital Signs</h4>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                                {r.vitalSigns.bloodPressure && (
                                  <div style={{ padding: "8px 12px", background: "var(--card-bg)", borderRadius: 6 }}>
                                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>Blood Pressure</div>
                                    <div style={{ fontSize: 14, color: "var(--text-1)", fontFamily: "monospace" }}>{r.vitalSigns.bloodPressure} mmHg</div>
                                  </div>
                                )}
                                {r.vitalSigns.heartRate && (
                                  <div style={{ padding: "8px 12px", background: "var(--card-bg)", borderRadius: 6 }}>
                                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>Heart Rate</div>
                                    <div style={{ fontSize: 14, color: "var(--text-1)", fontFamily: "monospace" }}>{r.vitalSigns.heartRate} bpm</div>
                                  </div>
                                )}
                                {r.vitalSigns.temperature && (
                                  <div style={{ padding: "8px 12px", background: "var(--card-bg)", borderRadius: 6 }}>
                                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>Temperature</div>
                                    <div style={{ fontSize: 14, color: "var(--text-1)", fontFamily: "monospace" }}>{r.vitalSigns.temperature.toFixed(1)}°C</div>
                                  </div>
                                )}
                                {r.vitalSigns.weight && (
                                  <div style={{ padding: "8px 12px", background: "var(--card-bg)", borderRadius: 6 }}>
                                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>Weight</div>
                                    <div style={{ fontSize: 14, color: "var(--text-1)", fontFamily: "monospace" }}>{r.vitalSigns.weight} kg</div>
                                  </div>
                                )}
                                {r.vitalSigns.height && (
                                  <div style={{ padding: "8px 12px", background: "var(--card-bg)", borderRadius: 6 }}>
                                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>Height</div>
                                    <div style={{ fontSize: 14, color: "var(--text-1)", fontFamily: "monospace" }}>{r.vitalSigns.height} cm</div>
                                  </div>
                                )}
                                {r.vitalSigns.oxygenSat && (
                                  <div style={{ padding: "8px 12px", background: "var(--card-bg)", borderRadius: 6 }}>
                                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>O2 Saturation</div>
                                    <div style={{ fontSize: 14, color: "var(--text-1)", fontFamily: "monospace" }}>{r.vitalSigns.oxygenSat}%</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {r.blockchainTxHash && (
                            <div style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              gap: 8, 
                              padding: "10px 16px", 
                              background: "var(--success-bg)", 
                              borderRadius: 6,
                              border: "1px solid var(--success)",
                            }}>
                              <CheckCircle size={16} color="var(--success)" />
                              <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>
                                Blockchain Verified
                              </span>
                              <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "monospace" }}>
                                Tx: {r.blockchainTxHash.slice(0, 10)}...{r.blockchainTxHash.slice(-8)}
                              </span>
                              <a 
                                href={`https://etherscan.io/tx/${r.blockchainTxHash}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                  display: "flex", 
                                  alignItems: "center", 
                                  gap: 4,
                                  fontSize: 11, 
                                  color: "var(--primary)", 
                                  textDecoration: "none",
                                  marginLeft: "auto",
                                }}
                              >
                                View on Etherscan <ExternalLink size={12} />
                              </a>
                            </div>
                          )}

                          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 12, display: "flex", gap: 16 }}>
                            <span>Created: {format(new Date(r.createdAt), "dd MMM yyyy HH:mm")}</span>
                            {r.createdAt !== r.updatedAt && (
                              <span>Updated: {format(new Date(r.updatedAt), "dd MMM yyyy HH:mm")}</span>
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
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"var(--primary)" }}>
                <Shield size={14}/> Tamper-proof blockchain log
              </div>
            </div>
            {logs.length === 0 ? (
              <div className="empty-state"><Shield size={40}/><p>No audit events</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Action</th><th>By</th><th>Hospital</th><th>Timestamp</th></tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <tr key={i}>
                        <td style={{ fontSize:13, color:"var(--text-1)" }}>{log.action.replace(/_/g," ")}</td>
                        <td style={{ fontSize:13 }}>{log.performedBy?.email||"System"}</td>
                        <td style={{ fontSize:13 }}>{log.hospitalId?.name||"—"}</td>
                        <td style={{ fontSize:12, color:"var(--text-3)" }}>{log.createdAt ? format(new Date(log.createdAt),"dd MMM yyyy HH:mm:ss") : "—"}</td>
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