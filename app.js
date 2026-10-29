const API_URL = "https://fakestoreapi.com/products";
const STORAGE_KEYS = { cart: "lime-tide-cart", theme: "lime-tide-theme" };

const elements = {
  loader: document.querySelector("#loader"),
  loaderMessage: document.querySelector("#loaderMessage"),
  offlineBanner: document.querySelector("#offlineBanner"),
  retryButton: document.querySelector("#retryButton"),
  siteShell: document.querySelector("#siteShell"),
  themeToggle: document.querySelector("#themeToggle"),
  cartShortcut: document.querySelector("#cartShortcut"),
  headerCartCount: document.querySelector("#headerCartCount"),
  categoryTabs: document.querySelector("#categoryTabs"),
  productGrid: document.querySelector("#productGrid"),
  resultCount: document.querySelector("#resultCount"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  statusMessage: document.querySelector("#statusMessage"),
  loadMoreButton: document.querySelector("#loadMoreButton"),
  menuToggle: document.querySelector("#menuToggle"),
  mainNav: document.querySelector(".main-nav"),
  drawerBackdrop: document.querySelector("#drawerBackdrop"),
  cartDrawer: document.querySelector("#cartDrawer"),
  closeCart: document.querySelector("#closeCart"),
  cartItems: document.querySelector("#cartItems"),
  cartEmpty: document.querySelector("#cartEmpty"),
  cartFooter: document.querySelector("#cartFooter"),
  drawerCount: document.querySelector("#drawerCount"),
  cartTotal: document.querySelector("#cartTotal"),
  clearCart: document.querySelector("#clearCart"),
  continueShopping: document.querySelector("#continueShopping"),
  checkoutButton: document.querySelector("#checkoutButton"),
  toast: document.querySelector("#toast"),
  toastText: document.querySelector("#toastText"),
  year: document.querySelector("#year"),
};

let products = [];
let activeCategory = "all";
let searchTerm = "";
let sortMode = "featured";
let visibleProducts = 8;
let cart = readStorage(STORAGE_KEYS.cart, []);
let toastTimer;

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
  } catch {
    showToast("Your browser couldn't save the list.");
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

function escapeHTML(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === "dark";
  elements.themeToggle.innerHTML = isDark
    ? '<i class="bi bi-sun"></i>'
    : '<i class="bi bi-moon-stars"></i>';
  elements.themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light theme" : "Switch to dark theme",
  );
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    /* Theme still works for this visit. */
  }
}

function showLoader(message = "Getting the good stuff ready…") {
  elements.loaderMessage.textContent = message;
  elements.loader.classList.remove("is-done");
}

function hideLoader() {
  elements.loader.classList.add("is-done");
  window.setTimeout(() => {
    if (elements.loader.classList.contains("is-done"))
      elements.loader.hidden = true;
  }, 450);
}

function showOfflineState(
  message = "We couldn't load the collection. Check your internet connection and try again.",
) {
  elements.siteShell.hidden = true;
  elements.offlineBanner.hidden = false;
  elements.loader.hidden = true;
  elements.loader.classList.remove("is-done");
  elements.loaderMessage.textContent = message;
}

async function loadProducts() {
  elements.offlineBanner.hidden = true;
  elements.loader.hidden = false;
  showLoader("Connecting to the shop…");
  elements.siteShell.hidden = true;

  if (!navigator.onLine) {
    showOfflineState(
      "You're offline. Check your internet connection, then retry.",
    );
    return;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(API_URL, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`Product service returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0)
      throw new Error("The product list was empty.");

    products = data;
    elements.siteShell.hidden = false;
    elements.offlineBanner.hidden = true;
    renderProducts();
    renderCart();
    hideLoader();
  } catch (error) {
    console.error("Could not load products:", error);
    showOfflineState(
      !navigator.onLine
        ? "You're offline. Check your internet connection, then retry."
        : "We couldn't reach the product service. Check your internet connection and try again.",
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getFilteredProducts() {
  let filtered = [...products];

  if (activeCategory !== "all") {
    filtered = filtered.filter(
      (product) => product.category === activeCategory,
    );
  }

  if (searchTerm) {
    filtered = filtered.filter((product) =>
      `${product.title} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(searchTerm),
    );
  }

  if (sortMode === "price-low") filtered.sort((a, b) => a.price - b.price);
  if (sortMode === "price-high") filtered.sort((a, b) => b.price - a.price);
  if (sortMode === "rating")
    filtered.sort((a, b) => b.rating.rate - a.rating.rate);

  return filtered;
}

