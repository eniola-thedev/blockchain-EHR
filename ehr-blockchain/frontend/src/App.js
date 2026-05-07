// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientPortal from "./pages/PatientPortal";
import HospitalDashboard from "./pages/HospitalDashboard";
import AccessRequests from "./pages/AccessRequests";
import InterHospitalRecordRequest from "./pages/InterHospitalRecordRequest";
import PatientRecords from "./pages/PatientRecords";
import AuditTrailPage from "./pages/AuditTrailPage";
import "./styles/globals.css";

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/home" replace />;
  // Route doctors directly to doctor dashboard, not hospital dashboard
  switch (user.role) {
    case "patient":
      return <Navigate to="/patient" replace />;
    case "doctor":
      return <Navigate to="/doctor" replace />;
    case "hospital":
      return <Navigate to="/hospital" replace />;
    case "admin":
      return <Navigate to="/hospital" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/patient"
            element={
              <ProtectedRoute roles={["patient"]}>
                <PatientPortal />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor"
            element={
              <ProtectedRoute roles={["doctor"]}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hospital"
            element={
              <ProtectedRoute roles={["hospital", "admin"]}>
                <HospitalDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/access"
            element={
              <ProtectedRoute roles={["hospital", "admin"]}>
                <AccessRequests />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inter-hospital"
            element={
              <ProtectedRoute roles={["hospital", "admin"]}>
                <InterHospitalRecordRequest />
              </ProtectedRoute>
            }
          />

          <Route
            path="/audit"
            element={
              <ProtectedRoute roles={["hospital", "admin"]}>
                <AuditTrailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/records/:patientId"
            element={
              <ProtectedRoute roles={["doctor", "hospital", "admin"]}>
                <PatientRecords />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
