const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const STORE_ORDER = path.join(__dirname, '../store_order');
const STORE_USERS = path.join(__dirname, '../store_users');

function readOrder(ref) {
  const file = path.join(STORE_ORDER, `${ref}.json`);
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function getUserOrderRefs(userId) {
  const f = path.join(STORE_USERS, userId, 'orders.json');
  if (!fs.existsSync(f)) return [];
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return []; }
}

// GET /my-orders — logged-in user's order list
router.get('/my-orders', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const refs   = getUserOrderRefs(req.session.user.id);
  const orders = refs
    .map(r => readOrder(r.ref) || r)
    .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));

  res.render('my-orders', {
    title: 'My Orders – Ninja9IT',
    page:  'my-orders',
    orders,
  });
});

// GET /track/:ref — public order tracking (anyone with the ref)
router.get('/track/:ref', (req, res) => {
  const order = readOrder(req.params.ref.toUpperCase());
  if (!order) {
    return res.status(404).render('404', { title: 'Order Not Found – Ninja9IT', page: '404' });
  }

  let etaTime = null;
  let etaMs   = null;
  if (order.confirmedAt) {
    etaMs   = new Date(order.confirmedAt).getTime() + 30 * 60 * 1000;
    etaTime = new Date(etaMs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  res.render('order-track', {
    title:   `Track Order ${order.ref} – Ninja9IT`,
    page:    'track',
    order,
    etaTime,
    etaMs:   etaMs ? etaMs : null,
    isOwner: req.session.user && order.user && req.session.user.id === order.user.id,
  });
});

module.exports = router;
