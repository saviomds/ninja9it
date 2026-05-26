const crypto = require('crypto');

function hashPassword(pwd) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pwd, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(pwd, stored) {
  const [salt, hash] = stored.split(':');
  return crypto.timingSafeEqual(
    crypto.scryptSync(pwd, salt, 64),
    Buffer.from(hash, 'hex')
  );
}

module.exports = { hashPassword, verifyPassword };
