require("dotenv").config();

const mongoose = require("mongoose");
const Admin = require("./src/models/Admin");
const Category = require("./src/models/Category");
const Product = require("./src/models/Product");
const { Order } = require("./src/models/Order");
const { createApp } = require("./src/app");
const { getConfig } = require("./src/config");

async function start() {
  const config = getConfig();
  await mongoose.connect(config.mongodbUri, {
    autoIndex: config.nodeEnv !== "production",
    serverSelectionTimeoutMS: 10000,
  });
  await Promise.all([Admin, Category, Product, Order].map((model) => model.createIndexes()));

  const app = createApp(config);
  const server = app.listen(config.port, () => {
    console.log(`Sheen & Shay server listening on port ${config.port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exitCode = 1;
});
