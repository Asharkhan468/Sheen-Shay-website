require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Admin = require("../src/models/Admin");
const { getConfig } = require("../src/config");

async function seedAdmin() {
  const config = getConfig();
  if (!config.adminEmail || !config.adminPassword) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in the server environment before creating the first admin.");
  }
  if (config.adminPassword.length < 14 || config.adminPassword.length > 128) {
    throw new Error("ADMIN_PASSWORD must be between 14 and 128 characters.");
  }

  await mongoose.connect(config.mongodbUri);
  const existing = await Admin.findOne({ email: config.adminEmail });
  if (existing) {
    throw new Error("An administrator already exists for this email. Use the authenticated password-change flow instead.");
  }
  const passwordHash = await bcrypt.hash(config.adminPassword, 12);
  await Admin.create({ email: config.adminEmail, passwordHash });
  console.log(`Created administrator ${config.adminEmail}.`);
}

seedAdmin()
  .catch((error) => {
    console.error("Admin seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
