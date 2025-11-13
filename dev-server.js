import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load hero images from auto-generated config.json
let HERO_IMAGES = {};
try {
  const configPath = path.join(__dirname, 'api', 'config.json');
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    HERO_IMAGES = JSON.parse(configContent);
    console.log(`Loaded ${Object.keys(HERO_IMAGES).length} hero images`);
  }
} catch (error) {
  console.error('Failed to load config.json:', error.message);
}

// Helper function to handle root route (mimics api/index.js)
function handleRootRoute(req, res) {
  try {
    const hostname = req.headers.host || '';
    
    // Extract subdomain from hostname
    const parts = hostname.split(':')[0].split('.');
    let subdomain = 'default';
    
    if (parts.length > 2) {
      const sub = parts[0].toLowerCase();
      // Ignore Vercel auto-generated deployment subdomains
      const isVercelPattern = /^[a-z0-9]{10,}-[a-z0-9]{10,}/.test(sub) && /\d/.test(sub);
      if (!isVercelPattern) {
        subdomain = sub;
      }
    }
    
    // Read _index.html from project root
    const htmlPath = path.join(__dirname, '_index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Determine og:image: hero_image if available, otherwise fallback to logo.png
    const protocol = req.protocol || 'http';
    const host = hostname || req.headers.host || 'localhost:3000';
    const ogImage = HERO_IMAGES[subdomain] || `${protocol}://${host}/logo.png`;
    const currentUrl = `${protocol}://${host}${req.url || '/'}`;
    
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
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    
    // Send modified HTML
    res.status(200).send(html);
    
  } catch (error) {
    console.error('Error in root handler:', error);
    // Fallback: try to serve static _index.html
    try {
      const htmlPath = path.join(__dirname, '_index.html');
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
    } catch (fallbackError) {
      res.status(500).send('Internal Server Error');
    }
  }
}

// Root route handler (mimics vercel.json rewrite)
app.get('/', handleRootRoute);

// Admin route (mimics vercel.json rewrite)
app.get('/admin', (req, res) => {
  const adminPath = path.join(__dirname, 'admin', 'index.html');
  res.sendFile(adminPath);
});

// API routes - dynamically import and handle serverless functions
app.all('/api/admin/:path*', async (req, res) => {
  try {
    const routePath = req.params.path || '';
    const apiFile = path.join(__dirname, 'api', 'admin', `${routePath}.js`);
    
    if (!fs.existsSync(apiFile)) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // Dynamically import the handler
    const module = await import(`./api/admin/${routePath}.js`);
    const handler = module.default;
    
    if (typeof handler !== 'function') {
      return res.status(500).json({ error: 'Invalid handler export' });
    }
    
    // Create Vercel-like request/response objects
    const vercelReq = {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      url: req.url
    };
    
    const vercelRes = {
      status: (code) => {
        res.status(code);
        return vercelRes;
      },
      json: (data) => res.json(data),
      send: (data) => res.send(data),
      setHeader: (name, value) => res.setHeader(name, value)
    };
    
    // Call the handler
    await handler(vercelReq, vercelRes);
    
  } catch (error) {
    console.error('Error handling API route:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Serve static files (CSS, JS, images, etc.)
app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    // Set cache headers for static assets (mimics vercel.json)
    if (path.match(/\.(css|js)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (path.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Local dev server running at http://localhost:${PORT}`);
  console.log(`📝 Admin UI: http://localhost:${PORT}/admin`);
  console.log(`🌐 Test review page: http://localhost:${PORT}/?biz=bodenseebaer\n`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Please stop the other process or use a different port:\n`);
    console.error(`   PORT=3001 npm run dev\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

