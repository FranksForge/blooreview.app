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
      heroImage = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${apiKey}`;
      // Resolve to final URL
      heroImage = await resolvePhotoUrl(heroImage);
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
 */
async function resolvePhotoUrl(photoUrl) {
  try {
    // Follow redirect to get final URL
    const response = await fetch(photoUrl, {
      method: 'HEAD',
      redirect: 'follow'
    });

    if (response.ok && response.url) {
      return response.url;
    }

    // Fallback: return original URL
    return photoUrl;
  } catch (error) {
    console.error('Error resolving photo URL:', error);
    // Fallback: return original URL
    return photoUrl;
  }
}

