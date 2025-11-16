# Google Maps API Key Setup Guide

This guide will help you create a new Google Maps API key with proper restrictions and replace the old one.

## Step 1: Create New API Key in Google Cloud Console

Based on the form you're seeing in Google Cloud Console:

### 1.1 Name the API Key
- **Name**: Enter a descriptive name (e.g., "BlooReview Places API Key")
- Use a unique name to identify this API key

### 1.2 Application Restrictions (Recommended for Security)
Select one of these options based on your deployment:

**For Vercel Serverless Functions (Recommended):**
- Select **"IP addresses"** 
- Add Vercel's serverless function IP ranges (you may need to allow all initially for testing, then restrict later)
- OR select **"None"** if you want to test first (less secure)

**For Local Development:**
- Select **"None"** for local testing with `.env.local`

**Best Practice:**
- Start with **"None"** to test
- Once working, switch to **"IP addresses"** and add Vercel IP ranges

### 1.3 API Restrictions (CRITICAL - Required for Security)
- Select **"Restrict key"**
- Click **"Restrict key"**
- In the API selection list, check ONLY these APIs:
  - ✅ **Places API** (required for business lookup)
  - ✅ **Places API (New)** (if available, use this instead)
  - ✅ **Geocoding API** (if you use address conversion)
  - ✅ **Maps JavaScript API** (only if using client-side maps)
  
**DO NOT enable:**
- ❌ Maps Embed API
- ❌ Routes API
- ❌ Distance Matrix API
- ❌ Any other APIs you don't need

This restricts your key to only the APIs your app uses, preventing abuse if the key is exposed.

### 1.4 Service Account (Optional)
- **Leave unchecked** unless you're using Vertex AI or other service account features
- For BlooReview, you don't need this

### 1.5 Create the Key
- Click **"Create"**
- **IMPORTANT**: Copy the API key immediately - you won't be able to see it again!

The API key will look like: `AIzaSy...` (approximately 39 characters)

## Step 2: Test the New API Key Locally

### 2.1 Update Local Environment File
Create or update `.env.local` in your project root:

```bash
GOOGLE_MAPS_API_KEY=YOUR_NEW_API_KEY_HERE
```

### 2.2 Test Locally
Run your local server:
```bash
npm run dev:vercel
```

Test the Maps API endpoint:
```bash
curl -X POST http://localhost:3000/api/admin/maps \
  -H "Content-Type: application/json" \
  -d '{"mapsUrl": "https://www.google.com/maps/place/Bodenseeb%C3%A4r/@47.6741955,9.3156699"}'
```

Verify you get a successful response with business details.

## Step 3: Update Vercel Environment Variable

### 3.1 Access Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Navigate to your BlooReview project
3. Go to **Settings** → **Environment Variables**

### 3.2 Update GOOGLE_MAPS_API_KEY
1. Find `GOOGLE_MAPS_API_KEY` in the list
2. Click **Edit** (or **Add** if it doesn't exist)
3. Set the value to your **NEW** API key
4. Select all environments: **Production**, **Preview**, **Development**
5. Click **Save**

### 3.3 Redeploy
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **three dots** (⋮) → **Redeploy**
4. OR trigger a new deployment by pushing to Git

Wait 2-3 minutes for the deployment to complete.

## Step 4: Verify New Key Works in Production

Test the production API:
```bash
curl -X POST https://your-domain.vercel.app/api/admin/maps \
  -H "Content-Type: application/json" \
  -d '{"mapsUrl": "https://www.google.com/maps/place/Bodenseeb%C3%A4r/@47.6741955,9.3156699"}'
```

Or test via your admin UI at `/admin` - enter a Google Maps URL and verify it fetches business details.

## Step 5: Delete the Old API Key

**⚠️ IMPORTANT: Only delete the old key after confirming the new one works!**

### 5.1 Find the Old API Key
1. Go to Google Cloud Console
2. Navigate to **APIs & Services** → **Credentials**
3. Find your old API key in the list

### 5.2 Delete the Old Key
1. Click on the old API key name
2. Scroll to the bottom
3. Click **"Delete"** button
4. Confirm deletion in the dialog

### 5.3 Verify Deletion
- The old key should disappear from the credentials list
- Test that your app still works (it should, using the new key)

## Troubleshooting

### Error: "API key not valid"
- Check that you copied the entire key (39 characters)
- Verify the key is enabled in Google Cloud Console
- Check that Places API is enabled for your project

### Error: "This API project is not authorized to use this API"
1. Go to **APIs & Services** → **Library**
2. Search for **"Places API"**
3. Click on it
4. Click **"Enable"**

### Error: "API key restricted" 
- Check your IP address restrictions (may be too strict)
- Temporarily set to "None" to test, then add proper restrictions

### Error: "Quota exceeded"
- Check your Google Cloud billing
- Review usage in **APIs & Services** → **Dashboard**
- Consider setting up billing alerts

## Security Best Practices

1. ✅ **Always restrict APIs** - Only enable what you need
2. ✅ **Use IP restrictions** when possible - Especially for serverless functions
3. ✅ **Monitor usage** - Set up alerts in Google Cloud Console
4. ✅ **Rotate keys regularly** - Every 6-12 months
5. ✅ **Never commit keys** - Keep them in environment variables only
6. ✅ **Use separate keys** - One for dev, one for production if needed

## API Key Locations in Code

The `GOOGLE_MAPS_API_KEY` environment variable is used in:
- `api/admin/maps.js` - Line 18
- `api/business/maps.js` - Line 19

Both files check for the key and will return an error if it's missing:
```javascript
const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  return res.status(500).json({ error: 'Google Maps API key not configured' });
}
```

## Next Steps After Setup

1. ✅ Monitor API usage in Google Cloud Console
2. ✅ Set up billing alerts to prevent unexpected charges
3. ✅ Test all Maps API features (place search, details, photos)
4. ✅ Update your team about the new key if applicable

