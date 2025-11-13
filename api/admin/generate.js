import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration values
const DEFAULT_CONFIG = {
  sheet_script_url: process.env.REVIEW_SCRIPT_URL || '',
  min_review: 5,
  discount_enabled: true,
  discount_percentage: 10,
  discount_valid_days: 30,
  referral_enabled: true,
  referral_message: "Lade deine Freunde ein sich Ihren eigenen Rabattcode zu holen!",
  google_review_base_url: "https://search.google.com/local/writereview?placeid=",
  google_review_url: "",
  logo_url: ""
};

/**
 * Serverless function to generate business review page
 * POST /api/admin/generate
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { placeId, name, category, mapsUrl, heroImage } = req.body;

    if (!placeId || !name) {
      return res.status(400).json({ error: 'Place ID and name are required' });
    }

    // Generate slug from business name
    const slug = generateSlug(name);

    // Read existing configs from GitHub
    const existingConfigs = await readConfigFile();

    // Check for slug collision
    const finalSlug = getUniqueSlug(slug, existingConfigs);

    // Create business config
    const businessConfig = {
      place_id: placeId,
      name: name,
      category: category || 'Business',
      google_maps_url: mapsUrl || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      hero_image: heroImage || '',
      logo_url: DEFAULT_CONFIG.logo_url,
      discount_enabled: DEFAULT_CONFIG.discount_enabled,
      discount_percentage: DEFAULT_CONFIG.discount_percentage,
      discount_valid_days: DEFAULT_CONFIG.discount_valid_days,
      referral_enabled: DEFAULT_CONFIG.referral_enabled,
      referral_message: DEFAULT_CONFIG.referral_message,
      google_review_base_url: DEFAULT_CONFIG.google_review_base_url,
      google_review_url: DEFAULT_CONFIG.google_review_url,
      sheet_script_url: DEFAULT_CONFIG.sheet_script_url,
      min_review: DEFAULT_CONFIG.min_review
    };

    // Add business to configs
    existingConfigs[finalSlug] = businessConfig;

    // Read existing api/config.json from GitHub
    const existingHeroImages = await readApiConfigFromGitHub();

    // Update hero images
    if (heroImage) {
      existingHeroImages[finalSlug] = heroImage;
    }

    // Generate config.js content
    const configContent = generateConfigFileContent(existingConfigs);
    
    // Update files on GitHub
    await commitAndPush(finalSlug, name, configContent, existingHeroImages);

    // Get base domain from request
    const hostname = req.headers.host || 'blooreview.app';
    let baseDomain = 'blooreview.app';
    
    // Extract base domain
    if (hostname.includes('admin.')) {
      baseDomain = hostname.replace('admin.', '');
    } else if (hostname.includes('.')) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        baseDomain = parts.slice(-2).join('.');
      }
    }
    
    const previewUrl = `https://${finalSlug}.${baseDomain}`;

    return res.status(200).json({
      slug: finalSlug,
      previewUrl: previewUrl,
      status: 'success',
      message: 'Review page generated successfully. Deployment will be triggered automatically.'
    });
  } catch (error) {
    console.error('Error in generate API:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate review page' 
    });
  }
}

/**
 * Generate slug from business name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Get unique slug (handle collisions)
 */
