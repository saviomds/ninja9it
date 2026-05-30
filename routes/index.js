'use strict';
const express = require('express');
const router  = express.Router();
const catalog = require('../data/drinks');
const db      = require('../lib/db');

router.get('/', (req, res) => {
  const firstVisit = !req.session.visited;
  req.session.visited = true;

  const { deleted } = db.getProducts();
  const featured = Object.values(catalog.items).flat()
    .filter(d => d.popular && !deleted.includes(d.id)).slice(0, 6);

  res.render('index', {
    title:       'Ninja9IT – Stealth Drinks Delivery 🇲🇺',
    page:        'home',
    featured,
    categoryMeta: catalog.categoryMeta,
    reviews:     db.getReviews(),
    showLoader:  firstVisit,
  });
});

module.exports = router;
