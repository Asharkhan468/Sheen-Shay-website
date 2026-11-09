let products = [];
let categories = [];
let cart = [];
let activeCategory = "All";
let searchQuery = "";
let appliedDiscount = 0;
let checkoutAttemptSignature = "";
let checkoutIdempotencyKey = "";

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

window.onload = async function () {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProductModal();
      closeCheckoutModal();
      closeReceiptModal();
      toggleCartDrawer(false);
    }
  });
  initLocalStorageData();
  updateCartUI();
  try {
    const [productResponse, categoryResponse] = await Promise.all([
      fetch("/api/store/products").then(readApiResponse),
      fetch("/api/store/categories").then(readApiResponse),
    ]);
    products = productResponse.products;
    categories = categoryResponse.categories.map((category) => category.name);
    refreshCartFromCatalog();
    renderCategories();
    renderProducts();
    updateCartUI();
  } catch (error) {
    document.getElementById("emptyCatalogState").classList.remove("hidden");
    document.getElementById("emptyCatalogState").textContent =
      "The catalog is temporarily unavailable. Please refresh the page or try again shortly.";
    showToast(error.message || "Could not load the catalog.");
  }
};

function initLocalStorageData() {
  const storedCart = localStorage.getItem("sheen_cart");
  if (storedCart) {
    try {
      cart = JSON.parse(storedCart).filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          /^[a-zA-Z0-9_-]{1,80}$/.test(item.id) &&
          Number.isSafeInteger(item.quantity) &&
          item.quantity > 0 &&
          item.quantity <= 99,
      );
    } catch (e) {
      cart = [];
    }
  }
}

async function readApiResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "A request to the store could not be completed.");
  }
  return payload;
}

function saveCartToStorage() {
  localStorage.setItem("sheen_cart", JSON.stringify(cart));
}

function refreshCartFromCatalog() {
  cart = cart.map((item) => {
    const currentProduct = products.find((product) => product.id === item.id);
    return currentProduct
      ? {
          ...item,
          title: currentProduct.title,
          salePrice: currentProduct.salePrice,
          imageUrl: currentProduct.imageUrl,
          unavailable: currentProduct.stockStatus === "Out of Stock",
        }
      : { ...item, unavailable: true };
  });
  saveCartToStorage();
}

function renderCategories() {
  const categoryNames = ["All", ...categories];
  const container = document.getElementById("categoryFilters");

  container.innerHTML = categoryNames
    .map((cat) => {
      const isActive = activeCategory === cat;
      const count =
        cat === "All"
          ? products.length
          : products.filter((p) => p.category === cat).length;
      return `
                    <button data-category="${escapeHTML(cat)}"
                        class="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                          isActive
                            ? "bg-brand-rosedark text-white shadow-md"
                            : "bg-white text-gray-700 hover:bg-brand-pink/40 border border-gray-200"
                        }">
                        <span>${escapeHTML(cat)}</span>
                        <span class="px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? "bg-white/30 text-white" : "bg-gray-100 text-gray-600"}">${count}</span>
                    </button>
                `;
    })
    .join("");

  if (!container.dataset.categoryListener) {
    container.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category]");
      if (button) filterCategory(button.dataset.category);
    });
    container.dataset.categoryListener = "true";
  }
}

function filterCategory(cat) {
  activeCategory = cat;
  renderCategories();
  renderProducts();
}

function handleSearch(isMobile = false) {
  const inputId = isMobile ? "mobileSearchInput" : "searchInput";
  searchQuery = document.getElementById(inputId).value.toLowerCase().trim();
  renderProducts();
}

function resetFilters() {
  activeCategory = "All";
  searchQuery = "";
  document.getElementById("searchInput").value = "";
  document.getElementById("mobileSearchInput").value = "";
  renderCategories();
  renderProducts();
}

