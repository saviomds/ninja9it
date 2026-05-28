'use strict';
require('dotenv').config();

const express     = require('express');
const session     = require('express-session');
const compression = require('compression');
const path        = require('path');
const fs          = require('fs');

const IS_VERCEL = !!process.env.VERCEL;

const { securityHeaders, sanitizeBody } = require('./middleware/security');
const db = require('./lib/db');
const { hashPassword, genId } = require('./lib/crypto');

const app = express();

// ── Trust proxy (Vercel / nginx) ─────────────
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Global middleware ─────────────────────────
app.use(compression());
app.use(securityHeaders);
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50kb' }));
app.use(sanitizeBody);
app.use(express.static(path.join(__dirname, 'public'), { index: false, etag: true }));

// ── Sessions ──────────────────────────────────
const FileStore    = require('session-file-store')(session);
const SESSION_DIR  = IS_VERCEL
  ? '/tmp/n9it-sessions'
  : path.join(__dirname, 'db/sessions');

app.use(session({
  secret:            process.env.SESSION_SECRET || 'ninja9it-shadow-key-2025',
  resave:            false,
  saveUninitialized: false,
  name:              'n9it.sid',
  store: new FileStore({
    path:        SESSION_DIR,
    ttl:         86400,
    reapInterval: 3600,
    logFn:       () => {},
  }),
  cookie: {
    maxAge:   86400000,
    httpOnly: true,
    sameSite: 'lax',
    secure:   IS_VERCEL,
  },
}));

// ── Inject globals into every response ────────
app.use((req, res, next) => {
  if (!req.session.cart) req.session.cart = [];
  res.locals.cart        = req.session.cart;
  res.locals.cartCount   = req.session.cart.reduce((s, i) => s + i.qty, 0);
  res.locals.cartTotal   = req.session.cart.reduce((s, i) => s + i.price * i.qty, 0);
  res.locals.currentUser = req.session.user || null;
  res.locals.settings    = db.getSettings();
  next();
});

// ── Routes ────────────────────────────────────
app.use('/',        require('./routes/auth'));
app.use('/',        require('./routes/profile'));
app.use('/admin',   require('./routes/admin'));
app.use('/',        require('./routes/index'));
app.use('/menu',    require('./routes/menu'));
app.use('/order',   require('./routes/order'));
app.use('/services',require('./routes/services'));
app.use('/api',     require('./routes/api'));
app.use('/',        require('./routes/install'));

// ── My Orders ─────────────────────────────────
app.get('/my-orders', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const orders = db.getAllOrders()
    .filter(o => o.user && o.user.id === req.session.user.id)
    .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  res.render('my-orders', { title: 'My Orders – Ninja9IT', page: 'my-orders', orders });
});

// ── Order tracking ────────────────────────────
app.get('/track/:ref', (req, res) => {
  const ref   = req.params.ref.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const order = db.getOrder(ref);
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
    title:   `Track ${order.ref} – Ninja9IT`,
    page:    'track',
    order,
    etaTime,
    etaMs:   etaMs || null,
    isOwner: !!(req.session.user && order.user && req.session.user.id === order.user.id),
  });
});

// ── TWA asset links ───────────────────────────
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace:                'android_app',
      package_name:             'com.ninja9it.app',
      sha256_cert_fingerprints: [process.env.TWA_SHA256_CERT || ''],
    },
  }]);
});

// ── 404 ───────────────────────────────────────
app.use((req, res) =>
  res.status(404).render('404', { title: 'Page Not Found – Ninja9IT', page: '404' })
);

// ── Global error handler ──────────────────────
app.use((err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url} —`, err.message);
  res.status(500).render('404', { title: 'Server Error – Ninja9IT', page: '404' });
});

// ── Seed admin (local only) ───────────────────
function seedAdmin() {
  if (db.hasAdmin()) return;
  db.createUser({
    id:        genId('admin'),
    username:  process.env.ADMIN_USERNAME || 'admin',
    email:     process.env.ADMIN_EMAIL    || 'admin@ninja9it.com',
    password:  hashPassword(process.env.ADMIN_PASS || 'Ninja9IT@admin'),
    avatar:    '🥷',
    isAdmin:   true,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.log('👑  Admin seeded. Username:', process.env.ADMIN_USERNAME || 'admin');
}

function purgeExpired() {
  try { db.purgeExpiredUsers(); } catch (e) { console.error('[Purge] error:', e.message); }
}

if (!IS_VERCEL) {
  seedAdmin();
  purgeExpired();
  setInterval(purgeExpired, 60 * 60 * 1000);
}

// ── Export for Vercel + listen locally ────────
module.exports = app;

if (!IS_VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`\n🥷  Ninja9IT → http://localhost:${PORT}\n`)
  );
}
