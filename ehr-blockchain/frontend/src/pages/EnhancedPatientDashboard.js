/**
 * Enhanced Patient Dashboard
 * Displays medical records timeline, lab results, medications, and vital trends
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "../styles/patientDashboard.css";

const PatientDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [timeline, setTimeline] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [medications, setMedications] = useState([]);
  const [vitalTrends, setVitalTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    recordType: "",
    startDate: "",
    endDate: "",
  });

  // Fetch patient profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get("/portal/profile");
        setProfile(response.data);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "patient") {
      fetchProfile();
    }
  }, [user]);

  // Fetch timeline
  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.recordType) params.append("type", filters.recordType);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const response = await api.get(`/portal/timeline?${params.toString()}`);
      setTimeline(response.data.timeline);
    } catch (error) {
      console.error("Failed to fetch timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch lab results
  const fetchLabResults = async () => {
    try {
      setLoading(true);
      const response = await api.get("/portal/lab-results");
      setLabResults(response.data.labResults);
    } catch (error) {
      console.error("Failed to fetch lab results:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch medications
  const fetchMedications = async () => {
    try {
      setLoading(true);
      const response = await api.get("/portal/medications");
      setMedications(response.data.medications);
    } catch (error) {
      console.error("Failed to fetch medications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch vital trends
  const fetchVitalTrends = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        "/portal/vital-trends?metric=bloodPressure&days=30",
      );
      setVitalTrends(response.data.trends);
    } catch (error) {
      console.error("Failed to fetch vital trends:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "timeline") fetchTimeline();
    if (tab === "labs") fetchLabResults();
    if (tab === "medications") fetchMedications();
    if (tab === "vitals") fetchVitalTrends();
  };

  useEffect(() => {
    if (activeTab === "timeline") {
      fetchTimeline();
    }
  }, [filters]);

  if (loading && !profile) {
    return <div className="patient-dashboard loading">⏳ Loading...</div>;
  }

  return (
    <div className="patient-dashboard">
      {/* Profile Header */}
      {profile && (
        <div className="profile-header">
          <div className="profile-info">
            <h1>
              {profile.profile.firstName} {profile.profile.lastName}
            </h1>
            <div className="profile-details">
              <span>📋 ID: {profile.profile.id}</span>
              <span>🩸 Blood Group: {profile.profile.bloodGroup}</span>
              <span>🧬 Genotype: {profile.profile.genotype}</span>
              <span>
                🏥 Home Hospital: {profile.profile.homeHospital?.name}
              </span>
            </div>
          </div>
          <div className="record-stats">
            <div className="stat-card">
              <span className="stat-value">{profile.recordStats.total}</span>
              <span className="stat-label">Total Records</span>
            </div>
            {Object.entries(profile.recordStats.byType).map(([type, count]) => (
              <div key={type} className="stat-card">
                <span className="stat-value">{count}</span>
                <span className="stat-label">{type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => handleTabChange("timeline")}
        >
          📅 Timeline
        </button>
        <button
          className={`tab ${activeTab === "labs" ? "active" : ""}`}
          onClick={() => handleTabChange("labs")}
        >
          🧪 Lab Results
        </button>
        <button
          className={`tab ${activeTab === "medications" ? "active" : ""}`}
          onClick={() => handleTabChange("medications")}
        >
          💊 Medications
        </button>
        <button
          className={`tab ${activeTab === "vitals" ? "active" : ""}`}
          onClick={() => handleTabChange("vitals")}
        >
          ❤️ Vital Trends
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <div className="timeline-tab">
            <div className="filters">
              <input
                type="date"
                placeholder="Start Date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
              <input
                type="date"
                placeholder="End Date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
              <select
                value={filters.recordType}
                onChange={(e) =>
                  setFilters({ ...filters, recordType: e.target.value })
                }
              >
                <option value="">All Types</option>
                <option value="diagnosis">Diagnosis</option>
                <option value="prescription">Prescription</option>
                <option value="lab_result">Lab Result</option>
                <option value="imaging">Imaging</option>
                <option value="vaccination">Vaccination</option>
                <option value="surgery">Surgery</option>
              </select>
            </div>

            <div className="timeline">
              {loading ? (
                <p>Loading records...</p>
              ) : timeline.length === 0 ? (
                <p>No records found</p>
              ) : (
                timeline.map((record) => (
                  <div key={record.id} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <h3>{record.title}</h3>
                      <p className="date">
                        📅 {new Date(record.date).toLocaleDateString()}
                      </p>
                      <p className="doctor">👨‍⚕️ {record.doctor}</p>
                      <p className="hospital">🏥 {record.hospital}</p>
                      {record.diagnosis && (
                        <p className="diagnosis">
                          <strong>Diagnosis:</strong> {record.diagnosis}
                        </p>
                      )}
                      <div className="record-indicators">
                        {record.hasMedications && (
                          <span className="indicator">💊 Medications</span>
                        )}
                        {record.hasLabResults && (
                          <span className="indicator">🧪 Lab Results</span>
                        )}
                        {record.hasVitals && (
                          <span className="indicator">❤️ Vitals</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Lab Results Tab */}
        {activeTab === "labs" && (
          <div className="labs-tab">
            {loading ? (
              <p>Loading lab results...</p>
            ) : labResults.length === 0 ? (
              <p>No lab results found</p>
            ) : (
              <div className="lab-results-table">
                <table>
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Value</th>
                      <th>Unit</th>
                      <th>Normal Range</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Doctor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labResults.map((result, idx) => (
                      <tr key={idx}>
                        <td>{result.testName}</td>
                        <td>{result.value}</td>
                        <td>{result.unit}</td>
                        <td>{result.normalRange}</td>
                        <td>
                          {result.isAbnormal ? (
                            <span className="abnormal">⚠️ Abnormal</span>
                          ) : (
                            <span className="normal">✓ Normal</span>
                          )}
                        </td>
                        <td>{new Date(result.date).toLocaleDateString()}</td>
                        <td>{result.doctor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Medications Tab */}
        {activeTab === "medications" && (
          <div className="medications-tab">
            {loading ? (
              <p>Loading medications...</p>
            ) : medications.length === 0 ? (
              <p>No medications found</p>
            ) : (
              <div className="medications-grid">
                {medications.map((med, idx) => (
                  <div key={idx} className="medication-card">
                    <h3>{med.name}</h3>
                    <div className="med-details">
                      <p>
                        <strong>Dosage:</strong> {med.dosage}
                      </p>
                      <p>
                        <strong>Frequency:</strong> {med.frequency}
                      </p>
                      <p>
                        <strong>Duration:</strong> {med.duration}
                      </p>
                      {med.notes && (
                        <p>
                          <strong>Notes:</strong> {med.notes}
                        </p>
                      )}
                      <p className="prescribed">
                        📅 {new Date(med.prescribedDate).toLocaleDateString()}
                      </p>
                      <p className="doctor">👨‍⚕️ {med.prescribedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vital Trends Tab */}
        {activeTab === "vitals" && (
          <div className="vitals-tab">
            {loading ? (
              <p>Loading vital signs...</p>
            ) : vitalTrends.length === 0 ? (
              <p>No vital data found</p>
            ) : (
              <div className="vitals-chart">
                <h3>Blood Pressure Trends (Last 30 Days)</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reading</th>
                      <th>Doctor</th>
                      <th>Hospital</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitalTrends.map((trend, idx) => (
                      <tr key={idx}>
                        <td>{new Date(trend.date).toLocaleDateString()}</td>
                        <td>{trend.value}</td>
                        <td>{trend.doctor}</td>
                        <td>{trend.hospital}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
