const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const verifyRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden for ${req.user.role} role.`
      });
    }
    next();
  };
};

const verifyTenant = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || req.user.restaurantId;
  
  if (!tenantId && req.user.role !== 'SUPERADMIN') {
    return res.status(400).json({ success: false, message: 'Tenant ID is required.' });
  }
  
  req.tenantId = tenantId;
  next();
};

module.exports = { verifyToken, verifyRole, verifyTenant };