function categoryLabel(category = "") {
  const labels = {
    electronics: "Tech",
    jewelery: "Accessories",
    "men's clothing": "For him",
    "women's clothing": "For her",
  };
  return labels[category] || category;
}

function badgeFor(product, index) {
  if (product.rating?.rate >= 4.5)
    return { text: "Top rated", color: "orange" };
  if (index % 5 === 1) return { text: "Good find", color: "blue" };
  return { text: "Everyday pick", color: "" };
}

function productCard(product, index) {
  const badge = badgeFor(product, index);
  const inCart = cart.some((item) => item.id === product.id);
  return `
    <article class="product-card">
      <div class="product-media">
        <span class="product-badge ${badge.color}">${badge.text}</span>
        <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.title)}" loading="lazy" referrerpolicy="no-referrer">
        <button class="quick-buy" data-buy-id="${product.id}" aria-label="${inCart ? "Add another" : "Add"} ${escapeHTML(product.title)} to buying list" title="Add to buying list">
          <i class="bi ${inCart ? "bi-bag-check-fill" : "bi-bag-plus"}"></i>
        </button>
      </div>
      <div class="product-meta"><span class="product-category">${escapeHTML(categoryLabel(product.category))}</span><span class="product-rating"><i class="bi bi-star-fill"></i>${Number(product.rating?.rate || 0).toFixed(1)} <span>(${Number(product.rating?.count || 0)})</span></span></div>
      <h3 class="product-title">${escapeHTML(product.title)}</h3>
      <div class="product-bottom"><div><span class="product-price">${formatPrice(product.price)}</span></div><button class="product-cta" data-buy-id="${product.id}">${inCart ? "Add another" : "Add to list"} <i class="bi bi-arrow-up-right"></i></button></div>
    </article>`;
}

