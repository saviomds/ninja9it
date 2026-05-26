const express = require('express');
const router  = express.Router();

router.get('/', (req, res) => {
  res.render('order', {
    title: 'Order Now – Ninja9IT',
    page: 'order',
  });
});

module.exports = router;
