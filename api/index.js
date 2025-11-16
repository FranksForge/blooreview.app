import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load hero images from public/config.js (single source of truth)
let HERO_IMAGES = {};
try {
  const configPath = path.join(process.cwd(), 'public', 'config.js');
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  // Extract REVIEW_CONFIGS object from JavaScript file
  const match = configContent.match(/window\.REVIEW_CONFIGS\s*=\s*(\{[\s\S]*?\});/);
  if (match) {
    const configs = new Function('return ' + match[1])();
    
    // Extract hero_image from each config
    for (const [slug, config] of Object.entries(configs)) {
      if (config.hero_image) {
        HERO_IMAGES[slug] = config.hero_image;
      }
    }
    
    console.log(`Loaded ${Object.keys(HERO_IMAGES).length} hero images from config.js`);
  }
} catch (error) {
  console.error('Failed to load config.js:', error.message);
  // Fallback to empty object - will use logo.png for all
}

/**
 * Serverless function handler
 * Intercepts requests to / and dynamically injects og:image based on subdomain
 */
export default async function handler(req, res) {
  try {
    const hostname = req.headers.host || '';
    
    // Extract subdomain from hostname
    const parts = hostname.split('.');
    let slug = 'default';
    
    if (parts.length > 2) {
      const sub = parts[0].toLowerCase();
      // Ignore Vercel auto-generated deployment subdomains
      const isVercelPattern = /^[a-z0-9]{10,}-[a-z0-9]{10,}/.test(sub) && /\d/.test(sub);
      if (!isVercelPattern) {
        slug = sub;
      }
    }
    
    // Try to load business from database
    let business = null;
    let heroImage = null;
    
    if (slug !== 'default') {
      try {
        const { sql } = await import('../lib/db.js');
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
        
        console.log(`Database query for slug "${slug}": found ${result.rows.length} businesses`);
        
        if (result.rows.length > 0) {
          business = result.rows[0];
          heroImage = business.hero_image;
          console.log(`Business found in database: ${business.name}`);
        } else {
          console.log(`Business not found in database for slug: ${slug}`);
        }
      } catch (dbError) {
        console.error('Error loading business from database:', dbError);
        // Fall back to config.js
      }
    }
    
    // Fallback to config.js if database lookup failed
    if (!heroImage && HERO_IMAGES[slug]) {
      heroImage = HERO_IMAGES[slug];
    }
    
    // If this is the apex/root domain (no business slug), serve the minimal login/home page
    if (slug === 'default') {
      try {
        const homePath = path.join(process.cwd(), 'public', 'home.html');
        const homeHtml = fs.readFileSync(homePath, 'utf8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
        return res.status(200).send(homeHtml);
      } catch (e) {
        // Fall through to review template if home is missing
      }
    }

    // Read review template from templates directory for business subdomains
    const htmlPath = path.join(process.cwd(), 'templates', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // If we have a business from database, inject config script and skip config.js
    if (business && slug !== 'default') {
      const businessConfig = business.config || {};
      
      // Build config object in the format expected by the frontend
      const config = {
        place_id: business.place_id || '',
        name: business.name || '',
        category: business.category || '',
        google_maps_url: business.google_maps_url || '',
        hero_image: business.hero_image || '',
        logo_url: business.logo_url || '',
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
      
      // Inject config script and REMOVE config.js dependency for database businesses
      const configScript = `<script>
  // Business config loaded from database for slug: ${slug}
  window.REVIEW_TOOL_CONFIG = ${JSON.stringify(config, null, 2)};
  console.log('✅ Database config loaded for slug: ${slug}', window.REVIEW_TOOL_CONFIG);
</script>`;
      
      // Replace config.js with our database config (don't load config.js for database businesses)
      html = html.replace(
        /(\s*)<script src="config\.js"><\/script>/,
        `$1${configScript}`
      );
      
      console.log(`✅ Injected database config for business: ${business.name}`);
    }
    
    // Determine og:image: hero_image if available, otherwise fallback to logo.png
    const ogImage = heroImage || `https://${hostname}/logo.png`;
    const currentUrl = `https://${hostname}${req.url || '/'}`;
    
    // Replace Open Graph meta tags
    html = html.replace(
      /<meta property="og:image" content="[^"]*"/,
      `<meta property="og:image" content="${ogImage}"`
    );
    html = html.replace(
      /<meta property="og:url" content="[^"]*"/,
      `<meta property="og:url" content="${currentUrl}"`
    );
    
    // Set response headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache for 1 hour on edge, revalidate in background
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    
    // Send modified HTML
    res.status(200).send(html);
    
  } catch (error) {
    console.error('Error in serverless function:', error);
    // Fallback: try to serve template index.html
    try {
      const htmlPath = path.join(process.cwd(), 'templates', 'index.html');
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
    } catch (fallbackError) {
      res.status(500).send('Internal Server Error');
    }
  }
}

