const crypto = require("node:crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const Category = require("../models/Category");
const Product = require("../models/Product");
const { Order } = require("../models/Order");
const { asyncRoute, cleanText, HttpError } = require("../http");
const { storefrontProduct } = require("../serializers");
const { calculateOrderTotals } = require("../orderRules");

const router = express.Router();
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many order attempts. Please wait and try again." },
});
const trackingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

router.get(
  "/products",
  asyncRoute(async (_req, res) => {
    const products = await Product.find({ active: true }).sort({ featured: -1, createdAt: -1 }).lean();
    res.set("Cache-Control", "no-cache, must-revalidate");
    res.json({ products: products.map(storefrontProduct) });
  }),
);

router.get(
  "/categories",
  asyncRoute(async (_req, res) => {
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.set("Cache-Control", "no-cache, must-revalidate");
    res.json({ categories: categories.map(({ _id, name, slug, description }) => ({ id: _id, name, slug, description })) });
  }),
);

function normalizePhone(phone) {
  return phone.replace(/\D/g, "");
}

async function reserveStock(items) {
  const reservations = [];
  for (const item of items) {
    if (item.stockQuantity === null || item.stockQuantity === undefined) continue;
    const result = await Product.updateOne(
      { _id: item.productId, active: true, stockQuantity: { $gte: item.quantity } },
      { $inc: { stockQuantity: -item.quantity } },
    );
    if (!result.modifiedCount) {
      await releaseStock(reservations);
      throw new HttpError(409, `${item.title} is no longer available in the requested quantity.`);
    }
    reservations.push({
      productId: item.productId,
      quantity: item.quantity,
      previousStatus: item.stockStatus,
    });
    const remaining = item.stockQuantity - item.quantity;
    await Product.updateOne(
      { _id: item.productId },
      { $set: { stockStatus: remaining === 0 ? "Out of Stock" : item.stockStatus } },
    );
  }
  return reservations;
}

async function releaseStock(reservations) {
  for (const reservation of reservations) {
    await Product.updateOne(
      { _id: reservation.productId },
      {
        $inc: { stockQuantity: reservation.quantity },
        $set: { stockStatus: reservation.previousStatus },
      },
    );
  }
}

function validateOrderInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "A valid order is required.");
  }
  const name = cleanText(body.name, 120, "Name", { required: true });
  const phone = cleanText(body.phone, 30, "Phone", { required: true });
  const city = cleanText(body.city, 80, "City", { required: true });
  const address = cleanText(body.address, 500, "Address", { required: true });
  const email = cleanText(body.email || "", 254, "Email");
  if (!/^03\d{9}$/.test(normalizePhone(phone))) {
    throw new HttpError(400, "Enter a valid Pakistani mobile number.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  if (!["Cash on Delivery (COD)", "JazzCash / EasyPaisa", "Bank Transfer"].includes(body.paymentMethod)) {
    throw new HttpError(400, "Select a valid payment method.");
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) {
    throw new HttpError(400, "Your cart must contain between 1 and 30 products.");
  }
  const quantities = new Map();
  for (const row of body.items) {
    if (!row || typeof row.productId !== "string" || row.productId.length > 80) {
      throw new HttpError(400, "A cart item is invalid.");
    }
    const quantity = Number(row.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new HttpError(400, "Each item quantity must be between 1 and 99.");
    }
    quantities.set(row.productId, (quantities.get(row.productId) || 0) + quantity);
  }
  for (const quantity of quantities.values()) {
    if (quantity > 99) throw new HttpError(400, "A product quantity cannot exceed 99.");
  }
  const idempotencyKey = body.idempotencyKey;
  if (typeof idempotencyKey !== "string" || !/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
    throw new HttpError(400, "Refresh checkout and try placing your order again.");
  }
  if (body.coupon && body.coupon !== "SHEEN10") {
    throw new HttpError(400, "The promotion code is not valid.");
  }
  return {
    name,
    phone: normalizePhone(phone),
    city,
    address,
    email,
    paymentMethod: body.paymentMethod,
    giftNote: cleanText(body.giftNote || "", 300, "Gift note"),
    coupon: body.coupon || "",
    idempotencyKey,
    quantities,
  };
}

router.post(
  "/orders",
  orderLimiter,
  asyncRoute(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const input = validateOrderInput(req.body);
    const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey }).select("+idempotencyKey");
    if (existing) return res.status(200).json({ order: customerReceipt(existing) });

    const productIds = [...input.quantities.keys()];
    const products = await Product.find({ _id: { $in: productIds }, active: true });
    if (products.length !== productIds.length) {
      throw new HttpError(409, "One or more products are no longer available. Refresh your cart and try again.");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const items = [...input.quantities].map(([productId, quantity]) => {
      const product = productMap.get(productId);
      if (product.stockStatus === "Out of Stock" || product.stockQuantity === 0) {
        throw new HttpError(409, `${product.title} is out of stock.`);
      }
      const unitPrice = product.saleEnabled ? product.salePrice : product.price;
      return {
        productId,
        sku: product.sku,
        title: product.title,
        imageUrl: product.images[0].url,
        quantity,
        unitPrice,
      };
    });

    const { subtotal, discountAmount, deliveryFee, total } = calculateOrderTotals(items, input.coupon);
    const orderNumber = `SS-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const reservations = await reserveStock(items.map((item) => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        title: item.title,
        quantity: item.quantity,
        stockQuantity: product.stockQuantity,
        stockStatus: product.stockStatus,
      };
    }));

    try {
      const order = await Order.create({
        orderNumber,
        idempotencyKey: input.idempotencyKey,
        customer: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          city: input.city,
          address: input.address,
        },
        items,
        giftNote: input.giftNote,
        subtotal,
        discountAmount,
        deliveryFee,
        total,
        paymentMethod: input.paymentMethod,
        statusHistory: [{ status: "Pending", note: "Order placed" }],
      });
      return res.status(201).json({ order: customerReceipt(order) });
    } catch (error) {
      await releaseStock(reservations);
      if (error.code === 11000) {
        const duplicate = await Order.findOne({ idempotencyKey: input.idempotencyKey });
        if (duplicate) return res.status(200).json({ order: customerReceipt(duplicate) });
      }
      throw error;
    }
  }),
);

function customerReceipt(order) {
  return {
    orderNumber: order.orderNumber,
    date: order.createdAt || new Date(),
    customerName: order.customer.name,
    city: order.customer.city,
    paymentMethod: order.paymentMethod,
    items: order.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    deliveryFee: order.deliveryFee,
    total: order.total,
  };
}

router.post(
  "/orders/track",
  trackingLimiter,
  asyncRoute(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const orderNumber = cleanText(req.body?.orderNumber, 80, "Order number", { required: true }).toUpperCase();
    const phone = cleanText(req.body?.phone, 30, "Phone", { required: true });
    const order = await Order.findOne({ orderNumber, archivedAt: null });
    if (!order || normalizePhone(order.customer.phone) !== normalizePhone(phone)) {
      throw new HttpError(404, "No order found. Check the order number and phone number and try again.");
    }
    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.trackingNumber,
      trackingProvider: order.trackingProvider,
      placedAt: order.createdAt,
      updatedAt: order.updatedAt,
      statusHistory: order.statusHistory.map(({ status, at }) => ({ status, at })),
    });
  }),
);

module.exports = router;
module.exports.validateOrderInput = validateOrderInput;
