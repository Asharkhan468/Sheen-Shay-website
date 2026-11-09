const DEFAULT_PRODUCTS = [
  {
    id: "ss-p1",
    title: "Good Vibes Deluxe Luxury Box",
    category: "Luxury Hampers",
    salePrice: 4850,
    origPrice: 5500,
    imageUrl:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80",
    description:
      "Custom luxury box featuring organic scented candle, artisan gourmet chocolates, gold pen, velvet notebook & dried blush flowers.",
    stockStatus: "In Stock",
    rating: 5.0,
  },
  {
    id: "ss-p2",
    title: "Personalized Acrylic LED Name Lamp",
    category: "LED & Lights",
    salePrice: 3200,
    origPrice: 3800,
    imageUrl:
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80",
    description:
      "Warm glowing LED laser-engraved custom name acrylic block with solid beechwood base.",
    stockStatus: "In Stock",
    rating: 4.9,
  },
  {
    id: "ss-p3",
    title: "Blush Pink Eternal Rose Bouquet",
    category: "Floral & Bouquets",
    salePrice: 5400,
    origPrice: 6200,
    imageUrl:
      "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80",
    description:
      "Handcrafted preserved blush roses wrapped in luxury satin ribbon that last for years without fading.",
    stockStatus: "In Stock",
    rating: 5.0,
  },
  {
    id: "ss-p4",
    title: "Custom Velvet Keepsake Jewelry Box",
    category: "Personalized Keepsakes",
    salePrice: 2950,
    origPrice: 3500,
    imageUrl:
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80",
    description:
      "Plush velvet organizer with gold metallic custom initials engraved on the lid.",
    stockStatus: "Limited Stock",
    rating: 4.8,
  },
  {
    id: "ss-p5",
    title: "Grand Eid & Wedding Deluxe Hamper",
    category: "Luxury Hampers",
    salePrice: 8900,
    origPrice: 9800,
    imageUrl:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=600&q=80",
    description:
      "Royal gold & rose basket with luxury perfumes, gourmet stuffed dates, acrylic photo frame & custom cards.",
    stockStatus: "In Stock",
    rating: 5.0,
  },
  {
    id: "ss-p6",
    title: "Customized Polaroid Photo String Lights",
    category: "Custom Accessories",
    salePrice: 1850,
    origPrice: 2200,
    imageUrl:
      "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=600&q=80",
    description:
      "12 printed polaroid memory prints attached with wooden clips to cozy fairy string lights.",
    stockStatus: "In Stock",
    rating: 4.7,
  },
];

let products = [];
let cart = [];
let orders = [];
let activeCategory = "All";
let searchQuery = "";
let appliedDiscount = 0;
let isAdminLoggedIn = false;

window.onload = function () {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProductModal();
      closeCheckoutModal();
      closeReceiptModal();
      toggleCartDrawer(false);
    }
  });
  initLocalStorageData();
  toggleProductImageMode();
  toggleProductSaleFields();
  renderCategories();
  renderProducts();
  updateCartUI();
  setupSecretAdminShortcut();

  if (sessionStorage.getItem("ss_admin_authed") === "true") {
    isAdminLoggedIn = true;
  }
};

// Secret Shortcut Handler: Ctrl+Shift+A or Ctrl+Alt+A
function setupSecretAdminShortcut() {
  window.addEventListener("keydown", function (e) {
    if (
      (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "A") ||
      (e.ctrlKey && e.altKey && e.key.toUpperCase() === "A")
    ) {
      e.preventDefault();
      openAdminPasscodeModal();
    }
  });
}

function isDesktopDevice() {
  return window.innerWidth >= 1024;
}

