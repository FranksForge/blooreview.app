import { getUserFromRequest } from '../../../lib/auth.js';
import { sql } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await sql`
      SELECT id, email, name, subscription_tier, subscription_status, created_at
      FROM users
      WHERE id = ${user.userId}
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

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


