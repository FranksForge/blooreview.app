(() => {
  const sanitizeString = (value) => (typeof value === "string" ? value.trim() : "");
  const sanitizeArray = (list) => [];

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

  const elements = {
    businessName: document.getElementById("business-name"),
    mainHeader: document.getElementById("main-header"),
    categoryLabel: document.getElementById("business-category-label"),
    mapsNote: document.getElementById("maps-note"),
    mapsLink: document.getElementById("maps-link"),
    googleLink: document.getElementById("google-link"),
    googleForward: document.getElementById("google-forward"),
    autoOpenNote: document.getElementById("auto-open-note"),
    ratingStep: document.getElementById("rating-step"),
    followupSection: document.getElementById("followup-step"),
    selectedRating: document.getElementById("selected-rating"),
    thankYou: document.getElementById("thank-you"),
    thankYouMessage: document.getElementById("thank-you-message"),
    feedbackForm: document.getElementById("feedback-form"),
    feedbackName: document.getElementById("feedback-name"),
    errorMessage: document.getElementById("form-error"),
    ratingInputs: Array.from(document.querySelectorAll('input[name="rating"]')),
    ratingSubmit: document.getElementById("confirm-rating"),
    ratingError: document.getElementById("rating-error"),
    commentsField: document.getElementById("comments"),
    discountSection: document.getElementById("discount-section"),
    discountCode: document.getElementById("discount-code"),
    discountPercentage: document.getElementById("discount-percentage"),
    discountExpiry: document.getElementById("discount-expiry"),
    copyCodeBtn: document.getElementById("copy-code-btn"),
    shareLoveSection: document.getElementById("share-love-section"),
    shareWhatsAppBtn: document.getElementById("share-whatsapp-btn"),
    shareSMSBtn: document.getElementById("share-sms-btn"),
    copyLinkBtn: document.getElementById("copy-link-btn")
  };

  // State will be initialized after config loads
  let state = null;

  const initializeState = () => {
    const config = window.REVIEW_TOOL_CONFIG || {};
    state = {
      businessName: sanitizeString(config.businessName) || "We value your feedback",
      businessCategory: sanitizeString(config.businessCategory),
      mapsUrl: sanitizeString(config.googleMapsUrl),
      placeId: sanitizeString(config.googlePlaceId),
      googleReviewBaseUrl:
        sanitizeString(config.googleReviewBaseUrl) ||
        "https://search.google.com/local/writereview?placeid=",
      googleReviewUrl: sanitizeString(config.googleReviewUrl),
      
      sheetScriptUrl: sanitizeString(config.sheetScriptUrl),
      discountEnabled: config.discount?.enabled !== false,
      discountPercentage: Number(config.discount?.percentage) || 10,
      discountValidDays: Number(config.discount?.validDays) || 30,
      selectedRating: null,
      currentDiscountCode: null,
      waitingForGoogleReturn: false,
      userComments: null,
      userName: null
    };
    
    // Build the full Google Review URL if not provided
    if (!state.googleReviewUrl && state.placeId) {
      state.googleReviewUrl = `${state.googleReviewBaseUrl}${encodeURIComponent(state.placeId)}`;
    }
  };

  

  const clearInlineError = () => {
    if (elements.errorMessage) elements.errorMessage.textContent = "";
    if (elements.ratingError) elements.ratingError.textContent = "";
  };

  const showRatingError = (message) => {
    if (elements.ratingError) elements.ratingError.textContent = message;
  };

  

  

  

  const resetView = () => {
    clearInlineError();
    elements.followupSection?.classList.add("hidden");
    elements.thankYou?.classList.add("hidden");
    elements.googleForward?.classList.add("hidden");
    elements.autoOpenNote?.classList.add("hidden");
  };

  const hideRatingStep = () => {
    elements.ratingStep?.classList.add("hidden");
    elements.mainHeader?.classList.add("hidden");
  };

  const showFollowupForm = (rating) => {
    if (!elements.followupSection) return;
    hideRatingStep();
    elements.followupSection.classList.remove("hidden");
    if (elements.selectedRating) {
      elements.selectedRating.textContent = rating;
    }
  };

  const generateDiscountCode = (name = "") => {
    // Calculate expiration date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + state.discountValidDays);
    
    // Format: DDMMYY (day, month, year of expiration)
    const day = String(expiryDate.getDate()).padStart(2, "0");
    const month = String(expiryDate.getMonth() + 1).padStart(2, "0");
    const year = String(expiryDate.getFullYear()).slice(-2);
    const dateCode = day + month + year;
    
    if (!name || name.trim().length === 0) {
      // Generate random code if no name provided
      const randomPart = Math.random().toString(36).substring(2, 4).toUpperCase();
      return `${randomPart}${dateCode}`;
    }
    
    const nameParts = name.trim().split(/\s+/);
    let nameCode = "";
    
    if (nameParts.length === 1) {
      // Single name: take first 2 characters
      nameCode = nameParts[0].substring(0, 2).toUpperCase();
    } else {
      // Multiple names: take first char of first name + first char of last name
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      nameCode = (firstName.substring(0, 1) + lastName.substring(0, 1)).toUpperCase();
    }
    
    return `${nameCode}${dateCode}`;
  };

  const openReviewLink = () => {
    if (!state.googleReviewUrl) {
      if (elements.errorMessage) {
        elements.errorMessage.textContent =
          "Google review link missing. Add googlePlaceId or googleReviewUrl to config.js.";
      }
      return;
    }
    elements.autoOpenNote?.classList.add("hidden");
    state.waitingForGoogleReturn = true;
    localStorage.setItem("reviewToolWaitingReturn", "true");
    localStorage.setItem("reviewToolRating", state.selectedRating);
    
    const win = window.open(state.googleReviewUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      elements.autoOpenNote?.classList.remove("hidden");
      elements.googleLink?.focus();
    }
  };

  const formatExpiryDate = (daysFromNow) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const copyDiscountCode = async () => {
    const code = state.currentDiscountCode;
    if (!code) return;
    
    try {
      await navigator.clipboard.writeText(code);
      if (elements.copyCodeBtn) {
        const originalText = elements.copyCodeBtn.textContent;
        elements.copyCodeBtn.textContent = "✓ Copied!";
        elements.copyCodeBtn.classList.add("copied");
        
        setTimeout(() => {
          elements.copyCodeBtn.textContent = originalText;
          elements.copyCodeBtn.classList.remove("copied");
        }, 2000);
      }
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        if (elements.copyCodeBtn) {
          elements.copyCodeBtn.textContent = "✓ Copied!";
        }
      } catch (err) {
        console.error("Copy failed", err);
      }
      document.body.removeChild(textarea);
    }
  };

  const getReviewPageUrl = () => {
    return window.location.origin + window.location.pathname;
  };

  const shareViaWhatsApp = () => {
    const businessName = state.businessName;
    const percentage = state.discountPercentage;
    const reviewUrl = getReviewPageUrl();
    
    const message = encodeURIComponent(
      `Check out ${businessName}! Leave a quick review and get ${percentage}% off: ${reviewUrl} 🎁`
    );
    
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareViaSMS = () => {
    const businessName = state.businessName;
    const percentage = state.discountPercentage;
    const reviewUrl = getReviewPageUrl();
    
    const message = encodeURIComponent(
      `Hey! Leave a review for ${businessName} and get ${percentage}% off: ${reviewUrl}`
    );
    
    // For iOS/Android SMS
    window.location.href = `sms:?&body=${message}`;
  };

  const copyReviewLink = async () => {
    const reviewUrl = getReviewPageUrl();
    
    try {
      await navigator.clipboard.writeText(reviewUrl);
      if (elements.copyLinkBtn) {
        const originalText = elements.copyLinkBtn.innerHTML;
        elements.copyLinkBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
        elements.copyLinkBtn.classList.add("copied");
        
        setTimeout(() => {
          elements.copyLinkBtn.innerHTML = originalText;
          elements.copyLinkBtn.classList.remove("copied");
        }, 2000);
      }
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = reviewUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        if (elements.copyLinkBtn) {
          elements.copyLinkBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
        }
      } catch (err) {
        console.error("Copy failed", err);
      }
      document.body.removeChild(textarea);
    }
  };

  const showThankYouPage = () => {
    resetView();
    hideRatingStep();
    elements.thankYou?.classList.remove("hidden");
    
    // Update thank you message based on discount availability
    if (state.discountEnabled) {
      if (elements.thankYouMessage) {
        elements.thankYouMessage.textContent = 
          "We appreciate you taking the time to help us improve. As a token of our gratitude, here's a special discount code just for you!";
      }
      elements.discountSection?.classList.remove("hidden");
      
      // Generate discount code using name from feedback if available
      const userName = state.userName || "";
      const discountCode = generateDiscountCode(userName);
      state.currentDiscountCode = discountCode;
      if (elements.discountCode) {
        elements.discountCode.textContent = discountCode;
      }
      
      // Display discount percentage
      if (elements.discountPercentage) {
        elements.discountPercentage.textContent = `${state.discountPercentage}%`;
      }
      
      // Display expiry date
      if (elements.discountExpiry) {
        elements.discountExpiry.textContent = formatExpiryDate(state.discountValidDays);
      }
      
      // Show share section if referral is enabled
      if (config.referral?.enabled !== false) {
        elements.shareLoveSection?.classList.remove("hidden");
      } else {
        elements.shareLoveSection?.classList.add("hidden");
      }
    } else {
      if (elements.thankYouMessage) {
        elements.thankYouMessage.textContent = 
          "We appreciate you taking the time to help us improve. Your feedback directly shapes how we serve our community.";
      }
      elements.discountSection?.classList.add("hidden");
      elements.shareLoveSection?.classList.add("hidden");
    }
    
    clearInlineError();
  };

  const handleFiveStarFlow = () => {
    hideRatingStep();
    elements.followupSection?.classList.add("hidden");
    elements.feedbackForm?.reset();
    elements.thankYou?.classList.add("hidden");
    elements.googleForward?.classList.remove("hidden");
    openReviewLink();
  };

  const sendInternalFeedback = async (payload) => {
    if (!state.sheetScriptUrl || state.sheetScriptUrl.includes("YOUR_SCRIPT_ID")) {
      console.warn("Sheet script URL missing, payload not sent", payload);
      return { ok: false, skipped: true };
    }
    try {
      // Use a CORS-simple request so the browser sends it without a preflight.
      // Apps Script will read JSON from e.postData.contents.
      await fetch(state.sheetScriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      // With no-cors, the response is opaque; we assume success if no network error thrown.
      console.log("Feedback sent to Sheets (opaque response)");
      return { ok: true, opaque: true };
    } catch (error) {
      console.error("Sheets submission failed", error);
      return { ok: false, error };
    }
  };

  const handleFeedbackSubmit = async (event) => {
    event.preventDefault();
    clearInlineError();

    if (!state.selectedRating || state.selectedRating >= 5) {
      if (elements.errorMessage) {
        elements.errorMessage.textContent = "Please pick a rating from 1 to 4 stars first.";
      }
      return;
    }

    const comments = sanitizeString(elements.commentsField?.value);
    if (!comments) {
      if (elements.errorMessage) {
        elements.errorMessage.textContent = "Please share your feedback before submitting.";
      }
      return;
    }

    const name = sanitizeString(elements.feedbackName?.value);
    state.userComments = comments;
    state.userName = name;

    // Generate discount code up front so we can persist it in Sheets
    const generatedCode = generateDiscountCode(name);
    state.currentDiscountCode = generatedCode;
    const expiryDateStr = formatExpiryDate(state.discountValidDays);

    const payload = {
      businessName: state.businessName,
      businessCategory: state.businessCategory,
      mapUrl: state.mapsUrl,
      placeId: state.placeId,
      rating: state.selectedRating,
      name: name,
      email: "",
      comments: comments,
      discountCode: generatedCode,
      discountPercentage: state.discountPercentage,
      discountValidDays: state.discountValidDays,
      discountExpiryDate: expiryDateStr,
      slug: resolveSlug(),
      submittedAt: new Date().toISOString()
    };

    // Send feedback (non-blocking)
    sendInternalFeedback(payload);

    // Show thank you page immediately
    showThankYouPage();
  };

  const checkForGoogleReturn = () => {
    const waitingReturn = localStorage.getItem("reviewToolWaitingReturn");
    const savedRating = localStorage.getItem("reviewToolRating");
    
    if (waitingReturn === "true" && savedRating === "5") {
      // User returned from Google Reviews
      localStorage.removeItem("reviewToolWaitingReturn");
      localStorage.removeItem("reviewToolRating");
      state.selectedRating = 5;
      state.waitingForGoogleReturn = false;
      
      // Show thank you page
      showThankYouPage();
    }
  };

  const setupVisibilityListener = () => {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && state.waitingForGoogleReturn) {
        // User came back to the app
        setTimeout(() => {
          if (state.waitingForGoogleReturn) {
            state.waitingForGoogleReturn = false;
            localStorage.removeItem("reviewToolWaitingReturn");
            showThankYouPage();
          }
        }, 500);
      }
    });

    window.addEventListener("focus", () => {
      if (state.waitingForGoogleReturn) {
        setTimeout(() => {
          if (state.waitingForGoogleReturn) {
            state.waitingForGoogleReturn = false;
            localStorage.removeItem("reviewToolWaitingReturn");
            showThankYouPage();
          }
        }, 500);
      }
    });
  };

  const attachListeners = () => {
    elements.ratingInputs.forEach((input) => {
      input.addEventListener("change", () => {
        state.selectedRating = Number(input.value);
        resetView();
        if (elements.ratingError) elements.ratingError.textContent = "";
      });
    });

    elements.ratingSubmit?.addEventListener("click", () => {
      if (!state.selectedRating) {
        showRatingError("Please select a star rating to continue.");
        return;
      }
      resetView();
      if (state.selectedRating === 5) {
        handleFiveStarFlow();
      } else {
        showFollowupForm(state.selectedRating);
      }
    });

    elements.feedbackForm?.addEventListener("submit", handleFeedbackSubmit);

    elements.copyCodeBtn?.addEventListener("click", copyDiscountCode);
    
    elements.shareWhatsAppBtn?.addEventListener("click", shareViaWhatsApp);
    
    elements.shareSMSBtn?.addEventListener("click", shareViaSMS);
    
    elements.copyLinkBtn?.addEventListener("click", copyReviewLink);
  };

  const applyConfigToDom = () => {
    if (elements.businessName) elements.businessName.textContent = state.businessName;
    const categoryDisplay = state.businessCategory || state.businessName;
    if (elements.categoryLabel) elements.categoryLabel.textContent = categoryDisplay;

    if (elements.googleLink) {
      elements.googleLink.href = state.googleReviewUrl || "#";
    }

    if (elements.mapsLink) {
      if (state.mapsUrl) {
        elements.mapsLink.href = state.mapsUrl;
        elements.mapsNote?.classList.remove("hidden");
      } else {
        elements.mapsNote?.classList.add("hidden");
      }
    }
  };

  const init = () => {
    initializeState();
    attachListeners();
    applyConfigToDom();
    setupVisibilityListener();
    checkForGoogleReturn();
  };

  // Wait for config to load before initializing
  const waitForConfig = setInterval(() => {
    if (window.configLoaded) {
      clearInterval(waitForConfig);
      console.log("App initializing with config:", window.REVIEW_TOOL_CONFIG);
      init();
    }
  }, 50);
})();
