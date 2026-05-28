'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../lib/db');
const { hashPassword, verifyPassword, genId } = require('../lib/crypto');
const rateLimit = require('../middleware/rateLimit');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10,
  message: 'Too many attempts. Please wait 15 minutes.' });

// ── GET /login ───────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null, page: 'login', title: 'Login – Ninja9IT' });
});

// ── POST /login ──────────────────────────────
router.post('/login', authLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('login', { error: 'Please enter your username and password.', page: 'login', title: 'Login – Ninja9IT' });
  }

  const user = db.findUserByLogin(username);

  if (!user) {
    return res.render('login', { error: 'Invalid username or password.', page: 'login', title: 'Login – Ninja9IT' });
  }

  // Remove expired guest accounts on login attempt
  if (!user.isAdmin && user.expiresAt && new Date() > new Date(user.expiresAt)) {
    db.deleteUser(user.id);
    return res.render('login', {
      error: 'Your account expired after 48 hours and was automatically removed. Please register again.',
      page: 'login', title: 'Login – Ninja9IT',
    });
  }

  if (!verifyPassword(password, user.password)) {
    return res.render('login', { error: 'Invalid username or password.', page: 'login', title: 'Login – Ninja9IT' });
  }

  req.session.user = {
    id:       user.id,
    username: user.username,
    isAdmin:  user.isAdmin,
    avatar:   user.avatar || '🥷',
  };
  res.redirect('/');
});

// ── GET /register ────────────────────────────
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register', { error: null, page: 'register', title: 'Register – Ninja9IT' });
});

// ── POST /register ───────────────────────────
router.post('/register', authLimiter, (req, res) => {
  const { username, email, password, confirm, avatar } = req.body;

  const fail = (msg) =>
    res.render('register', { error: msg, page: 'register', title: 'Register – Ninja9IT' });

  if (!username || !email || !password || !confirm) return fail('All fields are required.');
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))       return fail('Username: 3–20 chars, letters/numbers/underscore only.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))    return fail('Please enter a valid email address.');
  if (password.length < 6)                           return fail('Password must be at least 6 characters.');
  if (password !== confirm)                          return fail('Passwords do not match.');

  if (db.findUserByUsername(username)) return fail('That username is already taken.');
  if (db.findUserByEmail(email))       return fail('An account with that email already exists.');

  const VALID_AVATARS = ['🥷','😎','🦊','🐱','🐉','🦁','🐺','🐸','🤖','👾','🦅','🐯',
    '🧑🏻','🧑🏽','🧑🏾','🧑🏿','👨🏻','👨🏽','👨🏾','👨🏿','👩🏻','👩🏽','👩🏾','👩🏿'];
  const chosenAvatar = VALID_AVATARS.includes(avatar) ? avatar : '🥷';

  const newUser = {
    id:        genId('usr'),
    username,
    email:     email.toLowerCase(),
    password:  hashPassword(password),
    avatar:    chosenAvatar,
    isAdmin:   false,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createUser(newUser);

  req.session.user = {
    id:       newUser.id,
    username: newUser.username,
    isAdmin:  false,
    avatar:   newUser.avatar,
  };
  res.redirect('/');
});

// ── GET /logout ──────────────────────────────
router.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

module.exports = router;
