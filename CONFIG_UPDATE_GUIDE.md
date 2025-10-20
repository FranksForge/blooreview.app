# Config Update Guide

## Quick Reference

### Update Business Configs

```bash
# 1. Edit your Google Sheet (Review_config)
# 2. Run sync command
node sync-config.js

# 3. Review changes
git diff config.js

# 4. Deploy
git add config.js && git commit -m "Update configs" && git push
```

### One-Line Update (Quick)

```bash
node sync-config.js && git add config.js && git commit -m "Update configs" && git push
```

---

## Detailed Workflow

### Step 1: Edit Google Sheet
1. Open **"Review_config"** Google Sheet
2. Edit any business row (e.g., change Starbucks discount from 15% to 20%)
3. Google Sheets auto-saves

### Step 2: Sync to Local
```bash
cd /Users/franksforge/Forge/GoogleBusinessBooster/ReviewDemo
node sync-config.js
```

**Output:**
```
Syncing configs from Google Sheet...
✓ Fetched config for: bigc-donchan
✓ Fetched config for: starbucks-123
✓ Fetched config for: default
✓ Config file updated: config.js
✓ Config sync complete!
```

### Step 3: Review Changes
```bash
git diff config.js
```

This shows exactly what changed in the config file.

### Step 4: Deploy to Production
```bash
git add config.js
git commit -m "Update Starbucks discount to 20%"
git push
```

Vercel automatically deploys in ~2 minutes.

### Step 5: Verify Live
Visit `https://starbucks-123.franksforge.com` and confirm changes are live.

---

## Adding New Businesses

### In Google Sheet
1. Add new row to **"Review_config"** sheet
2. Fill in all required fields:
   - `slug`: URL-friendly identifier (e.g., `mcdonalds-456`)
   - `businessName`: Display name
   - `businessCategory`: Category
   - `googlePlaceId`: From Google Maps
   - `discount_percentage`, `discount_validDays`, etc.

### Update Sync Script
Edit `sync-config.js` line 31 to include new slug:
```javascript
const slugs = ['bigc-donchan', 'starbucks-123', 'default', 'mcdonalds-456'];
```

### Sync and Deploy
```bash
node sync-config.js && git add . && git commit -m "Add McDonald's config" && git push
```

### Test
Visit `https://mcdonalds-456.franksforge.com`

---

## Troubleshooting

### Sync fails with "Invalid JSON"
- Check if Apps Script is deployed correctly
- Test endpoint in browser: `https://script.google.com/.../exec?slug=bigc-donchan`
- Should return JSON, not HTML

### Config not updating on site
- Wait 2-3 minutes for Vercel deploy
- Hard refresh browser (Cmd+Shift+R on Mac)
- Check console for "Config loaded for slug: ..."

### Wrong business shows up
- Check subdomain matches slug exactly
- Slug should be lowercase, no special chars except hyphens
- Example: `bigc-donchan`, not `BigC-DonChan`

---

## Architecture

**Config Management:**
- **Source**: Google Sheet "Review_config"
- **API**: Apps Script Web App (GET endpoint)
- **Static File**: `config.js` (committed to git)
- **Sync**: Manual command (`node sync-config.js`)

**Review Submission:**
- **API**: Apps Script Web App (POST endpoint)
- **Storage**: Google Sheet "Review Booster Data" (separate tabs per business)
- **Real-time**: Every review submission hits the API

**Benefits:**
- ✅ Fast page loads (configs cached by CDN)
- ✅ No API calls for config on every visit
- ✅ Git history of config changes
- ✅ Control when updates go live
- ✅ Easy rollback if needed

