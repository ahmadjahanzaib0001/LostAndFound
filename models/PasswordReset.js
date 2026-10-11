const mongoose = require("mongoose");

// One pending password-reset code per email; MongoDB deletes it 10 minutes after createdAt.
const resetSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, expires: 600 },
});

module.exports = mongoose.model("PasswordReset", resetSchema);
