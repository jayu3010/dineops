const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  const restaurantId =
    user.restaurantId ??
    user.restaurant?.id ??
    user.staffRestaurantId ??
    user.staffRestaurant?.id ??
    null;
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, restaurantId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '24h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = { generateAccessToken, generateRefreshToken };
