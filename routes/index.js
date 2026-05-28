'use strict';
const express = require('express');
const router  = express.Router();
const catalog = require('../data/drinks');
const db      = require('../lib/db');

const featured = Object.values(catalog.items).flat().filter(d => d.popular).slice(0, 6);

router.get('/', (req, res) => {
  const firstVisit = !req.session.visited;
  req.session.visited = true;

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
