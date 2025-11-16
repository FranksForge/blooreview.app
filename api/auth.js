import login from '../lib/routes/auth/login.js';
import logout from '../lib/routes/auth/logout.js';
import register from '../lib/routes/auth/register.js';
import verify from '../lib/routes/auth/verify.js';

export default async function handler(req, res) {
  const path = (req.url || '').toLowerCase();
  try {
    if (path.includes('/register')) return register(req, res);
    if (path.includes('/login')) return login(req, res);
    if (path.includes('/logout')) return logout(req, res);
    if (path.includes('/verify')) return verify(req, res);
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('auth router error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

import { sql } from '../lib/db.js';
import bcrypt from 'bcryptjs';
import { generateToken, setAuthCookie, clearAuthCookie, getUserFromRequest } from '../lib/auth.js';

export default async function handler(req, res) {
  try {
    const path = (req.url || '').toLowerCase();
    if (path.includes('/register')) return register(req, res);
    if (path.includes('/login')) return login(req, res);
    if (path.includes('/logout')) return logout(req, res);
    if (path.includes('/verify')) return verify(req, res);
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('auth router error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function register(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existingUser.rows.length > 0) return res.status(409).json({ error: 'User with this email already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await sql`
      INSERT INTO users (email, password_hash, name, subscription_tier, subscription_status)
      VALUES (${email}, ${passwordHash}, ${name || null}, 'free', 'active')
      RETURNING id, email, name, subscription_tier, created_at
    `;
    const user = result.rows[0];
    const token = generateToken(user);
    setAuthCookie(res, token);
    return res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, subscriptionTier: user.subscription_tier },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const result = await sql`
      SELECT id, email, password_hash, name, subscription_tier, subscription_status
      FROM users
      WHERE email = ${email}
    `;
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) return res.status(401).json({ error: 'Invalid email or password' });
    const token = generateToken(user);
    setAuthCookie(res, token);
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscription_tier,
        subscriptionStatus: user.subscription_status
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function logout(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    clearAuthCookie(res);
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function verify(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const result = await sql`
      SELECT id, email, name, subscription_tier, subscription_status, created_at
      FROM users
      WHERE id = ${user.userId}
    `;
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userData = result.rows[0];
    return res.status(200).json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        subscriptionTier: userData.subscription_tier,
        subscriptionStatus: userData.subscription_status,
        createdAt: userData.created_at
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


