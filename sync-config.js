#!/usr/bin/env node

// Config Sync Script
// Run this manually after updating the Review_config Google Sheet
// Usage: node sync-config.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyFgxjgCPd6kLAo60D5NUspQWLnlKTjgfbbZ77XxsyZJSb_9Br1dD6-2ZDiOcvIFz5qmA/exec';
const CONFIG_FILE = path.join(__dirname, 'config.js');

// Fetch all configs from the Google Sheet
async function fetchAllConfigs() {
  // First, try to get all configs in one request
  try {
    console.log('Fetching all configs from sheet...');
    const url = `${APPS_SCRIPT_URL}?action=getAllConfigs`;
    const data = await fetchJSON(url);
    
    if (data.ok && data.configs) {
      console.log(`✓ Fetched all configs in one request`);
      return data.configs;
    }
  } catch (error) {
    console.log('Note: getAllConfigs endpoint not available, fetching individually...');
  }
  
  // Fallback: fetch known slugs individually
  const slugs = ['bigc-donchan', 'starbucks-123', 'default'];
  const configs = {};
  
  for (const slug of slugs) {
    try {
      const url = `${APPS_SCRIPT_URL}?slug=${slug}`;
      const data = await fetchJSON(url);
      
      if (data.ok && data.config) {
        configs[slug] = data.config;
        console.log(`✓ Fetched config for: ${slug}`);
      } else {
        console.warn(`✗ Failed to fetch config for: ${slug}`);
      }
    } catch (error) {
      console.error(`✗ Error fetching ${slug}:`, error.message);
    }
  }
  
  return configs;
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const makeRequest = (requestUrl) => {
      https.get(requestUrl, (res) => {
        // Follow redirects
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          console.log(`  Following redirect to: ${res.headers.location}`);
          makeRequest(res.headers.location);
          return;
        }
        
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }
        
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            console.error('Response was not JSON:', data.substring(0, 200));
            reject(new Error('Invalid JSON response'));
          }
        });
      }).on('error', reject);
    };
    
    makeRequest(url);
  });
}

// Generate the config.js file
function generateConfigFile(configs) {
  const template = `// Multi-tenant configs - updated: ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - Run 'node sync-config.js' to update from Google Sheets
window.REVIEW_CONFIGS = ${JSON.stringify(configs, null, 2)};

// Resolve slug from URL and set the active config
(function() {
  const resolveSlug = () => {
    const qp = new URL(window.location.href).searchParams.get("biz");
    if (qp) return qp.toLowerCase();
    
    const parts = window.location.hostname.split(".");
    if (parts.length > 2) {
      const subdomain = parts[0].toLowerCase();
      if (!subdomain.match(/^[a-z]+-[a-z0-9]+-[a-z0-9]+$/)) {
        return subdomain;
      }
    }
    
    return "default";
  };
  
  const slug = resolveSlug();
  window.REVIEW_TOOL_CONFIG = window.REVIEW_CONFIGS[slug] || window.REVIEW_CONFIGS["default"];
  console.log(\`Config loaded for slug: \${slug}\`, window.REVIEW_TOOL_CONFIG);
})();
`;
  
  fs.writeFileSync(CONFIG_FILE, template, 'utf8');
  console.log(`\n✓ Config file updated: ${CONFIG_FILE}`);
}

// Main
(async () => {
  console.log('Syncing configs from Google Sheet...\n');
  
  const configs = await fetchAllConfigs();
  
  if (Object.keys(configs).length === 0) {
    console.error('\n✗ No configs fetched. Please check your Google Sheet and Apps Script.');
    process.exit(1);
  }
  
  generateConfigFile(configs);
  
  console.log('\n✓ Config sync complete!');
  console.log('Next steps:');
  console.log('  1. Review the changes: git diff config.js');
  console.log('  2. Commit and push: git add config.js && git commit -m "Update configs" && git push');
})();