function initLocalStorageData() {
  const storedProds = localStorage.getItem("sheen_products");
  if (!storedProds) {
    localStorage.setItem("sheen_products", JSON.stringify(DEFAULT_PRODUCTS));
    products = DEFAULT_PRODUCTS;
  } else {
    try {
      products = JSON.parse(storedProds);
    } catch (e) {
      products = DEFAULT_PRODUCTS;
    }
  }

  const storedCart = localStorage.getItem("sheen_cart");
  if (storedCart) {
    try {
      cart = JSON.parse(storedCart);
    } catch (e) {
      cart = [];
    }
  }

  const storedOrders = localStorage.getItem("sheen_orders");
  if (storedOrders) {
    try {
      orders = JSON.parse(storedOrders);
    } catch (e) {
      orders = [];
    }
  }
}

function saveProductsToStorage() {
  try {
    localStorage.setItem("sheen_products", JSON.stringify(products));
  } catch (e) {
    throw new Error(
      "Browser storage is full. Use a smaller image or an image URL.",
    );
  }
}

function saveCartToStorage() {
  localStorage.setItem("sheen_cart", JSON.stringify(cart));
}

function saveOrdersToStorage() {
  localStorage.setItem("sheen_orders", JSON.stringify(orders));
}

function renderCategories() {
  const categories = [
    "All",
    "Luxury Hampers",
    "Personalized Keepsakes",
    "Floral & Bouquets",
    "LED & Lights",
    "Custom Accessories",
  ];
  const container = document.getElementById("categoryFilters");

  container.innerHTML = categories
    .map((cat) => {
      const isActive = activeCategory === cat;
      const count =
        cat === "All"
          ? products.length
          : products.filter((p) => p.category === cat).length;
      return `
                    <button onclick="filterCategory('${cat}')" 
                        class="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                          isActive
                            ? "bg-brand-rosedark text-white shadow-md"
                            : "bg-white text-gray-700 hover:bg-brand-pink/40 border border-gray-200"
                        }">
                        <span>${cat}</span>
                        <span class="px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? "bg-white/30 text-white" : "bg-gray-100 text-gray-600"}">${count}</span>
                    </button>
                `;
    })
    .join("");
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
                            <img src="${p.imageUrl}" alt="${p.title}" 
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
                                ${p.stockStatus}
                            </span>
                        </div>

                        <div class="p-5 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                                <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                                    <span>${p.category}</span>
                                    <div class="flex items-center text-amber-400 text-xs font-bold space-x-1">
                                        <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                                        <span class="text-gray-700 font-bold ml-1">${p.rating || 5.0}</span>
                                    </div>
                                </div>
                                <h3 class="font-bold text-gray-900 text-base leading-snug group-hover:text-brand-rosedark transition-colors">${p.title}</h3>
                                <p class="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">${p.description}</p>
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
                    <img src="${p.imageUrl}" alt="${p.title}" class="w-full h-full object-cover">
                    <span class="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-brand-rosedark font-bold text-xs px-3 py-1 rounded-full">
                        ${p.category}
                    </span>
                </div>
                <div class="space-y-4 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span class="text-green-600 font-bold">● ${p.stockStatus}</span>
                            <span class="text-amber-400 flex items-center space-x-1">
                                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                                <strong class="text-gray-800">${p.rating || 5.0}</strong>
                            </span>
                        </div>
                        <h2 class="font-serif font-bold text-2xl text-gray-900 leading-tight">${p.title}</h2>
                        
                        <div class="flex items-baseline space-x-2 my-2">
                            <span class="text-2xl font-extrabold text-brand-rosedark">PKR ${p.salePrice.toLocaleString()}</span>
                            ${isProductOnSale(p) ? `<span class="text-sm text-gray-400 line-through">PKR ${p.origPrice.toLocaleString()}</span>` : ""}
                        </div>

                        <p class="text-xs text-gray-600 leading-relaxed">${p.description}</p>
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
                        <img src="${item.imageUrl}" alt="${item.title}" class="w-14 h-14 object-cover rounded-xl shadow-xs">
                        <div class="flex-1 min-w-0">
                            <h4 class="text-xs font-bold text-gray-800 truncate">${item.title}</h4>
                            <p class="text-xs font-extrabold text-brand-rosedark mt-0.5">PKR ${item.salePrice.toLocaleString()}</p>
                            
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

function processOrderCheckout(e) {
  e.preventDefault();

  const name = document.getElementById("chkName").value.trim();
  const phone = document.getElementById("chkPhone").value.trim();
  const city = document.getElementById("chkCity").value;
  const address = document.getElementById("chkAddress").value.trim();
  const payMethod = document.querySelector(
    'input[name="payMethod"]:checked',
  ).value;
  const giftNote = document.getElementById("chkGiftNote").value.trim();

  const rawSubtotal = cart.reduce(
    (sum, item) => sum + item.salePrice * item.quantity,
    0,
  );
  const discountVal = rawSubtotal * appliedDiscount;
  const subtotal = rawSubtotal - discountVal;
  const deliveryFee = subtotal >= 6000 ? 0 : 250;
  const grandTotal = subtotal + deliveryFee;

  const orderId = `SS-${Date.now().toString().slice(-6)}`;
  const orderDate = new Date().toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
  });

  const newOrder = {
    id: orderId,
    date: orderDate,
    customerName: name,
    phone: phone,
    city: city,
    address: address,
    paymentMethod: payMethod,
    giftNote: giftNote,
    items: [...cart],
    subtotal: subtotal,
    deliveryFee: deliveryFee,
    total: grandTotal,
    status: "Pending",
    trackingNumber: `SS-${Date.now().toString().slice(-6)}`,
  };

  orders.unshift(newOrder);
  saveOrdersToStorage();

  document.getElementById("receiptOrderId").innerText = orderId;
  document.getElementById("receiptDate").innerText = `Date: ${orderDate}`;
  document.getElementById("receiptTrackingNumber").innerText =
    newOrder.trackingNumber;
  document.getElementById("receiptCustName").innerText = name;
  document.getElementById("receiptCustCity").innerText =
    `${city} (${address.substring(0, 20)}...)`;
  document.getElementById("receiptPayMethod").innerText = payMethod;
  document.getElementById("receiptGrandTotal").innerText =
    `PKR ${grandTotal.toLocaleString()}`;

  document.getElementById("receiptItems").innerHTML =
    cart
      .map(
        (i) => `
                <div class="flex justify-between">
                    <span>${i.quantity}x ${i.title}</span>
                    <span class="font-semibold">PKR ${(i.salePrice * i.quantity).toLocaleString()}</span>
                </div>
            `,
      )
      .join("") +
    `
                <div class="flex justify-between text-gray-500 pt-1 border-t border-gray-100">
                    <span>Delivery Fee</span>
                    <span>${deliveryFee === 0 ? "FREE" : `PKR ${deliveryFee}`}</span>
                </div>
            `;

  cart = [];
  appliedDiscount = 0;
  saveCartToStorage();
  updateCartUI();

  closeCheckoutModal();
  document.getElementById("receiptModal").classList.remove("hidden");
  document.getElementById("checkoutForm").reset();

  showToast("Order placed successfully!");
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

