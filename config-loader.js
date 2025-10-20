// config-loader.js
// Dynamically loads business configuration from Google Sheets by slug
(async function loadConfig() {
  const resolveSlug = () => {
    // Priority 1: Query parameter (for testing and explicit slugs)
    const qp = new URL(window.location.href).searchParams.get("biz");
    if (qp) return qp.toLowerCase();
    
    // Priority 2: Subdomain (but ignore Vercel's auto-generated subdomains)
    const parts = window.location.hostname.split(".");
    if (parts.length > 2) {
      const subdomain = parts[0].toLowerCase();
      // Ignore Vercel's auto-generated subdomains (contain random strings and numbers)
      // Keep business slugs like "bigc-donchan", "starbucks-123", etc.
      if (!subdomain.match(/^[a-z]+-[a-z0-9]+-[a-z0-9]+$/)) {
        return subdomain;
      }
    }
    
    return "default";
  };

  const loadConfigFromSheets = async (slug) => {
    try {
      // Use the same Apps Script Web App URL for configs
      const configUrl = "https://script.google.com/macros/s/AKfycbyFgxjgCPd6kLAo60D5NUspQWLnlKTjgfbbZ77XxsyZJSb_9Br1dD6-2ZDiOcvIFz5qmA/exec";
      const response = await fetch(`${configUrl}?slug=${slug}`);
      
      if (!response.ok) {
        throw new Error(`Config fetch failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.ok) {
        console.warn(`Config not found for slug: ${slug}, using default`);
        return null;
      }
      
      return result.config;
    } catch (error) {
      console.error("Failed to load config from Sheets:", error);
      return null;
    }
  };

  const fallbackConfig = {
    businessName: "Review Tool",
    businessCategory: "Business",
    googleMapsUrl: "",
    googlePlaceId: "",
    googleReviewBaseUrl: "https://search.google.com/local/writereview?placeid=",
    googleReviewUrl: "",
    sheetScriptUrl: "https://script.google.com/macros/s/AKfycbyFgxjgCPd6kLAo60D5NUspQWLnlKTjgfbbZ77XxsyZJSb_9Br1dD6-2ZDiOcvIFz5qmA/exec",
    discount: {
      enabled: true,
      percentage: 10,
      validDays: 30
    },
    referral: {
      enabled: true,
      message: "Invite your friends to also leave a review and get their own discount!"
    },
    logoUrl: "",
    heroImageUrl: ""
  };

  // Load config dynamically
  const slug = resolveSlug();
  console.log(`Loading config for slug: ${slug}`);
  
  const dynamicConfig = await loadConfigFromSheets(slug);
  const finalConfig = dynamicConfig || fallbackConfig;
  
  // Set the global config for the app to use
  window.REVIEW_TOOL_CONFIG = finalConfig;
  
  console.log("Config loaded:", finalConfig);
})();
