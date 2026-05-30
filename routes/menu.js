'use strict';
const express = require('express');
const router  = express.Router();
const catalog = require('../data/drinks');
const db      = require('../lib/db');

router.get('/', (req, res) => {
  const cat = catalog.categories.includes(req.query.cat) ? req.query.cat : 'beers';
  const { items: custom, hidden, deleted } = db.getProducts();

  const merged = {};
  catalog.categories.forEach(c => {
    merged[c] = (catalog.items[c] || []).filter(d => !hidden.includes(d.id) && !deleted.includes(d.id));
  });
  custom.forEach(p => {
    if (!merged[p.category]) merged[p.category] = [];
    merged[p.category].push(p);
  });

  res.render('menu', {
    title:       `Menu – ${catalog.categoryMeta[cat].label} – Ninja9IT`,
    page:        'menu',
    drinks:      merged,
    categoryMeta: catalog.categoryMeta,
    categories:  catalog.categories,
    activeCat:   cat,
  });
});

module.exports = router;
