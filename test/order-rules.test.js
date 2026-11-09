const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateOrderTotals } = require("../src/orderRules");
const storeRoutes = require("../src/routes/store");

test("order totals preserve the published coupon and delivery rules", () => {
  assert.deepEqual(
    calculateOrderTotals([{ unitPrice: 5000, quantity: 1 }]),
    { subtotal: 5000, discountAmount: 0, deliveryFee: 250, total: 5250 },
  );
  assert.deepEqual(
    calculateOrderTotals([{ unitPrice: 6000, quantity: 1 }]),
    { subtotal: 6000, discountAmount: 0, deliveryFee: 0, total: 6000 },
  );
  assert.deepEqual(
    calculateOrderTotals([{ unitPrice: 6000, quantity: 1 }], "SHEEN10"),
    { subtotal: 5400, discountAmount: 600, deliveryFee: 250, total: 5650 },
  );
});

test("checkout validates customer, cart, phone and idempotency before persistence", () => {
  const order = storeRoutes.validateOrderInput({
    name: "  Sana A. ",
    email: "sana@example.com",
    phone: "03001234567",
    city: "Lahore",
    address: "Street 1",
    paymentMethod: "Cash on Delivery (COD)",
    giftNote: "For you",
    coupon: "SHEEN10",
    idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
    items: [{ productId: "ss-p1", quantity: 2 }],
    total: 1,
  });
  assert.equal(order.name, "Sana A.");
  assert.equal(order.quantities.get("ss-p1"), 2);
  assert.equal(order.coupon, "SHEEN10");
  assert.throws(
    () => storeRoutes.validateOrderInput({
      name: "Sana",
      phone: "03001234567",
      city: "Lahore",
      address: "Street 1",
      paymentMethod: "Cash on Delivery (COD)",
      items: [{ productId: "ss-p1", quantity: 100 }],
      idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
    }),
    /between 1 and 99/,
  );
  assert.throws(
    () => storeRoutes.validateOrderInput({
      name: "Sana",
      phone: "03001234567",
      city: "Lahore",
      address: "Street 1",
      paymentMethod: "Cash on Delivery (COD)",
      items: [{ productId: "ss-p1", quantity: 1 }],
      idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
      coupon: "FREE",
    }),
    /not valid/,
  );
});
