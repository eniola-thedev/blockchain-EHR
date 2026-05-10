// models/User.js
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema({
  // Shared fields
  email: {
    type:     String,
    required: true,
    unique:   true,
    lowercase: true,
    trim:     true,
  },
  password: {
    type:     String,
    required: true,
    select:   false, // never returned in queries by default
  },
  role: {
    type:    String,
    enum:    ["admin", "hospital", "doctor", "patient"],
    required: true,
  },
  isActive: { type: Boolean, default: true },

  // Hospital fields
  hospitalId:   { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
  registeredHospitals: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hospital" }], // Hospitals where patient is registered
  walletAddress: { type: String }, // Ethereum address for blockchain interactions

  // Doctor fields
  doctorLicense: String,
  specialization: String,
  department:    String,

  // Patient fields
  patientId: {
    type:   String,
    unique: true,
    sparse: true, // only unique if set
  },
  firstName:  String,
  lastName:   String,
  dateOfBirth: Date,
  gender:     { type: String, enum: ["male", "female", "other"] },
  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  },
  genotype:   { type: String, enum: ["AA", "AS", "SS", "AC", "SC"] },
  phone:      String,
  address:    String,
  emergencyContact: {
    name:  String,
    phone: String,
    relationship: String,
  },

}, { timestamps: true });

// Hash password before save
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
