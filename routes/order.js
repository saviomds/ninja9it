const express = require('express');
const router  = express.Router();
const db      = require('../lib/db');

router.get('/', (req, res) => {
  // Pre-fill delivery details for logged-in users:
  // 1. Prefer saved fields on the user profile (phone, address, zone)
  // 2. Fall back to the most recent order's customer data
  let prefill = { name: '', phone: '', address: '', zone: '' };

  if (req.session.user) {
    const user = db.findUserById(req.session.user.id);
    if (user) {
      prefill.name    = user.username || '';
      prefill.phone   = user.phone   || '';
      prefill.address = user.address || '';
      prefill.zone    = user.zone    || '';

      // If no saved address yet, pull from most recent order
      if (!prefill.phone || !prefill.address) {
        const allOrders = db.getAllOrders()
          .filter(o => o.user && o.user.id === user.id)
          .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
        if (allOrders.length > 0) {
          const last = allOrders[0].customer || {};
          if (!prefill.phone)   prefill.phone   = last.phone   || '';
          if (!prefill.address) prefill.address = last.address || '';
          if (!prefill.zone)    prefill.zone    = last.zone    || '';
        }
      }
    }
  }

  res.render('order', {
    title:   'Order Now – Ninja9IT',
    page:    'order',
    prefill,
  });
});

module.exports = router;
