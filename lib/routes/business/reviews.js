import { sql } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';

/**
 * GET /api/business/[slug]/reviews
 * Returns all reviews for a business (1-4 stars only, since 5 stars go to Google)
 * GET /api/business/[slug]/reviews?analytics=true
 * Returns analytics data for a business
 * GET /api/business/[slug]/reviews?insights=true
 * Returns AI-generated insights and recommendations (last 30 days)
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

    // Get slug, analytics, and insights flags from query
    const { slug, analytics, insights } = req.query;
    const isAnalyticsRequest = analytics === 'true' || analytics === true;
    const isInsightsRequest = insights === 'true' || insights === true;
    
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

    // If analytics requested, return analytics data
    if (isAnalyticsRequest) {
      // Fetch all reviews for analytics (1-4 stars only)
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
    }

    // If insights requested, return AI-generated insights
    if (isInsightsRequest) {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      // Fetch reviews from last 30 days (1-4 stars only)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const reviewsResult = await sql`
        SELECT 
          rating,
          comments,
          submitted_at
        FROM reviews
        WHERE business_id = ${business.id}
          AND rating < 5
          AND submitted_at >= ${thirtyDaysAgo}
        ORDER BY submitted_at DESC
      `;

      const reviews = reviewsResult.rows;

      if (reviews.length === 0) {
        return res.status(200).json({
          businessName: business.name,
          insights: {
            summary: "No reviews found in the last 30 days to analyze.",
            themes: [],
            recommendations: []
          }
        });
      }

      // Prepare review data for OpenAI
      const reviewTexts = reviews.map(r => 
        `Rating: ${r.rating}/5 - "${r.comments || 'No comment'}"`
      ).join('\n\n');

      // Calculate basic stats for context
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
      reviews.forEach(r => ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1);

      // Create prompt for OpenAI
      const prompt = `You are a business consultant analyzing customer reviews. Analyze the following reviews from the last 30 days for "${business.name}" (${business.category || 'business'}):

${reviewTexts}

Statistics:
- Total reviews: ${reviews.length}
- Average rating: ${avgRating.toFixed(1)}/5
- Rating distribution: 1★: ${ratingCounts[1]}, 2★: ${ratingCounts[2]}, 3★: ${ratingCounts[3]}, 4★: ${ratingCounts[4]}

Provide a JSON response with the following structure:
{
  "summary": "A concise 2-3 sentence summary of the overall customer sentiment and key patterns",
  "themes": [
    {"type": "positive" or "negative", "description": "Theme description", "frequency": "how often mentioned"},
    ...
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    ...
  ]
}

Focus on actionable insights. Keep recommendations specific and practical. Limit to top 3-5 themes and 3-5 recommendations.`;

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful business consultant that provides actionable insights from customer reviews. Always respond with valid JSON only, no markdown formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        });

        const responseText = completion.choices[0]?.message?.content || '{}';
        
        // Parse JSON response (handle markdown code blocks if present)
        let insightsData;
        try {
          // Try to extract JSON from markdown code blocks
          const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (jsonMatch) {
            insightsData = JSON.parse(jsonMatch[1]);
          } else {
            insightsData = JSON.parse(responseText);
          }
        } catch (parseError) {
          console.error('Failed to parse OpenAI response:', responseText);
          // Fallback response
          insightsData = {
            summary: "Unable to parse AI response. Please try again.",
            themes: [],
            recommendations: []
          };
        }

        return res.status(200).json({
          businessName: business.name,
          insights: {
            summary: insightsData.summary || 'No summary available.',
            themes: insightsData.themes || [],
            recommendations: insightsData.recommendations || []
          }
        });
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError);
        return res.status(500).json({ 
          error: 'Failed to generate insights',
          message: openaiError.message || 'OpenAI API error'
        });
      }
    }

    // Otherwise, return reviews list
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
    console.error('Error fetching reviews/analytics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

