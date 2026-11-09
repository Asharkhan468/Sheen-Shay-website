const test = require("node:test");
const assert = require("node:assert/strict");
const Product = require("../src/models/Product");

function product(overrides = {}) {
  return new Product({
    sku: "SS-TEST-1",
    title: "Test Keepsake",
    slug: "test-keepsake",
    category: "Luxury Hampers",
    description: "A test product.",
    price: 1000,
    images: [{ url: "https://images.example.com/test.jpg" }],
    ...overrides,
  });
}

test("product schema accepts valid full-price products", async () => {
  await assert.doesNotReject(product().validate());
});

test("product schema rejects invalid or non-discounted sale prices", async () => {
  await assert.rejects(product({ saleEnabled: true, salePrice: 1000 }).validate(), /Sale price must be lower/);
  await assert.rejects(product({ saleEnabled: true, salePrice: 0 }).validate());
});

test("product inventory permits untracked stock and rejects fractional quantities", async () => {
  await assert.doesNotReject(product({ stockQuantity: null }).validate());
  await assert.rejects(product({ stockQuantity: 2.5 }).validate());
});
