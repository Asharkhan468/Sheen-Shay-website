const crypto = require("node:crypto");
const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Category = require("../models/Category");
const Product = require("../models/Product");
const { Order, ORDER_STATUSES, PAYMENT_STATUSES } = require("../models/Order");
const { asyncRoute, cleanText, HttpError, positiveInteger } = require("../http");
const { adminOrder, adminProduct } = require("../serializers");
const { requireAdmin, requireCsrf } = require("../middleware/auth");

const router = express.Router();
router.use(requireAdmin);
router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
router.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return requireCsrf(req, res, next);
  next();
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.mimetype)) {
      return callback(new HttpError(400, "Upload a JPEG, PNG, WebP, or AVIF image."));
    }
    callback(null, true);
  },
});
const imageUploadLimiter = require("express-rate-limit")({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function safeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseList(value, field, limit) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > limit) {
    throw new HttpError(400, `${field} must be a list of at most ${limit} entries.`);
  }
  return value.map((item) => cleanText(item, field === "tags" ? 40 : 120, field, { required: true }));
}

function parseImages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw new HttpError(400, "Add between 1 and 8 product images.");
  }
  return value.map((image) => {
    if (!image || typeof image !== "object") throw new HttpError(400, "A product image is invalid.");
    let url;
    try {
      url = new URL(cleanText(image.url, 2000, "Image URL", { required: true }));
    } catch {
      throw new HttpError(400, "Use a valid HTTPS image URL.");
    }
    if (url.protocol !== "https:") throw new HttpError(400, "Product image URLs must use HTTPS.");
    return {
      url: url.toString(),
      publicId: cleanText(image.publicId || "", 200, "Image ID"),
      alt: cleanText(image.alt || "", 200, "Image description"),
    };
  });
}

async function validateCategory(name) {
  const category = await Category.findOne({ name });
  if (!category) throw new HttpError(400, "Select an existing product category.");
  return category;
}

function booleanValue(value, field, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new HttpError(400, `${field} must be true or false.`);
  return value;
}

async function productValues(body, current) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "A valid product is required.");
  }
  const title = cleanText(body.title ?? current?.title, 140, "Product name", { required: true });
  const categoryName = cleanText(body.category ?? current?.category, 80, "Category", { required: true });
  await validateCategory(categoryName);
  const description = cleanText(body.description ?? current?.description, 3000, "Description", { required: true });
  const price = positiveInteger(body.price ?? current?.price, "Regular price");
  if (price < 1 || price > 100000000) throw new HttpError(400, "Regular price must be between PKR 1 and PKR 100,000,000.");
  const saleEnabled = booleanValue(body.saleEnabled, "Sale status", Boolean(current?.saleEnabled));
  const salePrice = saleEnabled
    ? positiveInteger(body.salePrice ?? current?.salePrice, "Sale price")
    : null;
  if (saleEnabled && (salePrice < 1 || salePrice >= price)) {
    throw new HttpError(400, "Sale price must be lower than the regular price.");
  }
  const images = body.images === undefined && current ? current.images : parseImages(body.images);
  const stockQuantity = body.stockQuantity === undefined && current
    ? current.stockQuantity
    : positiveInteger(body.stockQuantity, "Stock quantity", { optional: true });
  const stockStatus = body.stockStatus === undefined ? current?.stockStatus || "In Stock" : body.stockStatus;
  if (!["In Stock", "Limited Stock", "Out of Stock"].includes(stockStatus)) {
    throw new HttpError(400, "Select a valid stock status.");
  }
  const skuInput = body.sku === undefined ? current?.sku : body.sku;
  const sku = cleanText(skuInput || `SS-${crypto.randomBytes(4).toString("hex")}`, 40, "SKU", { required: true })
    .toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{1,39}$/.test(sku)) {
    throw new HttpError(400, "SKU may contain letters, numbers, dots, underscores, and hyphens.");
  }
  const rating = body.rating === undefined ? current?.rating ?? null : body.rating;
  if (rating !== null && (!Number.isFinite(Number(rating)) || Number(rating) < 0 || Number(rating) > 5)) {
    throw new HttpError(400, "Rating must be between 0 and 5, or left blank.");
  }
  return {
    sku,
    title,
    slug: slugify(title),
    category: categoryName,
    description,
    price,
    saleEnabled,
    salePrice,
    images,
    stockQuantity,
    stockStatus: stockQuantity === 0 ? "Out of Stock" : stockStatus,
    rating: rating === null || rating === "" ? null : Number(rating),
    customizationOptions: parseList(body.customizationOptions, "customization options", 20) ?? current?.customizationOptions ?? [],
    tags: parseList(body.tags, "tags", 20) ?? current?.tags ?? [],
    featured: booleanValue(body.featured, "Featured status", current?.featured || false),
    active: booleanValue(body.active, "Active status", current?.active ?? true),
    metaTitle: cleanText(body.metaTitle ?? current?.metaTitle ?? "", 160, "SEO title"),
    metaDescription: cleanText(body.metaDescription ?? current?.metaDescription ?? "", 320, "SEO description"),
  };
}

