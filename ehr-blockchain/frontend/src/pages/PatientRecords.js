// src/pages/PatientRecords.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import { recordsAPI, auditAPI } from "../services/api";
import { ArrowLeft, FileText, Shield } from "lucide-react";
import { format } from "date-fns";

export default function PatientRecords() {
  const { patientId } = useParams();
  const navigate      = useNavigate();
  const [records, setRecords]   = useState([]);
  const [patient, setPatient]   = useState(null);
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("records");

  useEffect(() => {
    const load = async () => {
      try {
        const [sumRes, recRes, logRes] = await Promise.all([
          recordsAPI.getPatientSummary(patientId),
          recordsAPI.getByPatient(patientId),
          auditAPI.getPatientLogs(patientId),
        ]);
        setPatient(sumRes.data.patient);
        setRecords(recRes.data.records || []);
        setLogs(logRes.data.logs || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [patientId]);

  if (loading) return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div className="spinner" style={{ width:40, height:40 }} />
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
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Type</th><th>Title</th><th>Doctor</th><th>Hospital</th><th>Blockchain Tx</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r._id}>
                        <td><span style={{ background:"var(--accent-bg)", color:"var(--accent)", padding:"2px 10px", borderRadius:20, fontSize:12, textTransform:"capitalize" }}>{r.recordType.replace("_"," ")}</span></td>
                        <td style={{ color:"var(--text-1)", fontWeight:500 }}>{r.title}</td>
                        <td style={{ fontSize:13 }}>{r.doctorName||"—"}</td>
                        <td style={{ fontSize:13 }}>{r.hospitalName||"—"}</td>
                        <td style={{ fontFamily:"monospace", fontSize:11, color:"var(--primary)" }}>
                          {r.blockchainTxHash ? r.blockchainTxHash.slice(0,16)+"…" : "Pending"}
                        </td>
                        <td style={{ fontSize:12, color:"var(--text-3)" }}>{format(new Date(r.createdAt),"dd MMM yyyy")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