function isProductOnSale(p) {
  if (!p) return false;
  const original = Number(p.origPrice || 0);
  const current = Number(p.salePrice || 0);
  if (typeof p.saleEnabled === "boolean")
    return p.saleEnabled && original > current && current > 0;
  // Backward compatibility for products saved before the sale toggle existed.
  return original > current && current > 0;
}

function toggleProductSaleFields() {
  const enabled = document.getElementById("prodSaleEnabled").checked;
  const wrap = document.getElementById("prodSalePriceWrap");
  const saleInput = document.getElementById("prodSalePrice");
  wrap.classList.toggle("hidden", !enabled);
  saleInput.required = enabled;
  updateProductDiscountPreview();
}

function updateProductDiscountPreview() {
  const enabled = document.getElementById("prodSaleEnabled").checked;
  const regular = Number(document.getElementById("prodOrigPrice").value || 0);
  const sale = Number(document.getElementById("prodSalePrice").value || 0);
  const preview = document.getElementById("prodDiscountPreview");
  if (!enabled) {
    preview.textContent = "";
    return;
  }
  if (regular > 0 && sale > 0 && sale < regular) {
    preview.textContent = `${Math.round(((regular - sale) / regular) * 100)}% discount — customer pays PKR ${sale.toLocaleString()}`;
  } else {
    preview.textContent = "Sale price must be lower than the regular price.";
  }
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const emptyState = document.getElementById("emptyCatalogState");

  let filtered = products.filter((p) => {
    const matchesCat =
      activeCategory === "All" || p.category === activeCategory;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery) ||
      p.category.toLowerCase().includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  document.getElementById("productCount").innerText = filtered.length;

  if (filtered.length === 0) {
    grid.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  } else {
    emptyState.classList.add("hidden");
  }

  grid.innerHTML = filtered
    .map((p) => {
      const discountPct = isProductOnSale(p)
        ? Math.round(((p.origPrice - p.salePrice) / p.origPrice) * 100)
        : 0;

      return `
                    <div class="product-card-hover glass-card rounded-3xl overflow-hidden shadow-md flex flex-col group border border-white cursor-pointer relative" onclick="openProductModal('${p.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openProductModal('${p.id}')}">
                        
                        <div class="relative overflow-hidden h-60 bg-gray-100">
                            <img src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.title)}"
                                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onerror="this.src='https://placehold.co/600x400/FFF0F5/E8A598?text=Luxury+Gift'">
                            
                            ${
                              discountPct > 0
                                ? `
                                <span class="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-xs">
                                    ${discountPct}% OFF
                                </span>
                            `
                                : ""
                            }

                            <span class="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-gray-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                                ${escapeHTML(p.stockStatus)}
                            </span>
                        </div>

                        <div class="p-5 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                                <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                                    <span>${escapeHTML(p.category)}</span>
                                    <div class="flex items-center text-amber-400 text-xs font-bold space-x-1">
                                        ${Number.isFinite(p.rating) ? `<svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><span class="text-gray-700 font-bold ml-1">${p.rating}</span>` : ""}
                                    </div>
                                </div>
                                <h3 class="font-bold text-gray-900 text-base leading-snug group-hover:text-brand-rosedark transition-colors">${escapeHTML(p.title)}</h3>
                                <p class="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">${escapeHTML(p.description)}</p>
                            </div>

                            <div class="pt-2 border-t border-gray-100 flex items-center justify-between" onclick="event.stopPropagation()">
                                <div>
                                    <div class="text-base font-extrabold text-brand-rosedark">PKR ${p.salePrice.toLocaleString()}</div>
                                    ${isProductOnSale(p) ? `<div class="text-[11px] text-gray-400 line-through">PKR ${p.origPrice.toLocaleString()}</div>` : ""}
                                </div>
                                
                                <div class="flex items-center space-x-1.5">
                                    <button onclick="openProductModal('${p.id}')" title="Quick view" aria-label="Quick view" class="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-brand-pink/50 hover:text-brand-rosedark transition-colors">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                    </button>
                                    <button onclick="addToCart('${p.id}')" ${p.stockStatus === "Out of Stock" ? "disabled" : ""} 
                                        class="px-3 py-2 rounded-xl bg-gradient-to-r from-brand-rosedark to-brand-rose text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center space-x-1">
                                        <span>${p.stockStatus === "Out of Stock" ? "Sold out" : "Add"}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
    })
    .join("");
}

// Product Details Modal (Product Open)
function openProductModal(productId) {
  const p = products.find((item) => item.id === productId);
  if (!p) return;

  const modal = document.getElementById("productQuickViewModal");
  const container = document.getElementById("productModalContent");

  container.innerHTML = `
                <div class="relative overflow-hidden rounded-2xl bg-gray-100 h-64 md:h-full">
                    <img src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.title)}" class="w-full h-full object-cover">
                    <span class="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-brand-rosedark font-bold text-xs px-3 py-1 rounded-full">
                        ${escapeHTML(p.category)}
                    </span>
                </div>
                <div class="space-y-4 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span class="text-green-600 font-bold">● ${escapeHTML(p.stockStatus)}</span>
                            <span class="text-amber-400 flex items-center space-x-1">
                                ${Number.isFinite(p.rating) ? `<svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg><strong class="text-gray-800">${p.rating}</strong>` : ""}
                            </span>
                        </div>
                        <h2 class="font-serif font-bold text-2xl text-gray-900 leading-tight">${escapeHTML(p.title)}</h2>
                        
                        <div class="flex items-baseline space-x-2 my-2">
                            <span class="text-2xl font-extrabold text-brand-rosedark">PKR ${p.salePrice.toLocaleString()}</span>
                            ${isProductOnSale(p) ? `<span class="text-sm text-gray-400 line-through">PKR ${p.origPrice.toLocaleString()}</span>` : ""}
                        </div>

                        <p class="text-xs text-gray-600 leading-relaxed">${escapeHTML(p.description)}</p>
                    </div>

                    <div class="space-y-3 pt-3 border-t border-gray-100">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Custom Ribbon & Gift Wrapping</label>
                            <select id="modalWrapOption" class="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white">
                                <option>Signature Pink Ribbon & Rose Bag (Included Free)</option>
                                <option>Gold Foil Luxury Gift Wrap (+PKR 250)</option>
                                <option>Velvet Luxury Gift Box (+PKR 450)</option>
                            </select>
                        </div>

                        <div class="flex space-x-2 pt-2">
                            <button onclick="addToCart('${p.id}'); closeProductModal();" class="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-800 font-bold text-xs hover:bg-gray-200 transition-colors">
                                Add to Cart
                            </button>
                            <button onclick="buyNowDirect('${p.id}')" class="flex-1 py-3 rounded-2xl bg-gradient-to-r from-brand-rosedark to-brand-rose text-white font-bold text-xs shadow-md hover:shadow-lg transition-all">
                                Buy Now (Direct Checkout)
                            </button>
                        </div>
                    </div>
                </div>
            `;

  modal.classList.remove("hidden");
}

function closeProductModal() {
  document.getElementById("productQuickViewModal").classList.add("hidden");
}

function buyNowDirect(productId) {
  closeProductModal();
  addToCart(productId);
  openCheckoutModal();
}

// Cart State & Calculations
function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;
  if (product.stockStatus === "Out of Stock") {
    showToast("Sorry, this gift is sold out");
    return;
  }

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    if (existing.quantity >= 99) {
      showToast("You can add up to 99 of this gift per order.");
      return;
    }
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      salePrice: product.salePrice,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
  }

  saveCartToStorage();
  updateCartUI();
  showToast(`Added "${product.title}" to cart!`);
}

function updateCartQuantity(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;

  if (delta > 0 && item.quantity >= 99) {
    showToast("You can add up to 99 of this gift per order.");
    return;
  }
  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter((i) => i.id !== productId);
  }

  saveCartToStorage();
  updateCartUI();
}

function removeCartItem(productId) {
  cart = cart.filter((i) => i.id !== productId);
  saveCartToStorage();
  updateCartUI();
  showToast("Item removed from cart");
}

function applyPromoCode() {
  const code = document.getElementById("promoInput").value.trim().toUpperCase();
  if (code === "SHEEN10") {
    appliedDiscount = 0.1;
    showToast("Promo code applied! 10% Discount");
  } else {
    appliedDiscount = 0;
    showToast("Invalid promo code");
  }
  updateCartUI();
}

function updateCartUI() {
  const badge = document.getElementById("cartBadge");
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  badge.innerText = totalCount;
  if (totalCount > 0) {
    badge.classList.remove("scale-0");
    badge.classList.add("scale-100");
  } else {
    badge.classList.remove("scale-100");
    badge.classList.add("scale-0");
  }

  const listContainer = document.getElementById("cartItemsList");
  if (cart.length === 0) {
    listContainer.innerHTML = `
                    <div class="text-center py-12 text-gray-400">
                        <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400 mb-2">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                        </div>
                        <p class="text-sm font-semibold text-gray-600">Your shopping cart is empty</p>
                        <p class="text-xs mt-1">Explore our catalog to add items</p>
                    </div>
                `;
  } else {
    listContainer.innerHTML = cart
      .map(
        (item) => `
                    <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <img src="${escapeHTML(/^https:\/\//i.test(item.imageUrl || "") ? item.imageUrl : "https://placehold.co/100")}" alt="${escapeHTML(item.title)}" class="w-14 h-14 object-cover rounded-xl shadow-xs">
                        <div class="flex-1 min-w-0">
                            <h4 class="text-xs font-bold text-gray-800 truncate">${escapeHTML(item.title)}${item.unavailable ? " (Unavailable)" : ""}</h4>
                            <p class="text-xs font-extrabold text-brand-rosedark mt-0.5">PKR ${Number(item.salePrice || 0).toLocaleString()}</p>
                            
                            <div class="flex items-center space-x-2 mt-1.5">
                                <button onclick="updateCartQuantity('${item.id}', -1)" class="w-5 h-5 rounded bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100">-</button>
                                <span class="text-xs font-bold text-gray-800">${item.quantity}</span>
                                <button onclick="updateCartQuantity('${item.id}', 1)" class="w-5 h-5 rounded bg-white border border-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100">+</button>
                            </div>
                        </div>
                        <button onclick="removeCartItem('${item.id}')" class="p-1 text-gray-400 hover:text-red-500">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                `,
      )
      .join("");
  }

  const rawSubtotal = cart.reduce(
    (sum, item) => sum + item.salePrice * item.quantity,
    0,
  );
  const discountVal = rawSubtotal * appliedDiscount;
  const subtotal = rawSubtotal - discountVal;
  const deliveryFee = subtotal >= 6000 || rawSubtotal === 0 ? 0 : 250;
  const grandTotal = subtotal + deliveryFee;

  document.getElementById("cartSubtotal").innerText =
    `PKR ${rawSubtotal.toLocaleString()}`;

  const promoRow = document.getElementById("promoDiscountRow");
  if (appliedDiscount > 0) {
    promoRow.classList.remove("hidden");
    document.getElementById("promoDiscountAmount").innerText =
      `-PKR ${discountVal.toLocaleString()}`;
  } else {
    promoRow.classList.add("hidden");
  }

  document.getElementById("cartDeliveryFee").innerText =
    deliveryFee === 0 ? "FREE" : `PKR ${deliveryFee}`;
  document.getElementById("cartGrandTotal").innerText =
    `PKR ${grandTotal.toLocaleString()}`;
  document.getElementById("chkModalTotal").innerText =
    `PKR ${grandTotal.toLocaleString()}`;

  const freeShipPct = Math.min(100, Math.round((subtotal / 6000) * 100));
  document.getElementById("freeShipBar").style.width = `${freeShipPct}%`;

  const notice = document.getElementById("freeShipNotice");
  if (subtotal >= 6000) {
    notice.innerHTML = `<svg class="w-3.5 h-3.5 text-emerald-600 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> <span>You unlocked FREE Pakistan Delivery!</span>`;
  } else {
    notice.innerHTML = `<svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> <span>Add PKR ${(6000 - subtotal).toLocaleString()} more for FREE Delivery!</span>`;
  }

  document.getElementById("checkoutBtn").disabled = cart.length === 0;
  if (cart.length === 0) {
    document
      .getElementById("checkoutBtn")
      .classList.add("opacity-50", "cursor-not-allowed");
  } else {
    document
      .getElementById("checkoutBtn")
      .classList.remove("opacity-50", "cursor-not-allowed");
  }
}

