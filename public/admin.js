const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Ready for Shipment",
  "Shipped",
  "Delivered",
  "Cancelled",
];
const PAYMENT_STATUSES = ["Pending", "Confirmed", "Failed", "Refunded"];
let csrfToken = "";
let categories = [];
let currentOrderPage = 1;
let currentOrder = null;
let noticeTimer;

const $ = (selector, root = document) => root.querySelector(selector);
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
const money = (value) => `PKR ${Number(value || 0).toLocaleString("en-PK")}`;
const dateTime = (value) =>
  value ? new Date(value).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) : "—";
const textLines = (value) => String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (options.method && options.method !== "GET" && csrfToken) headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  if (response.status === 401) {
    location.assign("/admin/login");
    throw new Error("Your session has expired. Sign in again.");
  }
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
  return payload;
}

function showNotice(message, error = false) {
  const notice = $("#notice");
  notice.textContent = message;
  notice.hidden = false;
  notice.classList.toggle("error", error);
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 5000);
}

function statusOptions(values, selected, firstLabel = "") {
  const first = firstLabel ? `<option value="">${escapeHtml(firstLabel)}</option>` : "";
  return first + values.map((value) =>
    `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`,
  ).join("");
}

async function loadSession() {
  const { admin, csrfToken: token } = await api("/api/admin/auth/me");
  csrfToken = token;
  $("#adminEmail").textContent = admin.email;
}

async function loadDashboard() {
  const { stats, recentOrders } = await api("/api/admin/dashboard");
  $("#activeProducts").textContent = stats.activeProducts;
  $("#openOrders").textContent = stats.openOrders;
  $("#pendingPayments").textContent = stats.pendingPayments;
  $("#confirmedRevenue").textContent = money(stats.confirmedRevenue);
  $("#recentOrders").innerHTML = orderTable(recentOrders, { compact: true });
}

function orderTable(orders, { compact = false } = {}) {
  if (!orders.length) return '<div class="empty-state">No orders to show yet.</div>';
  return `<table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th>${compact ? "" : "<th>Payment</th>"}<th></th></tr></thead><tbody>${orders.map((order) => `
    <tr>
      <td><strong>${escapeHtml(order.orderNumber)}</strong><span class="subtle">${escapeHtml(dateTime(order.date))}</span></td>
      <td><strong>${escapeHtml(order.customerName)}</strong><span class="subtle">${escapeHtml(order.phone)} · ${escapeHtml(order.city)}</span></td>
      <td>${money(order.total)}</td>
      <td>${escapeHtml(order.status)}</td>
      ${compact ? "" : `<td>${escapeHtml(order.paymentStatus)}<span class="subtle">${escapeHtml(order.paymentMethod)}</span></td>`}
      <td><button class="text-button" data-action="view-order" data-id="${escapeHtml(order.orderNumber)}">Details</button></td>
    </tr>`).join("")}</tbody></table>`;
}

async function loadCategories() {
  const payload = await api("/api/admin/categories");
  categories = payload.categories;
  const options = categories.map((category) =>
    `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`,
  ).join("");
  $("#productForm").elements.category.innerHTML = options;
  $("#categoriesList").innerHTML = categories.length
    ? `<table><thead><tr><th>Category</th><th>Products</th><th>Description</th><th></th></tr></thead><tbody>${categories.map((category) => `
      <tr><td><strong>${escapeHtml(category.name)}</strong></td><td>—</td><td>${escapeHtml(category.description || "—")}</td>
      <td><div class="table-actions"><button class="text-button" data-action="edit-category" data-id="${escapeHtml(category.id)}">Edit</button><button class="text-button danger" data-action="delete-category" data-id="${escapeHtml(category.id)}">Delete</button></div></td></tr>`).join("")}</tbody></table>`
    : '<div class="empty-state">No categories have been created.</div>';
}

