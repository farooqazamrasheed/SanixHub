const jwt = require('jsonwebtoken');

/**
 * Generate JWT access token
 */
exports.generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
};

/**
 * Generate JWT refresh token
 */
exports.generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

/**
 * Verify refresh token
 */
exports.verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Send tokens in HTTP-only cookies
 */
exports.sendTokenResponse = (user, statusCode, res) => {
  const accessToken = this.generateAccessToken(user._id);
  const refreshToken = this.generateRefreshToken(user._id);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  };

  // Access token expires in 15 minutes
  const accessCookieOptions = {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000 // 15 minutes
  };

  // Refresh token expires in 7 days
  const refreshCookieOptions = {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  res
    .status(statusCode)
    .cookie('accessToken', accessToken, accessCookieOptions)
    .cookie('refreshToken', refreshToken, refreshCookieOptions)
    .json({
      success: true,
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
};
