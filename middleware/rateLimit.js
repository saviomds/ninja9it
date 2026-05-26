const store = new Map();

// Clean up expired buckets every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of store) {
    if (now > rec.resetAt) store.delete(key);
  }
}, 60 * 60 * 1000).unref();

function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, message = 'Too many attempts. Please try again later.' } = {}) {
  return (req, res, next) => {
    const ip  = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    let rec = store.get(key);
    if (!rec || now > rec.resetAt) {
      rec = { count: 0, resetAt: now + windowMs };
      store.set(key, rec);
    }
    rec.count++;

    if (rec.count > max) {
      const mins = Math.ceil((rec.resetAt - now) / 60000);
      return res.status(429).render('login', {
        title: 'Login – Ninja9IT',
        page:  'login',
        error: `${message} Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`,
      });
    }
    next();
  };
}

module.exports = rateLimit;
