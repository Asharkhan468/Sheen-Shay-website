const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, default: "", maxlength: 240 },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Category || mongoose.model("Category", categorySchema);
