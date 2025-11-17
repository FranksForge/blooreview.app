import { sql } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const result = await sql`SELECT id FROM businesses WHERE slug = ${slug}`;
    if (result.rows.length === 0) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await requireAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      placeId,
      name,
      category,
      googleMapsUrl,
      heroImage,
      logoUrl,
      config
    } = req.body;

    if (!name || !placeId) {
      return res.status(400).json({ error: 'Business name and place ID are required' });
    }

    const userBusinesses = await sql`SELECT id FROM businesses WHERE user_id = ${user.userId}`;
    if (userBusinesses.rows.length >= 1) {
      return res.status(403).json({ 
        error: 'You have reached the limit of businesses for your plan. Upgrade to add more businesses.' 
      });
    }

    const baseSlug = generateSlug(name);
    const slug = await getUniqueSlug(baseSlug);

    const businessConfig = {
      discount_enabled: config?.discount_enabled ?? true,
      discount_percentage: config?.discount_percentage ?? 10,
      discount_valid_days: config?.discount_valid_days ?? 30,
      referral_enabled: config?.referral_enabled ?? true,
      review_threshold: config?.review_threshold ?? 5,
      sheet_script_url: config?.sheet_script_url || '',
      ...(config || {})
    };

    const result = await sql`
      INSERT INTO businesses (
        user_id,
        slug,
        place_id,
        name,
        category,
        google_maps_url,
        hero_image,
        logo_url,
        config
      )
      VALUES (
        ${user.userId},
        ${slug},
        ${placeId},
        ${name},
        ${category || null},
        ${googleMapsUrl || null},
        ${heroImage || null},
        ${logoUrl || null},
        ${JSON.stringify(businessConfig)}
      )
      RETURNING id, slug, name, category, created_at
    `;

    const business = result.rows[0];
    const hostname = req.headers.host || 'blooreview.app';
    // Extract base domain (e.g., "blooreview.app" from "www.blooreview.app" or "app.www.blooreview.app")
    const baseDomain = hostname.includes('.') 
      ? hostname.split('.').slice(-2).join('.')
      : 'blooreview.app';
    const reviewUrl = `https://${slug}.${baseDomain}`;

    return res.status(201).json({
      business: {
        id: business.id,
        slug: business.slug,
        name: business.name,
        category: business.category,
        createdAt: business.created_at
      },
      reviewUrl,
      message: 'Business created successfully'
    });
  } catch (error) {
    console.error('Error creating business:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A business with this slug already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}



