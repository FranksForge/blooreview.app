import { sql } from '../../../lib/db.js';

/**
 * Get business config by slug
 * Returns JavaScript that sets window.REVIEW_TOOL_CONFIG
 */
export default async function handler(req, res) {
  try {
    const { slug } = req.query;

    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    // Get business from database
    const result = await sql`
      SELECT 
        place_id,
        name,
        category,
        google_maps_url,
        hero_image,
        logo_url,
        config
      FROM businesses
      WHERE slug = ${slug}
    `;

    if (result.rows.length === 0) {
      // Business not found - return empty config
      res.setHeader('Content-Type', 'application/javascript');
      return res.status(200).send('window.REVIEW_TOOL_CONFIG = {};');
    }

    const business = result.rows[0];
    const businessConfig = business.config || {};

    // Build the config object in the format expected by the frontend
    const config = {
      place_id: business.place_id,
      name: business.name,
      category: business.category,
      google_maps_url: business.google_maps_url,
      hero_image: business.hero_image,
      logo_url: business.logo_url,
      google_review_base_url: 'https://search.google.com/local/writereview?placeid=',
      google_review_url: business.place_id 
        ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(business.place_id)}`
        : '',
      sheet_script_url: businessConfig.sheet_script_url || '',
      review_threshold: businessConfig.review_threshold || 5,
      discount_enabled: businessConfig.discount_enabled !== false,
      discount_percentage: businessConfig.discount_percentage || 10,
      discount_valid_days: businessConfig.discount_valid_days || 30,
      referral_enabled: businessConfig.referral_enabled !== false,
      min_review: businessConfig.review_threshold || 5
    };

    // Return as JavaScript that sets window.REVIEW_TOOL_CONFIG
    const js = `window.REVIEW_TOOL_CONFIG = ${JSON.stringify(config, null, 2)};`;
    
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return res.status(200).send(js);

  } catch (error) {
    console.error('Error loading business config:', error);
    // Return empty config on error
    res.setHeader('Content-Type', 'application/javascript');
    return res.status(200).send('window.REVIEW_TOOL_CONFIG = {};');
  }
}

