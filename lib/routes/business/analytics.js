import { sql } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';

/**
 * GET /api/business/[slug]/analytics
 * Returns analytics data for a business (1-4 star reviews only)
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

    // Fetch all reviews for this business (1-4 stars only)
    const reviewsResult = await sql`
      SELECT 
        rating,
        submitted_at
      FROM reviews
      WHERE business_id = ${business.id}
        AND rating < 5
      ORDER BY submitted_at ASC
    `;

    const reviews = reviewsResult.rows;

    // Calculate analytics
    const totalReviews = reviews.length;
    
    // Average rating
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    // Rating distribution
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    reviews.forEach(review => {
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
    });

    // Calculate percentages
    const ratingDistributionPercent = {};
    Object.keys(ratingDistribution).forEach(rating => {
      ratingDistributionPercent[rating] = totalReviews > 0
        ? (ratingDistribution[rating] / totalReviews) * 100
        : 0;
    });

    // Reviews over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const reviewsOverTime = {};
    reviews.forEach(review => {
      const reviewDate = new Date(review.submitted_at);
      if (reviewDate >= thirtyDaysAgo) {
        const dateKey = reviewDate.toISOString().split('T')[0]; // YYYY-MM-DD
        reviewsOverTime[dateKey] = (reviewsOverTime[dateKey] || 0) + 1;
      }
    });

    // Convert to array format for charting
    const timeSeriesData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      timeSeriesData.push({
        date: dateKey,
        count: reviewsOverTime[dateKey] || 0
      });
    }

    return res.status(200).json({
      businessName: business.name,
      analytics: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        ratingDistribution: {
          counts: ratingDistribution,
          percentages: ratingDistributionPercent
        },
        timeSeries: timeSeriesData
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

