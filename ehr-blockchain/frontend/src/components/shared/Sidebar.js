// src/components/shared/Sidebar.js
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  ArrowLeftRight,
  ShieldCheck,
  LogOut,
  Activity,
  Building2,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const NAV = {
  patient: [{ label: "My Records", icon: FileText, path: "/patient" }],
  doctor: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/doctor" },
    { label: "Patients", icon: Users, path: "/doctor" },
  ],
  hospital: [
    { label: "Overview", icon: LayoutDashboard, path: "/hospital" },
    { label: "Doctors", icon: Users, path: "/hospital" },
    { label: "Access Reqs", icon: ArrowLeftRight, path: "/access" },
    { label: "Audit Trail", icon: ClipboardList, path: "/audit" },
  ],
  admin: [
    { label: "Overview", icon: LayoutDashboard, path: "/hospital" },
    { label: "Hospitals", icon: Building2, path: "/hospital" },
    { label: "Audit Trail", icon: ClipboardList, path: "/audit" },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = NAV[user?.role] || [];

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">M</div>
          MedChain
        </div>
      </div>

      <nav style={{ flex: 1, padding: "0 0 16px" }}>
        <div className="nav-section">Navigation</div>
        {navItems.map((item) => (
          <button
            key={item.path + item.label}
            className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <item.icon className="nav-icon" size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ padding: "8px 12px 12px", fontSize: 13 }}>
          <div
            style={{ color: "var(--text-1)", fontWeight: 500, marginBottom: 2 }}
          >
            {user?.firstName
              ? `${user.firstName} ${user.lastName || ""}`
              : user?.email}
          </div>
          <div
            style={{
              color: "var(--text-3)",
              fontSize: 12,
              textTransform: "capitalize",
            }}
          >
            {user?.role}
            {user?.hospitalId?.name && ` · ${user.hospitalId.name}`}
          </div>
        </div>
        <button className="nav-item" onClick={handleLogout}>
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
