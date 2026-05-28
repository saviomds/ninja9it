'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../lib/db');
const { genRef } = require('../lib/crypto');
const catalog = require('../data/drinks');

// ── Cart helpers ─────────────────────────────

function findItem(id) {
  const { items, products } = mergedMenu();
  return items.find(x => x.id === id) || products.find(x => x.id === id) || null;
}

function mergedMenu() {
  const { items: builtIn } = catalog;
  const { items: custom, hidden } = db.getProducts();
  const allBuiltIn = Object.values(builtIn).flat().filter(d => !hidden.includes(d.id));
  return { items: allBuiltIn, products: custom };
}

function cartSummary(cart) {
  return {
    count: cart.reduce((s, i) => s + i.qty, 0),
    total: cart.reduce((s, i) => s + i.price * i.qty, 0),
  };
}

// ── POST /api/cart/add ───────────────────────
router.post('/cart/add', (req, res) => {
  const { id, qty = 1 } = req.body;
  const item = findItem(id);
  if (!item) return res.status(404).json({ error: 'Item not found.' });

  const cart     = req.session.cart || [];
  const existing = cart.find(i => i.id === id);

  if (existing) {
    existing.qty += Math.max(1, parseInt(qty) || 1);
  } else {
    cart.push({
      id:       item.id,
      name:     item.name,
      price:    item.price,
      emoji:    item.emoji,
      gradient: item.gradient,
      qty:      Math.max(1, parseInt(qty) || 1),
    });
  }

  req.session.cart = cart;
  const { count, total } = cartSummary(cart);
  res.json({ success: true, cartCount: count, cartTotal: total, message: `${item.name} added!` });
});

// ── POST /api/cart/update ────────────────────
router.post('/cart/update', (req, res) => {
  const { id, qty } = req.body;
  const cart = req.session.cart || [];
  const item = cart.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: 'Item not in cart.' });

  const n = parseInt(qty) || 0;
  req.session.cart = n <= 0 ? cart.filter(i => i.id !== id) : (item.qty = n, cart);

  const { count, total } = cartSummary(req.session.cart);
  res.json({ success: true, cartCount: count, cartTotal: total });
});

// ── POST /api/cart/remove ────────────────────
router.post('/cart/remove', (req, res) => {
  req.session.cart = (req.session.cart || []).filter(i => i.id !== req.body.id);
  const { count, total } = cartSummary(req.session.cart);
  res.json({ success: true, cartCount: count, cartTotal: total });
});

// ── POST /api/cart/clear ─────────────────────
router.post('/cart/clear', (req, res) => {
  req.session.cart = [];
  res.json({ success: true, cartCount: 0, cartTotal: 0 });
});

// ── POST /api/order/submit ───────────────────
router.post('/order/submit', (req, res) => {
  const { name, phone, address, zone, payment, notes } = req.body;

  if (!name || !phone || !address) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  const cart = req.session.cart || [];
  if (cart.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty!' });
  }

  const { total } = cartSummary(cart);
  const ref = genRef();
  const now = new Date().toISOString();

  const order = {
    ref,
    status:    'pending',
    placedAt:  now,
    updatedAt: now,
    user: req.session.user
      ? { id: req.session.user.id, username: req.session.user.username }
      : null,
    customer: { name: name.trim(), phone: phone.trim(), address: address.trim(), zone: (zone || '').trim() },
    payment:  payment || 'cash',
    notes:    (notes || '').trim(),
    items:    cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, subtotal: i.price * i.qty })),
    total,
    eta: '30 minutes',
  };

  db.saveOrder(order);
  req.session.cart = [];

  res.json({
    success:  true,
    orderRef: ref,
    message:  `Order ${ref} confirmed! Your ninja is on the way.`,
    eta:      '30 minutes',
  });
});

module.exports = router;
