const mongoose = require("mongoose");

// Holds a registration until the emailed code is confirmed.
// MongoDB deletes each document automatically 10 minutes after createdAt.
const pendingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // bcrypt hash
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, expires: 600 },
});

module.exports = mongoose.model("PendingUser", pendingSchema);
