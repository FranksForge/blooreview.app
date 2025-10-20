#!/usr/bin/env node

// Config Sync Script
// Run this manually after updating the Review_config Google Sheet
// Usage: 
//   node sync-config.js                    # Update all default slugs
//   node sync-config.js slug1 slug2        # Update specific slugs only
//   node sync-config.js newbusiness-123    # Add new business

const https = require('https');
const fs = require('fs');
const path = require('path');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbo0fy_aFMAyI1I87n8XvZ6eDzaxe1nI4zuUfkkNuawcKWBIbJ2uFkJq1Ntb_c-keLEQ/exec';
const CONFIG_FILE = path.join(__dirname, 'config.js');
const DEFAULT_SLUGS = ['bigc-donchan', 'starbucks-123', 'default', 'newbus123'];

// Get command line arguments
const args = process.argv.slice(2);

// Read existing configs from config.js
function readExistingConfigs() {
  try {
    const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    const match = configContent.match(/window\.REVIEW_CONFIGS\s*=\s*(\{[\s\S]*?\});/);
    if (match) {
      // Use Function constructor instead of eval for safer parsing
      return new Function('return ' + match[1])();
    }
  } catch (e) {
    console.log('Note: No existing config file found, will create new one');
  }
  return {};
}

// Fetch configs from the Google Sheet
async function fetchConfigs(slugs) {
  const configs = {};
  
  for (const slug of slugs) {
    try {
      const url = `${APPS_SCRIPT_URL}?slug=${slug}`;
      const data = await fetchJSON(url);
      
      if (data.ok && data.config) {
        configs[slug] = data.config;
        console.log(`✓ Fetched config for: ${slug}`);
      } else {
        console.warn(`✗ Failed to fetch config for: ${slug} (${data.error || 'unknown error'})`);
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
  
  // Determine which slugs to fetch
  let slugsToFetch;
  let existingConfigs = {};
  
  if (args.length > 0) {
    // Specific slugs provided via command line
    slugsToFetch = args;
    console.log(`Fetching specific slugs: ${slugsToFetch.join(', ')}\n`);
    
    // Load existing configs to merge with
    existingConfigs = readExistingConfigs();
    console.log(`Loaded ${Object.keys(existingConfigs).length} existing config(s)\n`);
  } else {
    // No arguments: fetch all default slugs
    slugsToFetch = DEFAULT_SLUGS;
    console.log(`Fetching all default slugs: ${slugsToFetch.join(', ')}\n`);
  }
  
  const newConfigs = await fetchConfigs(slugsToFetch);
  
  if (Object.keys(newConfigs).length === 0) {
    console.error('\n✗ No configs fetched. Please check your Google Sheet and Apps Script.');
    process.exit(1);
  }
  
  // Merge: new configs override existing ones
  const allConfigs = { ...existingConfigs, ...newConfigs };
  
  generateConfigFile(allConfigs);
  
  console.log(`\n✓ Config sync complete!`);
  console.log(`✓ Updated ${Object.keys(newConfigs).length} business(es)`);
  console.log(`✓ Total businesses in config: ${Object.keys(allConfigs).length}`);
  console.log('\nNext steps:');
  console.log('  1. Review the changes: git diff config.js');
  console.log('  2. Commit and push: git add config.js && git commit -m "Update configs" && git push');
})();