router.get(
  "/dashboard",
  asyncRoute(async (_req, res) => {
    const [activeProducts, openOrders, pendingPayments, revenue, recentOrders] = await Promise.all([
      Product.countDocuments({ active: true }),
      Order.countDocuments({ archivedAt: null, status: { $nin: ["Delivered", "Cancelled"] } }),
      Order.countDocuments({ archivedAt: null, paymentStatus: "Pending" }),
      Order.aggregate([
        { $match: { archivedAt: null, status: { $ne: "Cancelled" }, paymentStatus: "Confirmed" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.find({ archivedAt: null }).sort({ createdAt: -1 }).limit(8),
    ]);
    res.json({
      stats: {
        activeProducts,
        openOrders,
        pendingPayments,
        confirmedRevenue: revenue[0]?.total || 0,
      },
      recentOrders: recentOrders.map(adminOrder),
    });
  }),
);

router.get(
  "/products",
  asyncRoute(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const filter = {};
    if (req.query.active === "true") filter.active = true;
    if (req.query.active === "false") filter.active = false;
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const regex = new RegExp(safeRegex(req.query.search.trim().slice(0, 100)), "i");
      filter.$or = [{ title: regex }, { sku: regex }, { category: regex }];
    }
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter),
    ]);
    res.json({ products: products.map(adminProduct), page, pages: Math.ceil(total / limit), total });
  }),
);

router.get(
  "/products/:id",
  asyncRoute(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new HttpError(404, "Product not found.");
    res.json({ product: adminProduct(product) });
  }),
);

router.post(
  "/products",
  asyncRoute(async (req, res) => {
    const product = await Product.create(await productValues(req.body));
    res.status(201).json({ product: adminProduct(product) });
  }),
);

router.patch(
  "/products/:id",
  asyncRoute(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new HttpError(404, "Product not found.");
    Object.assign(product, await productValues(req.body, product));
    await product.save();
    res.json({ product: adminProduct(product) });
  }),
);

router.delete(
  "/products/:id",
  asyncRoute(async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, { $set: { active: false } }, { new: true });
    if (!product) throw new HttpError(404, "Product not found.");
    res.json({ product: adminProduct(product) });
  }),
);

router.get(
  "/categories",
  asyncRoute(async (_req, res) => {
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.json({
      categories: categories.map(({ _id, name, slug, description, createdAt }) => ({
        id: _id, name, slug, description, createdAt,
      })),
    });
  }),
);

