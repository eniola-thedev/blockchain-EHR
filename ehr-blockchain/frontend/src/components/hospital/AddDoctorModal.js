// src/components/hospital/AddDoctorModal.js
import React, { useState } from "react";
import { authAPI } from "../../services/api";
import toast from "react-hot-toast";
import { X, UserPlus } from "lucide-react";

export default function AddDoctorModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    firstName:"", lastName:"", email:"", password:"",
    doctorLicense:"", specialization:"", department:""
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    if (!form.email || !form.password || !form.firstName) return toast.error("Fill required fields");
    setSaving(true);
    try {
      await authAPI.registerDoctor(form);
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to register doctor");
    } finally { setSaving(false); }
  };

  const SPECIALIZATIONS = [
    "General Practice","Cardiology","Neurology","Orthopedics",
    "Pediatrics","Obstetrics & Gynecology","Surgery","Radiology",
    "Pathology","Emergency Medicine","Internal Medicine","Oncology"
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 className="modal-title" style={{ marginBottom:0 }}>Add Doctor</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input className="form-input" placeholder="John" value={form.firstName} onChange={set("firstName")}/>
          </div>
          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input className="form-input" placeholder="Smith" value={form.lastName} onChange={set("lastName")}/>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Email Address *</label>
          <input className="form-input" type="email" placeholder="doctor@hospital.com" value={form.email} onChange={set("email")}/>
        </div>
        <div className="form-group">
          <label className="form-label">Password *</label>
          <input className="form-input" type="password" placeholder="Min 8 characters" value={form.password} onChange={set("password")}/>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">License Number</label>
            <input className="form-input" placeholder="MDCN-XXXXX" value={form.doctorLicense} onChange={set("doctorLicense")}/>
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input className="form-input" placeholder="e.g. Cardiology" value={form.department} onChange={set("department")}/>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Specialization</label>
          <select className="form-select" value={form.specialization} onChange={set("specialization")}>
            <option value="">Select specialization…</option>
            {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <button className="btn btn-primary" style={{ flex:1, justifyContent:"center" }}
            onClick={submit} disabled={saving}>
            {saving ? <><span className="spinner" style={{width:16,height:16}}/> Registering…</> : <><UserPlus size={16}/> Add Doctor</>}
          </button>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
