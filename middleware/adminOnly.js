module.exports = function adminOnly(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) return next();
  req.session._redirectAfterLogin = req.originalUrl;
  res.redirect('/login');
};
