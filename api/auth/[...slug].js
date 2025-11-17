// Catch-all route for /api/auth/* - handles /api/auth/register, /api/auth/login, etc.
import login from '../../lib/routes/auth/login.js';
import logout from '../../lib/routes/auth/logout.js';
import register from '../../lib/routes/auth/register.js';
import verify from '../../lib/routes/auth/verify.js';

export default async function handler(req, res) {
  // In Vercel catch-all routes, req.query.slug is an array
  // For /api/auth/register, slug will be ['register']
  // For /api/auth/login, slug will be ['login']
  const pathSegments = req.query.slug || [];
  const endpoint = Array.isArray(pathSegments) ? pathSegments[0] : pathSegments;
  
  try {
    if (endpoint === 'register') {
      return await register(req, res);
    }
    if (endpoint === 'login') {
      return await login(req, res);
    }
    if (endpoint === 'logout') {
      return await logout(req, res);
    }
    if (endpoint === 'verify') {
      return await verify(req, res);
    }
    
    return res.status(404).json({ 
      error: 'Not found',
      receivedEndpoint: endpoint,
      pathSegments: pathSegments
    });
  } catch (e) {
    console.error('auth router error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

