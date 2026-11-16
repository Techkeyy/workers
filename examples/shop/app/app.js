// Inkwell Supply: a tiny stationery shop. Vanilla JS, no build step.
//
// DEMO ONLY: these credentials are fake and hard-coded so the example works offline.
// There is no server and no real account. Do not reuse them anywhere.
const DEMO_USER = { email: 'demo@inkwell.test', password: 'inkwell-demo' };
const COUPON = { code: 'INK10', rate: 0.1 };
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Prices are integer cents so the arithmetic is exact.
const PRODUCTS = [
  { id: 'fountain-pen', name: 'Fountain Pen', price: 1800, blurb: 'Smooth steel nib, refillable.' },
  { id: 'spiral-notebook', name: 'Spiral Notebook', price: 1200, blurb: '120 pages, dotted.' },
  { id: 'blue-black-ink', name: 'Blue-Black Ink', price: 950, blurb: '50 ml bottle.' },
  { id: 'washi-tape', name: 'Washi Tape Set', price: 625, blurb: 'Six rolls, muted colours.' },
  { id: 'pencil-set', name: 'Pencil Set', price: 1440, blurb: 'Twelve graphite pencils.' },
  { id: 'leather-journal', name: 'Leather Journal', price: 2400, blurb: 'Hand-stitched cover.' },
];

const view = document.getElementById('view');
const badge = document.getElementById('cart-badge');

// ---- state (kept in sessionStorage so a reload keeps the session and the cart) ----

const load = (key, fallback) => {
  try {
    return JSON.parse(sessionStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
let session = load('inkwell-session', null);
let cart = load('inkwell-cart', []); // [{ id, qty }]
let couponApplied = load('inkwell-coupon', false);

function saveCart() {
  sessionStorage.setItem('inkwell-cart', JSON.stringify(cart));
  sessionStorage.setItem('inkwell-coupon', JSON.stringify(couponApplied));
}

// ---- helpers ----

const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const product = (id) => PRODUCTS.find((p) => p.id === id);
const itemCount = () => cart.reduce((sum, line) => sum + line.qty, 0);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function updateBadge() {
  badge.textContent = String(itemCount());
}

function totals() {
  const subtotal = cart.reduce((sum, line) => sum + product(line.id).price * line.qty, 0);
  const discount = couponApplied ? Math.round(subtotal * COUPON.rate) : 0;
  return { subtotal, discount, total: subtotal - discount };
}

// ---- cart actions ----

function addToCart(id) {
  const line = cart.find((l) => l.id === id);
  if (line) line.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart();
  updateBadge(); // reflect the new count in the header
}

function changeQty(id, delta) {
  const line = cart.find((l) => l.id === id);
  if (!line) return;
  line.qty = Math.max(1, line.qty + delta);
  saveCart();
  updateBadge();
  renderCart();
}

function removeLine(id) {
  const index = cart.findIndex((line) => line.id === id);
  cart.splice(index, 1);
  saveCart();
  updateBadge();
  renderCart();
}

// ---- views ----

function renderLogin() {
  view.innerHTML = `
    <h1>Sign in</h1>
    <form id="login-form" class="login-form" novalidate>
      <label for="login-email">Email</label>
      <input id="login-email" name="email" type="email" autocomplete="username">
      <label for="login-password">Password</label>
      <input id="login-password" name="password" type="password" autocomplete="current-password">
      <div id="login-error" role="alert"></div>
      <p><button type="submit">Sign in</button></p>
      <p class="note">Demo store. Use the fake account ${DEMO_USER.email} / ${DEMO_USER.password}.</p>
    </form>`;
  document.getElementById('login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (email === DEMO_USER.email && password === DEMO_USER.password) {
      session = { email };
      sessionStorage.setItem('inkwell-session', JSON.stringify(session));
      location.hash = '#/shop';
    } else {
      document.getElementById('login-error').innerHTML = '<p class="form-error">Invalid email or password.</p>';
    }
  });
}

function renderShop() {
  view.innerHTML = `
    <h1>Stationery</h1>
    <ul class="grid">
      ${PRODUCTS.map(
        (p) => `
        <li>
          <article class="card" data-testid="product-card">
            <h2>${p.name}</h2>
            <p>${p.blurb}</p>
            <p class="price" data-testid="product-price">${money(p.price)}</p>
            <button type="button" data-add="${p.id}" aria-label="Add ${p.name} to cart">Add to cart</button>
          </article>
        </li>`,
      ).join('')}
    </ul>`;
  view.querySelectorAll('[data-add]').forEach((button) => button.addEventListener('click', () => addToCart(button.dataset.add)));
}

function renderCart() {
  if (!cart.length) {
    view.innerHTML = `<h1>Your cart</h1><p data-testid="empty-cart">Your cart is empty.</p><p><a href="#/shop">Back to the shop</a></p>`;
    return;
  }
  const { subtotal, discount, total } = totals();
  view.innerHTML = `
    <h1>Your cart</h1>
    <ul class="cart-lines">
      ${cart
        .map((line) => {
          const p = product(line.id);
          return `
        <li class="cart-line" data-testid="cart-line">
          <span class="name">${p.name}</span>
          <span class="qty">
            <button type="button" class="secondary" data-dec="${p.id}" aria-label="Decrease quantity of ${p.name}" ${line.qty === 1 ? 'disabled' : ''}>-</button>
            <span data-testid="qty">${line.qty}</span>
            <button type="button" class="secondary" data-inc="${p.id}" aria-label="Increase quantity of ${p.name}">+</button>
          </span>
          <span data-testid="line-total">${money(p.price * line.qty)}</span>
          <button type="button" class="secondary" data-remove="${p.id}" aria-label="Remove ${p.name}">Remove</button>
        </li>`;
        })
        .join('')}
    </ul>

    <section class="panel" aria-labelledby="coupon-heading">
      <h2 id="coupon-heading">Coupon</h2>
      <div class="coupon-row">
        <div>
          <label for="coupon-code">Coupon code</label>
          <input id="coupon-code" type="text" autocomplete="off">
        </div>
        <button type="button" id="apply-coupon">Apply coupon</button>
      </div>
      <div id="coupon-feedback">${couponApplied ? `<p class="form-ok" role="status">Coupon ${COUPON.code} applied: 10% off.</p>` : ''}</div>
    </section>

    <dl class="totals">
      <div><dt>Subtotal</dt><dd data-testid="subtotal">${money(subtotal)}</dd></div>
      ${discount ? `<div><dt>Discount</dt><dd data-testid="discount">-${money(discount)}</dd></div>` : ''}
      <div class="grand"><dt>Total</dt><dd data-testid="total">${money(total)}</dd></div>
    </dl>

    <section class="panel" aria-labelledby="checkout-heading">
      <h2 id="checkout-heading">Checkout</h2>
      <form id="checkout-form" novalidate>
        <label for="co-name">Full name</label>
        <input id="co-name" name="name" type="text" autocomplete="name">
        <p class="field-error" id="co-name-error" data-for="name"></p>
        <label for="co-email">Email address</label>
        <input id="co-email" name="email" type="email" autocomplete="email">
        <p class="field-error" id="co-email-error" data-for="email"></p>
        <label for="co-address">Shipping address</label>
        <input id="co-address" name="address" type="text" autocomplete="street-address">
        <p class="field-error" id="co-address-error" data-for="address"></p>
        <p><button type="submit">Place order</button></p>
      </form>
    </section>`;

  view.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => changeQty(b.dataset.inc, 1)));
  view.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => changeQty(b.dataset.dec, -1)));
  view.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => removeLine(b.dataset.remove)));
  document.getElementById('apply-coupon').addEventListener('click', applyCoupon);
  document.getElementById('checkout-form').addEventListener('submit', submitOrder);
}

