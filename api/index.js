import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load hero images from auto-generated config.json
let HERO_IMAGES = {};
try {
  const configPath = path.join(__dirname, 'config.json');
  const configContent = fs.readFileSync(configPath, 'utf8');
  HERO_IMAGES = JSON.parse(configContent);
  console.log(`Loaded ${Object.keys(HERO_IMAGES).length} hero images`);
} catch (error) {
  console.error('Failed to load config.json:', error.message);
  // Fallback to empty object - will use logo.png for all
}

/**
 * Serverless function handler
 * Intercepts requests to / and dynamically injects og:image based on subdomain
 */
export default function handler(req, res) {
  try {
    const hostname = req.headers.host || '';
    
    // Extract subdomain from hostname
    const parts = hostname.split('.');
    let subdomain = 'default';
    
    if (parts.length > 2) {
      const sub = parts[0].toLowerCase();
      // Ignore Vercel auto-generated deployment subdomains
      const isVercelPattern = /^[a-z0-9]{10,}-[a-z0-9]{10,}/.test(sub) && /\d/.test(sub);
      if (!isVercelPattern) {
        subdomain = sub;
      }
    }
    
    // Read _index.html from project root (renamed to prevent Vercel from serving it statically)
    const htmlPath = path.join(process.cwd(), '_index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Determine og:image: hero_image if available, otherwise fallback to logo.png
    const ogImage = HERO_IMAGES[subdomain] || `https://${hostname}/logo.png`;
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
    // Fallback: try to serve static _index.html
    try {
      const htmlPath = path.join(process.cwd(), '_index.html');
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
    } catch (fallbackError) {
      res.status(500).send('Internal Server Error');
    }
  }
}

