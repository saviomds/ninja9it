// Security headers applied to every response
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.removeHeader('X-Powered-By');
  next();
}

// Strip HTML tags and trim whitespace from all string body fields
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/<[^>]*>/g, '')   // strip HTML tags
          .replace(/[<>"'`]/g, '')   // strip remaining dangerous chars
          .trim();
      }
    }
  }
  next();
}

module.exports = { securityHeaders, sanitizeBody };
