const express = require('express');
const router  = express.Router();
const { items, categoryMeta } = require('../data/drinks');
const reviews = require('../data/reviews');

// Collect popular drinks across all categories for home page
const featured = Object.values(items).flat().filter(d => d.popular).slice(0, 6);

router.get('/', (req, res) => {
  const firstVisit = !req.session.visited;
  req.session.visited = true;

  res.render('index', {
    title: 'Ninja9IT – Stealth Drinks Delivery 🇲🇺',
    page: 'home',
    featured,
    categoryMeta,
    reviews,
    showLoader: firstVisit,
  });
});

module.exports = router;
