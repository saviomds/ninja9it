'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../lib/db');

router.get('/my-orders', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const orders = db.getAllOrders()
    .filter(o => o.user && o.user.id === req.session.user.id)
    .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  res.render('my-orders', { title: 'My Orders – Ninja9IT', page: 'my-orders', orders });
});

module.exports = router;