function getUniqueSlug(slug, existingConfigs) {
  if (!existingConfigs[slug]) {
    return slug;
  }

  let counter = 2;
  let uniqueSlug = `${slug}-${counter}`;
  
  while (existingConfigs[uniqueSlug]) {
    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Read existing config.js from GitHub
 */
async function readConfigFile() {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;

    if (!githubToken || !githubRepo) {
      // Fallback: try to read from local file (for development)
      try {
        const configPath = path.join(process.cwd(), 'config.js');
        if (fs.existsSync(configPath)) {
          const configContent = fs.readFileSync(configPath, 'utf8');
          const match = configContent.match(/window\.REVIEW_CONFIGS\s*=\s*(\{[\s\S]*?\});/);
          if (match) {
            return new Function('return ' + match[1])();
          }
        }
      } catch (error) {
        console.error('Error reading local config file:', error);
      }
      return {};
    }

    // Read from GitHub
    const [owner, repo] = githubRepo.split('/');
    const configContent = await readFileFromGitHub(owner, repo, 'config.js', githubToken);
    
    if (configContent) {
      // Extract REVIEW_CONFIGS object
      const match = configContent.match(/window\.REVIEW_CONFIGS\s*=\s*(\{[\s\S]*?\});/);
      if (match) {
        return new Function('return ' + match[1])();
      }
    }
    
    return {};
  } catch (error) {
    console.error('Error reading config file:', error);
    return {};
  }
}

/**
 * Read file from GitHub
 */
async function readFileFromGitHub(owner, repo, filePath, token) {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      // Decode base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      return content;
    } else if (response.status === 404) {
      // File doesn't exist yet
      return null;
    } else {
      throw new Error(`GitHub API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error reading file from GitHub:', error);
    return null;
  }
}

/**
 * Read api/config.json from GitHub
 */
async function readApiConfigFromGitHub() {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO;

    if (!githubToken || !githubRepo) {
      // Fallback: try to read from local file
      try {
        const apiConfigPath = path.join(process.cwd(), 'api', 'config.json');
        if (fs.existsSync(apiConfigPath)) {
          const content = fs.readFileSync(apiConfigPath, 'utf8');
          return JSON.parse(content);
        }
      } catch (error) {
        console.error('Error reading local API config:', error);
      }
      return {};
    }

    // Read from GitHub
    const [owner, repo] = githubRepo.split('/');
    const content = await readFileFromGitHub(owner, repo, 'api/config.json', githubToken);
    
    if (content) {
      return JSON.parse(content);
    }
    
    return {};
  } catch (error) {
    console.error('Error reading API config:', error);
    return {};
  }
}

/**
 * Generate config.js file content
 */
function generateConfigFileContent(configs) {
  const timestamp = new Date().toISOString();
  
  return `// Multi-tenant configs - updated: ${timestamp}
// DO NOT EDIT MANUALLY - Auto-generated by admin API
window.REVIEW_CONFIGS = ${JSON.stringify(configs, null, 2)};

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
}

/**
 * Commit and push to git using GitHub API
 * Note: In Vercel serverless functions, we need to use GitHub API
 * since we can't run git commands directly
 */
async function commitAndPush(slug, name, configContent, heroImages) {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO; // Format: owner/repo (e.g., username/repo)

    if (!githubToken || !githubRepo) {
      console.warn('GITHUB_TOKEN or GITHUB_REPO not set, skipping git commit');
      console.warn('Config generated but not committed to git');
      return;
    }

    // Get current file SHA from GitHub (required for update)
    const [owner, repo] = githubRepo.split('/');
    
    // Get config.js SHA
    const configSha = await getFileSha(owner, repo, 'config.js', githubToken);
    // Get public/config.js SHA (needed for Vercel deployment)
    const publicConfigSha = await getFileSha(owner, repo, 'public/config.js', githubToken);
    // Get api/config.json SHA
    const apiConfigSha = await getFileSha(owner, repo, 'api/config.json', githubToken);

    // Generate api/config.json content
    const apiConfigContent = JSON.stringify(heroImages, null, 2);

    // Update config.js (root directory - for local dev and source of truth)
    await updateFileOnGitHub(
      owner,
      repo,
      'config.js',
      configContent,
      configSha,
      `Auto-generate: Add ${name} (${slug})`,
      githubToken
    );

    // Update public/config.js (needed for Vercel deployment - serves from public/)
    await updateFileOnGitHub(
      owner,
      repo,
      'public/config.js',
      configContent,
      publicConfigSha,
      `Auto-generate: Add ${name} (${slug}) - Update public config for Vercel`,
      githubToken
    );

    // Update api/config.json
    await updateFileOnGitHub(
      owner,
      repo,
      'api/config.json',
      apiConfigContent,
      apiConfigSha,
      `Auto-generate: Add ${name} (${slug}) - Update hero images`,
      githubToken
    );

    console.log('Git commit and push completed via GitHub API');
  } catch (error) {
    console.error('Error committing to git:', error);
    // Don't throw error - git commit failure shouldn't block the response
  }
}

/**
 * Get file SHA from GitHub (required for updates)
 */
async function getFileSha(owner, repo, filePath, token) {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.sha;
    } else if (response.status === 404) {
      // File doesn't exist yet, return null
      return null;
    } else {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error getting file SHA:', error);
    return null;
  }
}

/**
 * Update file on GitHub using GitHub API
 */
async function updateFileOnGitHub(owner, repo, filePath, content, sha, message, token) {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    
    // Encode content as base64
    const contentBase64 = Buffer.from(content, 'utf8').toString('base64');

    const body = {
      message: message,
      content: contentBase64,
      branch: 'main'
    };

    // Include SHA if file exists (for update)
    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    console.log(`File ${filePath} updated on GitHub`);
  } catch (error) {
    console.error('Error updating file on GitHub:', error);
    throw error;
  }
}

