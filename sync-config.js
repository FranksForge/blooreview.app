#!/usr/bin/env node

// Config Sync Script
// Run this manually after updating the Review_config Google Sheet
// Usage: 
//   node sync-config.js                    # Update all default slugs
//   node sync-config.js slug1 slug2        # Update specific slugs only
//   node sync-config.js newbusiness-123    # Add new business
//   node sync-config.js --deploy           # Update all and auto-deploy
//   node sync-config.js slug1 --deploy     # Update slug and auto-deploy

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Apps Script URL for fetching configs from Google Sheet
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzb3vP3-rbp4y8Rb98RDYmHhjKLAbKlabPQI7VXmBH35PaUIUt_UyrLvUvswhqbs8XXpQ/exec';
// Apps Script URL for submitting reviews to Google Sheet (separate tabs per slug)
const REVIEW_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbysuZFWEL6zZs1fu8kowPwWRGLPFAvXvRKOCLqlxpf1qzB5pM8RiKlQmzwrQGwgMKKiNg/exec';

const CONFIG_FILE = path.join(__dirname, 'config.js');
// Update this array to match the row order in your Google Sheet
const DEFAULT_SLUGS = ['default', 'bigc-donchan', 'starbucks-123', 'newbus123'];

// Default configuration values applied when sheet fields are empty
const DEFAULT_CONFIG = {
  sheet_script_url: REVIEW_SCRIPT_URL,
  min_review: 5,
  discount_enabled: true,
  discount_percentage: 10,
  discount_valid_days: 30,
  referral_enabled: true,
  referral_message: "Lade deine Freunde ein sich Ihren eigenen Rabattcode zu holen!"
};

// Get command line arguments
const args = process.argv.slice(2);
const shouldDeploy = args.includes('--deploy');
const slugArgs = args.filter(arg => arg !== '--deploy');

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

// Fetch all configs from the Google Sheet at once
async function fetchAllConfigs() {
  try {
    const url = `${APPS_SCRIPT_URL}?action=getAllConfigs`;
    const data = await fetchJSON(url);
    
    if (data.ok && data.configs) {
      console.log(`✓ Fetched all configs: ${Object.keys(data.configs).length} businesses`);
      
      // Debug: Log sample config to see what fields are being returned
      const sampleSlug = Object.keys(data.configs)[0];
      if (sampleSlug) {
        console.log(`\nDebug - Sample config for "${sampleSlug}":`);
        console.log(`  Fields: ${Object.keys(data.configs[sampleSlug]).join(', ')}`);
        const sample = data.configs[sampleSlug];
        console.log(`  name: "${sample.name || '(not set)'}"`);
        console.log(`  businessName: "${sample.businessName || '(not set)'}"`);
        console.log(`  place_id: "${sample.place_id || '(not set)'}"`);
        console.log(`  googlePlaceId: "${sample.googlePlaceId || '(not set)'}"`);
        console.log(`  category: "${sample.category || '(not set)'}"`);
        console.log(`  businessCategory: "${sample.businessCategory || '(not set)'}"`);
        if (sample.discount) console.log(`  discount: ${JSON.stringify(sample.discount)}`);
        console.log(`  discount_enabled raw: ${JSON.stringify(sample.discount_enabled)} (type: ${typeof sample.discount_enabled}, value: "${sample.discount_enabled}")`);
        console.log(`  referral_enabled raw: ${JSON.stringify(sample.referral_enabled)} (type: ${typeof sample.referral_enabled}, value: "${sample.referral_enabled}")`);
        // Show an entry that might have empty cells
        const emptyTestSlug = Object.keys(data.configs).find(slug => {
          const cfg = data.configs[slug];
          return cfg && (cfg.discount_enabled === false || cfg.discount_enabled === '' || !cfg.discount_enabled);
        });
        if (emptyTestSlug && emptyTestSlug !== sampleSlug) {
          console.log(`\nDebug - Config with potentially empty cells "${emptyTestSlug}":`);
          const emptyTest = data.configs[emptyTestSlug];
          console.log(`  discount_enabled raw: ${JSON.stringify(emptyTest.discount_enabled)} (type: ${typeof emptyTest.discount_enabled})`);
          console.log(`  referral_enabled raw: ${JSON.stringify(emptyTest.referral_enabled)} (type: ${typeof emptyTest.referral_enabled})`);
        }
      }
      
      return data.configs;
    } else {
      console.warn(`✗ Failed to fetch all configs: ${data.error || 'unknown error'}`);
      return {};
    }
  } catch (error) {
    console.error(`✗ Error fetching all configs:`, error.message);
    return {};
  }
}

