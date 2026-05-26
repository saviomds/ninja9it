const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { items, categoryMeta, categories } = require('../data/drinks');

const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');

function readProductData() {
  try {
    const d = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    return { products: d.products || [], hiddenBuiltins: d.hiddenBuiltins || [] };
  } catch { return { products: [], hiddenBuiltins: [] }; }
}

router.get('/', (req, res) => {
  const cat       = req.query.cat || 'beers';
  const activeCat = categories.includes(cat) ? cat : 'beers';

  const { products: customProducts, hiddenBuiltins } = readProductData();

  // Merge built-ins (minus hidden) + custom products
  const mergedItems = {};
  categories.forEach(c => {
    mergedItems[c] = items[c].filter(p => !hiddenBuiltins.includes(p.id));
  });

  customProducts.forEach(p => {
    const c = p.category;
    if (!mergedItems[c]) mergedItems[c] = [];
    mergedItems[c].push(p);
  });

  res.render('menu', {
    title:       `Menu – ${categoryMeta[activeCat].label} – Ninja9IT`,
    page:        'menu',
    drinks:      mergedItems,
    categoryMeta,
    categories,
    activeCat,
  });
});

module.exports = router;
