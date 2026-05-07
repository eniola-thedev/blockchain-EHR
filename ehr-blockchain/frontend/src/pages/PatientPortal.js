// src/pages/PatientPortal.js
import React, { useState, useEffect } from "react";
import { recordsAPI } from "../services/api";
import { useAuth }    from "../context/AuthContext";
import Sidebar        from "../components/shared/Sidebar";
import {
  Heart, Droplets, FileText, Pill, FlaskConical,
  Activity, ChevronDown, ChevronRight, Calendar, Building2,
  User, Shield, AlertCircle
} from "lucide-react";
import { format } from "date-fns";

const RECORD_ICONS = {
  diagnosis:    FileText,
  prescription: Pill,
  lab_result:   FlaskConical,
  imaging:      Activity,
  general:      FileText,
};

const RECORD_COLORS = {
  diagnosis:    "var(--accent)",
  prescription: "var(--primary)",
  lab_result:   "var(--warning)",
  imaging:      "#a78bfa",
  general:      "var(--text-2)",
};

export default function PatientPortal() {
  const { user }    = useAuth();
  const [summary, setSummary]   = useState(null);
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const [sumRes, recRes] = await Promise.all([
          recordsAPI.getMySummary(),
          recordsAPI.getByPatient(user.patientId),
        ]);
        setSummary(sumRes.data);
        setRecords(recRes.data.records || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.patientId]);

  const filtered = activeTab === "all"
    ? records
    : records.filter(r => r.recordType === activeTab);

  const tabs = [
    { key: "all",         label: "All Records" },
    { key: "diagnosis",   label: "Diagnoses" },
    { key: "prescription",label: "Prescriptions" },
    { key: "lab_result",  label: "Lab Results" },
    { key: "imaging",     label: "Imaging" },
  ];

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content flex items-center" style={{ justifyContent: "center" }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </main>
      </div>
    );
  }

  const p = summary?.patient;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">

        {/* Read-only banner */}
        <div style={{
          background:   "rgba(79,142,247,0.08)",
          border:       "1px solid rgba(79,142,247,0.2)",
          borderRadius: "var(--radius)",
          padding:      "10px 16px",
          marginBottom: 24,
          display:      "flex",
          alignItems:   "center",
          gap:          10,
          fontSize:     13,
          color:        "var(--accent)"
        }}>
          <Shield size={16} />
          Your health records are managed by your hospital. You have read-only access.
        </div>

        {/* Profile header */}
        <div className="card mb-6" style={{ position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 4,
            background: "linear-gradient(90deg, var(--primary), var(--accent))"
          }} />
          <div className="flex items-center gap-4">
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: "var(--primary-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--primary)", flexShrink: 0
            }}>
              <User size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                {p?.firstName} {p?.lastName}
              </h2>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span className="text-sm text-muted">ID: <span style={{ color: "var(--primary)", fontFamily: "monospace" }}>{p?.patientId}</span></span>
                <span className="text-sm text-muted">DOB: {p?.dateOfBirth ? format(new Date(p.dateOfBirth), "dd MMM yyyy") : "—"}</span>
                <span className="text-sm text-muted">{p?.gender}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 12, marginTop: 20 }}>
            <VitalCard icon={Droplets} color="var(--danger)" label="Blood Group" value={p?.bloodGroup || "—"} />
            <VitalCard icon={Heart}    color="var(--accent)" label="Genotype"    value={p?.genotype || "—"} />
            <VitalCard icon={Building2} color="var(--primary)" label="Home Hospital" value={p?.hospitalId?.name || "—"} />
            <VitalCard icon={FileText} color="var(--warning)" label="Total Records" value={records.length} />
          </div>
        </div>

        {/* Emergency info callout */}
        {(p?.bloodGroup || p?.genotype) && (
          <div style={{
            background:   "var(--danger-bg)",
            border:       "1px solid rgba(240,82,82,0.2)",
            borderRadius: "var(--radius)",
            padding:      "12px 16px",
            marginBottom: 24,
            display:      "flex",
            alignItems:   "center",
            gap:          10,
            fontSize:     13,
          }}>
            <AlertCircle size={16} style={{ color: "var(--danger)", flexShrink: 0 }} />
            <span style={{ color: "var(--text-2)" }}>
              Emergency info — Blood: <strong style={{ color: "var(--text-1)" }}>{p?.bloodGroup}</strong>
              &nbsp;· Genotype: <strong style={{ color: "var(--text-1)" }}>{p?.genotype}</strong>
            </span>
          </div>
        )}

        {/* Records */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Medical Records</h3>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`btn btn-sm ${activeTab === t.key ? "btn-primary" : "btn-ghost"}`}
              >
                {t.label}
                {t.key !== "all" && (
                  <span style={{ marginLeft: 4, opacity: 0.7 }}>
                    ({records.filter(r => r.recordType === t.key).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <p>No {activeTab === "all" ? "" : activeTab} records found</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(record => (
                <RecordItem
                  key={record._id}
                  record={record}
                  isExpanded={expanded === record._id}
                  onToggle={() => setExpanded(expanded === record._id ? null : record._id)}
                />
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

function VitalCard({ icon: Icon, color, label, value }) {
  return (
    <div style={{
      background:    "var(--bg-3)",
      border:        "1px solid var(--border)",
      borderRadius:  "var(--radius)",
      padding:       "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Icon size={14} style={{ color }} />
        <span style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>
        {value}
      </div>
    </div>
  );
}

function RecordItem({ record, isExpanded, onToggle }) {
  const Icon  = RECORD_ICONS[record.recordType] || FileText;
  const color = RECORD_COLORS[record.recordType] || "var(--text-2)";

  return (
    <div style={{
      background:    "var(--bg-3)",
      border:        "1px solid var(--border)",
      borderRadius:  "var(--radius)",
      overflow:      "hidden",
      transition:    "border-color 0.15s",
      borderLeft:    `3px solid ${color}`,
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "none", border: "none",
          padding: "14px 16px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12, textAlign: "left"
        }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 8,
          background: `${color}18`, display: "flex", alignItems: "center",
          justifyContent: "center", color, flexShrink: 0 }}>
          <Icon size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "var(--text-1)", fontWeight: 500, fontSize: 14 }}>
            {record.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            {record.hospitalName} · {record.doctorName} ·{" "}
            {format(new Date(record.createdAt), "dd MMM yyyy")}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            background: `${color}18`, color, padding: "2px 10px",
            borderRadius: 20, fontSize: 12, fontWeight: 500,
            textTransform: "capitalize"
          }}>
            {record.recordType.replace("_", " ")}
          </span>
          {isExpanded ? <ChevronDown size={16} style={{ color: "var(--text-3)" }} /> : <ChevronRight size={16} style={{ color: "var(--text-3)" }} />}
        </div>
      </button>

      {isExpanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
          {record.description && (
            <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 12, lineHeight: 1.6 }}>
              {record.description}
            </p>
          )}
          {record.diagnosis && (
            <InfoSection title="Diagnosis" value={record.diagnosis} />
          )}
          {record.medications?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Medications
              </div>
              {record.medications.map((m, i) => (
                <div key={i} style={{
                  background: "var(--surface)", borderRadius: "var(--radius)",
                  padding: "10px 12px", marginBottom: 6, fontSize: 13,
                }}>
                  <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{m.name}</span>
                  <span style={{ color: "var(--text-3)" }}> · {m.dosage} · {m.frequency} · {m.duration}</span>
                </div>
              ))}
            </div>
          )}
          {record.labResults?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Lab Results
              </div>
              {record.labResults.map((l, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "8px 12px", background: "var(--surface)",
                  borderRadius: "var(--radius)", marginBottom: 4, fontSize: 13
                }}>
                  <span style={{ color: "var(--text-2)" }}>{l.testName}</span>
                  <span style={{ color: l.isAbnormal ? "var(--danger)" : "var(--text-1)", fontWeight: 500 }}>
                    {l.value} {l.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
          {record.blockchainTxHash && (
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-3)" }}>
              <span style={{ color: "var(--primary)" }}>⛓ On-chain:</span>{" "}
              <span style={{ fontFamily: "monospace" }}>{record.blockchainTxHash.slice(0, 20)}…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoSection({ title, value }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)",
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {title}
      </div>
      <p style={{ fontSize: 14, color: "var(--text-2)" }}>{value}</p>
    </div>
  );
}
