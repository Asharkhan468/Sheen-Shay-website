const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const Admin = require("../models/Admin");
const { asyncRoute, HttpError } = require("../http");
const { issueCsrfToken, requireAdmin, requireCsrf } = require("../middleware/auth");

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please wait and try again." },
});

router.post(
  "/login",
  loginLimiter,
  asyncRoute(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password || email.length > 254 || password.length > 128) {
      throw new HttpError(400, "Enter your email address and password.");
    }

    const admin = await Admin.findOne({ email }).select("+passwordHash");
    const passwordHash = admin?.passwordHash || "$2a$12$invalidhashpaddinginvalidhashpaddinginvalidhashpa";
    const passwordMatches = await bcrypt.compare(password, passwordHash);
    if (!admin || !admin.active || !passwordMatches) {
      throw new HttpError(401, "The email or password is incorrect.");
    }

    await new Promise((resolve, reject) =>
      req.session.regenerate((error) => (error ? reject(error) : resolve())),
    );
    req.session.adminId = admin.id;
    issueCsrfToken(req);
    admin.lastLoginAt = new Date();
    await admin.save();
    await new Promise((resolve, reject) =>
      req.session.save((error) => (error ? reject(error) : resolve())),
    );

    res.json({
      admin: { email: admin.email },
      csrfToken: req.session.csrfToken,
    });
  }),
);

router.get(
  "/me",
  requireAdmin,
  asyncRoute(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const admin = await Admin.findById(req.session.adminId);
    if (!admin || !admin.active) {
      req.session.destroy(() => {});
      throw new HttpError(401, "Please sign in again.");
    }
    res.json({ admin: { email: admin.email }, csrfToken: issueCsrfToken(req) });
  }),
);

router.post("/logout", requireAdmin, requireCsrf, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("ss_admin_session", {
      httpOnly: true,
      sameSite: "lax",
      secure: req.secure,
      path: "/",
    });
    res.status(204).end();
  });
});

router.post(
  "/password",
  requireAdmin,
  requireCsrf,
  asyncRoute(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    if (newPassword.length < 14 || newPassword.length > 128) {
      throw new HttpError(400, "Choose a new password between 14 and 128 characters.");
    }
    if (newPassword === currentPassword) {
      throw new HttpError(400, "Your new password must be different from the current password.");
    }

    const admin = await Admin.findById(req.session.adminId).select("+passwordHash");
    if (!admin || !admin.active || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
      throw new HttpError(401, "The current password is incorrect. Sign in again if needed.");
    }
    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    await admin.save();

    await new Promise((resolve, reject) =>
      req.session.regenerate((error) => (error ? reject(error) : resolve())),
    );
    req.session.adminId = admin.id;
    issueCsrfToken(req);
    await new Promise((resolve, reject) =>
      req.session.save((error) => (error ? reject(error) : resolve())),
    );
    res.json({ message: "Password updated.", csrfToken: req.session.csrfToken });
  }),
);

module.exports = router;