async function loadProducts() {
  const params = new URLSearchParams({ limit: "100" });
  if ($("#productVisibility").value) params.set("active", $("#productVisibility").value);
  if ($("#productSearch").value.trim()) params.set("search", $("#productSearch").value.trim());
  const { products, total } = await api(`/api/admin/products?${params}`);
  $("#productsTable").innerHTML = products.length
    ? `<table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Visibility</th><th></th></tr></thead><tbody>${products.map((product) => `
      <tr>
        <td><div class="product-cell"><img src="${escapeHtml(product.images[0]?.url || "")}" alt=""><div><strong>${escapeHtml(product.title)}</strong><span class="subtle">${escapeHtml(product.sku)}</span></div></div></td>
        <td>${escapeHtml(product.category)}</td>
        <td>${money(product.saleEnabled ? product.salePrice : product.price)}${product.saleEnabled ? `<span class="subtle"><s>${money(product.price)}</s></span>` : ""}</td>
        <td>${product.stockQuantity === null ? escapeHtml(product.stockStatus) : `${product.stockQuantity} · ${escapeHtml(product.stockStatus)}`}</td>
        <td>${product.active ? "Active" : "Archived"}</td>
        <td><div class="table-actions"><button class="text-button" data-action="edit-product" data-id="${escapeHtml(product.id)}">Edit</button>${product.active ? `<button class="text-button danger" data-action="archive-product" data-id="${escapeHtml(product.id)}">Archive</button>` : ""}</div></td>
      </tr>`).join("")}</tbody></table><p class="muted">${total} product${total === 1 ? "" : "s"}</p>`
    : '<div class="empty-state">No products match your search.</div>';
  $("#productForm").elements.category.innerHTML = categories.map((category) =>
    `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`,
  ).join("");
}

async function loadOrders() {
  const params = new URLSearchParams({ page: String(currentOrderPage), limit: "25" });
  if ($("#orderSearch").value.trim()) params.set("search", $("#orderSearch").value.trim());
  if ($("#orderStatus").value) params.set("status", $("#orderStatus").value);
  if ($("#paymentStatus").value) params.set("paymentStatus", $("#paymentStatus").value);
  if ($("#showArchivedOrders").checked) params.set("archived", "true");
  const { orders, page, pages, total } = await api(`/api/admin/orders?${params}`);
  $("#ordersTable").innerHTML = orderTable(orders);
  $("#orderPage").textContent = `${page} / ${Math.max(1, pages)} · ${total} orders`;
  $("#prevOrders").disabled = page <= 1;
  $("#nextOrders").disabled = page >= pages;
}

function setTab(tab) {
  $("#overviewPanel").hidden = tab !== "overview";
  for (const panel of document.querySelectorAll(".page-panel")) panel.hidden = panel.id !== `${tab}Panel`;
  for (const button of document.querySelectorAll(".tab")) button.classList.toggle("active", button.dataset.tab === tab);
  if (tab === "products") loadProducts().catch((error) => showNotice(error.message, true));
  if (tab === "categories") loadCategories().catch((error) => showNotice(error.message, true));
  if (tab === "orders") loadOrders().catch((error) => showNotice(error.message, true));
}

function resetProductForm() {
  const form = $("#productForm");
  form.reset();
  form.elements.id.value = "";
  form.elements.active.checked = true;
  form.elements.imageUrls.value = "";
  form.elements.stockQuantity.value = "";
  $("#productFormTitle").textContent = "Add a product";
}

