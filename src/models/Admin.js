const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
