const test = require("node:test");
const assert = require("node:assert/strict");
const { getConfig } = require("../src/config");

test("server configuration requires a database and strong session secret", () => {
  assert.throws(() => getConfig({}), /MONGODB_URI, SESSION_SECRET/);
  assert.throws(
    () => getConfig({ MONGODB_URI: "mongodb://example", SESSION_SECRET: "short" }),
    /at least 32 characters/,
  );
});

test("partial Cloudinary credentials are rejected", () => {
  assert.throws(
    () => getConfig({
      MONGODB_URI: "mongodb://example",
      SESSION_SECRET: "x".repeat(32),
      CLOUDINARY_CLOUD_NAME: "account",
    }),
    /all three Cloudinary/,
  );
});
