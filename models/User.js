const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash
    role: { type: String, enum: ["user", "admin"], required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    phone: { type: String, default: "" },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: "" },
    twoFactorPending: { type: String, default: "" },
    twoFactorLastStep: { type: Number, default: 0 },
    recoveryCodes: { type: [String], default: [] },
    avatarUrl: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
