import createBusiness from '../lib/routes/business/create.js';
import maps from '../lib/routes/business/maps.js';
import configBySlug from '../lib/routes/business/config.js';

export default async function handler(req, res) {
  const path = (req.url || '').toLowerCase();
  try {
    if (path.includes('/create')) return createBusiness(req, res);
    if (path.includes('/maps')) return maps(req, res);
    const match = path.match(/\/api\/business\/([^/]+)\/config/);
    if (match?.[1]) {
      req.query = { ...(req.query || {}), slug: decodeURIComponent(match[1]) };
      return configBySlug(req, res);
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('business router error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

import { sql } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  try {
    const path = (req.url || '').toLowerCase();
    if (path.includes('/create')) return create(req, res);
    if (path.includes('/maps')) return maps(req, res);
    const match = path.match(/\/api\/business\/([^/]+)\/config/);
    if (match?.[1]) {
      req.query = { ...(req.query || {}), slug: decodeURIComponent(match[1]) };
      return config(req, res);
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('business router error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ===== create =====
function generateSlug(name) {
  return name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
async function getUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const result = await sql`SELECT id FROM businesses WHERE slug = ${slug}`;
    if (result.rows.length === 0) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}
async function create(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await requireAuth(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const { placeId, name, category, googleMapsUrl, heroImage, logoUrl, config } = req.body;
    if (!name || !placeId) return res.status(400).json({ error: 'Business name and place ID are required' });
    const userBusinesses = await sql`SELECT id FROM businesses WHERE user_id = ${user.userId}`;
    if (userBusinesses.rows.length >= 1) {
      return res.status(403).json({ error: 'You have reached the limit of businesses for your plan. Upgrade to add more businesses.' });
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
      INSERT INTO businesses (user_id, slug, place_id, name, category, google_maps_url, hero_image, logo_url, config)
      VALUES (${user.userId}, ${slug}, ${placeId}, ${name}, ${category || null}, ${googleMapsUrl || null}, ${heroImage || null}, ${logoUrl || null}, ${JSON.stringify(businessConfig)})
      RETURNING id, slug, name, category, created_at
    `;
    const business = result.rows[0];
    const hostname = req.headers.host || 'blooreview.app';
    const reviewUrl = `https://${slug}.${hostname.replace(/^[^.]+\\./, '')}`;
    return res.status(201).json({
      business: { id: business.id, slug: business.slug, name: business.name, category: business.category, createdAt: business.created_at },
      reviewUrl,
      message: 'Business created successfully'
    });
  } catch (error) {
    console.error('Error creating business:', error);
    if (error.code === '23505') return res.status(409).json({ error: 'A business with this slug already exists' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ===== maps =====
async function maps(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { mapsUrl } = req.body;
    if (!mapsUrl) return res.status(400).json({ error: 'Google Maps URL is required' });
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Google Maps API key not configured' });
    const parsed = parseMapsUrlDetails(mapsUrl);
    const placeIdFromUrl = extractPlaceIdFromUrl(mapsUrl);
    if (placeIdFromUrl) {
      const businessDetails = await fetchPlaceDetails(placeIdFromUrl, apiKey);
      return res.status(200).json(businessDetails);
    }
    const businessDetails = await searchPlaceByText(parsed, apiKey);
    return res.status(200).json(businessDetails);
  } catch (error) {
    console.error('Error in maps API:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch business details' });
  }
}
function parseMapsUrlDetails(url) {
  const result = { searchName: '', latitude: null, longitude: null };
  if (!url) return result;
  try {
    const decoded = decodeURIComponent(url);
    const nameMatch = decoded.match(/\\/maps\\/place\\/([^/]+)/i);
    if (nameMatch?.[1]) result.searchName = nameMatch[1].replace(/\\+/g, ' ').replace(/-/g, ' ').trim();
    const precise = decoded.match(/!8m2!3d(-?\\d+\\.\\d+)!4d(-?\\d+\\.\\d+)/);
    if (precise) {
      result.latitude = Number(precise[1]); result.longitude = Number(precise[2]);
    } else {
      const at = decoded.match(/@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/);
      if (at) { result.latitude = Number(at[1]); result.longitude = Number(at[2]); }
    }
  } catch (e) { console.error('Error parsing Maps URL:', e); }
  return result;
}
function extractPlaceIdFromUrl(url) {
  try {
    const m1 = url.match(/place_id:([A-Za-z0-9_-]+)/); if (m1) return m1[1];
    const m2 = url.match(/!1s0x([A-Za-z0-9_-]+)/); if (m2) return null;
    return null;
  } catch (e) { console.error('Error extracting Place ID:', e); return null; }
}
async function fetchPlaceDetails(placeId, apiKey) {
  const fields = 'place_id,name,formatted_address,types,photos,url,geometry';
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`;
  const response = await fetch(detailsUrl);
  if (!response.ok) throw new Error(`Places API error: ${response.status}`);
  const data = await response.json();
  if (data.status !== 'OK' || !data.result) throw new Error(data.error_message || 'Business not found in Google Places');
  const place = data.result;
  const category = place.types && place.types.length > 0 ? formatCategory(place.types[0]) : 'Business';
  let heroImage = null;
  if (place.photos && place.photos.length > 0) {
    const photoReference = place.photos[0].photo_reference;
    const photoUrlWithKey = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${apiKey}`;
    heroImage = await resolvePhotoUrl(photoUrlWithKey);
    if (!heroImage) heroImage = null;
  }
  return {
    placeId: place.place_id,
    name: place.name,
    category,
    mapsUrl: place.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    heroImage,
    address: place.formatted_address || ''
  };
}
async function searchPlaceByText(parsed, apiKey) {
  const textQuery = parsed.searchName || 'business';
  let searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(textQuery)}&key=${apiKey}`;
  if (parsed.latitude && parsed.longitude) searchUrl += `&location=${parsed.latitude},${parsed.longitude}&radius=500`;
  const response = await fetch(searchUrl);
  if (!response.ok) throw new Error(`Places API error: ${response.status}`);
  const data = await response.json();
  if (data.status !== 'OK' || !data.results || data.results.length === 0) throw new Error(data.error_message || 'Business not found in Google Places');
  const place = data.results[0];
  return await fetchPlaceDetails(place.place_id, apiKey);
}
function formatCategory(type) { return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); }
async function resolvePhotoUrl(photoUrl) {
  if (photoUrl.includes('&key=') || photoUrl.includes('?key=')) { /* attempt resolution */ }
  const maxRetries = 3;
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(photoUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
      if (response.ok && response.url) {
        const resolvedUrl = response.url;
        if (resolvedUrl.includes('&key=') || resolvedUrl.includes('?key=')) return null;
        if (resolvedUrl.includes('lh3.googleusercontent.com')) return resolvedUrl;
        return resolvedUrl;
      }
    } catch (e) { lastError = e; if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt)); }
  }
  console.error('Failed to resolve photo URL after retries:', lastError?.message);
  if (photoUrl.includes('&key=') || photoUrl.includes('?key=')) return null;
  return photoUrl;
}

// ===== [slug]/config =====
async function config(req, res) {
  try {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'Slug is required' });
    const result = await sql`
      SELECT place_id, name, category, google_maps_url, hero_image, logo_url, config
      FROM businesses
      WHERE slug = ${slug}
    `;
    if (result.rows.length === 0) {
      res.setHeader('Content-Type', 'application/javascript');
      return res.status(200).send('window.REVIEW_TOOL_CONFIG = {};');
    }
    const business = result.rows[0];
    const businessConfig = business.config || {};
    const cfg = {
      place_id: business.place_id,
      name: business.name,
      category: business.category,
      google_maps_url: business.google_maps_url,
      hero_image: business.hero_image,
      logo_url: business.logo_url,
      google_review_base_url: 'https://search.google.com/local/writereview?placeid=',
      google_review_url: business.place_id ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(business.place_id)}` : '',
      sheet_script_url: businessConfig.sheet_script_url || '',
      review_threshold: businessConfig.review_threshold || 5,
      discount_enabled: businessConfig.discount_enabled !== false,
      discount_percentage: businessConfig.discount_percentage || 10,
      discount_valid_days: businessConfig.discount_valid_days || 30,
      referral_enabled: businessConfig.referral_enabled !== false,
      min_review: businessConfig.review_threshold || 5
    };
    const js = `window.REVIEW_TOOL_CONFIG = ${JSON.stringify(cfg, null, 2)};`;
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return res.status(200).send(js);
  } catch (error) {
    console.error('Error loading business config:', error);
    res.setHeader('Content-Type', 'application/javascript');
    return res.status(200).send('window.REVIEW_TOOL_CONFIG = {};');
  }
}


