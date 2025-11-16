import { sql } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await requireAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await sql`
      SELECT 
        id,
        slug,
        name,
        category,
        hero_image,
        config,
        created_at,
        updated_at
      FROM businesses
      WHERE user_id = ${user.userId}
      ORDER BY created_at DESC
    `;

    const businesses = result.rows.map(business => ({
      id: business.id,
      slug: business.slug,
      name: business.name,
      category: business.category,
      heroImage: business.hero_image,
      config: business.config,
      createdAt: business.created_at,
      updatedAt: business.updated_at
    }));

    return res.status(200).json({ businesses });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


