const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const loanApp_token = req.headers.authorization;
  const token = loanApp_token && loanApp_token.split(' ')[1];

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};