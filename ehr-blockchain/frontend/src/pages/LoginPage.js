// src/pages/LoginPage.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Activity, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back!`);
      switch (user.role) {
        case "patient":
          navigate("/patient");
          break;
        case "doctor":
          navigate("/doctor");
          break;
        default:
          navigate("/hospital");
          break;
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div className="auth-logo-mark">
              <Activity size={26} />
            </div>
          </div>
          <h1 className="auth-title">MedChain EHR</h1>
          <p className="auth-subtitle">
            Secure blockchain-powered health records
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@hospital.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: "relative" }}>
              <input
                className="form-input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-3)",
                  display: "flex",
                  padding: 0,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            style={{ marginTop: 8, justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} />{" "}
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 14,
            color: "var(--text-2)",
          }}
        >
          New hospital?{" "}
          <Link to="/register" style={{ color: "var(--primary)" }}>
            Register here
          </Link>
        </p>

        {/* Demo credentials hint */}
        <div
          style={{
            marginTop: 24,
            padding: "12px 16px",
            background: "var(--bg-3)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            fontSize: 13,
          }}
        >
          <div
            style={{
              color: "var(--text-3)",
              marginBottom: 6,
              fontWeight: 600,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Demo Accounts
          </div>
          {[
            ["Hospital A Admin", "admin@central.com", "Admin@1234"],
            ["Hospital B Admin", "admin@sunshine.com", "Admin@1234"],
            ["Doctor (Central)", "dr.smith@central.com", "Test@1234"],
            ["Doctor (Sunshine)", "dr.johnson@sunshine.com", "Test@1234"],
            ["Patient", "patient@demo.com", "Patient@1234"],
          ].map(([role, email, password]) => (
            <div
              key={role}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              <span style={{ color: "var(--text-2)" }}>{role}</span>
              <button
                type="button"
                onClick={() => setForm({ email, password })}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--primary)",
                  fontSize: 13,
                }}
              >
                {email}
              </button>
            </div>
          ))}
          <div style={{ color: "var(--text-3)", fontSize: 12, marginTop: 4 }}>
            Hospital: <code style={{ color: "var(--text-2)" }}>Admin@1234</code>{" "}
            &nbsp;|&nbsp; Doctor:{" "}
            <code style={{ color: "var(--text-2)" }}>Test@1234</code>{" "}
            &nbsp;|&nbsp; Patient:{" "}
            <code style={{ color: "var(--text-2)" }}>Patient@1234</code>
          </div>
        </div>
      </div>
    </div>
  );
}
