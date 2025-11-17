import login from '../lib/routes/auth/login.js';
import logout from '../lib/routes/auth/logout.js';
import register from '../lib/routes/auth/register.js';
import verify from '../lib/routes/auth/verify.js';

export default async function handler(req, res) {
  const path = (req.url || '').toLowerCase();
  try {
    if (path.includes('/register')) return await register(req, res);
    if (path.includes('/login')) return await login(req, res);
    if (path.includes('/logout')) return await logout(req, res);
    if (path.includes('/verify')) return await verify(req, res);
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('auth router error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
