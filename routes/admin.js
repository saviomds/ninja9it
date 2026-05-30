'use strict';
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');
const multer   = require('multer');
const adminOnly = require('../middleware/adminOnly');
const db        = require('../lib/db');
const { hashPassword } = require('../lib/crypto');
const catalog   = require('../data/drinks');

const UPLOADS_DIR = path.join(__dirname, '../public/uploads/products');

// ── Multer (product images) ──────────────────
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
    /^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Images only')),
});

router.use(adminOnly);

function pendingCount() {
  return db.getAllOrders().filter(o => o.status === 'pending').length;
}

// ── DASHBOARD ────────────────────────────────
router.get('/', (req, res) => {
  const allOrders  = db.getAllOrders();
  const users      = db.getUsers();
  const { items: custom, deleted } = db.getProducts();

  let productCount = custom.length;
  catalog.categories.forEach(cat => {
    productCount += (catalog.items[cat] || []).filter(p => !deleted.includes(p.id)).length;
  });

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

// ── ORDERS ───────────────────────────────────
const ALLOWED_STATUSES = ['pending', 'confirmed', 'delivered', 'cancelled'];

router.get('/orders', (req, res) => {
  const allOrders    = db.getAllOrders().sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  const statusFilter = req.query.status || 'all';
  const orders       = statusFilter === 'all' ? allOrders : allOrders.filter(o => o.status === statusFilter);
  res.render('admin/orders', {
    title: 'Orders – Admin – Ninja9IT', adminPage: 'orders', page: 'admin',
    orders, allOrders, statusFilter,
    pendingCount: allOrders.filter(o => o.status === 'pending').length,
  });
});

router.post('/orders/:ref/status', (req, res) => {
  const { ref } = req.params;
  const newStatus = req.body.status;
  if (!ALLOWED_STATUSES.includes(newStatus)) return res.redirect('/admin/orders');

  const order = db.getOrder(ref);
  if (order) {
    const updates = { status: newStatus };
    if (newStatus === 'confirmed' && !order.confirmedAt) {
      updates.confirmedAt = new Date().toISOString();
      updates.etaTime     = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }
    if (newStatus === 'delivered' && !order.deliveredAt) {
      updates.deliveredAt = new Date().toISOString();
    }
    db.updateOrder(ref, updates);
  }
  res.redirect('/admin/orders' + (req.query.status ? `?status=${req.query.status}` : ''));
});

router.post('/orders/:ref/delete', (req, res) => {
  db.deleteOrder(req.params.ref);
  res.redirect('/admin/orders');
});

router.post('/orders/delete-all', (req, res) => {
  db.getAllOrders().forEach(o => db.deleteOrder(o.ref));
  res.redirect('/admin/orders');
});

// ── PRODUCTS ─────────────────────────────────
router.get('/products', (req, res) => {
  const { items: custom, hidden, deleted } = db.getProducts();
  res.render('admin/products', {
    title: 'Products – Admin – Ninja9IT', adminPage: 'products', page: 'admin',
    customProducts: custom, builtInItems: catalog.items,
    categoryMeta: catalog.categoryMeta, categories: catalog.categories,
    hiddenBuiltins: hidden, deletedBuiltins: deleted, pendingCount: pendingCount(),
  });
});

router.get('/products/new', (req, res) => {
  res.render('admin/product-form', {
    title: 'Add Product – Ninja9IT', adminPage: 'product-new', page: 'admin',
    product: null, categoryMeta: catalog.categoryMeta, categories: catalog.categories,
    error: null, pendingCount: pendingCount(),
  });
});

router.post('/products/new', upload.single('image'), (req, res) => {
  const { name, category, price, tag, emoji, gradient, desc, isLocal, popular } = req.body;
  if (!name || !category || !price) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.render('admin/product-form', {
      title: 'Add Product – Ninja9IT', adminPage: 'product-new', page: 'admin',
      product: null, categoryMeta: catalog.categoryMeta, categories: catalog.categories,
      error: 'Name, category and price are required.', pendingCount: pendingCount(),
    });
  }
  const pdb = db.getProducts();
  pdb.items.push({
    id:        `cprod_${crypto.randomBytes(6).toString('hex')}`,
    name, category,
    price:     parseInt(price),
    tag:       tag || '',
    emoji:     emoji || '📦',
    gradient:  gradient || 'linear-gradient(135deg,#1a1a1a,#333)',
    desc:      desc || '',
    isLocal:   !!isLocal,
    popular:   !!popular,
    image:     req.file ? `/uploads/products/${req.file.filename}` : null,
    createdAt: new Date().toISOString(),
  });
  db.saveProducts(pdb);
  res.redirect('/admin/products');
});

router.get('/products/:id/edit', (req, res) => {
  const { items } = db.getProducts();
  const product = items.find(p => p.id === req.params.id);
  if (!product) return res.redirect('/admin/products');
  res.render('admin/product-form', {
    title: 'Edit Product – Ninja9IT', adminPage: 'product-edit', page: 'admin',
    product, categoryMeta: catalog.categoryMeta, categories: catalog.categories,
    error: null, pendingCount: pendingCount(),
  });
});

router.post('/products/:id/edit', upload.single('image'), (req, res) => {
  const { name, category, price, tag, emoji, gradient, desc, isLocal, popular } = req.body;
  const pdb = db.getProducts();
  const idx = pdb.items.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.redirect('/admin/products');

  if (!name || !category || !price) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.render('admin/product-form', {
      title: 'Edit Product – Ninja9IT', adminPage: 'product-edit', page: 'admin',
      product: pdb.items[idx], categoryMeta: catalog.categoryMeta, categories: catalog.categories,
      error: 'Name, category and price are required.', pendingCount: pendingCount(),
    });
  }

  const existing = pdb.items[idx];
  if (req.file && existing.image) {
    const old = path.join(__dirname, '../public', existing.image);
    if (fs.existsSync(old)) try { fs.unlinkSync(old); } catch {}
  }
  pdb.items[idx] = {
    ...existing, name, category, price: parseInt(price),
    tag: tag || '', emoji: emoji || existing.emoji || '📦',
    gradient: gradient || existing.gradient, desc: desc || '',
    isLocal: !!isLocal, popular: !!popular,
    image: req.file ? `/uploads/products/${req.file.filename}` : existing.image,
    updatedAt: new Date().toISOString(),
  };
  db.saveProducts(pdb);
  res.redirect('/admin/products');
});

