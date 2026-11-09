function calculateOrderTotals(items, coupon = "") {
  const rawSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = coupon === "SHEEN10" ? Math.round(rawSubtotal * 0.1) : 0;
  const subtotal = rawSubtotal - discountAmount;
  const deliveryFee = subtotal >= 6000 ? 0 : 250;
  return {
    subtotal,
    discountAmount,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
}

module.exports = { calculateOrderTotals };
