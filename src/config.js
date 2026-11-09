function getConfig(env = process.env) {
  const required = ["MONGODB_URI", "SESSION_SECRET"];
  const missing = required.filter((key) => !env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (env.SESSION_SECRET.trim().length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a whole number between 1 and 65535.");
  }

  const cloudinaryValues = [
    env.CLOUDINARY_CLOUD_NAME,
    env.CLOUDINARY_API_KEY,
    env.CLOUDINARY_API_SECRET,
  ];
  if (cloudinaryValues.some(Boolean) && !cloudinaryValues.every(Boolean)) {
    throw new Error("Provide all three Cloudinary environment variables or leave all blank.");
  }

  const clientOrigin = (env.CLIENT_ORIGIN || `http://localhost:${port}`).replace(/\/$/, "");
  let originUrl;
  try {
    originUrl = new URL(clientOrigin);
  } catch {
    throw new Error("CLIENT_ORIGIN must be a valid HTTP(S) origin.");
  }
  if (!["http:", "https:"].includes(originUrl.protocol) || originUrl.origin !== clientOrigin) {
    throw new Error("CLIENT_ORIGIN must contain only an HTTP(S) origin without a path.");
  }

  return {
    nodeEnv: env.NODE_ENV || "development",
    port,
    mongodbUri: env.MONGODB_URI.trim(),
    sessionSecret: env.SESSION_SECRET,
    clientOrigin,
    adminEmail: env.ADMIN_EMAIL?.trim().toLowerCase(),
    adminPassword: env.ADMIN_PASSWORD,
    cloudinary: cloudinaryValues.every(Boolean)
      ? {
          cloudName: env.CLOUDINARY_CLOUD_NAME,
          apiKey: env.CLOUDINARY_API_KEY,
          apiSecret: env.CLOUDINARY_API_SECRET,
        }
      : null,
  };
}

module.exports = { getConfig };
