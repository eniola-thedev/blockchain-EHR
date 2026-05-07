/**
 * Doctor Dashboard (REDESIGNED)
 * Improved layout with better features for medical record management
 * and inter-hospital collaboration
 */

import React, { useState, useEffect } from "react";
import Sidebar from "../components/shared/Sidebar";
import { useAuth } from "../context/AuthContext";
import { recordsAPI, authAPI } from "../services/api";
import api from "../services/api";
import toast from "react-hot-toast";
import "../styles/doctorDashboard.css";
import {
  Search,
  Plus,
  FileText,
  Pill,
  FlaskConical,
  Activity,
  User,
  X,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Clock,
  Share2,
} from "lucide-react";

const RECORD_TYPES = [
  { value: "diagnosis", label: "Diagnosis", icon: "🔍" },
  { value: "prescription", label: "Prescription", icon: "💊" },
  { value: "lab_result", label: "Lab Result", icon: "🧪" },
  { value: "imaging", label: "Imaging", icon: "🖼️" },
  { value: "general", label: "General Note", icon: "📝" },
];

export default function DoctorDashboard() {
  const { user } = useAuth();

  // Patient Search State
  const [patientId, setPatientId] = useState("");
  const [searching, setSearching] = useState(false);
  const [records, setRecords] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);

  // Modal States
  const [showCreateRecord, setShowCreateRecord] = useState(false);
  const [showRegisterPatient, setShowRegisterPatient] = useState(false);

  // Inter-hospital State
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Fetch incoming inter-hospital requests on mount
  useEffect(() => {
    fetchIncomingRequests();
    const interval = setInterval(fetchIncomingRequests, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchIncomingRequests = async () => {
    try {
      setLoadingRequests(true);
      const response = await api.get(
        "/inter-hospital/incoming?status=pending&limit=5",
      );
      setIncomingRequests(response.data.requests || []);
    } catch (error) {
      console.error("Failed to fetch incoming requests:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const searchPatient = async () => {
    if (!patientId.trim()) {
      toast.error("Enter Patient ID");
      return;
    }

    setSearching(true);
    try {
      const [summRes, recRes] = await Promise.all([
        recordsAPI.getPatientSummary(patientId),
        recordsAPI.getByPatient(patientId),
      ]);

      setPatientInfo(summRes.data.patient);
      setRecords(recRes.data.records || []);
      toast.success("Patient found!");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Patient not found");
      setPatientInfo(null);
      setRecords([]);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") searchPatient();
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content doctor-dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1>Doctor Dashboard</h1>
            <p className="subtitle">
              Welcome, Dr. {user?.firstName} {user?.lastName || ""}
            </p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowRegisterPatient(true)}
              title="Register a new patient"
            >
              <UserPlus size={16} /> Register Patient
            </button>
          </div>
        </div>

        {/* Alerts Section */}
        {incomingRequests.length > 0 && (
          <div className="alerts-section">
            <div className="alert alert-info">
              <AlertCircle size={20} />
              <div className="alert-content">
                <h3>Pending Inter-Hospital Requests</h3>
                <p>
                  You have {incomingRequests.length} incoming record request
                  {incomingRequests.length !== 1 ? "s" : ""} requiring review
                </p>
              </div>
              <button
                className="btn-small"
                onClick={() => (window.location.href = "/inter-hospital")}
              >
                Review →
              </button>
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          {/* Patient Search Section */}
          <section className="dashboard-section patient-search-section">
            <h2>🔍 Search Patient</h2>
            <div className="search-box">
              <input
                type="text"
                placeholder="Enter Patient ID (e.g., PAT001)"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="search-input"
              />
              <button
                onClick={searchPatient}
                disabled={searching}
                className="btn btn-primary"
              >
                <Search size={16} />
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          </section>

          {/* Patient Information */}
          {patientInfo && (
            <section className="dashboard-section patient-info-section">
              <h2>👤 Patient Information</h2>
              <div className="patient-card">
                <div className="patient-header">
                  <div className="patient-name">
                    <h3>
                      {patientInfo.firstName} {patientInfo.lastName}
                    </h3>
                    <p className="patient-id">ID: {patientInfo.patientId}</p>
                  </div>
                  <div className="patient-details">
                    <p>
                      <strong>DOB:</strong>{" "}
                      {patientInfo.dateOfBirth
                        ? new Date(patientInfo.dateOfBirth).toLocaleDateString()
                        : "N/A"}
                    </p>
                    <p>
                      <strong>Blood Group:</strong>{" "}
                      {patientInfo.bloodGroup || "N/A"}
                    </p>
                    <p>
                      <strong>Genotype:</strong> {patientInfo.genotype || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Quick Actions */}
          {patientInfo && (
            <section className="dashboard-section quick-actions">
              <h2>⚡ Quick Actions</h2>
              <div className="action-buttons">
                <button
                  className="action-btn"
                  onClick={() => setShowCreateRecord(true)}
                  title="Add new medical record"
                >
                  <Plus size={20} />
                  <span>Add Record</span>
                </button>
                <button
                  className="action-btn"
                  onClick={() => (window.location.href = "/inter-hospital")}
                  title="Request records from other hospitals"
                >
                  <Share2 size={20} />
                  <span>Request Records</span>
                </button>
                <button
                  className="action-btn"
                  onClick={() => setPatientId("")}
                  title="Clear search"
                >
                  <X size={20} />
                  <span>Clear</span>
                </button>
              </div>
            </section>
          )}

          {/* Medical Records */}
          {patientInfo && (
            <section className="dashboard-section records-section">
              <div className="section-header">
                <h2>📋 Medical Records ({records.length})</h2>
                <button
                  className="btn-small"
                  onClick={() => setShowCreateRecord(true)}
                >
                  + Add Record
                </button>
              </div>

              {records.length === 0 ? (
                <div className="empty-state">
                  <FileText size={40} />
                  <p>No medical records yet</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateRecord(true)}
                  >
                    Create First Record
                  </button>
                </div>
              ) : (
                <div className="records-list">
                  {records.map((record) => (
                    <div key={record._id} className="record-item">
                      <div className="record-icon">
                        {RECORD_TYPES.find((t) => t.value === record.recordType)
                          ?.icon || "📄"}
                      </div>
                      <div className="record-info">
                        <h4>{record.title}</h4>
                        <p className="record-meta">
                          <span className="record-type">
                            {RECORD_TYPES.find(
                              (t) => t.value === record.recordType,
                            )?.label || record.recordType}
                          </span>
                          <span className="record-date">
                            {new Date(record.createdAt).toLocaleDateString()}
                          </span>
                        </p>
                        {record.description && (
                          <p className="record-description">
                            {record.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Inter-Hospital Requests Summary */}
          {incomingRequests.length > 0 && (
            <section className="dashboard-section requests-summary">
              <div className="section-header">
                <h2>📥 Incoming Requests</h2>
                <button
                  className="btn-small"
                  onClick={() => (window.location.href = "/inter-hospital")}
                >
                  View All →
                </button>
              </div>
              <div className="requests-mini-list">
                {incomingRequests.slice(0, 3).map((req) => (
                  <div key={req._id} className="request-mini">
                    <div className="request-hospital">
                      <strong>{req.requestingHospital?.name}</strong>
                    </div>
                    <div className="request-patient">
                      Patient {req.patientId}
                    </div>
                    <div className="request-status pending">Pending</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Modals */}
        {showCreateRecord && patientInfo && (
          <CreateRecordModal
            patientId={patientInfo.patientId}
            onClose={() => setShowCreateRecord(false)}
            onSuccess={(rec) => {
              setRecords((prev) => [rec, ...prev]);
              setShowCreateRecord(false);
              toast.success("Record created successfully!");
            }}
          />
        )}

        {showRegisterPatient && (
          <RegisterPatientModal
            onClose={() => setShowRegisterPatient(false)}
            onSuccess={(id) => {
              setShowRegisterPatient(false);
              setPatientId(id);
              searchPatient();
            }}
          />
        )}
      </main>
    </div>
  );
}

/* ═══════════════════ CREATE RECORD MODAL ═══════════════════ */
function CreateRecordModal({ patientId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    recordType: "diagnosis",
    title: "",
    description: "",
    diagnosis: "",
    medications: [],
    labResults: [],
  });

  const [saving, setSaving] = useState(false);
  const [medLine, setMedLine] = useState({
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
  });

  const submit = async () => {
    if (!form.title.trim()) {
      return toast.error("Title is required");
    }

    setSaving(true);
    try {
      const res = await recordsAPI.create({ ...form, patientId });
      onSuccess({
        ...form,
        _id: res.data.recordId,
        createdAt: new Date(),
      });
      toast.success("Record created successfully!");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to create record");
    } finally {
      setSaving(false);
    }
  };

  const addMedication = () => {
    if (!medLine.name.trim()) {
      toast.error("Medication name required");
      return;
    }
    setForm({
      ...form,
      medications: [...form.medications, { ...medLine }],
    });
    setMedLine({ name: "", dosage: "", frequency: "", duration: "" });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Create Medical Record</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Record Type *</label>
            <select
              value={form.recordType}
              onChange={(e) => setForm({ ...form, recordType: e.target.value })}
            >
              {RECORD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              placeholder="e.g., Hypertension Follow-up"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Additional notes about the patient visit"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows="3"
            />
          </div>

          {form.recordType === "diagnosis" && (
            <div className="form-group">
              <label>Diagnosis</label>
              <textarea
                placeholder="Diagnosis details"
                value={form.diagnosis}
                onChange={(e) =>
                  setForm({ ...form, diagnosis: e.target.value })
                }
                rows="2"
              />
            </div>
          )}

          {form.recordType === "prescription" && (
            <div className="form-section">
              <h4>💊 Medications</h4>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Medication name"
                  value={medLine.name}
                  onChange={(e) =>
                    setMedLine({ ...medLine, name: e.target.value })
                  }
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Dosage (e.g., 500mg)"
                    value={medLine.dosage}
                    onChange={(e) =>
                      setMedLine({ ...medLine, dosage: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Frequency (e.g., 2x daily)"
                    value={medLine.frequency}
                    onChange={(e) =>
                      setMedLine({ ...medLine, frequency: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Duration (e.g., 7 days)"
                    value={medLine.duration}
                    onChange={(e) =>
                      setMedLine({ ...medLine, duration: e.target.value })
                    }
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-small"
                onClick={addMedication}
              >
                + Add Medication
              </button>

              {form.medications.length > 0 && (
                <div className="added-items">
                  <h5>Added Medications:</h5>
                  {form.medications.map((med, idx) => (
                    <div key={idx} className="item-tag">
                      {med.name} - {med.dosage} ({med.frequency})
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            medications: form.medications.filter(
                              (_, i) => i !== idx,
                            ),
                          })
                        }
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Creating..." : "Create Record"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ REGISTER PATIENT MODAL ═══════════════════ */
function RegisterPatientModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    genotype: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return toast.error("First and Last name are required");
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      return toast.error("Valid email is required");
    }

    setLoading(true);
    try {
      const res = await authAPI.registerPatient(form);
      toast.success("Patient registered successfully!");
      onSuccess(res.data.patientId);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👤 Register New Patient</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Step Indicator */}
          <div className="step-indicator">
            <div className={`step ${step >= 1 ? "active" : ""}`}>1</div>
            <div className={`step-line ${step > 1 ? "active" : ""}`}></div>
            <div className={`step ${step >= 2 ? "active" : ""}`}>2</div>
          </div>

          {step === 1 && (
            <div className="form-section">
              <h3>Basic Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    placeholder="First name"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  placeholder="patient@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) =>
                      setForm({ ...form, dateOfBirth: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-section">
              <h3>Health Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Blood Group</label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) =>
                      setForm({ ...form, bloodGroup: e.target.value })
                    }
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Genotype</label>
                  <select
                    value={form.genotype}
                    onChange={(e) =>
                      setForm({ ...form, genotype: e.target.value })
                    }
                  >
                    <option value="">Select</option>
                    <option value="AA">AA</option>
                    <option value="AS">AS</option>
                    <option value="SS">SS</option>
                    <option value="AC">AC</option>
                    <option value="SC">SC</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="Patient's phone number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 2 && (
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              ← Back
            </button>
          )}
          {step === 1 && (
            <button
              className="btn btn-primary"
              onClick={() => setStep(2)}
              disabled={!form.firstName.trim() || !form.lastName.trim()}
            >
              Next →
            </button>
          )}
          {step === 2 && (
            <>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={loading}
              >
                {loading ? "Registering..." : "Register Patient"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