// Fetch configs from the Google Sheet (preserves order)
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

// Sort configs to match Google Sheet row order
function sortConfigsBySheetOrder(configs, requestedSlugs) {
  // When fetching all, use DEFAULT_SLUGS order (which should match sheet)
  // When fetching specific slugs, use the order they were requested
  const orderedConfigs = {};
  const sortOrder = requestedSlugs.length > 0 ? requestedSlugs : DEFAULT_SLUGS;
  
  // First add configs in the specified order
  sortOrder.forEach(slug => {
    if (configs[slug]) {
      orderedConfigs[slug] = configs[slug];
    }
  });
  
  // Then add any remaining configs (shouldn't happen, but just in case)
  Object.keys(configs).forEach(slug => {
    if (!orderedConfigs[slug]) {
      orderedConfigs[slug] = configs[slug];
    }
  });
  
  return orderedConfigs;
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
  // Process each config to ensure proper structure (sheet data should already be in snake_case)
  const processedConfigs = {};
  for (const [slug, config] of Object.entries(configs)) {
    // Start with the original config (preserves all fields from sheet, including new columns)
    const processed = { ...config };
    
    // Apply field mappings (handles both old camelCase and new snake_case formats)
    // Use nullish coalescing (??) to preserve empty strings, only use fallback for null/undefined
    processed.name = config.name ?? config.businessName ?? '';
    processed.category = config.category ?? config.businessCategory ?? '';
    processed.place_id = config.place_id ?? config.googlePlaceId ?? '';
    processed.google_maps_url = config.google_maps_url ?? config.googleMapsUrl ?? '';
    processed.hero_image = config.hero_image ?? config.heroImageUrl ?? '';
    processed.logo_url = config.logo_url ?? config.logoUrl ?? '';
    
    // Helper to convert numeric booleans (1/0 from sheets) to boolean
    const toBoolean = (value) => {
      if (value === true || value === false) return value;
      if (value === 1 || value === '1') return true;
      if (value === 0 || value === '0') return false;
      return value !== undefined ? Boolean(value) : true; // default to true if undefined
    };
    
    // Helper to get value or default (handles empty strings as missing)
    const getValueOrDefault = (value, defaultValue) => {
      if (value === null || value === undefined || value === '') {
        return defaultValue;
      }
      return value;
    };
    
    // Helper for numeric fields - treats 0 as empty (since empty sheet cells become 0)
    const getNumericOrDefault = (value, defaultValue) => {
      const numValue = value !== null && value !== undefined && value !== '' ? Number(value) : null;
      if (numValue === null || numValue === 0 || isNaN(numValue)) {
        return defaultValue;
      }
      return numValue;
    };
    
    // Helper for boolean fields - treats false/0 as empty when coming from potentially empty sheet cells
    // Only applies default if value is explicitly undefined/null/empty, not if explicitly set to false
    const getBooleanOrDefault = (value, defaultValue) => {
      if (value === null || value === undefined || value === '') {
        return defaultValue;
      }
      // If explicitly set (even to false/0), use that value
      return toBoolean(value);
    };
    
    // Handle discount fields - convert "yes"/"no" to boolean
    const discountEnabledRaw = config.discount_enabled ?? config.discount?.enabled;
    const discountEnabledStr = String(discountEnabledRaw || '').toLowerCase().trim();
    
    if (discountEnabledStr === 'yes') {
      processed.discount_enabled = true;
    } else if (discountEnabledStr === 'no') {
      processed.discount_enabled = false;
    } else {
      // Empty, null, undefined, or anything else → use default (true)
      processed.discount_enabled = DEFAULT_CONFIG.discount_enabled;
    }
    
    // For numeric fields, treat 0 as empty (empty sheet cells become 0)
    processed.discount_percentage = getNumericOrDefault(
      config.discount_percentage ?? config.discount?.percentage,
      DEFAULT_CONFIG.discount_percentage
    );
    
    processed.discount_valid_days = getNumericOrDefault(
      config.discount_valid_days ?? config.discount?.validDays,
      DEFAULT_CONFIG.discount_valid_days
    );
    
    // Handle referral fields - convert "yes"/"no" to boolean
    const referralEnabledRaw = config.referral_enabled ?? config.referral?.enabled;
    const referralEnabledStr = String(referralEnabledRaw || '').toLowerCase().trim();
    
    if (referralEnabledStr === 'yes') {
      processed.referral_enabled = true;
    } else if (referralEnabledStr === 'no') {
      processed.referral_enabled = false;
    } else {
      // Empty, null, undefined, or anything else → use default (true)
      processed.referral_enabled = DEFAULT_CONFIG.referral_enabled;
    }
    
    processed.referral_message = getValueOrDefault(
      config.referral_message ?? config.referral?.message,
      DEFAULT_CONFIG.referral_message
    );
    
    // Handle internal fields (preserve or set defaults)
    processed.google_review_base_url = config.google_review_base_url ?? config.googleReviewBaseUrl ?? 'https://search.google.com/local/writereview?placeid=';
    processed.google_review_url = config.google_review_url ?? config.googleReviewUrl ?? '';
    processed.sheet_script_url = getValueOrDefault(
      config.sheet_script_url ?? config.sheetScriptUrl,
      DEFAULT_CONFIG.sheet_script_url
    );
    
    // Handle min_review (review threshold) - treat 0 as empty
    processed.min_review = getNumericOrDefault(
      config.min_review ?? config.review_threshold,
      DEFAULT_CONFIG.min_review
    );
    
    // Clean up old field names (remove camelCase versions if they exist)
    delete processed.businessName;
    delete processed.businessCategory;
    delete processed.googlePlaceId;
    delete processed.googleMapsUrl;
    delete processed.heroImageUrl;
    delete processed.logoUrl;
    delete processed.googleReviewBaseUrl;
    delete processed.googleReviewUrl;
    delete processed.sheetScriptUrl;
    delete processed.discount; // Remove nested discount object if it exists
    delete processed.referral; // Remove nested referral object if it exists
    
    processedConfigs[slug] = processed;
  }
  
  const template = `// Multi-tenant configs - updated: ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - Run 'node sync-config.js' to update from Google Sheets
window.REVIEW_CONFIGS = ${JSON.stringify(processedConfigs, null, 2)};

// Resolve slug from URL and set the active config
(function() {
  const resolveSlug = () => {
    const qp = new URL(window.location.href).searchParams.get("biz");
    if (qp) return qp.toLowerCase();
    
    const parts = window.location.hostname.split(".");
    if (parts.length > 2) {
      const subdomain = parts[0].toLowerCase();
      // Only ignore obvious Vercel auto-generated subdomains (long random alphanumeric hashes)
      // Allow all business slugs, including those with 3 segments like "friseursalon-anke-krichel"
      // Vercel pattern: very long segments (10+ chars) with numbers, like "abc123def456-ghi789jkl012-mno345pqr678"
      const isVercelPattern = /^[a-z0-9]{10,}-[a-z0-9]{10,}/.test(subdomain) && /\\d/.test(subdomain);
      if (!isVercelPattern) {
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
  
  if (slugArgs.length > 0) {
    // Specific slugs provided via command line
    slugsToFetch = slugArgs;
    console.log(`Fetching specific slugs: ${slugsToFetch.join(', ')}\n`);
    
    // Load existing configs to merge with
    existingConfigs = readExistingConfigs();
    console.log(`Loaded ${Object.keys(existingConfigs).length} existing config(s)\n`);
    
    const newConfigs = await fetchConfigs(slugsToFetch);
  } else {
    // No arguments: fetch ALL configs from Google Sheet
    console.log(`Fetching all configs from Google Sheet...\n`);
    
    const allConfigs = await fetchAllConfigs();
    
    if (Object.keys(allConfigs).length === 0) {
      console.error('\n✗ No configs fetched. Please check your Google Sheet and Apps Script.');
      process.exit(1);
    }
    
    // Sort to match DEFAULT_SLUGS order (for consistency)
    const sortedConfigs = sortConfigsBySheetOrder(allConfigs, DEFAULT_SLUGS);
    generateConfigFile(sortedConfigs);
    
    console.log(`\n✓ Config sync complete!`);
    console.log(`✓ Updated ${Object.keys(allConfigs).length} business(es)`);
    console.log(`✓ Total businesses in config: ${Object.keys(sortedConfigs).length}`);
    
    if (shouldDeploy) {
      console.log('\n🚀 Deploying to production...');
      try {
        // Check if there are changes to commit
        execSync('git diff --quiet config.js', { stdio: 'ignore' });
        console.log('ℹ️  No changes to deploy');
      } catch (error) {
        // There are changes, proceed with commit and push
        try {
          execSync('git add config.js', { stdio: 'inherit' });
          execSync(`git commit -m "Update all configs from Google Sheet"`, { stdio: 'inherit' });
          execSync('git push', { stdio: 'inherit' });
          console.log('\n✅ Deployed successfully!');
          console.log('⏳ Vercel will deploy in 2-3 minutes');
        } catch (deployError) {
          console.error('\n❌ Deployment failed:', deployError.message);
          process.exit(1);
        }
      }
    } else {
      console.log('\nNext steps:');
      console.log('  1. Review the changes: git diff config.js');
      console.log('  2. Deploy: node sync-config.js --deploy');
      console.log('  OR manually: git add config.js && git commit -m "Update configs" && git push');
    }
    
    return; // Exit early for the "fetch all" case
  }
  
  const newConfigs = await fetchConfigs(slugsToFetch);
  
  if (Object.keys(newConfigs).length === 0) {
    console.error('\n✗ No configs fetched. Please check your Google Sheet and Apps Script.');
    process.exit(1);
  }
  
  // Merge: new configs override existing ones
  const mergedConfigs = { ...existingConfigs, ...newConfigs };
  
  // Sort to match sheet order
  const allConfigs = sortConfigsBySheetOrder(mergedConfigs, slugsToFetch);
  
  generateConfigFile(allConfigs);
  
  console.log(`\n✓ Config sync complete!`);
  console.log(`✓ Updated ${Object.keys(newConfigs).length} business(es)`);
  console.log(`✓ Total businesses in config: ${Object.keys(allConfigs).length}`);
  
  if (shouldDeploy) {
    console.log('\n🚀 Deploying to production...');
    try {
      // Check if there are changes to commit
      execSync('git diff --quiet config.js', { stdio: 'ignore' });
      console.log('ℹ️  No changes to deploy');
    } catch (error) {
      // There are changes, proceed with commit and push
      try {
        const slugList = slugArgs.length > 0 ? slugArgs.join(', ') : 'all configs';
        execSync('git add config.js', { stdio: 'inherit' });
        execSync(`git commit -m "Update configs: ${slugList}"`, { stdio: 'inherit' });
        execSync('git push', { stdio: 'inherit' });
        console.log('\n✅ Deployed successfully!');
        console.log('⏳ Vercel will deploy in 2-3 minutes');
      } catch (deployError) {
        console.error('\n❌ Deployment failed:', deployError.message);
        process.exit(1);
      }
    }
  } else {
    console.log('\nNext steps:');
    console.log('  1. Review the changes: git diff config.js');
    console.log('  2. Deploy: node sync-config.js --deploy');
    console.log('  OR manually: git add config.js && git commit -m "Update configs" && git push');
  }
})();
