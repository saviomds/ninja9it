const express   = require('express');
const router    = express.Router();
const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');
const multer    = require('multer');
const adminOnly = require('../middleware/adminOnly');
const { readJSON, writeJSON, readAllOrders, readUsers, writeUsers } = require('../utils/db');

const STORE_ORDER    = path.join(__dirname, '../store_order');
const STORE_USERS    = path.join(__dirname, '../store_users');
const USERS_FILE     = path.join(__dirname, '../data/users.json');
const PRODUCTS_FILE  = path.join(__dirname, '../data/products.json');
const SETTINGS_FILE  = path.join(__dirname, '../data/settings.json');
const UPLOADS_DIR    = path.join(__dirname, '../public/uploads/products');

const { items: builtInItems, categoryMeta, categories } = require('../data/drinks');

// ── MULTER ──────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); cb(null, UPLOADS_DIR); },
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `prod_${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Images only')),
});

// ── HELPERS ─────────────────────────────────
function readProducts()      { return readJSON(PRODUCTS_FILE) || { products: [], hiddenBuiltins: [] }; }
function writeProducts(db)   { writeJSON(PRODUCTS_FILE, db); }
function readSettings()      { return readJSON(SETTINGS_FILE) || {}; }
function writeSettings(s)    { writeJSON(SETTINGS_FILE, s); }
function getPendingCount()   { return readAllOrders(STORE_ORDER).filter(o => o.status === 'pending').length; }
function genProductId()      { return 'cprod_' + crypto.randomBytes(6).toString('hex'); }

const ALLOWED_STATUSES = ['pending', 'confirmed', 'delivered', 'cancelled'];

router.use(adminOnly);

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
router.get('/', (req, res) => {
  const allOrders    = readAllOrders(STORE_ORDER);
  const { users }    = readUsers(USERS_FILE);
  const { products } = readProducts();

  let productCount = products.length;
  categories.forEach(cat => { productCount += (builtInItems[cat] || []).length; });

  res.render('admin/dashboard', {
    title:        'Dashboard – Admin – Ninja9IT',
    adminPage:    'dashboard',
    page:         'admin',
    totalOrders:  allOrders.length,
    pendingCount: allOrders.filter(o => o.status === 'pending').length,
    revenue:      allOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0),
    productCount,
    userCount:    users.filter(u => !u.isAdmin).length,
    recentOrders: allOrders.sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt)).slice(0, 8),
  });
});

// ═══════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════
router.get('/orders', (req, res) => {
  const allOrders    = readAllOrders(STORE_ORDER).sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  const statusFilter = req.query.status || 'all';
  const orders       = statusFilter === 'all' ? allOrders : allOrders.filter(o => o.status === statusFilter);

  res.render('admin/orders', {
    title: 'Orders – Admin – Ninja9IT', adminPage: 'orders', page: 'admin',
    orders, allOrders, statusFilter,
    pendingCount: allOrders.filter(o => o.status === 'pending').length,
  });
});

router.post('/orders/:ref/status', (req, res) => {
  const file = path.join(STORE_ORDER, `${req.params.ref}.json`);
  const order = readJSON(file);
  const newStatus = req.body.status;

  if (order && ALLOWED_STATUSES.includes(newStatus)) {
    order.status    = newStatus;
    order.updatedAt = new Date().toISOString();
    if (newStatus === 'confirmed' && !order.confirmedAt) {
      order.confirmedAt = new Date().toISOString();
      order.etaTime     = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }
    if (newStatus === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date().toISOString();
    }
    writeJSON(file, order);
  }
  res.redirect('/admin/orders' + (req.query.status ? `?status=${req.query.status}` : ''));
});

router.post('/orders/:ref/delete', (req, res) => {
  const ref   = req.params.ref;
  const file  = path.join(STORE_ORDER, `${ref}.json`);
  const order = readJSON(file);

  if (order) {
    const userId = order.user && order.user.id;
    if (userId) {
      const idxFile = path.join(STORE_USERS, userId, 'orders.json');
      const list    = readJSON(idxFile) || [];
      writeJSON(idxFile, list.filter(o => o.ref !== ref));
    }
    fs.unlinkSync(file);
  }
  res.redirect('/admin/orders');
});

router.post('/orders/delete-all', (req, res) => {
  if (!fs.existsSync(STORE_ORDER)) return res.redirect('/admin/orders');

  fs.readdirSync(STORE_ORDER).filter(f => f.endsWith('.json')).forEach(f => {
    const file  = path.join(STORE_ORDER, f);
    const order = readJSON(file);
    if (order) {
      const userId = order.user && order.user.id;
      if (userId) writeJSON(path.join(STORE_USERS, userId, 'orders.json'), []);
      fs.unlinkSync(file);
    }
  });
  res.redirect('/admin/orders');
});

// ═══════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════
router.get('/products', (req, res) => {
  const { products, hiddenBuiltins = [] } = readProducts();
  res.render('admin/products', {
    title: 'Products – Admin – Ninja9IT', adminPage: 'products', page: 'admin',
    customProducts: products, builtInItems, categoryMeta, categories,
    hiddenBuiltins, pendingCount: getPendingCount(),
  });
});

router.get('/products/new', (req, res) => {
  res.render('admin/product-form', {
    title: 'Add Product – Admin – Ninja9IT', adminPage: 'product-new', page: 'admin',
    product: null, categoryMeta, categories, error: null, pendingCount: getPendingCount(),
  });
});

router.post('/products/new', upload.single('image'), (req, res) => {
  const { name, category, price, tag, emoji, gradient, desc, isLocal, popular } = req.body;
  if (!name || !category || !price) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.render('admin/product-form', {
      title: 'Add Product – Admin – Ninja9IT', adminPage: 'product-new', page: 'admin',
      product: null, categoryMeta, categories, pendingCount: getPendingCount(),
      error: 'Name, category and price are required.',
    });
  }
  const db = readProducts();
  db.products.push({
    id: genProductId(), name, category, price: parseInt(price),
    tag: tag || '', emoji: emoji || '📦',
    gradient: gradient || 'linear-gradient(135deg,#1a1a1a,#333)',
    desc: desc || '', isLocal: !!isLocal, popular: !!popular,
    image: req.file ? `/uploads/products/${req.file.filename}` : null,
    createdAt: new Date().toISOString(),
  });
  writeProducts(db);
  res.redirect('/admin/products');
});

router.get('/products/:id/edit', (req, res) => {
  const { products } = readProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.redirect('/admin/products');
  res.render('admin/product-form', {
    title: 'Edit Product – Admin – Ninja9IT', adminPage: 'product-edit', page: 'admin',
    product, categoryMeta, categories, error: null, pendingCount: getPendingCount(),
  });
});

router.post('/products/:id/edit', upload.single('image'), (req, res) => {
  const { name, category, price, tag, emoji, gradient, desc, isLocal, popular } = req.body;
  const db  = readProducts();
  const idx = db.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.redirect('/admin/products');

  if (!name || !category || !price) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.render('admin/product-form', {
      title: 'Edit Product – Admin – Ninja9IT', adminPage: 'product-edit', page: 'admin',
      product: db.products[idx], categoryMeta, categories, pendingCount: getPendingCount(),
      error: 'Name, category and price are required.',
    });
  }

  const existing = db.products[idx];
  if (req.file && existing.image) {
    const old = path.join(__dirname, '../public', existing.image);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  db.products[idx] = {
    ...existing, name, category, price: parseInt(price),
    tag: tag || '', emoji: emoji || existing.emoji || '📦',
    gradient: gradient || existing.gradient, desc: desc || '',
    isLocal: !!isLocal, popular: !!popular,
    image: req.file ? `/uploads/products/${req.file.filename}` : existing.image,
    updatedAt: new Date().toISOString(),
  };
  writeProducts(db);
  res.redirect('/admin/products');
});

router.post('/products/:id/delete', (req, res) => {
  const db  = readProducts();
  const idx = db.products.findIndex(p => p.id === req.params.id);
  if (idx !== -1) {
    const { image } = db.products[idx];
    if (image) { const f = path.join(__dirname, '../public', image); if (fs.existsSync(f)) fs.unlinkSync(f); }
    db.products.splice(idx, 1);
    writeProducts(db);
  }
  res.redirect('/admin/products');
});

// ═══════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════
router.get('/users', (req, res) => {
  const { users }  = readUsers(USERS_FILE);
  const allOrders  = readAllOrders(STORE_ORDER);
  const orderStats = {};

  allOrders.forEach(o => {
    if (!o.user) return;
    const uid = o.user.id;
    if (!orderStats[uid]) orderStats[uid] = { count: 0, revenue: 0 };
    orderStats[uid].count++;
    if (o.status !== 'cancelled') orderStats[uid].revenue += (o.total || 0);
  });

  res.render('admin/users', {
    title: 'Users – Admin – Ninja9IT', adminPage: 'users', page: 'admin',
    users: users.sort((a, b) => (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0)),
    orderStats, pendingCount: getPendingCount(),
  });
});

// Hide a built-in product from the public menu
router.post('/products/builtin/:id/hide', (req, res) => {
  const db = readProducts();
  if (!db.hiddenBuiltins) db.hiddenBuiltins = [];
  if (!db.hiddenBuiltins.includes(req.params.id)) db.hiddenBuiltins.push(req.params.id);
  writeProducts(db);
  res.redirect('/admin/products');
});

// Restore a hidden built-in product
router.post('/products/builtin/:id/restore', (req, res) => {
  const db = readProducts();
  db.hiddenBuiltins = (db.hiddenBuiltins || []).filter(id => id !== req.params.id);
  writeProducts(db);
  res.redirect('/admin/products');
});

// ═══════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════
router.get('/settings', (req, res) => {
  res.render('admin/settings', {
    title:       'Settings – Admin – Ninja9IT',
    adminPage:   'settings',
    page:        'admin',
    settings:    readSettings(),
    pendingCount: getPendingCount(),
    saved:       req.query.saved || null,
  });
});

router.post('/settings', (req, res) => {
  const { phone, phoneRaw, whatsapp, email, hours, address } = req.body;
  writeSettings({ phone, phoneRaw, whatsapp, email, hours, address });
  res.redirect('/admin/settings?saved=1');
});

router.post('/users/:id/delete', (req, res) => {
  const db   = readUsers(USERS_FILE);
  const user = db.users.find(u => u.id === req.params.id);

  if (user && !user.isAdmin) {
    // Delete user's order files
    if (fs.existsSync(STORE_ORDER)) {
      fs.readdirSync(STORE_ORDER).filter(f => f.endsWith('.json')).forEach(f => {
        const file  = path.join(STORE_ORDER, f);
        const order = readJSON(file);
        if (order && order.user && order.user.id === user.id) fs.unlinkSync(file);
      });
    }
    // Delete user folder
    const userDir = path.join(STORE_USERS, user.id);
    if (fs.existsSync(userDir)) fs.rmSync(userDir, { recursive: true, force: true });

    db.users = db.users.filter(u => u.id !== user.id);
    writeUsers(USERS_FILE, db);
  }
  res.redirect('/admin/users');
});

module.exports = router;
