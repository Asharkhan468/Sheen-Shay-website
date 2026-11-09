const crypto = require("node:crypto");
const { HttpError } = require("../http");

function requireAdmin(req, res, next) {
  if (!req.session?.adminId) {
    if (req.originalUrl.startsWith("/api/")) {
      return next(new HttpError(401, "Please sign in to continue."));
    }
    return res.redirect("/admin/login");
  }
  next();
}

function issueCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  return req.session.csrfToken;
}

function requireCsrf(req, res, next) {
  const expected = req.session?.csrfToken;
  const supplied = req.get("x-csrf-token");
  if (!expected || !supplied) {
    return next(new HttpError(403, "The security token is missing or expired. Refresh and try again."));
  }
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return next(new HttpError(403, "The security token is invalid. Refresh and try again."));
  }
  next();
}

module.exports = { issueCsrfToken, requireAdmin, requireCsrf };
