import { sql } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';

/**
 * GET /api/business/[slug]/reviews
 * Returns all reviews for a business (1-4 stars only, since 5 stars go to Google)
 * Requires authentication and ownership verification
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const user = await requireAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get slug from query
    const { slug } = req.query;
    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    // Verify user owns the business
    const businessResult = await sql`
      SELECT id, name, user_id
      FROM businesses
      WHERE slug = ${slug}
    `;

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = businessResult.rows[0];
    if (business.user_id !== user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch reviews for this business (1-4 stars only, ordered by newest first)
    const reviewsResult = await sql`
      SELECT 
        id,
        rating,
        name,
        comments,
        submitted_at
      FROM reviews
      WHERE business_id = ${business.id}
        AND rating < 5
      ORDER BY submitted_at DESC
    `;

    const reviews = reviewsResult.rows.map(review => ({
      id: review.id,
      rating: review.rating,
      name: review.name,
      comments: review.comments,
      submittedAt: review.submitted_at
    }));

    return res.status(200).json({
      businessName: business.name,
      reviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