function toggleCartDrawer(open) {
  const drawer = document.getElementById("cartDrawer");
  const backdrop = document.getElementById("cartBackdrop");
  const panel = document.getElementById("cartPanel");

  if (open) {
    drawer.classList.remove("hidden");
    setTimeout(() => {
      backdrop.classList.remove("opacity-0");
      panel.classList.remove("translate-x-full");
    }, 10);
  } else {
    backdrop.classList.add("opacity-0");
    panel.classList.add("translate-x-full");
    setTimeout(() => {
      drawer.classList.add("hidden");
    }, 300);
  }
}

// Internal Checkout Order Flow
function openCheckoutModal() {
  if (cart.length === 0) return;
  toggleCartDrawer(false);
  document.getElementById("checkoutModal").classList.remove("hidden");
}

function closeCheckoutModal() {
  document.getElementById("checkoutModal").classList.add("hidden");
}

async function processOrderCheckout(e) {
  e.preventDefault();

  const name = document.getElementById("chkName").value.trim();
  const phone = document.getElementById("chkPhone").value.trim();
  const email = document.getElementById("chkEmail").value.trim();
  const city = document.getElementById("chkCity").value;
  const address = document.getElementById("chkAddress").value.trim();
  const payMethod = document.querySelector(
    'input[name="payMethod"]:checked',
  ).value;
  const giftNote = document.getElementById("chkGiftNote").value.trim();

  const orderRequest = {
    name,
    email,
    phone,
    city,
    address,
    paymentMethod: payMethod,
    giftNote,
    coupon: appliedDiscount > 0 ? "SHEEN10" : "",
    items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
  };
  const signature = JSON.stringify(orderRequest);
  if (!checkoutIdempotencyKey || checkoutAttemptSignature !== signature) {
    checkoutIdempotencyKey = crypto.randomUUID();
    checkoutAttemptSignature = signature;
  }
  orderRequest.idempotencyKey = checkoutIdempotencyKey;

  const submitButton = document.querySelector('#checkoutForm button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Placing your order…";
  try {
    const response = await fetch("/api/store/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderRequest),
    });
    const payload = await readApiResponse(response);
    const newOrder = payload.order;
    const orderDate = new Date(newOrder.date).toLocaleString("en-PK", {
      timeZone: "Asia/Karachi",
    });

    document.getElementById("receiptOrderId").innerText = newOrder.orderNumber;
    document.getElementById("receiptDate").innerText = `Date: ${orderDate}`;
    document.getElementById("receiptTrackingNumber").innerText =
      "Tracking details will be available when your order ships.";
    document.getElementById("receiptCustName").innerText = newOrder.customerName;
    document.getElementById("receiptCustCity").innerText =
      `${newOrder.city} (${address.substring(0, 20)}${address.length > 20 ? "..." : ""})`;
    document.getElementById("receiptPayMethod").innerText =
      newOrder.paymentMethod;
    document.getElementById("receiptGrandTotal").innerText =
      `PKR ${newOrder.total.toLocaleString()}`;

    document.getElementById("receiptItems").innerHTML =
      newOrder.items
        .map(
          (item) => `
                    <div class="flex justify-between">
                        <span>${item.quantity}x ${escapeHTML(item.title)}</span>
                        <span class="font-semibold">PKR ${(item.unitPrice * item.quantity).toLocaleString()}</span>
                    </div>
                `,
        )
        .join("") +
      `
                    <div class="flex justify-between text-gray-500 pt-1 border-t border-gray-100">
                        <span>Delivery Fee</span>
                        <span>${newOrder.deliveryFee === 0 ? "FREE" : `PKR ${newOrder.deliveryFee.toLocaleString()}`}</span>
                    </div>
                `;

    cart = [];
    appliedDiscount = 0;
    checkoutAttemptSignature = "";
    checkoutIdempotencyKey = "";
    saveCartToStorage();
    updateCartUI();

    closeCheckoutModal();
    document.getElementById("receiptModal").classList.remove("hidden");
    document.getElementById("checkoutForm").reset();
    showToast("Order placed successfully!");
  } catch (error) {
    showToast(error.message || "We couldn't place your order. Please try again.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Confirm & Place Order";
  }
}

function closeReceiptModal() {
  document.getElementById("receiptModal").classList.add("hidden");
}

// WhatsApp Custom Request Builder
function updateBudgetValue(val) {
  document.getElementById("budgetValueDisplay").innerText =
    `PKR ${parseInt(val).toLocaleString()}`;
}

function handleCustomWhatsAppSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("custName").value.trim();
  const city = document.getElementById("custCity").value.trim();
  const occasion = document.getElementById("custOccasion").value;
  const budget = parseInt(
    document.getElementById("custBudget").value,
  ).toLocaleString();
  const notes = document.getElementById("custNotes").value.trim();

  const text = `*NEW CUSTOM GIFT REQUEST - SHEEN & SHAY CREATES*

*Customer Name:* ${name}
*Delivery City:* ${city}
*Special Occasion:* ${occasion}
*Budget Allocation:* PKR ${budget}

*Custom Theme & Details:*
"${notes}"

_Sent via Sheen & Shay Creates Web Builder_`;

  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/923000000000?text=${encodedText}`;

  window.open(whatsappUrl, "_blank");
  showToast("Redirecting to WhatsApp Designer...");
}

function openAdminPasscodeModal() {
  window.location.assign("/admin");
}

async function trackCustomerOrder(e) {
  e.preventDefault();
  const result = document.getElementById("trackingResult");
  result.classList.remove("hidden");
  const button = e.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const response = await fetch("/api/store/orders/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: document.getElementById("trackingOrderId").value.trim(),
        phone: document.getElementById("trackingPhone").value.trim(),
      }),
    });
    const order = await readApiResponse(response);
    const steps = [
      "Pending",
      "Confirmed",
      "Processing",
      "Ready for Shipment",
      "Shipped",
      "Delivered",
    ];
    const current = steps.indexOf(order.status);
    const progress = order.status === "Cancelled"
      ? `<p class="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">This order has been cancelled.</p>`
      : `<div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">${steps.map((step, index) => `<div class="text-center"><div class="h-2 rounded-full ${index <= current ? "bg-brand-rosedark" : "bg-gray-200"}"></div><span class="text-[10px] ${index <= current ? "text-brand-rosedark font-bold" : "text-gray-400"}">${escapeHTML(step)}</span></div>`).join("")}</div>`;
    const placed = order.placedAt
      ? new Date(order.placedAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })
      : "—";
    result.innerHTML = `<div class="rounded-2xl bg-white border border-brand-rose/20 p-5">
      <div class="flex flex-wrap justify-between gap-2">
        <div><p class="text-xs text-gray-500">Order number</p><strong class="text-brand-rosedark">${escapeHTML(order.orderNumber)}</strong></div>
        <div><p class="text-xs text-gray-500">Shipping tracking number</p><strong>${escapeHTML(order.trackingNumber || "Not yet available")}</strong></div>
      </div>
      <p class="mt-4 text-sm text-gray-700">Current status: <strong class="text-brand-rosedark">${escapeHTML(order.status)}</strong></p>
      ${order.trackingProvider ? `<p class="text-sm text-gray-600">Carrier: ${escapeHTML(order.trackingProvider)}</p>` : ""}
      ${progress}
      <p class="text-xs text-gray-500 mt-4">Placed: ${escapeHTML(placed)}</p>
    </div>`;
  } catch (error) {
    result.innerHTML = `<div class="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">${escapeHTML(error.message || "Unable to look up this order.")}</div>`;
  } finally {
    button.disabled = false;
  }
}