function openProductForm(product) {
  resetProductForm();
  if (product) {
    const form = $("#productForm");
    form.elements.id.value = product.id;
    form.elements.title.value = product.title;
    form.elements.sku.value = product.sku;
    form.elements.category.value = product.category;
    form.elements.price.value = product.price;
    form.elements.saleEnabled.checked = product.saleEnabled;
    form.elements.salePrice.value = product.salePrice ?? "";
    form.elements.stockQuantity.value = product.stockQuantity ?? "";
    form.elements.stockStatus.value = product.stockStatus;
    form.elements.featured.checked = product.featured;
    form.elements.active.checked = product.active;
    form.elements.description.value = product.description;
    form.elements.imageUrls.value = product.images.map((image) => image.url).join("\n");
    form.elements.customizationOptions.value = (product.customizationOptions || []).join("\n");
    form.elements.tags.value = (product.tags || []).join("\n");
    form.elements.metaTitle.value = product.metaTitle || "";
    form.elements.metaDescription.value = product.metaDescription || "";
    form.elements.rating.value = product.rating ?? "";
    $("#productFormTitle").textContent = "Edit product";
  }
    $("#productForm").elements.salePrice.disabled = !$("#productForm").elements.saleEnabled.checked;
    $("#productForm").hidden = false;
  $("#productForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function productPayload(form, images) {
  return {
    title: form.elements.title.value,
    sku: form.elements.sku.value,
    category: form.elements.category.value,
    description: form.elements.description.value,
    price: Number(form.elements.price.value),
    saleEnabled: form.elements.saleEnabled.checked,
    salePrice: form.elements.salePrice.value ? Number(form.elements.salePrice.value) : null,
    stockQuantity: form.elements.stockQuantity.value === "" ? null : Number(form.elements.stockQuantity.value),
    stockStatus: form.elements.stockStatus.value,
    images,
    customizationOptions: textLines(form.elements.customizationOptions.value),
    tags: textLines(form.elements.tags.value),
    featured: form.elements.featured.checked,
    active: form.elements.active.checked,
    rating: form.elements.rating.value === "" ? null : Number(form.elements.rating.value),
    metaTitle: form.elements.metaTitle.value,
    metaDescription: form.elements.metaDescription.value,
  };
}

async function saveProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    let images = textLines(form.elements.imageUrls.value).map((url) => ({ url }));
    const files = form.elements.imageFiles.files;
    if (files.length) {
      const uploadData = new FormData();
      for (const file of files) uploadData.append("images", file);
      const uploaded = await api("/api/admin/uploads", { method: "POST", body: uploadData });
      images = [...images, ...uploaded.images];
    }
    const id = form.elements.id.value;
    const payload = productPayload(form, images);
    await api(id ? `/api/admin/products/${encodeURIComponent(id)}` : "/api/admin/products", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    form.hidden = true;
    showNotice(id ? "Product updated." : "Product added.");
    await loadProducts();
    await loadDashboard();
  } catch (error) {
    showNotice(error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function editProduct(id) {
  const { product } = await api(`/api/admin/products/${encodeURIComponent(id)}`);
  openProductForm(product);
}

function openOrder(order) {
  currentOrder = order;
  $("#orderDetails").innerHTML = `
    <p class="eyebrow">ORDER DETAILS</p><h2>${escapeHtml(order.orderNumber)}</h2>
    <div class="order-detail-grid">
      <div><strong>CUSTOMER</strong><p>${escapeHtml(order.customerName)}<br>${escapeHtml(order.email || "No email provided")}<br>${escapeHtml(order.phone)}</p></div>
      <div><strong>DELIVERY ADDRESS</strong><p>${escapeHtml(order.address)}<br>${escapeHtml(order.city)}</p></div>
      <div><strong>PAYMENT</strong><p>${escapeHtml(order.paymentMethod)}<br>${escapeHtml(order.paymentStatus)}</p></div>
      <div><strong>PLACED</strong><p>${escapeHtml(dateTime(order.date))}</p></div>
    </div>
    <div class="dialog-items"><strong>ITEMS</strong>${order.items.map((item) => `<p><span>${escapeHtml(item.quantity)} × ${escapeHtml(item.title)}${item.customization ? `<br><small>${escapeHtml(item.customization)}</small>` : ""}</span><strong>${money(item.quantity * item.unitPrice)}</strong></p>`).join("")}<p><span>Subtotal</span><strong>${money(order.subtotal)}</strong></p><p><span>Delivery</span><strong>${money(order.deliveryFee)}</strong></p><p><strong>Total</strong><strong>${money(order.total)}</strong></p></div>
    ${order.giftNote ? `<p class="muted"><strong>Gift note:</strong> ${escapeHtml(order.giftNote)}</p>` : ""}
    ${order.statusHistory?.length ? `<div class="history-list"><strong>STATUS HISTORY</strong>${order.statusHistory.map((entry) => `<p>${escapeHtml(entry.status)} · ${escapeHtml(dateTime(entry.at))}${entry.note ? ` — ${escapeHtml(entry.note)}` : ""}</p>`).join("")}</div>` : ""}
    <form id="orderUpdateForm" class="dialog-form">
      <label>Order status<select name="status">${statusOptions(ORDER_STATUSES, order.status)}</select></label>
      <label>Payment status<select name="paymentStatus">${statusOptions(PAYMENT_STATUSES, order.paymentStatus)}</select></label>
      <label>Shipping carrier<input name="trackingProvider" maxlength="100" value="${escapeHtml(order.trackingProvider)}"></label>
      <label>Tracking number<input name="trackingNumber" maxlength="100" value="${escapeHtml(order.trackingNumber)}"></label>
      <label class="wide">Internal notes<textarea name="internalNotes" maxlength="3000">${escapeHtml(order.internalNotes)}</textarea></label>
      <label class="wide">Status update note (optional)<input name="statusNote" maxlength="300"></label>
      <button class="button button-primary wide" type="submit">Save order updates</button>
      <button class="button button-outline wide" type="button" data-action="${order.archivedAt ? "restore-order" : "archive-order"}">${order.archivedAt ? "Restore order" : "Archive order"}</button>
    </form>`;
  $("#orderDialog").showModal();
}

async function viewOrder(id) {
  const { order } = await api(`/api/admin/orders/${encodeURIComponent(id)}`);
  openOrder(order);
}

async function saveOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await api(`/api/admin/orders/${encodeURIComponent(currentOrder.orderNumber)}`, {
      method: "PATCH",
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    $("#orderDialog").close();
    showNotice("Order details updated.");
    await Promise.all([loadOrders(), loadDashboard()]);
  } catch (error) {
    showNotice(error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function saveCategory(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.elements.id.value;
  const body = JSON.stringify({ name: form.elements.name.value, description: form.elements.description.value });
  try {
    await api(id ? `/api/admin/categories/${encodeURIComponent(id)}` : "/api/admin/categories", {
      method: id ? "PATCH" : "POST",
      body,
    });
    form.reset();
    form.elements.id.value = "";
    $("#cancelCategoryEdit").hidden = true;
    showNotice(id ? "Category updated." : "Category added.");
    await loadCategories();
  } catch (error) {
    showNotice(error.message, true);
  }
}

async function handleClick(event) {
  const tabButton = event.target.closest("[data-tab]");
  if (tabButton) return setTab(tabButton.dataset.tab);
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    if (action === "view-order") return await viewOrder(id);
    if (action === "edit-product") return await editProduct(id);
    if (action === "archive-product") {
      if (!confirm("Archive this product? It will no longer appear in the storefront.")) return;
      await api(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
      showNotice("Product archived.");
      await Promise.all([loadProducts(), loadDashboard()]);
    }
    if (action === "edit-category") {
      const category = categories.find((entry) => entry.id === id);
      if (!category) throw new Error("Category not found. Refresh and try again.");
      const form = $("#categoryForm");
      form.elements.id.value = category.id;
      form.elements.name.value = category.name;
      form.elements.description.value = category.description || "";
      $("#cancelCategoryEdit").hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (action === "delete-category") {
      if (!confirm("Delete this category? Products must be moved or archived first.")) return;
      await api(`/api/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
      showNotice("Category deleted.");
      await loadCategories();
    }
    if (action === "archive-order") {
      if (!currentOrder || currentOrder.archivedAt) return;
      if (!confirm("Archive this order record? It will remain saved and can be restored by support.")) return;
      await api(`/api/admin/orders/${encodeURIComponent(currentOrder.orderNumber)}/archive`, { method: "POST" });
      $("#orderDialog").close();
      showNotice("Order archived.");
      await Promise.all([loadOrders(), loadDashboard()]);
    }
    if (action === "restore-order") {
      if (!currentOrder?.archivedAt) return;
      await api(`/api/admin/orders/${encodeURIComponent(currentOrder.orderNumber)}/restore`, { method: "POST" });
      $("#orderDialog").close();
      showNotice("Order restored.");
      await loadOrders();
    }
  } catch (error) {
    showNotice(error.message, true);
  }
}

async function logout() {
  try {
    await api("/api/admin/auth/logout", { method: "POST" });
    location.assign("/admin/login");
  } catch (error) {
    showNotice(error.message, true);
  }
}

async function updatePassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const payload = await api("/api/admin/auth/password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: form.elements.currentPassword.value,
        newPassword: form.elements.newPassword.value,
      }),
    });
    csrfToken = payload.csrfToken;
    form.reset();
    showNotice(payload.message);
  } catch (error) {
    showNotice(error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function init() {
  try {
    await loadSession();
    $("#orderStatus").innerHTML = statusOptions(ORDER_STATUSES, "", "All order statuses");
    $("#paymentStatus").innerHTML = statusOptions(PAYMENT_STATUSES, "", "All payment statuses");
    document.addEventListener("click", handleClick);
    $("#logoutButton").addEventListener("click", logout);
    $("#newProductButton").addEventListener("click", () => openProductForm());
    $("#closeProductForm").addEventListener("click", () => { $("#productForm").hidden = true; });
    $("#cancelProductForm").addEventListener("click", () => { $("#productForm").hidden = true; });
    $("#productForm").addEventListener("submit", saveProduct);
    $("#categoryForm").addEventListener("submit", saveCategory);
    $("#cancelCategoryEdit").addEventListener("click", () => {
      $("#categoryForm").reset();
      $("#categoryForm").elements.id.value = "";
      $("#cancelCategoryEdit").hidden = true;
    });
    $("#orderDialog").addEventListener("submit", saveOrder);
    $("#passwordForm").addEventListener("submit", updatePassword);
    $("#productSearch").addEventListener("input", debounce(() => loadProducts().catch((error) => showNotice(error.message, true)), 250));
    $("#productVisibility").addEventListener("change", () => loadProducts().catch((error) => showNotice(error.message, true)));
    $("#orderSearch").addEventListener("input", debounce(() => {
      currentOrderPage = 1;
      loadOrders().catch((error) => showNotice(error.message, true));
    }, 250));
    $("#orderStatus").addEventListener("change", () => { currentOrderPage = 1; loadOrders().catch((error) => showNotice(error.message, true)); });
    $("#paymentStatus").addEventListener("change", () => { currentOrderPage = 1; loadOrders().catch((error) => showNotice(error.message, true)); });
    $("#showArchivedOrders").addEventListener("change", () => { currentOrderPage = 1; loadOrders().catch((error) => showNotice(error.message, true)); });
    $("#prevOrders").addEventListener("click", () => { currentOrderPage -= 1; loadOrders().catch((error) => showNotice(error.message, true)); });
    $("#nextOrders").addEventListener("click", () => { currentOrderPage += 1; loadOrders().catch((error) => showNotice(error.message, true)); });
    $("#exportOrders").addEventListener("click", () => {
      const link = document.createElement("a");
      link.href = "/api/admin/orders/export.csv";
      link.download = "";
      link.click();
    });
    $("#productForm").elements.saleEnabled.addEventListener("change", (event) => {
      $("#productForm").elements.salePrice.disabled = !event.target.checked;
    });
    $("#productForm").elements.salePrice.disabled = true;
    const results = await Promise.allSettled([loadCategories(), loadDashboard()]);
    for (const result of results) {
      if (result.status === "rejected") showNotice(result.reason.message, true);
    }
  } catch (error) {
    showNotice(error.message, true);
  }
}

function debounce(callback, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

init();
