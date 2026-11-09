const mongoose = require("mongoose");

const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Ready for Shipment",
  "Shipped",
  "Delivered",
  "Cancelled",
];
const PAYMENT_STATUSES = ["Pending", "Confirmed", "Failed", "Refunded"];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    idempotencyKey: { type: String, required: true, unique: true, select: false },
    customer: {
      name: { type: String, required: true, maxlength: 120 },
      email: { type: String, default: "", maxlength: 254 },
      phone: { type: String, required: true, maxlength: 30 },
      city: { type: String, required: true, maxlength: 80 },
      address: { type: String, required: true, maxlength: 500 },
    },
    items: [
      {
        productId: { type: String, required: true },
        sku: { type: String, required: true },
        title: { type: String, required: true },
        imageUrl: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1, max: 99 },
        unitPrice: { type: Number, required: true, min: 1 },
        customization: { type: String, default: "", maxlength: 300 },
      },
    ],
    giftNote: { type: String, default: "", maxlength: 300 },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["Cash on Delivery (COD)", "JazzCash / EasyPaisa", "Bank Transfer"],
      required: true,
    },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "Pending" },
    status: { type: String, enum: ORDER_STATUSES, default: "Pending" },
    trackingNumber: { type: String, default: "" },
    trackingProvider: { type: String, default: "", maxlength: 100 },
    internalNotes: { type: String, default: "", maxlength: 3000 },
    statusHistory: [
      {
        status: { type: String, enum: ORDER_STATUSES, required: true },
        at: { type: Date, default: Date.now },
        note: { type: String, default: "", maxlength: 300 },
      },
    ],
    stockReleased: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = {
  Order: mongoose.models.Order || mongoose.model("Order", orderSchema),
  ORDER_STATUSES,
  PAYMENT_STATUSES,
};