// Modular Source Code Inspector Modal
const MODULAR_FILES = {
  indexHtml: `<!-- index.html -->\n<!DOCTYPE html>\n<html>\n<head>\n  <title>Sheen & Shay Storefront</title>\n  <script src="https://cdn.tailwindcss.com"><\/script>\n</head>\n<body>\n  <header>...</header>\n  <div id="productGrid"></div>\n  <script src="app.js"><\/script>\n</body>\n</html>`,
  adminHtml: `<!-- admin.html -->\n<!DOCTYPE html>\n<html>\n<head>\n  <title>Admin Dashboard</title>\n</head>\n<body>\n  <div id="kpis">...</div>\n  <form id="productForm">...</form>\n  <table id="adminOrdersTable">...</table>\n  <script src="admin.js"><\/script>\n</body>\n</html>`,
  appJs: `// app.js - Storefront & Cart Engine\nfunction addToCart(id) { ... }\nfunction processOrderCheckout(e) { ... }`,
  adminJs: `// admin.js - Inventory CRUD & Orders Manager\nfunction handleProductSave(e) { ... }\nfunction updateOrderStatus(id, status) { ... }`,
  stylesCss: `/* styles.css - Glassmorphism & UI Tokens */\n.glass-card { background: rgba(255, 255, 255, 0.88); }\n.product-card-hover { transition: all 0.35s; }`,
};

