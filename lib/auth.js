import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Generate JWT token for user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      subscriptionTier: user.subscription_tier || 'free'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Get user from request (from cookie or Authorization header)
 */
export async function getUserFromRequest(req) {
  // Try to get token from cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const token = cookies.auth_token;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        return decoded;
      }
    }
  }

  // Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      return decoded;
    }
  }

  return null;
}

/**
 * Parse cookies from cookie header string
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
  }
  return cookies;
}

/**
 * Set auth cookie in response
 */
export function setAuthCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`
  );
}

/**
 * Clear auth cookie
 */
export function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    'auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
  );
}

/**
 * Middleware to require authentication
 * Returns user if authenticated, otherwise returns null
 */
export async function requireAuth(req) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return null;
  }
  return user;
}

