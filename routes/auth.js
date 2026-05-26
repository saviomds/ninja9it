const express               = require('express');
const router                = express.Router();
const path                  = require('path');
const fs                    = require('fs');
const crypto                = require('crypto');
const { hashPassword, verifyPassword } = require('../utils/crypto');
const { readUsers, writeUsers, writeJSON } = require('../utils/db');
const rateLimit             = require('../middleware/rateLimit');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const STORE_DIR  = path.join(__dirname, '../store_users');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10,
  message: 'Too many login attempts.' });

function genId() { return 'usr_' + crypto.randomBytes(8).toString('hex'); }

// GET /login
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null, page: 'login', title: 'Login – Ninja9IT' });
});

// POST /login
router.post('/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('login', { error: 'Please enter your username and password.', page: 'login', title: 'Login – Ninja9IT' });
  }

  const db   = readUsers(USERS_FILE);
  const user = db.users.find(
    u => u.username.toLowerCase() === username.toLowerCase()
      || u.email.toLowerCase()    === username.toLowerCase()
  );

  if (!user) {
    return res.render('login', { error: 'Invalid username or password.', page: 'login', title: 'Login – Ninja9IT' });
  }

  // 48-hour expiry check
  if (!user.isAdmin && user.expiresAt && new Date() > new Date(user.expiresAt)) {
    db.users = db.users.filter(u => u.id !== user.id);
    writeUsers(USERS_FILE, db);
    return res.render('login', {
      error: 'Your account expired after 48 hours and was automatically removed. Please register again.',
      page: 'login', title: 'Login – Ninja9IT',
    });
  }

  let valid = false;
  try { valid = verifyPassword(password, user.password); } catch {}
  if (!valid) {
    return res.render('login', { error: 'Invalid username or password.', page: 'login', title: 'Login – Ninja9IT' });
  }

  req.session.user = { id: user.id, username: user.username, isAdmin: user.isAdmin, avatar: user.avatar || '🥷' };
  req.session.save(() => res.redirect('/'));
});

// GET /register
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register', { error: null, page: 'register', title: 'Register – Ninja9IT' });
});

// POST /register
router.post('/register', authLimiter, (req, res) => {
  const { username, email, password, confirm, avatar } = req.body;

  if (!username || !email || !password || !confirm) {
    return res.render('register', { error: 'All fields are required.', page: 'register', title: 'Register – Ninja9IT' });
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.render('register', { error: 'Username must be 3–20 characters: letters, numbers, underscores only.', page: 'register', title: 'Register – Ninja9IT' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.render('register', { error: 'Please enter a valid email address.', page: 'register', title: 'Register – Ninja9IT' });
  }
  if (password.length < 6) {
    return res.render('register', { error: 'Password must be at least 6 characters.', page: 'register', title: 'Register – Ninja9IT' });
  }
  if (password !== confirm) {
    return res.render('register', { error: 'Passwords do not match.', page: 'register', title: 'Register – Ninja9IT' });
  }

  const db = readUsers(USERS_FILE);
  const exists = db.users.find(
    u => u.username.toLowerCase() === username.toLowerCase()
      || u.email.toLowerCase()    === email.toLowerCase()
  );
  if (exists) {
    return res.render('register', { error: 'Username or email is already taken.', page: 'register', title: 'Register – Ninja9IT' });
  }

  const id      = genId();
  const now     = new Date();
  const expires = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const ALLOWED_AVATARS = ['🥷','👤','🧑🏻','🧑🏽','🧑🏾','🧑🏿','👨🏻','👨🏽','👨🏾','👨🏿','👩🏻','👩🏽','👩🏾','👩🏿','🧔🏽','👱🏻'];
  const safeAvatar = ALLOWED_AVATARS.includes(avatar) ? avatar : '🥷';

  db.users.push({
    id,
    username,
    email:      email.toLowerCase(),
    password:   hashPassword(password),
    avatar:     safeAvatar,
    createdAt:  now.toISOString(),
    expiresAt:  expires.toISOString(),
    isAdmin:    false,
    folderPath: `store_users/${id}`,
  });
  writeUsers(USERS_FILE, db);

  const userDir = path.join(STORE_DIR, id);
  fs.mkdirSync(userDir, { recursive: true });
  writeJSON(path.join(userDir, 'profile.json'), {
    id, username, email: email.toLowerCase(), avatar: safeAvatar,
    createdAt: now.toISOString(), expiresAt: expires.toISOString(),
  });

  req.session.user = { id, username, isAdmin: false, avatar: safeAvatar };
  req.session.save(() => res.redirect('/'));
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
