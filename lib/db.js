'use strict';
const fs   = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '../db');

// ── Low-level helpers ────────────────────────────────────────

function filePath(name) {
  return path.join(DB_DIR, name.endsWith('.json') ? name : `${name}.json`);
}

function read(name) {
  const p = filePath(name);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function write(name, data) {
  const p   = filePath(name);
  const tmp = p + '.tmp';
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, p);
  } catch (err) {
    console.error(`[DB] write error (${name}):`, err.message);
  }
}

// ── Users ────────────────────────────────────────────────────

function getUsers() {
  return (read('users') || { users: [] }).users;
}

function saveUsers(users) {
  write('users', { users });
}

function findUser(predicate) {
  return getUsers().find(predicate) || null;
}

function findUserById(id) {
  return findUser(u => u.id === id);
}

function findUserByUsername(username) {
  return findUser(u => u.username.toLowerCase() === username.toLowerCase());
}

function findUserByEmail(email) {
  return findUser(u => u.email.toLowerCase() === email.toLowerCase());
}

function findUserByLogin(login) {
  const l = login.toLowerCase();
  return findUser(u =>
    u.username.toLowerCase() === l || u.email.toLowerCase() === l
  );
}

function createUser(userData) {
  const users = getUsers();
  users.push(userData);
  saveUsers(users);
  return userData;
}

function updateUser(id, updates) {
  const users = getUsers();
  const idx   = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
  saveUsers(users);
  return users[idx];
}

function deleteUser(id) {
  const users = getUsers().filter(u => u.id !== id);
  saveUsers(users);
}

function purgeExpiredUsers() {
  const now   = new Date();
  const users = getUsers();
  const kept  = users.filter(u =>
    u.isAdmin || !u.expiresAt || new Date(u.expiresAt) > now
  );
  if (kept.length !== users.length) saveUsers(kept);
}

function hasAdmin() {
  return getUsers().some(u => u.isAdmin);
}

// ── Orders ───────────────────────────────────────────────────
// One file per order: db/orders/{REF}.json

const ORDERS_DIR = path.join(DB_DIR, 'orders');

function getOrder(ref) {
  const p = path.join(ORDERS_DIR, `${ref}.json`);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function saveOrder(order) {
  const p   = path.join(ORDERS_DIR, `${order.ref}.json`);
  const tmp = p + '.tmp';
  try {
    fs.mkdirSync(ORDERS_DIR, { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(order, null, 2), 'utf8');
    fs.renameSync(tmp, p);
  } catch (err) {
    console.error('[DB] saveOrder error:', err.message);
  }
}

function getAllOrders() {
  if (!fs.existsSync(ORDERS_DIR)) return [];
  return fs.readdirSync(ORDERS_DIR)
    .filter(f => f.endsWith('.json') && !f.endsWith('.tmp'))
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(ORDERS_DIR, f), 'utf8')); } catch { return null; } })
    .filter(Boolean);
}

function updateOrder(ref, updates) {
  const order = getOrder(ref);
  if (!order) return null;
  const updated = { ...order, ...updates, updatedAt: new Date().toISOString() };
  saveOrder(updated);
  return updated;
}

function deleteOrder(ref) {
  const p = path.join(ORDERS_DIR, `${ref}.json`);
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch {}
  }
}

// ── Products ─────────────────────────────────────────────────

function getProducts() {
  const p = read('products') || {};
  return { items: p.items || [], hidden: p.hidden || [], deleted: p.deleted || [] };
}

function saveProducts(db) {
  write('products', db);
}

// ── Settings ─────────────────────────────────────────────────

function getSettings() {
  return read('settings') || {};
}

function saveSettings(settings) {
  write('settings', settings);
}

// ── Reviews ──────────────────────────────────────────────────

function getReviews() {
  return (read('reviews') || { reviews: [] }).reviews;
}

// ── Module exports ───────────────────────────────────────────

module.exports = {
  // users
  getUsers, saveUsers,
  findUser, findUserById, findUserByUsername, findUserByEmail, findUserByLogin,
  createUser, updateUser, deleteUser,
  purgeExpiredUsers, hasAdmin,
  // orders
  getOrder, saveOrder, getAllOrders, updateOrder, deleteOrder,
  // products
  getProducts, saveProducts,
  // settings
  getSettings, saveSettings,
  // reviews
  getReviews,
};
