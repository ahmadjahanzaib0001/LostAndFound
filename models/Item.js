const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["lost", "found"], required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "In Review", "Claimed", "Resolved"], default: "Pending" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);
