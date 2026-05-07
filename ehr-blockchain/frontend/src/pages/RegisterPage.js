// src/pages/RegisterPage.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";
import { Activity, Building2 } from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
    phone: "",
    address: "",
    country: "Nigeria",
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword)
      return toast.error("Passwords do not match");
    if (form.password.length < 8)
      return toast.error("Password must be at least 8 characters");
    setSaving(true);
    try {
      await authAPI.registerHospital(form);
      toast.success("Hospital registered and verified! You can now log in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div className="auth-logo-mark">
              <Activity size={26} />
            </div>
          </div>
          <h1 className="auth-title">Register Hospital</h1>
          <p className="auth-subtitle">Join the MedChain blockchain network</p>
        </div>

        <form onSubmit={submit}>
          {/* Hospital + License */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Hospital Name *</label>
              <input
                className="form-input"
                value={form.name}
                onChange={set("name")}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">License Number *</label>
              <input
                className="form-input"
                value={form.licenseNumber}
                onChange={set("licenseNumber")}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={set("email")}
              required
            />
          </div>

          {/* Passwords */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={set("password")}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input
                className="form-input"
                type="password"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                required
              />
            </div>
          </div>

          {/* Phone + Country */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={set("phone")}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Country</label>
              <select
                className="form-select"
                value={form.country}
                onChange={set("country")}
              >
                {[
                  "Nigeria",
                  "Ghana",
                  "Kenya",
                  "South Africa",
                  "Uganda",
                  "Tanzania",
                  "Ethiopia",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              className="form-input"
              value={form.address}
              onChange={set("address")}
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={saving}
          >
            {saving ? "Registering..." : "Register Hospital"}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: "center", marginTop: 20 }}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