// Mobile Admin Access Restriction
function openAdminPasscodeModal() {
  if (!isDesktopDevice()) {
    document
      .getElementById("adminMobileRestrictModal")
      .classList.remove("hidden");
    return;
  }

  if (isAdminLoggedIn) {
    switchView("admin");
  } else {
    document.getElementById("adminPasscodeModal").classList.remove("hidden");
  }
}

function closeAdminMobileRestrictModal() {
  document.getElementById("adminMobileRestrictModal").classList.add("hidden");
}

function closeAdminPasscodeModal() {
  document.getElementById("adminPasscodeModal").classList.add("hidden");
}

function handleAdminPasscodeSubmit(e) {
  e.preventDefault();
  const pass = document.getElementById("adminPassInput").value;
  if (pass === "sheen123") {
    isAdminLoggedIn = true;
    sessionStorage.setItem("ss_admin_authed", "true");
    closeAdminPasscodeModal();
    switchView("admin");
    showToast("Admin Dashboard Unlocked");
  } else {
    alert("Incorrect passcode. Please try again.");
  }
}

function logoutAdmin() {
  isAdminLoggedIn = false;
  sessionStorage.removeItem("ss_admin_authed");
  switchView("store");
  showToast("Admin locked");
}

function switchView(view) {
  const store = document.getElementById("storeView");
  const admin = document.getElementById("adminView");

  if (view === "admin") {
    if (!isDesktopDevice()) {
      document
        .getElementById("adminMobileRestrictModal")
        .classList.remove("hidden");
      return;
    }
    if (!isAdminLoggedIn) {
      openAdminPasscodeModal();
      return;
    }
    store.classList.add("hidden");
    admin.classList.remove("hidden");
    renderAdminKPIs();
    renderAdminProducts();
    renderAdminOrders();
  } else {
    admin.classList.add("hidden");
    store.classList.remove("hidden");
    renderProducts();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchAdminTab(tab) {
  const prodTab = document.getElementById("adminTabProducts");
  const ordersTab = document.getElementById("adminTabOrders");
  const prodBtn = document.getElementById("adminTabProdBtn");
  const ordersBtn = document.getElementById("adminTabOrdersBtn");

  if (tab === "products") {
    prodTab.classList.remove("hidden");
    ordersTab.classList.add("hidden");
    prodBtn.className =
      "py-3 px-6 text-xs sm:text-sm font-bold border-b-2 border-brand-rosedark text-brand-rosedark focus:outline-none";
    ordersBtn.className =
      "py-3 px-6 text-xs sm:text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-700 focus:outline-none";
  } else {
    ordersTab.classList.remove("hidden");
    prodTab.classList.add("hidden");
    ordersBtn.className =
      "py-3 px-6 text-xs sm:text-sm font-bold border-b-2 border-brand-rosedark text-brand-rosedark focus:outline-none";
    prodBtn.className =
      "py-3 px-6 text-xs sm:text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-700 focus:outline-none";
  }
}

// Admin Inventory CRUD & Analytics
function renderAdminKPIs() {
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pending = orders.filter((o) => o.status === "Pending").length;

  document.getElementById("kpiRevenue").innerText =
    `PKR ${revenue.toLocaleString()}`;
  document.getElementById("kpiTotalOrders").innerText = orders.length;
  document.getElementById("kpiPendingOrders").innerText = pending;
  document.getElementById("kpiActiveProducts").innerText = products.length;
}

function renderAdminProducts() {
  const tbody = document.getElementById("adminProductsTableBody");
  tbody.innerHTML = products
    .map(
      (p) => `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="py-3 px-6 font-semibold flex items-center space-x-3">
                        <img src="${p.imageUrl}" class="w-10 h-10 object-cover rounded-lg border" onerror="this.src='https://placehold.co/100'">
                        <div>
                            <p class="text-gray-900 font-bold">${p.title}</p>
                            <p class="text-[10px] text-gray-400">ID: ${p.id}</p>
                        </div>
                    </td>
                    <td class="py-3 px-4">${p.category}</td>
                    <td class="py-3 px-4">
                        <div class="font-bold text-brand-rosedark">PKR ${p.salePrice.toLocaleString()}</div>
                        ${isProductOnSale(p) ? `<div class="text-[10px] text-gray-400 line-through">PKR ${p.origPrice.toLocaleString()}</div><span class="text-[10px] font-bold text-rose-600">${Math.round(((p.origPrice - p.salePrice) / p.origPrice) * 100)}% OFF</span>` : '<span class="text-[10px] text-gray-400">No sale</span>'}
                    </td>
                    <td class="py-3 px-4">
                        <span class="px-2 py-1 rounded-full text-[10px] font-bold ${p.stockStatus === "In Stock" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}">
                            ${p.stockStatus}
                        </span>
                    </td>
                    <td class="py-3 px-6 text-right space-x-2">
                        <button onclick="editProduct('${p.id}')" class="text-blue-600 hover:underline font-bold">Edit</button>
                        <button onclick="deleteProduct('${p.id}')" class="text-red-500 hover:underline font-bold">Delete</button>
                    </td>
                </tr>
            `,
    )
    .join("");
}

async function handleProductSave(e) {
  e.preventDefault();
  const editId = document.getElementById("prodEditId").value;
  const title = document.getElementById("prodTitle").value.trim();
  const category = document.getElementById("prodCategory").value;
  const regularPrice = parseInt(
    document.getElementById("prodOrigPrice").value,
    10,
  );
  const saleEnabled = document.getElementById("prodSaleEnabled").checked;
  const enteredSalePrice = parseInt(
    document.getElementById("prodSalePrice").value,
    10,
  );
  if (!Number.isFinite(regularPrice) || regularPrice < 1) {
    showToast("Enter a valid regular price");
    return;
  }
  if (
    saleEnabled &&
    (!Number.isFinite(enteredSalePrice) ||
      enteredSalePrice < 1 ||
      enteredSalePrice >= regularPrice)
  ) {
    showToast("Sale price must be lower than the regular price");
    return;
  }
  const salePrice = saleEnabled ? enteredSalePrice : regularPrice;
  const origPrice = saleEnabled ? regularPrice : null;
  const stockStatus = document.getElementById("prodStockStatus").value;
  const description = document.getElementById("prodDescription").value.trim();
  const mode =
    document.querySelector('input[name="prodImageMode"]:checked')?.value ||
    "url";
  const file = document.getElementById("prodImageFile").files[0];
  let imageUrl = document.getElementById("prodImageUrl").value.trim();
  const existing = products.find((p) => p.id === editId);

  try {
    if (mode === "upload" && file) imageUrl = await compressProductImage(file);
    else if (mode === "upload" && existing) imageUrl = existing.imageUrl;
    if (!imageUrl) {
      showToast("Please upload an image or enter an image URL");
      return;
    }
    if (editId) {
      const index = products.findIndex((p) => p.id === editId);
      if (index !== -1)
        products[index] = {
          ...products[index],
          title,
          category,
          salePrice,
          origPrice,
          saleEnabled,
          imageUrl,
          stockStatus,
          description,
        };
      showToast("Product updated successfully!");
    } else {
      products.unshift({
        id: `ss-p${Date.now()}`,
        title,
        category,
        salePrice,
        origPrice,
        saleEnabled,
        imageUrl,
        stockStatus,
        description,
        rating: 5.0,
      });
      showToast("New product added!");
    }
    saveProductsToStorage();
    resetProductForm();
    renderAdminProducts();
    renderAdminKPIs();
    renderCategories();
    renderProducts();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Could not save product. Image may be too large.");
  }
}

function toggleProductImageMode() {
  const mode =
    document.querySelector('input[name="prodImageMode"]:checked')?.value ||
    "upload";
  const fileInput = document.getElementById("prodImageFile");
  const urlInput = document.getElementById("prodImageUrl");
  fileInput.classList.toggle("hidden", mode !== "upload");
  urlInput.classList.toggle("hidden", mode !== "url");
  fileInput.required =
    mode === "upload" && !document.getElementById("prodEditId").value;
  urlInput.required = mode === "url";
}

function previewProductImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Please select a valid image file");
    event.target.value = "";
    return;
  }
  const preview = document.getElementById("prodImagePreview");
  preview.src = URL.createObjectURL(file);
  preview.classList.remove("hidden");
}