let currentActiveCodeTab = "indexHtml";

function toggleModularCodeViewer() {
  const modal = document.getElementById("codeViewerModal");
  modal.classList.toggle("hidden");
  if (!modal.classList.contains("hidden")) {
    showCodeTab("indexHtml");
  }
}

function showCodeTab(tabKey) {
  currentActiveCodeTab = tabKey;
  document.querySelectorAll(".code-tab-btn").forEach((btn) => {
    btn.className =
      "code-tab-btn px-4 py-2 text-xs font-mono rounded-t-lg bg-gray-700 text-gray-300 hover:bg-gray-600";
  });
  const activeBtn = document.getElementById(`tab_${tabKey}`);
  if (activeBtn) {
    activeBtn.className =
      "code-tab-btn px-4 py-2 text-xs font-mono rounded-t-lg bg-gray-900 text-brand-pink font-bold border-t-2 border-brand-pink";
  }

  document.getElementById("codeSnippetBox").innerText =
    MODULAR_FILES[tabKey] || "";
}

function copyCurrentCodeTab() {
  const textToCopy = MODULAR_FILES[currentActiveCodeTab];
  const temp = document.createElement("textarea");
  temp.value = textToCopy;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
  showToast(`Copied ${currentActiveCodeTab} file code!`);
}

// Utilities
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

function showToast(message) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className =
    "toast-enter bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center space-x-2 border border-brand-pink/30";
  toast.innerHTML = `<svg class="w-4 h-4 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>${escapeHTML(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// UX helpers: Escape closes layers, background scroll locks while a layer is open
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeProductModal();
  closeCheckoutModal();
  closeReceiptModal();
  toggleCartDrawer(false);
});
(function () {
  const ids = [
    "productQuickViewModal",
    "checkoutModal",
    "receiptModal",
    "cartDrawer",
  ];
  const sync = () => {
    const open = ids.some((id) => {
      const el = document.getElementById(id);
      return el && !el.classList.contains("hidden");
    });
    document.body.style.overflow = open ? "hidden" : "";
  };
  const mo = new MutationObserver(sync);
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) mo.observe(el, { attributes: true, attributeFilter: ["class"] });
  });
})();
