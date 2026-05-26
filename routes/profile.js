const express  = require('express');
const router   = express.Router();
const path     = require('path');
const { hashPassword, verifyPassword } = require('../utils/crypto');
const { readUsers, writeUsers, writeJSON, readJSON, readAllOrders } = require('../utils/db');

const USERS_FILE    = path.join(__dirname, '../data/users.json');
const STORE_USERS   = path.join(__dirname, '../store_users');
const STORE_ORDER   = path.join(__dirname, '../store_order');

const ALLOWED_AVATARS = ['🥷','👤','🧑🏻','🧑🏽','🧑🏾','🧑🏿','👨🏻','👨🏽','👨🏾','👨🏿','👩🏻','👩🏽','👩🏾','👩🏿','🧔🏽','👱🏻'];

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// GET /profile
router.get('/profile', requireLogin, (req, res) => {
  const db   = readUsers(USERS_FILE);
  const user = db.users.find(u => u.id === req.session.user.id);
  if (!user) return res.redirect('/logout');

  const allOrders  = readAllOrders(STORE_ORDER);
  const myOrders   = allOrders.filter(o => o.user && o.user.id === user.id);
  const totalSpent = myOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);

  res.render('profile', {
    title:      'My Profile – Ninja9IT',
    page:       'profile',
    user,
    stats: {
      total:     myOrders.length,
      delivered: myOrders.filter(o => o.status === 'delivered').length,
      active:    myOrders.filter(o => ['pending','confirmed'].includes(o.status)).length,
      spent:     totalSpent,
    },
    success: req.query.saved  ? 'Profile updated successfully.' : null,
    error:   req.query.error  ? decodeURIComponent(req.query.error) : null,
  });
});

// POST /profile/update — update username, email, avatar
router.post('/profile/update', requireLogin, (req, res) => {
  const { username, email, avatar } = req.body;
  const db   = readUsers(USERS_FILE);
  const idx  = db.users.findIndex(u => u.id === req.session.user.id);
  if (idx === -1) return res.redirect('/logout');

  const user = db.users[idx];

  if (!username || !email) {
    return res.redirect('/profile?error=' + encodeURIComponent('Username and email are required.'));
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.redirect('/profile?error=' + encodeURIComponent('Username must be 3–20 chars: letters, numbers, underscores.'));
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.redirect('/profile?error=' + encodeURIComponent('Please enter a valid email address.'));
  }

  // Check uniqueness — exclude current user
  const taken = db.users.find(u => u.id !== user.id && (
    u.username.toLowerCase() === username.toLowerCase() ||
    u.email.toLowerCase()    === email.toLowerCase()
  ));
  if (taken) {
    return res.redirect('/profile?error=' + encodeURIComponent('Username or email is already taken by another account.'));
  }

  const safeAvatar = ALLOWED_AVATARS.includes(avatar) ? avatar : (user.avatar || '🥷');

  db.users[idx] = { ...user, username, email: email.toLowerCase(), avatar: safeAvatar, updatedAt: new Date().toISOString() };
  writeUsers(USERS_FILE, db);

  // Update profile.json
  const profileFile = path.join(STORE_USERS, user.id, 'profile.json');
  const profile     = readJSON(profileFile) || {};
  writeJSON(profileFile, { ...profile, username, email: email.toLowerCase(), avatar: safeAvatar, updatedAt: new Date().toISOString() });

  // Update session
  req.session.user = { ...req.session.user, username, avatar: safeAvatar };
  req.session.save(() => res.redirect('/profile?saved=1'));
});

// POST /profile/password — change password
router.post('/profile/password', requireLogin, (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const db  = readUsers(USERS_FILE);
  const idx = db.users.findIndex(u => u.id === req.session.user.id);
  if (idx === -1) return res.redirect('/logout');

  const user = db.users[idx];

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.redirect('/profile?error=' + encodeURIComponent('All password fields are required.'));
  }
  if (newPassword.length < 6) {
    return res.redirect('/profile?error=' + encodeURIComponent('New password must be at least 6 characters.'));
  }
  if (newPassword !== confirmPassword) {
    return res.redirect('/profile?error=' + encodeURIComponent('New passwords do not match.'));
  }

  let valid = false;
  try { valid = verifyPassword(currentPassword, user.password); } catch {}
  if (!valid) {
    return res.redirect('/profile?error=' + encodeURIComponent('Current password is incorrect.'));
  }

  db.users[idx] = { ...user, password: hashPassword(newPassword), updatedAt: new Date().toISOString() };
  writeUsers(USERS_FILE, db);

  req.session.save(() => res.redirect('/profile?saved=1'));
});

module.exports = router;