function compressProductImage(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error("Choose an image under 12 MB"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image file"));
      img.onload = () => {
        const max = 1100,
          scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas
          .getContext("2d")
          .drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function editProduct(id) {
  const p = products.find((prod) => prod.id === id);
  if (!p) return;

  document.getElementById("prodFormTitle").innerText = "Edit Product";
  document.getElementById("prodEditId").value = p.id;
  document.getElementById("prodTitle").value = p.title;
  document.getElementById("prodCategory").value = p.category;
  const productHasSale = isProductOnSale(p);
  document.getElementById("prodSaleEnabled").checked = productHasSale;
  document.getElementById("prodOrigPrice").value = productHasSale
    ? p.origPrice
    : p.salePrice;
  document.getElementById("prodSalePrice").value = productHasSale
    ? p.salePrice
    : "";
  toggleProductSaleFields();
  document.getElementById("prodImageUrl").value = p.imageUrl;
  document.querySelector('input[name="prodImageMode"][value="url"]').checked =
    true;
  document.getElementById("prodImageFile").value = "";
  document.getElementById("prodImagePreview").src = p.imageUrl;
  document.getElementById("prodImagePreview").classList.remove("hidden");
  toggleProductImageMode();
  document.getElementById("prodStockStatus").value = p.stockStatus;
  document.getElementById("prodDescription").value = p.description;

  window.scrollTo({ top: 100, behavior: "smooth" });
}

function deleteProduct(id) {
  if (confirm("Delete this product from inventory?")) {
    products = products.filter((p) => p.id !== id);
    saveProductsToStorage();
    renderAdminProducts();
    renderAdminKPIs();
    renderCategories();
    renderProducts();
    showToast("Product deleted");
  }
}

function resetProductForm() {
  document.getElementById("productForm").reset();
  document.getElementById("prodEditId").value = "";
  document.getElementById("prodFormTitle").innerText = "Add New Luxury Product";
  document.querySelector(
    'input[name="prodImageMode"][value="upload"]',
  ).checked = true;
  document.getElementById("prodImageFile").value = "";
  document.getElementById("prodImageUrl").value = "";
  document.getElementById("prodImagePreview").classList.add("hidden");
  document.getElementById("prodSaleEnabled").checked = false;
  document.getElementById("prodSalePrice").value = "";
  toggleProductSaleFields();
  toggleProductImageMode();
}

// Admin Orders Manager
function renderAdminOrders() {
  const tbody = document.getElementById("adminOrdersTableBody");
  const filter = document.getElementById("orderStatusFilter").value;
  const searchQuery = (document.getElementById("adminOrderSearch")?.value || "")
    .toLowerCase()
    .trim();

  let filteredOrders = orders.filter((o) => {
    const matchesFilter = filter === "ALL" || o.status === filter;
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery) ||
      o.customerName.toLowerCase().includes(searchQuery) ||
      o.phone.toLowerCase().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  if (filteredOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-400">No customer orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredOrders
    .map(
      (o) => `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="py-3 px-6">
                        <span class="font-extrabold text-brand-rosedark">${o.id}</span>
                        <p class="text-[10px] text-gray-400">${o.date}</p>
                    </td>
                    <td class="py-3 px-4">
                        <p class="font-bold text-gray-800">${o.customerName}</p>
                        <p class="text-[11px] text-gray-500">${o.phone} | ${o.city}</p>
                        <p class="text-[10px] text-gray-400 truncate max-w-xs">${o.address}</p>
                    </td>
                    <td class="py-3 px-4">
                        <p class="text-xs font-semibold text-gray-700">${o.items.length} item(s):</p>
                        <p class="text-[10px] text-gray-500 truncate max-w-xs">${o.items.map((i) => `${i.quantity}x ${i.title}`).join(", ")}</p>
                    </td>
                    <td class="py-3 px-4 font-bold text-gray-900">PKR ${o.total.toLocaleString()}</td>
                    <td class="py-3 px-4">
                        <span class="text-[10px] block font-semibold text-gray-500">${o.paymentMethod}</span>
                        <select onchange="updateOrderStatus('${o.id}', this.value)" class="mt-1 text-[11px] font-bold px-2 py-1 rounded-lg border ${
                          o.status === "Pending"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : o.status === "Dispatched"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : o.status === "Delivered"
                                ? "bg-green-50 text-green-800 border-green-200"
                                : "bg-gray-50 text-gray-800 border-gray-200"
                        }">
                            <option value="Pending" ${o.status === "Pending" ? "selected" : ""}>Pending</option>
                            <option value="Processing" ${o.status === "Processing" ? "selected" : ""}>Processing</option>
                            <option value="Dispatched" ${o.status === "Dispatched" ? "selected" : ""}>Dispatched</option>
                            <option value="Delivered" ${o.status === "Delivered" ? "selected" : ""}>Delivered</option>
                        </select>
                    </td>
                    <td class="py-3 px-4 text-right">
                        <button onclick="deleteOrder('${o.id}')" class="text-red-500 hover:underline font-bold text-xs">Delete</button>
                    </td>
                </tr>
            `,
    )
    .join("");
}

function trackCustomerOrder(e) {
  e.preventDefault();
  const raw = document
    .getElementById("trackingOrderId")
    .value.trim()
    .toUpperCase();
  const normalized = raw.startsWith("#") ? raw.slice(1) : raw;
  const order = orders.find(
    (o) =>
      String(o.id).replace("#", "").toUpperCase() === normalized ||
      String(o.trackingNumber || "")
        .replace("#", "")
        .toUpperCase() === normalized,
  );
  const result = document.getElementById("trackingResult");
  result.classList.remove("hidden");
  if (!order) {
    result.innerHTML = `<div class="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">No order found. Please check your order number and try again.</div>`;
    return;
  }
  const steps = ["Pending", "Processing", "Dispatched", "Delivered"];
  const current = Math.max(0, steps.indexOf(order.status));
  result.innerHTML = `<div class="rounded-2xl bg-white border border-brand-rose/20 p-5">
                <div class="flex flex-wrap justify-between gap-2"><div><p class="text-xs text-gray-500">Order number</p><strong class="text-brand-rosedark">${order.id}</strong></div>
                <div><p class="text-xs text-gray-500">Tracking number</p><strong>${order.trackingNumber || order.id.replace("#", "")}</strong></div></div>
                <p class="mt-4 text-sm text-gray-700">Current status: <strong class="text-brand-rosedark">${order.status}</strong></p>
                <div class="grid grid-cols-4 gap-2 mt-4">${steps.map((step, i) => `<div class="text-center"><div class="h-2 rounded-full ${i <= current ? "bg-brand-rosedark" : "bg-gray-200"}"></div><span class="text-[10px] ${i <= current ? "text-brand-rosedark font-bold" : "text-gray-400"}">${step}</span></div>`).join("")}</div>
                <p class="text-xs text-gray-500 mt-4">Placed: ${order.date}</p></div>`;
}

function updateOrderStatus(orderId, newStatus) {
  const order = orders.find((o) => o.id === orderId);
  if (order) {
    order.status = newStatus;
    saveOrdersToStorage();
    renderAdminKPIs();
    renderAdminOrders();
    showToast(`Order ${orderId} updated to "${newStatus}"`);
  }
}

function deleteOrder(orderId) {
  if (confirm(`Delete order ${orderId}?`)) {
    orders = orders.filter((o) => o.id !== orderId);
    saveOrdersToStorage();
    renderAdminOrders();
    renderAdminKPIs();
    showToast("Order deleted");
  }
}

function exportOrdersCSV() {
  if (orders.length === 0) {
    alert("No orders available to export!");
    return;
  }

  let csv =
    "Order ID,Date,Customer Name,Phone,City,Total PKR,Payment Method,Status\n";
  orders.forEach((o) => {
    csv += `"${o.id}","${o.date}","${o.customerName}","${o.phone}","${o.city}","${o.total}","${o.paymentMethod}","${o.status}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", `Sheen_Shay_Orders_${Date.now()}.csv`);
  a.click();
  showToast("Orders exported to CSV");
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
  toast.innerHTML = `<svg class="w-4 h-4 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>${message}</span>`;

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
  if (typeof closeAdminPasscodeModal === "function") closeAdminPasscodeModal();
});
(function () {
  const ids = [
    "productQuickViewModal",
    "checkoutModal",
    "receiptModal",
    "adminPasscodeModal",
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
