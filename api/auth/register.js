import { sql } from '../../lib/db.js';
import bcrypt from 'bcryptjs';
import { generateToken, setAuthCookie } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test database connection first
    try {
      await sql`SELECT 1`;
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed',
        message: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await sql`
      INSERT INTO users (email, password_hash, name, subscription_tier, subscription_status)
      VALUES (${email}, ${passwordHash}, ${name || null}, 'free', 'active')
      RETURNING id, email, name, subscription_tier, created_at
    `;

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user);

    // Set auth cookie
    setAuthCookie(res, token);

    // Return user data (without password)
    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscription_tier
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

