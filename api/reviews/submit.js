import { sql } from '../../lib/db.js';

/**
 * POST /api/reviews/submit
 * Body: { businessSlug?: string, businessId?: string, rating: number, name?: string, comments: string }
 * Behavior:
 *  - Insert review into Postgres (source of truth)
 *  - If business.config.sheet_script_url exists, mirror payload to Google Apps Script (best-effort)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessSlug, businessId, rating, name, comments } = req.body || {};

    if ((!businessSlug && !businessId) || !rating || !comments) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const parsedRating = Number(rating);
    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Invalid rating' });
    }

    // Find business by id or slug
    let business;
    if (businessId) {
      const r = await sql`SELECT id, slug, config FROM businesses WHERE id = ${businessId}`;
      business = r.rows[0];
    } else {
      const r = await sql`SELECT id, slug, config FROM businesses WHERE slug = ${businessSlug}`;
      business = r.rows[0];
    }
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Insert into reviews (source of truth)
    const inserted = await sql`
      INSERT INTO reviews (business_id, rating, name, comments)
      VALUES (${business.id}, ${parsedRating}, ${name || null}, ${comments})
      RETURNING id, submitted_at
    `;

    // Best-effort mirror to Google Sheets if configured
    try {
      const config = business.config || {};
      const sheetUrl = typeof config.sheet_script_url === 'string' ? config.sheet_script_url.trim() : '';
      if (sheetUrl) {
        const payload = {
          business_slug: business.slug,
          rating: parsedRating,
          name: name || '',
          comments,
          submitted_at: inserted.rows[0].submitted_at
        };
        // Apps Script prefers text/plain with JSON string; no-cors not needed server-side
        fetch(sheetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch((err) => {
          console.error('Sheets mirror failed:', err);
        });
      }
    } catch (mirrorErr) {
      // Do not fail the request if mirror fails
      console.error('Sheets mirror error:', mirrorErr);
    }

    return res.status(200).json({
      success: true,
      reviewId: inserted.rows[0].id
    });
  } catch (err) {
    console.error('Submit review failed:', err);
    return res.status(500).json({ error: 'Failed to submit review' });
  }
}


