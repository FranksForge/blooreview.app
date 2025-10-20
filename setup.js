(() => {
  const el = (id) => document.getElementById(id);
  const mapsUrlInput = el("maps-url");
  const nameInput = el("business-name-input");
  const apiKeyInput = el("api-key");
  const resolveBtn = el("resolve");
  const copyBtn = el("copy-snippet");
  const errorEl = el("setup-error");
  const results = el("results");
  const placeIdDisplay = el("place-id-display");
  const nameDisplay = el("name-display");
  const categoryDisplay = el("category-display");
  const reviewLinkDisplay = el("review-link-display");
  const mapUrlDisplay = el("map-url-display");
  const configSnippet = el("config-snippet");
  const debugPre = el("debug-log");

  const REVIEW_BASE = "https://search.google.com/local/writereview?placeid=";

  const TYPE_CATEGORY_MAP = {
    grocery_or_supermarket: "Grocery",
    supermarket: "Grocery",
    convenience_store: "Grocery",
    hypermarket: "Hypermarket",
    department_store: "Retail",
    shopping_mall: "Retail",
    store: "Retail",
    electronics_store: "Retail",
    clothing_store: "Retail",
    jewelry_store: "Retail",
    furniture_store: "Retail",
    home_goods_store: "Retail",
    restaurant: "Restaurant",
    meal_takeaway: "Restaurant",
    meal_delivery: "Restaurant",
    cafe: "Coffee Shop",
    bakery: "Coffee Shop",
    bar: "Restaurant",
    beauty_salon: "Salon",
    hair_care: "Salon",
    spa: "Spa",
    gym: "Fitness",
    health: "Fitness",
    doctor: "Health",
    dentist: "Health",
    auto_repair: "Auto Repair",
    car_dealer: "Auto",
    lodging: "Hotel",
    hotel: "Hotel"
  };

  const debug = (...args) => {
    console.debug("[Setup]", ...args);
    if (debugPre) {
      const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2))).join(" ");
      debugPre.textContent += `${line}\n`;
    }
  };

  const setError = (msg) => {
    errorEl.textContent = msg || "";
  };

  const sanitize = (s) => (typeof s === "string" ? s.trim() : "");

  const parseMapsUrlDetails = (url) => {
    const result = { searchName: "", latitude: null, longitude: null };
    if (!url) return result;
    try {
      const decoded = decodeURIComponent(url);
      const nameMatch = decoded.match(/\/maps\/place\/([^/]+)/i);
      if (nameMatch?.[1]) {
        result.searchName = nameMatch[1].replace(/\+/g, " ").replace(/-/g, " ").trim();
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
      debug("parse error", e);
    }
    return result;
  };

  let sdkPromise = null;
  const loadSdk = (apiKey) => {
    if (window.google?.maps?.places?.Place) return Promise.resolve();
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const cb = "__initSetupPlaces__";
      const script = document.createElement("script");
      script.src =
        "https://maps.googleapis.com/maps/api/js?" +
        `key=${encodeURIComponent(apiKey)}` +
        "&libraries=places&loading=async&v=beta" +
        `&callback=${cb}`;
      script.async = true;
      script.defer = true;
      window[cb] = () => {
        delete window[cb];
        if (window.google?.maps?.places?.Place) {
          debug("SDK loaded");
          resolve();
        } else {
          sdkPromise = null;
          reject(new Error("Places API not available (Place)."));
        }
      };
      script.onerror = () => {
        sdkPromise = null;
        reject(new Error("Failed loading Maps JS SDK"));
      };
      document.head.appendChild(script);
    });
    return sdkPromise;
  };

  let placesLibPromise = null;
  const placesLib = async () => {
    if (!placesLibPromise) {
      placesLibPromise = window.google.maps.importLibrary("places");
    }
    return placesLibPromise;
  };

  const searchByText = async (textQuery, bias) => {
    const { Place } = await placesLib();
    const params = {
      textQuery,
      fields: ["id", "displayName", "primaryType", "types", "formattedAddress"]
    };
    if (bias?.lat != null && bias?.lng != null) {
      params.locationBias = { circle: { center: { lat: bias.lat, lng: bias.lng }, radius: 500 } };
    }
    debug("searchByText", params);
    const res = await Place.searchByText(params);
    debug("searchByText response", res);
    return res?.places?.[0] || null;
  };

  const searchNearby = async (lat, lng) => {
    const { Place, PlaceSearchNearbyRankPreference } = await placesLib();
    const params = {
      locationRestriction: { circle: { center: { lat, lng }, radius: 500 } },
      fields: ["id", "displayName", "primaryType", "types", "formattedAddress"],
      rankPreference: PlaceSearchNearbyRankPreference?.POPULARITY
    };
    debug("searchNearby", params);
    const res = await Place.searchNearby(params);
    debug("searchNearby response", res);
    return res?.places?.[0] || null;
  };

  const fetchDetails = async (id) => {
    const { Place } = await placesLib();
    const place = new Place({ id });
    debug("fetchFields for", id);
    await place.fetchFields({
      fields: [
        "id",
        "displayName",
        "primaryType",
        "types",
        "formattedAddress",
        "rating",
        "userRatingCount"
      ]
    });
    debug("fetchFields response", place);
    return place;
  };

  const toCategory = (types = [], primaryType = "") => {
    const all = [primaryType, ...types].filter(Boolean);
    for (const t of all) {
      if (TYPE_CATEGORY_MAP[t]) return TYPE_CATEGORY_MAP[t];
    }
    if (all.length) {
      return all[0].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "";
  };

  const buildSnippet = ({ name, category, placeId, mapUrl }) => `// Paste into config.js
window.REVIEW_TOOL_CONFIG = {
  // ...existing fields
  businessName: ${JSON.stringify(name)},
  businessCategory: ${JSON.stringify(category)},
  googlePlaceId: ${JSON.stringify(placeId)},
  googleMapsUrl: ${JSON.stringify(mapUrl)}
};`;

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      debug("Copied to clipboard");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
      debug("Copied using fallback");
    }
  };

  resolveBtn.addEventListener("click", async () => {
    debugPre.textContent = "";
    setError("");
    results.classList.add("hidden");

    const mapUrl = sanitize(mapsUrlInput.value);
    const apiKey = sanitize(apiKeyInput.value);
    const nameHint = sanitize(nameInput.value);

    if (!mapUrl || !apiKey) {
      setError("Please provide both the Google Maps URL and an API key.");
      return;
    }

    try {
      await loadSdk(apiKey);
    } catch (e) {
      setError(e.message);
      return;
    }

    const parsed = parseMapsUrlDetails(mapUrl);
    debug({ parsed });

    const queries = [nameHint, parsed.searchName, mapUrl]
      .map(sanitize)
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i);

    let summary = null;
    for (const q of queries) {
      try {
        summary = await searchByText(q, {
          lat: parsed.latitude,
          lng: parsed.longitude
        });
        if (summary?.id) break;
      } catch (e) {
        debug("searchByText error for", q, e);
      }
    }

    if (!summary?.id && parsed.latitude != null) {
      summary = await searchNearby(parsed.latitude, parsed.longitude);
    }

    if (!summary?.id) {
      setError("Could not resolve a Place ID. Try a clearer name or a different Maps URL.");
      return;
    }

    const details = await fetchDetails(summary.id);
    const displayName = details.displayName?.text || summary.displayName?.text || nameHint || parsed.searchName || "";
    const category = toCategory(details.types || [], details.primaryType || "");
    const reviewUrl = `${REVIEW_BASE}${encodeURIComponent(summary.id)}`;

    placeIdDisplay.textContent = summary.id;
    nameDisplay.textContent = displayName;
    categoryDisplay.textContent = category;
    reviewLinkDisplay.textContent = reviewUrl;
    mapUrlDisplay.textContent = mapUrl;

    const snippet = buildSnippet({ name: displayName, category, placeId: summary.id, mapUrl });
    configSnippet.textContent = snippet;
    results.classList.remove("hidden");
  });

  copyBtn.addEventListener("click", async () => {
    if (!configSnippet.textContent) return;
    await copyText(configSnippet.textContent);
  });
})();

