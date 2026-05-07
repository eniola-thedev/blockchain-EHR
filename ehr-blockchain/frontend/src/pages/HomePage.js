import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Shield,
  Lock,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    navigate("/");
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text-1)",
      }}
    >
      {/* Navigation */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
            fontWeight: 800,
            color: "var(--primary)",
          }}
        >
          🏥 MedChain
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/login")}
          >
            Sign In
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/register")}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        style={{
          paddingTop: 120,
          paddingBottom: 80,
          paddingLeft: 40,
          paddingRight: 40,
          textAlign: "center",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "10%",
            width: 400,
            height: 400,
            background:
              "radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)",
            borderRadius: "50%",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "56px",
            fontWeight: 800,
            marginBottom: 24,
            lineHeight: 1.1,
            position: "relative",
            zIndex: 1,
          }}
        >
          Secure Healthcare Records on the Blockchain
        </h1>

        <p
          style={{
            fontSize: "18px",
            color: "var(--text-2)",
            marginBottom: 40,
            maxWidth: "600px",
            margin: "0 auto 40px",
            lineHeight: 1.6,
          }}
        >
          MedChain revolutionizes patient data management with immutable
          blockchain records, encrypted storage, and seamless inter-hospital
          access control.
        </p>

        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            marginBottom: 80,
          }}
        >
          <button
            className="btn btn-primary"
            onClick={() => navigate("/register")}
          >
            Start Free Trial <ArrowRight size={16} />
          </button>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/login")}
          >
            Sign In
          </button>
        </div>

        {/* Feature Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            marginBottom: 60,
          }}
        >
          {[
            {
              icon: Shield,
              title: "Blockchain Security",
              desc: "Immutable record keeping with cryptographic verification",
            },
            {
              icon: Lock,
              title: "End-to-End Encryption",
              desc: "Patient data encrypted with military-grade standards",
            },
            {
              icon: TrendingUp,
              title: "Real-time Analytics",
              desc: "Track vital signs and health trends instantly",
            },
            {
              icon: Users,
              title: "Hospital Network",
              desc: "Seamless inter-hospital patient record sharing",
            },
            {
              icon: Zap,
              title: "Emergency Access",
              desc: "Instant access to critical records in emergencies",
            },
            {
              icon: Check,
              title: "Audit Trail",
              desc: "Complete transparency of all record access",
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "24px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--primary-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary)",
                  marginBottom: 16,
                }}
              >
                <feature.icon size={24} />
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-2)",
                  lineHeight: 1.5,
                }}
              >
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section
        style={{
          background: "var(--surface)",
          padding: "60px 40px",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 40,
            maxWidth: "1200px",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          {[
            { number: "5+", label: "Hospital Networks" },
            { number: "50+", label: "Patient Records" },
            { number: "100%", label: "Blockchain Backed" },
            { number: "24/7", label: "Emergency Access" },
          ].map((stat, idx) => (
            <div key={idx}>
              <div
                style={{
                  fontSize: "40px",
                  fontWeight: 800,
                  color: "var(--primary)",
                  marginBottom: 8,
                  fontFamily: "var(--font-display)",
                }}
              >
                {stat.number}
              </div>
              <div style={{ fontSize: 14, color: "var(--text-2)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          padding: "80px 40px",
          textAlign: "center",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "32px",
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          Ready to Transform Healthcare?
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "var(--text-2)",
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          Join leading hospitals in creating a secure, transparent healthcare
          network powered by blockchain technology.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/register")}
          >
            Create Account <ArrowRight size={16} />
          </button>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/login")}
          >
            Already a member?
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "40px",
          textAlign: "center",
          color: "var(--text-3)",
          fontSize: "14px",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          © 2026 MedChain. Securing Healthcare Records with Blockchain.
        </div>
        <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
          <a
            href="#"
            style={{ color: "var(--primary)", textDecoration: "none" }}
          >
            Privacy
          </a>
          <a
            href="#"
            style={{ color: "var(--primary)", textDecoration: "none" }}
          >
            Terms
          </a>
          <a
            href="#"
            style={{ color: "var(--primary)", textDecoration: "none" }}
          >
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}
