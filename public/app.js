const state = {
  token: localStorage.getItem("token"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  cart: JSON.parse(localStorage.getItem("cart") || "[]"),
  authMode: "login"
};

const $ = id => document.getElementById(id);

function headers(auth = false) {
  const h = { "Content-Type": "application/json" };
  if (auth && state.token) h.Authorization = `Bearer ${state.token}`;
  return h;
}

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function money(value) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function toast(message) {
  const t = $("toast");
  t.textContent = message;
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", 2200);
}

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  $(id).classList.remove("hidden");

  if (id === "orders") loadMyOrders();
  if (id === "admin") loadAdminOrders();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateAuthUI() {
  $("authBtn").textContent = state.user ? `Logout (${state.user.name.split(" ")[0]})` : "Login";
  document.querySelectorAll(".admin-only").forEach(el => {
    el.classList.toggle("hidden", state.user?.role !== "admin");
  });
  $("cartCount").textContent = state.cart.reduce((sum, i) => sum + i.quantity, 0);
}

$("authBtn").onclick = () => {
  if (state.user) {
    state.token = null;
    state.user = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    updateAuthUI();
    showSection("shop");
    toast("Logged out");
  } else openAuth();
};

async function loadCategories() {
  try {
    const categories = await api("/api/products/categories");
    $("category").innerHTML = `<option>All</option>` +
      categories.map(c => `<option>${escapeHtml(c)}</option>`).join("");
  } catch {}
}

async function loadProducts() {
  const search = encodeURIComponent($("search").value.trim());
  const category = encodeURIComponent($("category").value);
  try {
    const products = await api(`/api/products?search=${search}&category=${category}`);
    $("products").innerHTML = products.length
      ? products.map(productCard).join("")
      : `<div class="panel"><h3>No products found</h3><p>Try another search.</p></div>`;
  } catch (e) {
    $("products").innerHTML = `<div class="panel">${e.message}</div>`;
  }
}

function productCard(p) {
  const disabled = p.stock < 1 ? "disabled" : "";
  return `
    <article class="product">
      <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}"
           onerror="this.src='https://via.placeholder.com/600x400?text=Product'">
      <div class="product-body">
        <span class="category-label">${escapeHtml(p.category)}</span>
        <h3>${escapeHtml(p.name)}</h3>
        <p class="desc">${escapeHtml(p.description || "")}</p>
        <div class="price">${money(p.price)}</div>
        <div class="stock">${p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</div>
        <button class="primary" ${disabled} onclick="addToCart('${p._id}')">
          ${p.stock > 0 ? "Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </article>`;
}

let productsCache = [];
async function cacheProducts() {
  productsCache = await api("/api/products");
}

async function addToCart(id) {
  try {
    if (!productsCache.length) await cacheProducts();
    const p = productsCache.find(x => x._id === id);
    if (!p) return;

    const existing = state.cart.find(i => i.productId === id);
    if (existing) {
      if (existing.quantity >= p.stock) return toast("Maximum available stock reached");
      existing.quantity++;
    } else {
      state.cart.push({ productId: id, quantity: 1, name: p.name, price: p.price, image: p.image });
    }

    saveCart();
    toast("Added to cart 🛒");
  } catch (e) {
    toast(e.message);
  }
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(state.cart));
  updateAuthUI();
}

function openCart() {
  renderCart();
  $("cartModal").classList.remove("hidden");
}

function closeCart() {
  $("cartModal").classList.add("hidden");
}

function renderCart() {
  if (!state.cart.length) {
    $("cartItems").innerHTML = `<div class="panel"><p>Your cart is empty.</p></div>`;
    $("cartTotal").textContent = "₹0";
    return;
  }

  $("cartItems").innerHTML = state.cart.map((item, index) => `
    <div class="cart-row">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <div>${money(item.price)}</div>
      </div>
      <div class="qty">
        <button onclick="changeQty(${index}, -1)">−</button>
        <span>${item.quantity}</span>
        <button onclick="changeQty(${index}, 1)">+</button>
      </div>
      <button class="remove" onclick="removeCart(${index})">Remove</button>
    </div>`).join("");

  const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  $("cartTotal").textContent = money(total);
}

function changeQty(index, delta) {
  state.cart[index].quantity += delta;
  if (state.cart[index].quantity <= 0) state.cart.splice(index, 1);
  saveCart();
  renderCart();
}

function removeCart(index) {
  state.cart.splice(index, 1);
  saveCart();
  renderCart();
}

function openAuth() {
  $("authModal").classList.remove("hidden");
  switchAuth("login");
}

function closeAuth() {
  $("authModal").classList.add("hidden");
}

