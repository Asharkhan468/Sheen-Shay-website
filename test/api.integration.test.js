const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { createApp } = require("../src/app");
const Admin = require("../src/models/Admin");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");

test("admin APIs protect access and customer orders use database pricing and stock", async (t) => {
  const mongo = await MongoMemoryServer.create();
  const config = {
    nodeEnv: "test",
    port: 0,
    mongodbUri: mongo.getUri(),
    sessionSecret: "test-session-secret-with-more-than-thirty-two-characters",
    clientOrigin: "http://storefront.example",
    cloudinary: null,
  };
  await mongoose.connect(config.mongodbUri);
  const app = createApp(config);
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  let csrfToken = "";

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await app.locals.sessionStore.close();
    await mongoose.disconnect();
    await mongo.stop();
  });

  await Admin.create({
    email: "owner@example.com",
    passwordHash: await bcrypt.hash("correct-horse-battery-41", 4),
  });
  await Category.create({ name: "Luxury Hampers", slug: "luxury-hampers" });
  const product = await Product.create({
    _id: "ss-integration-1",
    sku: "SS-INT-1",
    title: "Integration Gift",
    slug: "integration-gift",
    category: "Luxury Hampers",
    description: "A gift used for integration checks.",
    price: 5000,
    saleEnabled: true,
    salePrice: 4500,
    images: [{ url: "https://images.example.com/gift.jpg" }],
    stockQuantity: 5,
    stockStatus: "In Stock",
  });

  const blocked = await fetch(`${baseUrl}/api/admin/products`);
  assert.equal(blocked.status, 401);
  const blockedPage = await fetch(`${baseUrl}/admin`, { redirect: "manual" });
  assert.equal(blockedPage.status, 302);
  assert.equal(blockedPage.headers.get("location"), "/admin/login");
  const blockedMutation = await fetch(`${baseUrl}/api/admin/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
    body: JSON.stringify({ name: "Not Allowed" }),
  });
  assert.equal(blockedMutation.status, 403);

  const login = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@example.com", password: "correct-horse-battery-41" }),
  });
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie").split(";")[0];
  csrfToken = (await login.json()).csrfToken;

  const missingCsrf = await fetch(`${baseUrl}/api/admin/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name: "No token" }),
  });
  assert.equal(missingCsrf.status, 403);

  const storeCatalog = await fetch(`${baseUrl}/api/store/products`).then((response) => response.json());
  assert.equal(storeCatalog.products[0].salePrice, 4500);
  assert.equal(storeCatalog.products[0].origPrice, 5000);
  const orderRequest = {
    idempotencyKey: "123e4567-e89b-12d3-a456-426614174001",
    name: "Sana Test",
    email: "sana@example.com",
    phone: "03001234567",
    city: "Lahore",
    address: "Street 1, Lahore",
    paymentMethod: "Cash on Delivery (COD)",
    giftNote: "With love",
    coupon: "SHEEN10",
    total: 1,
    items: [{ productId: product.id, quantity: 2, price: 1 }],
  };
  const firstOrderResponse = await fetch(`${baseUrl}/api/store/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderRequest),
  });
  assert.equal(firstOrderResponse.status, 201);
  const receipt = (await firstOrderResponse.json()).order;
  assert.equal(receipt.total, 8100);
  assert.equal(receipt.items[0].unitPrice, 4500);

  const duplicateOrderResponse = await fetch(`${baseUrl}/api/store/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderRequest),
  });
  assert.equal(duplicateOrderResponse.status, 200);
  assert.equal((await duplicateOrderResponse.json()).order.orderNumber, receipt.orderNumber);
  assert.equal((await Product.findById(product.id)).stockQuantity, 3);

  const orderLookup = await fetch(`${baseUrl}/api/store/orders/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNumber: receipt.orderNumber, phone: "03001234567" }),
  });
  assert.equal(orderLookup.status, 200);
  assert.equal((await orderLookup.json()).status, "Pending");
  const privateLookup = await fetch(`${baseUrl}/api/store/orders/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNumber: receipt.orderNumber, phone: "03009999999" }),
  });
  assert.equal(privateLookup.status, 404);

  const adminOrders = await fetch(`${baseUrl}/api/admin/orders`, { headers: { Cookie: cookie } });
  assert.equal(adminOrders.status, 200);
  const orders = (await adminOrders.json()).orders;
  assert.equal(orders[0].customerName, "Sana Test");
  assert.equal(orders[0].email, "sana@example.com");

  const cancel = await fetch(`${baseUrl}/api/admin/orders/${encodeURIComponent(receipt.orderNumber)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie, "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ status: "Cancelled", statusNote: "Customer requested cancellation" }),
  });
  assert.equal(cancel.status, 200);
  assert.equal((await Product.findById(product.id)).stockQuantity, 5);

  const password = await fetch(`${baseUrl}/api/admin/auth/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ currentPassword: "correct-horse-battery-41", newPassword: "another-strong-password-52" }),
  });
  assert.equal(password.status, 200);
  const passwordResult = await password.json();
  cookie = password.headers.get("set-cookie").split(";")[0];
  csrfToken = passwordResult.csrfToken;
  const logout = await fetch(`${baseUrl}/api/admin/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookie, "X-CSRF-Token": csrfToken },
  });
  assert.equal(logout.status, 204);
  const afterLogout = await fetch(`${baseUrl}/api/admin/products`, { headers: { Cookie: cookie } });
  assert.equal(afterLogout.status, 401);
});