router.post(
  "/categories",
  asyncRoute(async (req, res) => {
    const name = cleanText(req.body?.name, 80, "Category name", { required: true });
    if (!/^[\p{L}\p{N} &'-]+$/u.test(name)) {
      throw new HttpError(400, "Category names may contain letters, numbers, spaces, apostrophes, ampersands, and hyphens.");
    }
    const slug = slugify(name);
    if (!slug) throw new HttpError(400, "Enter a valid category name.");
    const description = cleanText(req.body.description || "", 240, "Category description");
    const category = await Category.create({ name, slug, description });
    res.status(201).json({ category: { id: category.id, name: category.name, slug: category.slug, description: category.description } });
  }),
);

router.patch(
  "/categories/:id",
  asyncRoute(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new HttpError(404, "Category not found.");
    const name = cleanText(req.body?.name ?? category.name, 80, "Category name", { required: true });
    if (!/^[\p{L}\p{N} &'-]+$/u.test(name)) {
      throw new HttpError(400, "Category name contains unsupported characters.");
    }
    const description = cleanText(req.body?.description ?? category.description, 240, "Category description");
    const oldName = category.name;
    category.name = name;
    category.slug = slugify(name);
    category.description = description;
    await category.save();
    if (oldName !== name) await Product.updateMany({ category: oldName }, { $set: { category: name } });
    res.json({ category: { id: category.id, name: category.name, slug: category.slug, description: category.description } });
  }),
);

router.delete(
  "/categories/:id",
  asyncRoute(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) throw new HttpError(404, "Category not found.");
    const productCount = await Product.countDocuments({ category: category.name });
    if (productCount) throw new HttpError(409, "Move every product out of this category before deleting it.");
    await category.deleteOne();
    res.status(204).end();
  }),
);

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "sheen-shay/products",
        public_id: crypto.randomUUID(),
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(new HttpError(502, "The image could not be uploaded. Please try again."));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          alt: file.originalname.replace(/\.[^.]+$/, "").slice(0, 200),
        });
      },
    );
    stream.end(file.buffer);
  });
}

router.post(
  "/uploads",
  imageUploadLimiter,
  (req, res, next) => {
    imageUpload.array("images", 5)(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        const message = error.code === "LIMIT_FILE_SIZE"
          ? "Each image must be 8 MB or smaller."
          : "Upload no more than 5 images at a time.";
        return next(new HttpError(400, message));
      }
      if (error) return next(error);
      next();
    });
  },
  asyncRoute(async (req, res) => {
    if (!req.app.locals.cloudinaryConfigured) {
      throw new HttpError(503, "Image uploads are unavailable until Cloudinary is configured. You may use a public HTTPS image URL instead.");
    }
    if (!req.files?.length) throw new HttpError(400, "Choose at least one product image.");
    const images = await Promise.all(req.files.map(uploadToCloudinary));
    res.status(201).json({ images });
  }),
);

router.get(
  "/orders",
  asyncRoute(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const filter = { archivedAt: req.query.archived === "true" ? { $ne: null } : null };
    if (typeof req.query.status === "string" && ORDER_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (typeof req.query.paymentStatus === "string" && PAYMENT_STATUSES.includes(req.query.paymentStatus)) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const regex = new RegExp(safeRegex(req.query.search.trim().slice(0, 100)), "i");
      filter.$or = [
        { orderNumber: regex },
        { "customer.name": regex },
        { "customer.email": regex },
        { "customer.phone": regex },
      ];
    }
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Order.countDocuments(filter),
    ]);
    res.json({ orders: orders.map(adminOrder), page, pages: Math.ceil(total / limit), total });
  }),
);

