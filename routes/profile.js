'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../lib/db');
const { hashPassword, verifyPassword } = require('../lib/crypto');

const ALLOWED_AVATARS = ['🥷','😎','🦊','🐱','🐉','🦁','🐺','🐸','🤖','👾','🦅','🐯',
  '🧑🏻','🧑🏽','🧑🏾','🧑🏿','👨🏻','👨🏽','👨🏾','👨🏿','👩🏻','👩🏽','👩🏾','👩🏿'];

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// ── GET /profile ─────────────────────────────
router.get('/profile', requireLogin, (req, res) => {
  const user = db.findUserById(req.session.user.id);
  if (!user) return res.redirect('/logout');

  const allOrders  = db.getAllOrders();
  const myOrders   = allOrders.filter(o => o.user && o.user.id === user.id);
  const totalSpent = myOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);

  res.render('profile', {
    title: 'My Profile – Ninja9IT',
    page:  'profile',
    user,
    stats: {
      total:     myOrders.length,
      delivered: myOrders.filter(o => o.status === 'delivered').length,
      active:    myOrders.filter(o => ['pending', 'confirmed'].includes(o.status)).length,
      spent:     totalSpent,
    },
    success: req.query.saved ? 'Profile updated successfully.' : null,
    error:   req.query.error ? decodeURIComponent(req.query.error) : null,
  });
});

// ── POST /profile/update ─────────────────────
router.post('/profile/update', requireLogin, (req, res) => {
  const { username, email, avatar } = req.body;
  const user = db.findUserById(req.session.user.id);
  if (!user) return res.redirect('/logout');

  const fail = (msg) => res.redirect('/profile?error=' + encodeURIComponent(msg));

  if (!username || !email)                              return fail('Username and email are required.');
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))         return fail('Username: 3–20 chars, letters/numbers/underscores.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))      return fail('Please enter a valid email address.');

  // Check uniqueness — skip current user
  const taken = db.findUser(u =>
    u.id !== user.id &&
    (u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase())
  );
  if (taken) return fail('Username or email is already taken.');

  const safeAvatar = ALLOWED_AVATARS.includes(avatar) ? avatar : (user.avatar || '🥷');
  db.updateUser(user.id, { username, email: email.toLowerCase(), avatar: safeAvatar });

  req.session.user = { ...req.session.user, username, avatar: safeAvatar };
  req.session.save(() => res.redirect('/profile?saved=1'));
});

// ── POST /profile/password ───────────────────
router.post('/profile/password', requireLogin, (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = db.findUserById(req.session.user.id);
  if (!user) return res.redirect('/logout');

  const fail = (msg) => res.redirect('/profile?error=' + encodeURIComponent(msg));

  if (!currentPassword || !newPassword || !confirmPassword) return fail('All password fields are required.');
  if (newPassword.length < 6)                               return fail('New password must be at least 6 characters.');
  if (newPassword !== confirmPassword)                      return fail('New passwords do not match.');
  if (!verifyPassword(currentPassword, user.password))      return fail('Current password is incorrect.');

  db.updateUser(user.id, { password: hashPassword(newPassword) });
  req.session.save(() => res.redirect('/profile?saved=1'));
});

module.exports = router;
