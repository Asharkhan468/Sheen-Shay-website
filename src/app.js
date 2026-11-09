const path = require("node:path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cloudinary = require("cloudinary").v2;
const authRoutes = require("./routes/auth");
const storeRoutes = require("./routes/store");
const adminRoutes = require("./routes/admin");
const { HttpError } = require("./http");
const { requireAdmin } = require("./middleware/auth");

const root = path.join(__dirname, "..");
const views = path.join(root, "views");

function createApp(config) {
  const app = express();
  if (config.nodeEnv === "production") app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.locals.cloudinaryConfigured = Boolean(config.cloudinary);

  if (config.cloudinary) {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
    });
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com"],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "https://api.cloudinary.com"],
          upgradeInsecureRequests: config.nodeEnv === "production" ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (origin && origin === config.clientOrigin) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Credentials", "true");
      res.set("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");
      res.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
      res.vary("Origin");
    }
    if (req.method === "OPTIONS") return res.sendStatus(origin === config.clientOrigin ? 204 : 403);
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && origin) {
      const requestOrigin = `${req.protocol}://${req.get("host")}`;
      if (origin !== config.clientOrigin && origin !== requestOrigin) {
        return next(new HttpError(403, "This request origin is not allowed."));
      }
    }
    next();
  });

  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: false, limit: "32kb" }));
  const sessionStore = MongoStore.create({
    mongoUrl: config.mongodbUri,
    collectionName: "admin_sessions",
    ttl: 60 * 60 * 8,
    autoRemove: "native",
  });
  app.locals.sessionStore = sessionStore;
  app.use(
    session({
      name: "ss_admin_session",
      secret: config.sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "lax",
        maxAge: 8 * 60 * 60 * 1000,
      },
    }),
  );

  app.use("/api", rateLimit({
    windowMs: 60 * 1000,
    limit: 180,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait and try again." },
  }));
  app.use("/api/admin/auth", authRoutes);
  app.use("/api/store", storeRoutes);
  app.use("/api/admin", adminRoutes);

  app.get("/health", (_req, res) => {
    const mongoose = require("mongoose");
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable" });
  });

  app.get("/", (_req, res) => res.sendFile(path.join(root, "index.html")));
  app.get("/index.html", (_req, res) => res.sendFile(path.join(root, "index.html")));
  app.get("/style.css", (_req, res) => res.sendFile(path.join(root, "style.css")));
  app.get("/app.js", (_req, res) => res.sendFile(path.join(root, "app.js")));
  app.use(express.static(path.join(root, "public"), { index: false, dotfiles: "deny" }));

  app.get("/admin/login", (req, res) => {
    if (req.session?.adminId) return res.redirect("/admin");
    res.sendFile(path.join(views, "admin-login.html"));
  });
  app.get("/admin", requireAdmin, (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(path.join(views, "admin.html"));
  });
  app.get("/admin/*", requireAdmin, (_req, res) => res.status(404).send("Admin page not found."));
  app.get("/api/*", (_req, _res, next) => next(new HttpError(404, "API endpoint not found.")));
  app.use((_req, res) => res.status(404).send("Page not found."));

  app.use((error, req, res, _next) => {
    if (res.headersSent) return;
    let status = error.status || 500;
    let message = error.message || "An unexpected error occurred.";
    if (error.code === 11000) {
      status = 409;
      message = "A record with that unique value already exists.";
    } else if (error.name === "ValidationError") {
      status = 400;
      message = Object.values(error.errors).map((entry) => entry.message).join(" ");
    } else if (error.name === "CastError") {
      status = 400;
      message = "The requested record identifier is invalid.";
    }
    if (status >= 500) console.error("Request failed:", req.method, req.path, error);
    res.status(status).json({ error: status >= 500 ? "The server could not complete the request." : message });
  });

  return app;
}

module.exports = { createApp };
