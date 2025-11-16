/**
 * Fetch business details from Google Maps API (client-facing)
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
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }
    const parsed = parseMapsUrlDetails(mapsUrl);
    const placeIdFromUrl = extractPlaceIdFromUrl(mapsUrl);
    if (placeIdFromUrl) {
      const businessDetails = await fetchPlaceDetails(placeIdFromUrl, apiKey);
      return res.status(200).json(businessDetails);
    }
    const businessDetails = await searchPlaceByText(parsed, apiKey);
    return res.status(200).json(businessDetails);
  } catch (error) {
    console.error('Error in maps API:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch business details' 
    });
  }
}

function parseMapsUrlDetails(url) {
  const result = { searchName: '', latitude: null, longitude: null };
  if (!url) return result;
  try {
    const decoded = decodeURIComponent(url);
    const nameMatch = decoded.match(/\/maps\/place\/([^/]+)/i);
    if (nameMatch?.[1]) {
      result.searchName = nameMatch[1].replace(/\+/g, ' ').replace(/-/g, ' ').trim();
    }
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

function extractPlaceIdFromUrl(url) {
  try {
    const placeIdMatch1 = url.match(/place_id:([A-Za-z0-9_-]+)/);
    if (placeIdMatch1) return placeIdMatch1[1];
    const placeIdMatch2 = url.match(/!1s0x([A-Za-z0-9_-]+)/);
    if (placeIdMatch2) return null;
    return null;
  } catch (error) {
    console.error('Error extracting Place ID:', error);
    return null;
  }
}

async function fetchPlaceDetails(placeId, apiKey) {
  try {
    const fields = 'place_id,name,formatted_address,types,photos,url,geometry';
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`;
    const response = await fetch(detailsUrl);
    if (!response.ok) throw new Error(`Places API error: ${response.status}`);
    const data = await response.json();
    if (data.status !== 'OK' || !data.result) throw new Error(data.error_message || 'Business not found in Google Places');
    const place = data.result;
    const category = place.types && place.types.length > 0 ? formatCategory(place.types[0]) : 'Business';
    let heroImage = null;
    if (place.photos && place.photos.length > 0) {
      const photoReference = place.photos[0].photo_reference;
      const photoUrlWithKey = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${apiKey}`;
      heroImage = await resolvePhotoUrl(photoUrlWithKey);
      if (!heroImage) heroImage = null;
    }
    return {
      placeId: place.place_id,
      name: place.name,
      category,
      mapsUrl: place.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      heroImage,
      address: place.formatted_address || ''
    };
  } catch (error) {
    console.error('Error fetching place details:', error);
    throw error;
  }
}

async function searchPlaceByText(parsed, apiKey) {
  try {
    const textQuery = parsed.searchName || 'business';
    let searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(textQuery)}&key=${apiKey}`;
    if (parsed.latitude && parsed.longitude) {
      searchUrl += `&location=${parsed.latitude},${parsed.longitude}&radius=500`;
    }
    const response = await fetch(searchUrl);
    if (!response.ok) throw new Error(`Places API error: ${response.status}`);
    const data = await response.json();
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(data.error_message || 'Business not found in Google Places');
    }
    const place = data.results[0];
    const placeId = place.place_id;
    return await fetchPlaceDetails(placeId, apiKey);
  } catch (error) {
    console.error('Error searching place by text:', error);
    throw error;
  }
}

function formatCategory(type) {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function resolvePhotoUrl(photoUrl) {
  if (photoUrl.includes('&key=') || photoUrl.includes('?key=')) {
    console.warn('Photo URL contains API key, attempting resolution...');
  }
  const maxRetries = 3;
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(photoUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
      if (response.ok && response.url) {
        const resolvedUrl = response.url;
        if (resolvedUrl.includes('&key=') || resolvedUrl.includes('?key=')) return null;
        if (resolvedUrl.includes('lh3.googleusercontent.com')) return resolvedUrl;
        console.warn('Resolved URL is not lh3.googleusercontent.com:', resolvedUrl);
        return resolvedUrl;
      }
    } catch (error) {
      lastError = error;
      console.warn(`Photo URL resolution attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  console.error('Failed to resolve photo URL after all retries:', lastError?.message);
  if (photoUrl.includes('&key=') || photoUrl.includes('?key=')) return null;
  console.warn('Returning unresolved URL (no API key detected):', photoUrl);
  return photoUrl;
}



