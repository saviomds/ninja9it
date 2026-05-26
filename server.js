require('dotenv').config();

const express       = require('express');
const session       = require('express-session');
const compression   = require('compression');
const path          = require('path');
const fs            = require('fs');
const crypto        = require('crypto');

const IS_VERCEL = !!process.env.VERCEL;

const { securityHeaders, sanitizeBody } = require('./middleware/security');
const { readJSON, writeJSON, readOrder, readAllOrders, readUsers, writeUsers } = require('./utils/db');

const app = express();

// ── TRUST PROXY (for correct IP behind nginx/reverse proxy) ─
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── GLOBAL MIDDLEWARE ────────────────────────
app.use(compression());
app.use(securityHeaders);
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50kb' }));
app.use(sanitizeBody);
app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  etag:  true,
}));

// ── SESSION ──────────────────────────────────
const sessionConfig = {
  secret:            process.env.SESSION_SECRET || 'ninja9it-fallback-secret',
  resave:            false,
  saveUninitialized: false,
  name:              'n9it.sid',
  cookie: {
    maxAge:   86400000,
    httpOnly: true,
    sameSite: 'lax',
    secure:   IS_VERCEL,
  },
};

if (!IS_VERCEL) {
  const FileStore = require('session-file-store')(session);
  sessionConfig.store = new FileStore({
    path:         path.join(__dirname, 'data/sessions'),
    ttl:          86400,
    reapInterval: 3600,
    logFn:        () => {},
  });
}

app.use(session(sessionConfig));

// ── ATTACH CART + USER + SETTINGS TO EVERY RESPONSE ────
const SETTINGS_FILE = path.join(__dirname, 'data/settings.json');
app.use((req, res, next) => {
  if (!req.session.cart) req.session.cart = [];
  res.locals.cart        = req.session.cart;
  res.locals.cartCount   = req.session.cart.reduce((s, i) => s + i.qty, 0);
  res.locals.cartTotal   = req.session.cart.reduce((s, i) => s + i.price * i.qty, 0);
  res.locals.currentUser = req.session.user || null;
  res.locals.settings    = readJSON(SETTINGS_FILE) || {};
  next();
});

// ── ROUTES ───────────────────────────────────
app.use('/',         require('./routes/auth'));
app.use('/',         require('./routes/profile'));
app.use('/admin',    require('./routes/admin'));
app.use('/',         require('./routes/index'));
app.use('/services', require('./routes/services'));
app.use('/menu',     require('./routes/menu'));
app.use('/order',    require('./routes/order'));
app.use('/api',      require('./routes/api'));
app.use('/',         require('./routes/install'));

// ── MY ORDERS ────────────────────────────────
const STORE_ORDER_DIR = path.join(__dirname, 'store_order');
const STORE_USERS_DIR = path.join(__dirname, 'store_users');

app.get('/my-orders', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const indexFile = path.join(STORE_USERS_DIR, req.session.user.id, 'orders.json');
  const refs      = readJSON(indexFile) || [];
  const orders    = refs
    .map(r => readOrder(r.ref, STORE_ORDER_DIR) || r)
    .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));

  res.render('my-orders', { title: 'My Orders – Ninja9IT', page: 'my-orders', orders });
});

// ── ORDER TRACKING ───────────────────────────
app.get('/track/:ref', (req, res) => {
  const ref   = req.params.ref.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const order = readOrder(ref, STORE_ORDER_DIR);
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

// ── WELL-KNOWN (TWA / Android APK) ──────────
app.get('/.well-known/assetlinks.json', (req, res) => {
  const sha256 = process.env.TWA_SHA256_CERT || 'REPLACE_WITH_YOUR_SHA256_CERT_FINGERPRINT';
  res.json([{
    relation:  ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace:              'android_app',
      package_name:           'com.ninja9it.app',
      sha256_cert_fingerprints: [sha256],
    },
  }]);
});

// ── 404 ──────────────────────────────────────
app.use((req, res) =>
  res.status(404).render('404', { title: 'Page Not Found – Ninja9IT', page: '404' })
);

// ── GLOBAL ERROR HANDLER ─────────────────────
app.use((err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url} —`, err.message);
  res.status(500).render('404', { title: 'Server Error – Ninja9IT', page: '404' });
});

// ── BOOT TASKS ───────────────────────────────
const USERS_FILE = path.join(__dirname, 'data/users.json');
const STORE_DIR  = path.join(__dirname, 'store_users');

function seedAdmin() {
  const db = readUsers(USERS_FILE);
  if (db.users.some(u => u.isAdmin)) return;

  const { hashPassword } = require('./utils/crypto');
  const adminPass = process.env.ADMIN_PASS || 'Ninja9IT@admin';
  const adminId   = 'admin_001';

  db.users.unshift({
    id:         adminId,
    username:   process.env.ADMIN_USERNAME || 'admin',
    email:      process.env.ADMIN_EMAIL    || 'admin@ninja9it.com',
    password:   hashPassword(adminPass),
    createdAt:  new Date().toISOString(),
    expiresAt:  null,
    isAdmin:    true,
    folderPath: `store_users/${adminId}`,
  });

  writeUsers(USERS_FILE, db);
  fs.mkdirSync(path.join(STORE_DIR, adminId), { recursive: true });
  console.log('\n👑  Admin seeded — username: admin\n');
}

function cleanupExpiredUsers() {
  try {
    const db     = readUsers(USERS_FILE);
    const before = db.users.length;
    const now    = new Date();

    db.users = db.users.filter(u =>
      u.isAdmin || !u.expiresAt || new Date(u.expiresAt) > now
    );

    if (db.users.length < before) {
      writeUsers(USERS_FILE, db);
      console.log(`[Auth] Removed ${before - db.users.length} expired user(s).`);
    }
  } catch (err) {
    console.error('[Auth] Cleanup error:', err.message);
  }
}

seedAdmin();
cleanupExpiredUsers();
setInterval(cleanupExpiredUsers, 60 * 60 * 1000);

// ── START ────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`\n🥷  Ninja9IT is live → http://localhost:${PORT}\n`)
);
