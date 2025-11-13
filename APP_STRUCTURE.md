# App Structure

## Overview
This document describes the new SaaS app structure for BlooReview.

## Directory Structure

```
BlooReview/
├── admin/                    # Admin UI for business registration
│   ├── index.html           # Admin interface HTML
│   ├── admin.css            # Admin interface styles
│   └── admin.js             # Admin interface JavaScript
│
├── api/                      # Serverless API endpoints
│   ├── admin/               # Admin API endpoints
│   │   ├── maps.js          # Google Maps API integration
│   │   └── generate.js      # Business generation endpoint
│   ├── index.js             # Dynamic HTML injection (Open Graph)
│   ├── config.json          # Hero images mapping (auto-generated)
│   └── package.json         # API package configuration
│
├── public/                  # Public assets (served by Vercel)
│   ├── index.html          # Review page HTML template
│   ├── app.js              # Review page frontend logic
│   ├── styles.css          # Review page styles
│   ├── config.js           # Business configurations (auto-generated)
│   └── logo.png            # Logo image
├── vercel.json              # Vercel configuration
└── package.json             # Project dependencies
```

## Key Files

### Admin UI (`admin/`)

#### `admin/index.html`
- Admin interface for registering new businesses
- Form to input Google Maps URL
- Displays business details before generation
- Preview of generated review page URL

#### `admin/admin.js`
- Client-side JavaScript for admin interface
- Handles form submission
- Fetches business details from Maps API
- Generates review pages via API
- Shows preview URLs

#### `admin/admin.css`
- Modern, minimalist UI styles
- Responsive design
- Clean form layouts

### API Endpoints (`api/admin/`)

#### `api/admin/maps.js`
- **Endpoint**: `POST /api/admin/maps`
- **Purpose**: Fetch business details from Google Maps API
- **Input**: `{ mapsUrl: "https://www.google.com/maps/place/..." }`
- **Output**: `{ placeId, name, category, mapsUrl, heroImage, address }`
- **Features**:
  - Parses Google Maps URL
  - Extracts Place ID if present
  - Searches by text if Place ID not found
  - Fetches place details using Places API
  - Resolves hero image URLs

#### `api/admin/generate.js`
- **Endpoint**: `POST /api/admin/generate`
- **Purpose**: Generate business review page and update config files
- **Input**: `{ placeId, name, category, mapsUrl, heroImage }`
- **Output**: `{ slug, previewUrl, status, message }`
- **Features**:
  - Generates slug from business name
  - Handles slug collisions (appends numbers)
  - Reads existing configs from GitHub
  - Updates `config.js` with new business
  - Updates `api/config.json` with hero images
  - Commits changes to GitHub via API
  - Returns preview URL

### Configuration Files

#### `public/config.js`
- Auto-generated JavaScript file (DO NOT EDIT MANUALLY)
- Contains all business configurations
- Structure: `window.REVIEW_CONFIGS[slug] = { ... }`
- Includes slug resolution logic
- Updated via GitHub API when new businesses are added
- Single source of truth for Vercel deployment

#### `api/config.json`
- Auto-generated JSON file (DO NOT EDIT MANUALLY)
- Maps business slugs to hero image URLs
- Used by `api/index.js` for Open Graph meta tags
- Updated via GitHub API when new businesses are added

### Vercel Configuration

#### `vercel.json`
- Serverless function configurations
- Route definitions
- Admin routes: `/admin` → `/admin/index.html`
- API routes: `/api/admin/*` → `/api/admin/*`
- Root route: `/` → `/api/index`
- Cache headers for static assets

## Environment Variables

Required environment variables:

- `GOOGLE_MAPS_API_KEY` - Google Maps API key for Places API
- `GITHUB_TOKEN` - GitHub personal access token (for updating files)
- `GITHUB_REPO` - GitHub repository (format: `owner/repo`)
- `REVIEW_SCRIPT_URL` - Google Apps Script URL for review submissions (optional)

## Workflow

1. **Admin accesses admin UI** at `/admin`
2. **Admin enters Google Maps URL** in the form
3. **System fetches business details** via `/api/admin/maps`
4. **Admin reviews business details** (name, category, place ID, hero image)
5. **Admin clicks "Generate Review Page"**
6. **System generates slug** from business name
7. **System reads existing configs** from GitHub
8. **System updates config files** via GitHub API
9. **GitHub triggers Vercel deployment** automatically
10. **Review page becomes available** at `[slug].blooreview.app`

## GitHub API Integration

The generate API uses GitHub API to update files:

1. **Read existing files** from GitHub
2. **Update configs** in memory
3. **Get file SHA** from GitHub (required for updates)
4. **Update files** via GitHub API
5. **GitHub triggers Vercel deployment** automatically

## Deployment

- **Vercel**: Automatically deploys on Git push
- **GitHub**: Stores all configuration files
- **Domain**: `blooreview.app` (configured in Vercel)
- **Subdomains**: Each business gets a subdomain (e.g., `bodenseebaer.blooreview.app`)

## Next Steps

1. Set up environment variables in Vercel
2. Configure domain in Vercel
3. Set up wildcard DNS for subdomains
4. Test Maps API integration
5. Test business generation
6. Deploy to production

