import React, { useState, useEffect } from "react";
import Sidebar from "../components/shared/Sidebar";
import { useAuth } from "../context/AuthContext";
import { auditAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  Calendar,
  Filter,
  User,
  Lock,
  Eye,
  Download,
  AlertCircle,
  Clock,
} from "lucide-react";

export default function AuditTrailPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: "",
    userId: "",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { ...filter };
      // Remove empty filters
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await auditAPI.getLogs(params);
      setLogs(res.data.logs || []);
    } catch (err) {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const csv = [
      ["Timestamp", "Action", "User", "Hospital", "Details", "IP Address"],
      ...logs.map((l) => [
        new Date(l.createdAt).toLocaleString(),
        l.action,
        l.performedBy?.email || "System",
        l.hospitalId?.name || "—",
        JSON.stringify(l.details || {}),
        l.ipAddress,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const ACTION_COLORS = {
    LOGIN: "primary",
    LOGOUT: "secondary",
    ACCESS_GRANTED: "success",
    ACCESS_REVOKED: "danger",
    RECORD_CREATED: "primary",
    RECORD_VIEWED: "accent",
    PATIENT_REGISTERED: "success",
    DOCTOR_REGISTERED: "success",
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">
            Complete transparency of all system access and actions
          </p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <h3 className="card-title mb-4">Filters</h3>
          <div className="grid-4">
            <div className="form-group">
              <label className="form-label">Action</label>
              <select
                className="form-select"
                value={filter.action}
                onChange={(e) =>
                  setFilter({ ...filter, action: e.target.value })
                }
              >
                <option value="">All Actions</option>
                <option value="LOGIN">Login</option>
                <option value="ACCESS_GRANTED">Access Granted</option>
                <option value="ACCESS_REVOKED">Access Revoked</option>
                <option value="RECORD_CREATED">Record Created</option>
                <option value="RECORD_VIEWED">Record Viewed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input
                className="form-input"
                type="date"
                value={filter.dateFrom}
                onChange={(e) =>
                  setFilter({ ...filter, dateFrom: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input
                className="form-input"
                type="date"
                value={filter.dateTo}
                onChange={(e) =>
                  setFilter({ ...filter, dateTo: e.target.value })
                }
              />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <button className="btn btn-primary" onClick={fetchLogs}>
                <Filter size={16} /> Apply
              </button>
              <button
                className="btn btn-outline"
                onClick={exportLogs}
                disabled={logs.length === 0}
              >
                <Download size={16} /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Activity Log</h3>
            <span style={{ fontSize: 13, color: "var(--text-2)" }}>
              {logs.length} events
            </span>
          </div>

          {loading ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text-2)",
              }}
            >
              <span className="spinner" style={{ width: 24, height: 24 }} />
              <p style={{ marginTop: 8 }}>Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text-2)",
              }}
            >
              <AlertCircle
                size={40}
                style={{ marginBottom: 16, opacity: 0.5 }}
              />
              <p>No logs found matching your filters</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Details</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={idx}>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 13,
                          }}
                        >
                          <Clock size={14} style={{ color: "var(--text-3)" }} />
                          <span>
                            {new Date(log.createdAt).toLocaleDateString()}{" "}
                            <br />
                            <span
                              style={{ color: "var(--text-3)", fontSize: 12 }}
                            >
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            background: `var(--${ACTION_COLORS[log.action] || "primary"}-bg)`,
                            color: `var(--${ACTION_COLORS[log.action] || "primary"})`,
                            padding: "4px 10px",
                            borderRadius: 16,
                            fontSize: 12,
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 13,
                          }}
                        >
                          <User size={14} style={{ color: "var(--primary)" }} />
                          <div>
                            <strong>
                              {log.performedBy?.email || "System"}
                            </strong>
                            <br />
                            <span
                              style={{ color: "var(--text-3)", fontSize: 12 }}
                            >
                              {log.performedBy?.firstName
                                ? `${log.performedBy.firstName} ${log.performedBy.lastName}`
                                : "System"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code
                          style={{
                            fontSize: 12,
                            color: "var(--primary)",
                            background: "var(--bg-3)",
                            padding: "4px 8px",
                            borderRadius: 4,
                          }}
                        >
                          {JSON.stringify(log.details || {}).slice(0, 50)}…
                        </code>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: "monospace",
                            color: "var(--text-2)",
                          }}
                        >
                          {log.ipAddress || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
