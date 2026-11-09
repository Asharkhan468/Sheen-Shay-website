const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");

const productSchema = new mongoose.Schema(
  {
    _id: { type: String, default: randomUUID },
    sku: { type: String, required: true, trim: true, uppercase: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    price: { type: Number, required: true, min: 1 },
    saleEnabled: { type: Boolean, default: false },
    salePrice: { type: Number, default: null, min: 1 },
    images: {
      type: [
        {
          url: { type: String, required: true, maxlength: 2000 },
          publicId: { type: String, default: "" },
          alt: { type: String, default: "", maxlength: 200 },
        },
      ],
      validate: [(images) => images.length > 0 && images.length <= 8, "Products require 1 to 8 images."],
    },
    stockQuantity: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (value) => value === null || Number.isSafeInteger(value),
        message: "Stock quantity must be a whole number or left untracked.",
      },
    },
    stockStatus: {
      type: String,
      enum: ["In Stock", "Limited Stock", "Out of Stock"],
      default: "In Stock",
    },
    rating: { type: Number, default: null, min: 0, max: 5 },
    customizationOptions: {
      type: [{ type: String, trim: true, maxlength: 120 }],
      default: [],
      validate: [(items) => items.length <= 20, "A product may have at most 20 customization options."],
    },
    tags: {
      type: [{ type: String, trim: true, maxlength: 40 }],
      default: [],
      validate: [(items) => items.length <= 20, "A product may have at most 20 tags."],
    },
    metaTitle: { type: String, default: "", maxlength: 160 },
    metaDescription: { type: String, default: "", maxlength: 320 },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.pre("validate", function validateSale(next) {
  if (this.saleEnabled && (!this.salePrice || this.salePrice >= this.price)) {
    this.invalidate("salePrice", "Sale price must be lower than the regular price.");
  }
  if (!this.saleEnabled) this.salePrice = null;
  next();
});

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
