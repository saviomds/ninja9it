const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { items } = require('../data/drinks');
const { writeJSON, readJSON } = require('../utils/db');

const STORE_ORDER = path.join(__dirname, '../store_order');

function findDrink(id) {
  for (const list of Object.values(items)) {
    const d = list.find(x => x.id === id);
    if (d) return d;
  }
  return null;
}

function cartSummary(cart) {
  return {
    count: cart.reduce((s, i) => s + i.qty, 0),
    total: cart.reduce((s, i) => s + i.price * i.qty, 0),
  };
}

// Add to cart
router.post('/cart/add', (req, res) => {
  const { id, qty = 1 } = req.body;
  const drink = findDrink(id);
  if (!drink) return res.status(404).json({ error: 'Drink not found' });

  const cart     = req.session.cart;
  const existing = cart.find(i => i.id === id);

  if (existing) {
    existing.qty += parseInt(qty);
  } else {
    cart.push({
      id: drink.id, name: drink.name, price: drink.price,
      emoji: drink.emoji, gradient: drink.gradient, qty: parseInt(qty)
    });
  }

  const { count, total } = cartSummary(cart);
  res.json({ success: true, cartCount: count, cartTotal: total, message: `${drink.name} added to cart!` });
});

// Update quantity
router.post('/cart/update', (req, res) => {
  const { id, qty } = req.body;
  const cart = req.session.cart;
  const item = cart.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: 'Item not in cart' });

  const n = parseInt(qty);
  if (n <= 0) {
    req.session.cart = cart.filter(i => i.id !== id);
  } else {
    item.qty = n;
  }

  const { count, total } = cartSummary(req.session.cart);
  res.json({ success: true, cartCount: count, cartTotal: total });
});

// Remove item
router.post('/cart/remove', (req, res) => {
  const { id } = req.body;
  req.session.cart = req.session.cart.filter(i => i.id !== id);
  const { count, total } = cartSummary(req.session.cart);
  res.json({ success: true, cartCount: count, cartTotal: total });
});

// Clear cart
router.post('/cart/clear', (req, res) => {
  req.session.cart = [];
  res.json({ success: true, cartCount: 0, cartTotal: 0 });
});

// Submit order — saves JSON file to store_order/
router.post('/order/submit', (req, res) => {
  const { name, phone, address, zone, payment, notes } = req.body;
  if (!name || !phone || !address) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }
  if (!req.session.cart || req.session.cart.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty!' });
  }

  const ref     = 'N9-' + Date.now().toString(36).toUpperCase();
  const now     = new Date();
  const cart    = req.session.cart;
  const { total } = cartSummary(cart);

  // Build order record
  const order = {
    ref,
    status:    'pending',
    placedAt:  now.toISOString(),
    user: req.session.user
      ? { id: req.session.user.id, username: req.session.user.username }
      : null,
    customer: { name, phone, address, zone: zone || '' },
    payment,
    notes:   notes || '',
    items:   cart.map(i => ({
      id:       i.id,
      name:     i.name,
      price:    i.price,
      qty:      i.qty,
      subtotal: i.price * i.qty
    })),
    total,
    eta: '30 minutes'
  };

  // Atomic save to store_order/<ref>.json (no-op on read-only filesystems like Vercel)
  try { fs.mkdirSync(STORE_ORDER, { recursive: true }); } catch {}
  writeJSON(path.join(STORE_ORDER, `${ref}.json`), order);

  // Link ref to user's orders index if logged in
  if (req.session.user) {
    try {
      const idxFile = path.join(__dirname, '../store_users', req.session.user.id, 'orders.json');
      const existing = readJSON(idxFile) || [];
      existing.push({ ref, placedAt: now.toISOString(), total, status: 'pending' });
      writeJSON(idxFile, existing);
    } catch (err) {
      console.error('[Order] Failed to update user index:', err.message);
    }
  }

  req.session.cart = [];
  res.json({
    success:  true,
    orderRef: ref,
    message:  `Order ${ref} confirmed! Your ninja is on the way.`,
    eta:      '30 minutes'
  });
});

module.exports = router;
