/**
 * Serverless function to fetch business details from Google Maps API
 * POST /api/admin/maps
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mapsUrl } = req.body;

    if (!mapsUrl) {
      return res.status(400).json({ error: 'Google Maps URL is required' });
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    // Parse Maps URL to extract business information
    const parsed = parseMapsUrlDetails(mapsUrl);

    // Extract Place ID from URL if present
    const placeIdFromUrl = extractPlaceIdFromUrl(mapsUrl);
    
    if (placeIdFromUrl) {
      // If Place ID is in URL, fetch details directly
      const businessDetails = await fetchPlaceDetails(placeIdFromUrl, apiKey);
      return res.status(200).json(businessDetails);
    }

    // Otherwise, search by text
    const businessDetails = await searchPlaceByText(parsed, apiKey);

    return res.status(200).json(businessDetails);
  } catch (error) {
    console.error('Error in maps API:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch business details' 
    });
  }
}

/**
 * Parse Google Maps URL to extract business information
 */
function parseMapsUrlDetails(url) {
  const result = { 
    searchName: '', 
    latitude: null, 
    longitude: null 
  };

  if (!url) return result;

  try {
    const decoded = decodeURIComponent(url);
    
    // Extract business name from URL
    const nameMatch = decoded.match(/\/maps\/place\/([^/]+)/i);
    if (nameMatch?.[1]) {
      result.searchName = nameMatch[1]
        .replace(/\+/g, ' ')
        .replace(/-/g, ' ')
        .trim();
    }

    // Extract coordinates
    const precise = decoded.match(/!8m2!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (precise) {
      result.latitude = Number(precise[1]);
      result.longitude = Number(precise[2]);
    } else {
      const at = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (at) {
        result.latitude = Number(at[1]);
        result.longitude = Number(at[2]);
      }
    }
  } catch (e) {
    console.error('Error parsing Maps URL:', e);
  }

  return result;
}

/**
 * Extract Place ID from Google Maps URL
 */
function extractPlaceIdFromUrl(url) {
  try {
    // Try to extract Place ID from URL patterns
    // Pattern 1: /place_id:ChIJ...
    const placeIdMatch1 = url.match(/place_id:([A-Za-z0-9_-]+)/);
    if (placeIdMatch1) {
      return placeIdMatch1[1];
    }

    // Pattern 2: !1s0x... (Place ID in encoded format)
    const placeIdMatch2 = url.match(/!1s0x([A-Za-z0-9_-]+)/);
    if (placeIdMatch2) {
      // This is a coordinate-based ID, not a Place ID
      // We'll need to search by text instead
      return null;
    }

    return null;
  } catch (error) {
    console.error('Error extracting Place ID:', error);
    return null;
  }
}

/**
 * Fetch place details by Place ID using Places API
 */
async function fetchPlaceDetails(placeId, apiKey) {
  try {
    // Use Places API Details endpoint
    const fields = 'place_id,name,formatted_address,types,photos,url,geometry';
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`;

    const response = await fetch(detailsUrl);
    
    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK' || !data.result) {
      throw new Error(data.error_message || 'Business not found in Google Places');
    }

    const place = data.result;

    // Get category from types
    const category = place.types && place.types.length > 0
      ? formatCategory(place.types[0])
      : 'Business';

    // Get hero image (first photo)
    let heroImage = null;
    if (place.photos && place.photos.length > 0) {
      const photoReference = place.photos[0].photo_reference;
      const photoUrlWithKey = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${apiKey}`;
      // Resolve to final URL (must not contain API key)
      heroImage = await resolvePhotoUrl(photoUrlWithKey);
      
      // If resolution failed, don't store URL with API key
      if (!heroImage) {
        console.warn('Failed to resolve hero image URL - skipping hero image');
        heroImage = null;
      }
    }

    return {
      placeId: place.place_id,
      name: place.name,
      category: category,
      mapsUrl: place.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      heroImage: heroImage,
      address: place.formatted_address || ''
    };
  } catch (error) {
    console.error('Error fetching place details:', error);
    throw error;
  }
}

/**
 * Search for place by text using Places API
 */
async function searchPlaceByText(parsed, apiKey) {
  try {
    const textQuery = parsed.searchName || 'business';
    let searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(textQuery)}&key=${apiKey}`;

    // Add location bias if coordinates are available
    if (parsed.latitude && parsed.longitude) {
      searchUrl += `&location=${parsed.latitude},${parsed.longitude}&radius=500`;
    }

    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(data.error_message || 'Business not found in Google Places');
    }

    const place = data.results[0];
    const placeId = place.place_id;

    // Fetch full details
    return await fetchPlaceDetails(placeId, apiKey);
  } catch (error) {
    console.error('Error searching place by text:', error);
    throw error;
  }
}

/**
 * Format category from Places API type
 */
function formatCategory(type) {
  // Convert snake_case to Title Case
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Resolve photo URL to final lh3 URL (follow redirect)
 * Never returns a URL containing an API key - returns null if resolution fails
 */
async function resolvePhotoUrl(photoUrl) {
  // Safety check: never return URLs with API keys
  if (photoUrl.includes('&key=') || photoUrl.includes('?key=')) {
    console.warn('Photo URL contains API key, attempting resolution...');
  }

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Follow redirect to get final URL
      const response = await fetch(photoUrl, {
        method: 'HEAD',
        redirect: 'follow',
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok && response.url) {
        const resolvedUrl = response.url;
        
        // Safety check: ensure resolved URL doesn't contain API key
        if (resolvedUrl.includes('&key=') || resolvedUrl.includes('?key=')) {
          console.error('Resolved URL still contains API key, rejecting');
          return null;
        }

        // Ensure it's a valid lh3.googleusercontent.com URL
        if (resolvedUrl.includes('lh3.googleusercontent.com')) {
          return resolvedUrl;
        }

        // If it's not an lh3 URL but also doesn't have a key, it might be valid
        // But log it for investigation
        console.warn('Resolved URL is not lh3.googleusercontent.com:', resolvedUrl);
        return resolvedUrl;
      }
    } catch (error) {
      lastError = error;
      console.warn(`Photo URL resolution attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // All retries failed - never return URL with API key
  console.error('Failed to resolve photo URL after all retries:', lastError?.message);
  
  // Check if original URL contains API key
  if (photoUrl.includes('&key=') || photoUrl.includes('?key=')) {
    console.error('Cannot return URL with API key - returning null');
    return null;
  }

  // If original URL doesn't have a key, it might be safe to return
  // But log it as it shouldn't happen in normal flow
  console.warn('Returning unresolved URL (no API key detected):', photoUrl);
  return photoUrl;
}