router.post('/products/:id/delete', (req, res) => {
  const pdb = db.getProducts();
  const idx = pdb.items.findIndex(p => p.id === req.params.id);
  if (idx !== -1) {
    const { image } = pdb.items[idx];
    if (image) { const f = path.join(__dirname, '../public', image); if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch {} }
    pdb.items.splice(idx, 1);
    db.saveProducts(pdb);
  }
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return res.json({ success: true });
  res.redirect('/admin/products');
});

router.post('/products/builtin/:id/delete', (req, res) => {
  const pdb = db.getProducts();
  if (!pdb.deleted.includes(req.params.id)) pdb.deleted.push(req.params.id);
  db.saveProducts(pdb);
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return res.json({ success: true });
  res.redirect('/admin/products');
});

// ── USERS ────────────────────────────────────
router.get('/users', (req, res) => {
  const users     = db.getUsers();
  const allOrders = db.getAllOrders();
  const stats     = {};

  allOrders.forEach(o => {
    if (!o.user) return;
    const uid = o.user.id;
    if (!stats[uid]) stats[uid] = { count: 0, revenue: 0 };
    stats[uid].count++;
    if (o.status !== 'cancelled') stats[uid].revenue += (o.total || 0);
  });

  res.render('admin/users', {
    title: 'Users – Admin – Ninja9IT', adminPage: 'users', page: 'admin',
    users: users.sort((a, b) => (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0)),
    orderStats: stats, pendingCount: pendingCount(),
  });
});

router.post('/users/:id/delete', (req, res) => {
  const user = db.findUserById(req.params.id);
  if (user && !user.isAdmin) {
    db.getAllOrders()
      .filter(o => o.user && o.user.id === user.id)
      .forEach(o => db.deleteOrder(o.ref));
    db.deleteUser(user.id);
  }
  res.redirect('/admin/users');
});

router.post('/users/:id/promote', (req, res) => {
  const user = db.findUserById(req.params.id);
  if (user && !user.isAdmin) {
    db.updateUser(user.id, { isAdmin: true, expiresAt: null });
  }
  res.redirect('/admin/users');
});

// ── SETTINGS ─────────────────────────────────
router.get('/settings', (req, res) => {
  res.render('admin/settings', {
    title: 'Settings – Admin – Ninja9IT', adminPage: 'settings', page: 'admin',
    settings: db.getSettings(), pendingCount: pendingCount(),
    saved: req.query.saved || null,
  });
});

router.post('/settings', (req, res) => {
  const { phone, phoneRaw, whatsapp, email, hours, address } = req.body;
  db.saveSettings({ phone, phoneRaw, whatsapp, email, hours, address });
  res.redirect('/admin/settings?saved=1');
});

module.exports = router;