function switchAuth(mode) {
  state.authMode = mode;
  $("loginTab").classList.toggle("active", mode === "login");
  $("registerTab").classList.toggle("active", mode === "register");
  $("authName").classList.toggle("hidden", mode === "login");
  $("authName").required = mode === "register";
  $("authSubmit").textContent = mode === "login" ? "Login" : "Create Account";
  $("authMessage").textContent = "";
}

$("authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const payload = {
    name: $("authName").value,
    email: $("authEmail").value,
    password: $("authPassword").value
  };

  try {
    const data = await api(`/api/auth/${state.authMode}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload)
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    closeAuth();
    updateAuthUI();
    toast(state.authMode === "login" ? "Welcome back!" : "Account created!");
  } catch (e) {
    $("authMessage").textContent = e.message;
  }
});

function openCheckout() {
  if (!state.cart.length) return toast("Your cart is empty");
  if (!state.user) {
    closeCart();
    openAuth();
    return toast("Please login before checkout");
  }
  closeCart();
  $("checkoutModal").classList.remove("hidden");
}

function closeCheckout() {
  $("checkoutModal").classList.add("hidden");
}

$("checkoutForm").addEventListener("submit", async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  const shippingAddress = Object.fromEntries(form.entries());

  try {
    const order = await api("/api/orders", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({
        items: state.cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress
      })
    });

    state.cart = [];
    saveCart();
    e.target.reset();
    closeCheckout();
    toast(`Order placed: ${order._id.slice(-6).toUpperCase()}`);
    await loadProducts();
  } catch (e) {
    $("checkoutMessage").textContent = e.message;
  }
});

async function loadMyOrders() {
  if (!state.user) {
    $("myOrders").innerHTML = `<div class="panel"><h3>Please login</h3><p>Login to see your orders.</p></div>`;
    return;
  }

  try {
    const orders = await api("/api/orders/my", { headers: headers(true) });
    $("myOrders").innerHTML = orders.length
      ? orders.map(orderCard).join("")
      : `<div class="panel"><p>No orders yet.</p></div>`;
  } catch (e) {
    $("myOrders").innerHTML = `<div class="panel">${e.message}</div>`;
  }
}

function orderCard(o) {
  return `
    <div class="order-card">
      <div class="order-top">
        <div>
          <strong>Order #${o._id.slice(-8).toUpperCase()}</strong>
          <div class="desc">${new Date(o.createdAt).toLocaleString()}</div>
        </div>
        <span class="status">${escapeHtml(o.status)}</span>
      </div>
      <div class="order-items">
        ${o.items.map(i => `${escapeHtml(i.name)} × ${i.quantity} — ${money(i.price * i.quantity)}`).join("<br>")}
      </div>
      <div class="order-total">Total: ${money(o.totalAmount)}</div>
    </div>`;
}

$("productForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (state.user?.role !== "admin") return toast("Admin access required");

  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());
  body.price = Number(body.price);
  body.stock = Number(body.stock);

  try {
    await api("/api/products", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify(body)
    });
    e.target.reset();
    toast("Product added");
    await cacheProducts();
    await loadProducts();
  } catch (e) {
    toast(e.message);
  }
});

async function loadAdminOrders() {
  if (state.user?.role !== "admin") {
    $("adminOrders").innerHTML = "<p>Admin access required.</p>";
    return;
  }

  try {
    const orders = await api("/api/orders", { headers: headers(true) });
    $("adminOrders").innerHTML = orders.length
      ? orders.map(adminOrder).join("")
      : "<p>No orders yet.</p>";
  } catch (e) {
    $("adminOrders").innerHTML = `<p>${e.message}</p>`;
  }
}

function adminOrder(o) {
  const statuses = ["Placed","Processing","Shipped","Out for Delivery","Delivered","Cancelled"];
  return `
    <div class="admin-order">
      <strong>#${o._id.slice(-8).toUpperCase()}</strong>
      <div>${escapeHtml(o.user?.name || "User")} — ${money(o.totalAmount)}</div>
      <div class="desc">${new Date(o.createdAt).toLocaleString()}</div>
      <select onchange="updateOrderStatus('${o._id}', this.value)">
        ${statuses.map(s => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
      </select>
    </div>`;
}

async function updateOrderStatus(id, status) {
  try {
    await api(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: headers(true),
      body: JSON.stringify({ status })
    });
    toast("Order status updated");
  } catch (e) {
    toast(e.message);
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
function escapeAttr(value) { return escapeHtml(value); }

async function init() {
  updateAuthUI();
  await loadCategories();
  await cacheProducts();
  await loadProducts();
}

init();
