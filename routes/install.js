const express = require('express');
const router  = express.Router();

router.get('/install', (req, res) => {
  const proto  = req.headers['x-forwarded-proto'] || req.protocol;
  const host   = req.headers['x-forwarded-host']  || req.get('host');
  const appUrl = process.env.APP_URL || `${proto}://${host}`;

  res.render('install', {
    title:  'Install Ninja9IT App – Stealth Drinks Delivery 🇲🇺',
    page:   'install',
    appUrl,
  });
});

module.exports = router;