router.get(
  "/orders/export.csv",
  asyncRoute(async (_req, res) => {
    const orders = await Order.find({ archivedAt: null }).sort({ createdAt: -1 }).limit(10000).lean();
    const fields = ["Order Number", "Date", "Customer", "Email", "Phone", "City", "Total PKR", "Payment Method", "Payment Status", "Status", "Tracking Number"];
    const cell = (value) => {
      let text = String(value ?? "");
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = orders.map((order) => [
      order.orderNumber,
      order.createdAt?.toISOString(),
      order.customer.name,
      order.customer.email,
      order.customer.phone,
      order.customer.city,
      order.total,
      order.paymentMethod,
      order.paymentStatus,
      order.status,
      order.trackingNumber,
    ]);
    res.type("text/csv").attachment(`sheen-shay-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send([fields, ...rows].map((row) => row.map(cell).join(",")).join("\r\n"));
  }),
);

router.get(
  "/orders/:id",
  asyncRoute(async (req, res) => {
    const order = await Order.findOne({ orderNumber: req.params.id });
    if (!order) throw new HttpError(404, "Order not found.");
    res.json({ order: adminOrder(order) });
  }),
);

router.patch(
  "/orders/:id",
  asyncRoute(async (req, res) => {
    const order = await Order.findOne({ orderNumber: req.params.id });
    if (!order) throw new HttpError(404, "Order not found.");
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError(400, "A valid order update is required.");
    }
    if (body.status !== undefined) {
      if (!ORDER_STATUSES.includes(body.status)) throw new HttpError(400, "Select a valid order status.");
      if (order.status !== body.status) {
        if (body.status === "Cancelled" && !order.stockReleased) {
          for (const item of order.items) {
            await Product.updateOne(
              { _id: item.productId, stockQuantity: { $ne: null } },
              { $inc: { stockQuantity: item.quantity }, $set: { stockStatus: "In Stock" } },
            );
          }
          order.stockReleased = true;
        } else if (order.status === "Cancelled" && body.status !== "Cancelled" && order.stockReleased) {
          const products = await Product.find({ _id: { $in: order.items.map((item) => item.productId) } });
          const reservations = [];
          for (const item of order.items) {
            const product = products.find((entry) => entry.id === item.productId);
            if (!product || product.stockQuantity === null || product.stockQuantity === undefined) continue;
            const result = await Product.updateOne(
              { _id: product.id, stockQuantity: { $gte: item.quantity } },
              { $inc: { stockQuantity: -item.quantity } },
            );
            if (!result.modifiedCount) {
              for (const held of reservations) {
                await Product.updateOne({ _id: held.productId }, { $inc: { stockQuantity: held.quantity } });
              }
              throw new HttpError(409, `Not enough stock to reopen order ${order.orderNumber}.`);
            }
            reservations.push({ productId: product.id, quantity: item.quantity });
          }
          order.stockReleased = false;
        }
        order.status = body.status;
        order.statusHistory.push({
          status: body.status,
          note: cleanText(body.statusNote || "", 300, "Status note"),
        });
      }
    }
    if (body.paymentStatus !== undefined) {
      if (!PAYMENT_STATUSES.includes(body.paymentStatus)) throw new HttpError(400, "Select a valid payment status.");
      order.paymentStatus = body.paymentStatus;
    }
    if (body.trackingNumber !== undefined) {
      order.trackingNumber = cleanText(body.trackingNumber, 100, "Tracking number");
    }
    if (body.trackingProvider !== undefined) {
      order.trackingProvider = cleanText(body.trackingProvider, 100, "Shipping carrier");
    }
    if (body.internalNotes !== undefined) {
      order.internalNotes = cleanText(body.internalNotes, 3000, "Internal notes");
    }
    await order.save();
    res.json({ order: adminOrder(order) });
  }),
);

router.post(
  "/orders/:id/archive",
  asyncRoute(async (req, res) => {
    const order = await Order.findOneAndUpdate(
      { orderNumber: req.params.id, archivedAt: null },
      { $set: { archivedAt: new Date() } },
      { new: true },
    );
    if (!order) throw new HttpError(404, "Active order not found.");
    res.json({ order: adminOrder(order) });
  }),
);

router.post(
  "/orders/:id/restore",
  asyncRoute(async (req, res) => {
    const order = await Order.findOneAndUpdate(
      { orderNumber: req.params.id, archivedAt: { $ne: null } },
      { $set: { archivedAt: null } },
      { new: true },
    );
    if (!order) throw new HttpError(404, "Archived order not found.");
    res.json({ order: adminOrder(order) });
  }),
);

module.exports = router;
