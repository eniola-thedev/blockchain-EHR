// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 30000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("medchain_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("medchain_token");
      localStorage.removeItem("medchain_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

// ─── Auth ───────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  registerHospital: (data) => api.post("/auth/register/hospital", data),
  registerPatient: (data) => api.post("/auth/register/patient", data),
  registerPatientAsDoctor: (data) =>
    api.post("/auth/register/patient-by-doctor", data),
  registerDoctor: (data) => api.post("/auth/register/doctor", data),
  getMe: () => api.get("/auth/me"),
};

// ─── Records ────────────────────────────────────────────────────────
export const recordsAPI = {
  create: (data) => api.post("/records", data),
  getByPatient: (patientId, params) =>
    api.get(`/records/patient/${patientId}`, { params }),
  getById: (id) => api.get(`/records/${id}`),
  getPatientSummary: (patientId) => api.get(`/records/summary/${patientId}`),
  getMySummary: () => api.get("/records/my-summary"),
  uploadFile: (recordId, formData) =>
    api.post(`/records/${recordId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// ─── Hospitals ──────────────────────────────────────────────────────
export const hospitalsAPI = {
  getAll: () => api.get("/hospitals"),
  getById: (id) => api.get(`/hospitals/${id}`),
  getPatientHome: (patientId) =>
    api.get(`/hospitals/patient/${patientId}/home`),
  verify: (id) => api.patch(`/hospitals/${id}/verify`),
};

// ─── Access ─────────────────────────────────────────────────────────
export const accessAPI = {
  request: (data) => api.post("/access/request", data),
  grant: (requestId, data) => api.post(`/access/${requestId}/grant`, data),
  revoke: (requestId) => api.post(`/access/${requestId}/revoke`),
  getIncoming: (params) => api.get("/access/incoming", { params }),
  getOutgoing: () => api.get("/access/outgoing"),
  checkAccess: (patientId) => api.get(`/access/check/${patientId}`),
  getAvailableHospitals: (search) =>
    api.get("/access/hospitals/available", { params: { search } }),
};

// ─── Audit ──────────────────────────────────────────────────────────
export const auditAPI = {
  getLogs: (params) => api.get("/audit", { params }),
  getPatientLogs: (patientId) => api.get(`/audit/patient/${patientId}`),
};

export default api;
