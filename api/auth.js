import login from '../lib/routes/auth/login.js';
import logout from '../lib/routes/auth/logout.js';
import register from '../lib/routes/auth/register.js';
import verify from '../lib/routes/auth/verify.js';

export default async function handler(req, res) {
  // In Vercel, req.url for /api/auth/register is typically just /register
  // But it could also be the full path, so we check both
  const urlPath = req.url || '';
  const path = urlPath.toLowerCase();
  
  // Extract just the endpoint name (e.g., 'register' from '/register' or '/api/auth/register')
  const endpoint = path.split('/').filter(Boolean).pop() || '';
  
  try {
    // Match by endpoint name or full path
    if (endpoint === 'register' || path.includes('/register')) {
      return await register(req, res);
    }
    if (endpoint === 'login' || path.includes('/login')) {
      return await login(req, res);
    }
    if (endpoint === 'logout' || path.includes('/logout')) {
      return await logout(req, res);
    }
    if (endpoint === 'verify' || path.includes('/verify')) {
      return await verify(req, res);
    }
    
    return res.status(404).json({ error: 'Not found', receivedPath: urlPath });
  } catch (e) {
    console.error('auth router error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