function renderProducts() {
  const filtered = getFilteredProducts();
  const visible = filtered.slice(0, visibleProducts);

  elements.resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "item" : "items"} to explore`;
  elements.productGrid.innerHTML = visible.map(productCard).join("");
  elements.loadMoreButton.hidden =
    visible.length >= filtered.length || filtered.length === 0;
  elements.statusMessage.hidden = filtered.length > 0;
  elements.statusMessage.classList.remove("error");

  if (filtered.length === 0) {
    elements.statusMessage.textContent = products.length
      ? "No products match that search. Try another word or category."
      : "Products are not available right now.";
    elements.productGrid.innerHTML = "";
  }
}

function addToCart(productId) {
  const product = products.find((item) => item.id === Number(productId));
  if (!product) return;

  const existing = cart.find((item) => item.id === product.id);
  if (existing) existing.quantity += 1;
  else
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      category: product.category,
      quantity: 1,
    });

  saveCart();
  renderProducts();
  renderCart();
  showToast(`${product.title} added to your buying list`);
}

function changeQuantity(productId, change) {
  const item = cart.find((entry) => entry.id === Number(productId));
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) cart = cart.filter((entry) => entry.id !== item.id);
  saveCart();
  renderCart();
  renderProducts();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== Number(productId));
  saveCart();
  renderCart();
  renderProducts();
  showToast("Item removed from your list");
}

function renderCart() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  elements.headerCartCount.textContent = count > 99 ? "99+" : count;
  elements.drawerCount.textContent = `(${count})`;
  elements.cartTotal.textContent = formatPrice(total);
  elements.cartEmpty.hidden = cart.length > 0;
  elements.cartFooter.hidden = cart.length === 0;

  elements.cartItems.innerHTML = cart
    .map(
      (item) => `
    <article class="cart-item">
      <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}">
      <div>
        <p class="cart-item-category">${escapeHTML(categoryLabel(item.category))}</p>
        <h3 class="cart-item-title">${escapeHTML(item.title)}</h3>
        <span class="cart-item-price">${formatPrice(item.price * item.quantity)}</span>
        <div class="quantity-controls">
          <button data-quantity-id="${item.id}" data-change="-1" aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button data-quantity-id="${item.id}" data-change="1" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="remove-item" data-remove-id="${item.id}" aria-label="Remove ${escapeHTML(item.title)}"><i class="bi bi-trash3"></i></button>
    </article>`,
    )
    .join("");
}

function openCart() {
  elements.drawerBackdrop.hidden = false;
  requestAnimationFrame(() => elements.drawerBackdrop.classList.add("visible"));
  elements.cartDrawer.classList.add("open");
  elements.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  elements.closeCart.focus();
}

function closeCart() {
  elements.drawerBackdrop.classList.remove("visible");
  elements.cartDrawer.classList.remove("open");
  elements.cartDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  window.setTimeout(() => {
    if (!elements.cartDrawer.classList.contains("open"))
      elements.drawerBackdrop.hidden = true;
  }, 260);
}

function showToast(message) {
  elements.toastText.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => elements.toast.classList.remove("show"),
    2600,
  );
}

// Category filters
elements.categoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  visibleProducts = 8;
  elements.categoryTabs
    .querySelectorAll("[data-category]")
    .forEach((tab) => tab.classList.toggle("active", tab === button));
  renderProducts();
});

// Search and sort
elements.searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  visibleProducts = 8;
  renderProducts();
});
elements.sortSelect.addEventListener("change", (event) => {
  sortMode = event.target.value;
  renderProducts();
});

// Buy buttons are handled with event delegation because cards are rendered dynamically.
elements.productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-buy-id]");
  if (button) addToCart(button.dataset.buyId);
});
elements.loadMoreButton.addEventListener("click", () => {
  visibleProducts += 8;
  renderProducts();
});

// Buying list drawer
elements.cartShortcut.addEventListener("click", openCart);
elements.closeCart.addEventListener("click", closeCart);
elements.drawerBackdrop.addEventListener("click", closeCart);
elements.continueShopping.addEventListener("click", closeCart);
elements.cartItems.addEventListener("click", (event) => {
  const quantityButton = event.target.closest("[data-quantity-id]");
  const removeButton = event.target.closest("[data-remove-id]");
  if (quantityButton)
    changeQuantity(
      quantityButton.dataset.quantityId,
      Number(quantityButton.dataset.change),
    );
  if (removeButton) removeFromCart(removeButton.dataset.removeId);
});
elements.clearCart.addEventListener("click", () => {
  cart = [];
  saveCart();
  renderCart();
  renderProducts();
  showToast("Your buying list has been cleared");
});
elements.checkoutButton.addEventListener("click", () => {
  showToast("This demo saves a buying list; checkout isn't connected yet.");
});

// Theme, navigation and keyboard shortcuts
elements.themeToggle.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme || "dark";
  setTheme(current === "dark" ? "light" : "dark");
});
elements.menuToggle.addEventListener("click", () => {
  const isOpen = elements.mainNav.classList.toggle("open");
  elements.menuToggle.innerHTML = `<i class="bi ${isOpen ? "bi-x-lg" : "bi-list"}"></i>`;
  elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
});
elements.mainNav.addEventListener("click", (event) => {
  const categoryLink = event.target.closest("[data-category-link]");
  if (categoryLink) {
    activeCategory = categoryLink.dataset.categoryLink;
    elements.categoryTabs
      .querySelectorAll("[data-category]")
      .forEach((tab) =>
        tab.classList.toggle("active", tab.dataset.category === activeCategory),
      );
    visibleProducts = 8;
    renderProducts();
  }
  elements.mainNav.classList.remove("open");
  elements.menuToggle.innerHTML = '<i class="bi bi-list"></i>';
  elements.menuToggle.setAttribute("aria-expanded", "false");
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCart();
  const targetTag = document.activeElement?.tagName;
  if (
    event.key === "/" &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(targetTag)
  ) {
    event.preventDefault();
    elements.searchInput.focus();
  }
});
elements.retryButton.addEventListener("click", loadProducts);
window.addEventListener("online", () => {
  if (elements.siteShell.hidden) loadProducts();
});
window.addEventListener("offline", () => {
  if (!elements.siteShell.hidden)
    showToast("Connection lost. Product refresh may not work.");
});

elements.year.textContent = new Date().getFullYear();
setTheme(
  readStorage(STORAGE_KEYS.theme, "dark") === "light" ? "light" : "dark",
);
renderCart();
loadProducts();
