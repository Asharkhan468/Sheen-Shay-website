class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function requireFields(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "A JSON request body is required.");
  }
  const missing = fields.filter(
    (field) => typeof value[field] !== "string" || !value[field].trim(),
  );
  if (missing.length) {
    throw new HttpError(400, `Required fields: ${missing.join(", ")}.`);
  }
}

function cleanText(value, maxLength, field, { required = false } = {}) {
  if (typeof value !== "string") {
    if (required) throw new HttpError(400, `${field} is required.`);
    return "";
  }
  const text = value.trim();
  if (required && !text) throw new HttpError(400, `${field} is required.`);
  if (text.length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`);
  }
  return text;
}

function positiveInteger(value, field, { optional = false } = {}) {
  if (optional && (value === null || value === "" || value === undefined)) {
    return null;
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new HttpError(400, `${field} must be a non-negative whole number.`);
  }
  return number;
}

module.exports = { HttpError, asyncRoute, cleanText, positiveInteger, requireFields };
