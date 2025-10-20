// config-loader.js
// Dynamically loads business configuration from Google Sheets by slug
(async function loadConfig() {
  // Prevent app.js from running until config is loaded
  window.configLoaded = false;
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
        console.warn(`Config not found for slug: ${slug}, using fallback`);
        return null;
      }
      
      return result.config;
    } catch (error) {
      console.error("Failed to load config from Sheets:", error);
      return null;
    }
  };

  // Static configs for testing (until Apps Script doGet is implemented)
  const staticConfigs = {
    "bigc-donchan": {
      businessName: "Big C Supercenter Chiang Mai Don Chan",
      businessCategory: "Hypermarket",
      googleMapsUrl: "https://www.google.com/maps/place/Big+C+Supercenter+Chiang+Mai+Don+Chan/@18.7689158,99.0326956,17z/data=!3m1!4b1!4m6!3m5!1s0x30da2ff2f600edbd:0x961a4eee12234361!8m2!3d18.7689158!4d99.0326956!16s%2Fg%2F1tjwl1zw",
      googlePlaceId: "ChIJ7_xbz-k62jARmU24rdBT2BI",
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
    },
    "starbucks-123": {
      businessName: "Starbucks Coffee Chiang Mai",
      businessCategory: "Coffee Shop",
      googleMapsUrl: "https://www.google.com/maps/place/Starbucks/@18.7889,98.9850,17z",
      googlePlaceId: "ChIJ1234567890abcdef",
      googleReviewBaseUrl: "https://search.google.com/local/writereview?placeid=",
      googleReviewUrl: "",
      sheetScriptUrl: "https://script.google.com/macros/s/AKfycbyFgxjgCPd6kLAo60D5NUspQWLnlKTjgfbbZ77XxsyZJSb_9Br1dD6-2ZDiOcvIFz5qmA/exec",
      discount: {
        enabled: true,
        percentage: 15,
        validDays: 30
      },
      referral: {
        enabled: true,
        message: "Share this review page with friends so they can also leave feedback and get their own discount!"
      },
      logoUrl: "",
      heroImageUrl: ""
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
  
  // Try Sheets first, then static configs, then fallback
  const dynamicConfig = await loadConfigFromSheets(slug);
  const staticConfig = staticConfigs[slug];
  const finalConfig = dynamicConfig || staticConfig || fallbackConfig;
  
  // Set the global config for the app to use
  window.REVIEW_TOOL_CONFIG = finalConfig;
  window.configLoaded = true;
  
  console.log("Config loaded:", finalConfig);
  console.log("Business Name:", finalConfig.businessName);
  console.log("Category:", finalConfig.businessCategory);
})();