function applyCoupon() {
  const code = document.getElementById('coupon-code').value.trim().toUpperCase();
  if (code === COUPON.code) {
    couponApplied = true;
    saveCart();
    renderCart();
  } else {
    document.getElementById('coupon-feedback').innerHTML = '<p class="form-error" role="alert">Invalid coupon code.</p>';
  }
}

function validateCheckout(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Name is required';
  if (!values.email.trim() || !EMAIL_RE.test(values.email)) errors.email = values.email.trim() ? 'Enter a valid email address' : 'Email is required';
  if (!values.address.trim()) errors.address = 'Address is required';
  return errors;
}

function submitOrder(event) {
  event.preventDefault();
  const form = event.target;
  const values = { name: form.name.value, email: form.email.value, address: form.address.value };
  const errors = validateCheckout(values);
  form.querySelectorAll('[data-for]').forEach((p) => {
    p.textContent = errors[p.dataset.for] || '';
    form[p.dataset.for].toggleAttribute('aria-invalid', Boolean(errors[p.dataset.for]));
  });
  if (Object.keys(errors).length) return;

  const orderNumber = `INK-${Math.floor(10000 + Math.random() * 90000)}`;
  const paid = money(totals().total);
  cart = [];
  couponApplied = false;
  saveCart();
  updateBadge();
  view.innerHTML = `
    <section class="panel confirmed" role="status" aria-labelledby="confirmed-heading">
      <h1 id="confirmed-heading">Order confirmed</h1>
      <p data-testid="order-number">Order number: ${orderNumber}</p>
      <p>Thanks, ${escapeHtml(values.name.trim())}. We charged ${paid} (demo, no real payment) and will ship to ${escapeHtml(values.address.trim())}.</p>
      <p><a href="#/shop">Keep shopping</a></p>
    </section>`;
}

// ---- router ----

function render() {
  const route = location.hash || '#/shop';
  const signedIn = Boolean(session);
  document.getElementById('logout').hidden = !signedIn;
  const who = document.getElementById('user-email');
  who.hidden = !signedIn;
  who.textContent = signedIn ? session.email : '';
  updateBadge();
  if (!signedIn) {
    if (route !== '#/login') location.hash = '#/login';
    else renderLogin();
    return;
  }
  if (route === '#/login') location.hash = '#/shop';
  else if (route === '#/cart') renderCart();
  else renderShop();
}

document.getElementById('logout').addEventListener('click', () => {
  session = null;
  sessionStorage.removeItem('inkwell-session');
  location.hash = '#/login';
});
window.addEventListener('hashchange', render);
render();
