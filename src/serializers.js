function storefrontProduct(product) {
  const regularPrice = product.price;
  const onSale = product.saleEnabled && Number.isFinite(product.salePrice);
  const image = product.images[0];
  return {
    id: product._id,
    title: product.title,
    category: product.category,
    salePrice: onSale ? product.salePrice : regularPrice,
    origPrice: onSale ? regularPrice : null,
    saleEnabled: onSale,
    imageUrl: image?.url || "",
    images: product.images.map((item) => ({ url: item.url, alt: item.alt })),
    description: product.description,
    stockStatus: product.stockQuantity === 0 ? "Out of Stock" : product.stockStatus,
    rating: product.rating,
    featured: product.featured,
    customizationOptions: product.customizationOptions,
  };
}

function adminProduct(product) {
  return {
    id: product._id,
    sku: product.sku,
    title: product.title,
    slug: product.slug,
    category: product.category,
    description: product.description,
    price: product.price,
    saleEnabled: product.saleEnabled,
    salePrice: product.salePrice,
    images: product.images,
    stockQuantity: product.stockQuantity,
    stockStatus: product.stockQuantity === 0 ? "Out of Stock" : product.stockStatus,
    rating: product.rating,
    customizationOptions: product.customizationOptions,
    tags: product.tags,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    featured: product.featured,
    active: product.active,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function adminOrder(order) {
  return {
    id: order.orderNumber,
    orderNumber: order.orderNumber,
    date: order.createdAt,
    customerName: order.customer.name,
    email: order.customer.email,
    phone: order.customer.phone,
    city: order.customer.city,
    address: order.customer.address,
    items: order.items,
    giftNote: order.giftNote,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    deliveryFee: order.deliveryFee,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    trackingNumber: order.trackingNumber,
    trackingProvider: order.trackingProvider,
    internalNotes: order.internalNotes,
    statusHistory: order.statusHistory,
    archivedAt: order.archivedAt,
  };
}

module.exports = { adminOrder, adminProduct, storefrontProduct };
