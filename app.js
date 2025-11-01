(() => {
  const sanitizeString = (value) => (typeof value === "string" ? value.trim() : "");
  const sanitizeArray = (list) => [];

  // Translations object
  const translations = {
    en: {
      subtitle: "Taking 2 minutes to leave a review helps us improve and grow. We really appreciate you for taking the time!",
      ratingPrompt: "How would you rate your experience?",
      ratingError: "Please select a star rating to continue.",
      continueButton: "Continue",
      ratingStars: "stars",
      ratingStarsSingular: "star",
      feedbackIntro: "We read every message closely. Let us know what happened so we can follow up.",
      feedbackPrompt: "Tell us about your experience",
      feedbackPlaceholder: "Share your thoughts...",
      feedbackNameLabel: "Your name (optional)",
      feedbackNamePlaceholder: "Enter your name",
      feedbackSubmit: "Submit Review",
      thankYouTitle: "Thank you so much!",
      thankYouMessage: "Your feedback means the world to us and helps us serve you better.",
      discountTitle: "🎉 Here's your discount!",
      discountBadge: "DISCOUNT",
      discountLabel: "Your discount code:",
      discountExpiry: "Valid until",
      copyCode: "Copy Code",
      shareLoveTitle: "Share the love!",
      shareLoveMessage: "Invite your friends to also leave a review and get their own discount!",
      shareWhatsapp: "Share on WhatsApp",
      shareSMS: "Share via SMS",
      copyLink: "Copy Link",
      googleForwardTitle: "🎉 Thanks for the love!",
      googleForwardMessage: "Your words mean a lot to us. We're opening Google Reviews so you can share them publicly.",
      googleForwardHighlight: "✨ After leaving your review, use the back button to return here for your discount code!",
      googleForwardButton: "Open Google Reviews",
      mapsNote: "Need a refresher about us?",
      mapsLink: "View our Google Maps listing.",
      footer: "Powered by Review Tool Demo • We truly appreciate your support.",
      copied: "Copied!",
      errorGeneric: "Something went wrong. Please try again."
    },
    de: {
      subtitle: "Nur 2 Minuten für eine Bewertung helfen uns, besser zu werden und zu wachsen. Wir schätzen Ihre Zeit sehr!",
      ratingPrompt: "Wie würden Sie Ihre Erfahrung bewerten?",
      ratingError: "Bitte wählen Sie eine Sternebewertung aus, um fortzufahren.",
      continueButton: "Weiter",
      ratingStars: "Sterne",
      ratingStarsSingular: "Stern",
      feedbackIntro: "Wir lesen jede Nachricht sorgfältig. Ihr Feedback hilft uns unseren Service zukünftig noch weiter zu verbessern.",
      feedbackPrompt: "Erzählen Sie uns von Ihrer Erfahrung - Wie können wir uns verbessern?",
      feedbackPlaceholder: "Teilen Sie Ihre Gedanken mit...",
      feedbackNameLabel: "Ihr Name (optional)",
      feedbackNamePlaceholder: "Geben Sie Ihren Namen ein",
      feedbackSubmit: "Bewertung abschicken",
      thankYouTitle: "Vielen Dank!",
      thankYouMessage: "Wir schätzen es sehr, dass Sie sich die Zeit genommen haben, uns zu helfen, besser zu werden. Ihr Feedback hilft uns direkt dabei, unseren Service zu verbessern.",
      discountTitle: "🎉 Hier ist Ihr Rabatt!",
      discountBadge: "RABATT",
      discountLabel: "Ihr Rabattcode:",
      discountExpiry: "Gültig bis",
      copyCode: "Code kopieren",
      shareLoveTitle: "Teilen Sie die Liebe!",
      shareLoveMessage: "Laden Sie Ihre Freunde ein, auch eine Bewertung zu hinterlassen und ihren eigenen Rabatt zu erhalten!",
      shareWhatsapp: "Auf WhatsApp teilen",
      shareSMS: "Per SMS teilen",
      copyLink: "Link kopieren",
      googleForwardTitle: "🎉 Danke für die Liebe!",
      googleForwardMessage: "Wir haben Google Bewertungen in einem neuen Tab für Sie geöffnet. Teilen Sie dort Ihre Erfahrung!",
      googleForwardHighlight: "✨ Nach Ihrer Bewertung kehren Sie zu diesem Tab zurück, um Ihren Rabattcode zu erhalten!",
      googleForwardButton: "Google Bewertungen erneut öffnen",
      mapsNote: "Brauchen Sie eine Erinnerung an uns?",
      mapsLink: "Sehen Sie sich unseren Google Maps Eintrag an.",
      footerPoweredBy: "Powered by",
      footerTagline: "Wir schätzen Ihre Unterstützung sehr.",
      copied: "Kopiert!",
      errorGeneric: "Etwas ist schief gelaufen. Bitte versuchen Sie es erneut."
    }
  };

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

  // Translation helper function - German ONLY
  const t = (key, fallback = '') => {
    return translations.de[key] || fallback;
  };

  // State will be initialized after config loads
  let state = null;

  const initializeState = () => {
    const config = window.REVIEW_TOOL_CONFIG || {};
    
    state = {
      businessName: sanitizeString(config.name) || "Wir schätzen Ihr Feedback",
    businessCategory: sanitizeString(config.category),
    mapsUrl: sanitizeString(config.google_maps_url),
    placeId: sanitizeString(config.place_id),
    googleReviewBaseUrl:
      sanitizeString(config.google_review_base_url) ||
      "https://search.google.com/local/writereview?placeid=",
    googleReviewUrl: sanitizeString(config.google_review_url),
      
    sheetScriptUrl: sanitizeString(config.sheet_script_url),
      reviewThreshold: Number(config.review_threshold) || 5,
      discountEnabled: config.discount_enabled !== false,
      discountPercentage: Number(config.discount_percentage) || 10,
      discountValidDays: Number(config.discount_valid_days) || 30,
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
    
    // Hide the rating step (button and interactive stars)
    elements.ratingStep?.classList.add("hidden");
    
    // Hide the subtitle text on feedback page
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) {
      subtitle.classList.add('hidden');
    }
    
    // Show the feedback form
    elements.followupSection.classList.remove("hidden");
    
    // Show home button
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) homeBtn.classList.remove('hidden');
    
    // Check the corresponding star in the display stars
    const displayStar = document.getElementById(`display-star${rating}`);
    if (displayStar) {
      displayStar.checked = true;
    }
  };

  const resetToHome = () => {
    // Reset all state
    state.selectedRating = null;
    state.currentDiscountCode = null;
    state.userComments = null;
    state.userName = null;
    state.waitingForGoogleReturn = false;
    
    // Clear form fields
    if (elements.commentsField) elements.commentsField.value = '';
    if (elements.feedbackName) elements.feedbackName.value = '';
    
    // Uncheck all stars
    elements.ratingInputs.forEach(star => star.checked = false);
    
    // Show the initial screen
    elements.ratingStep?.classList.remove("hidden");
    elements.mainHeader?.classList.remove("hidden");
    
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) subtitle.classList.remove('hidden');
    
    // Hide all other sections
    elements.followupSection?.classList.add("hidden");
    elements.thankYou?.classList.add("hidden");
    elements.googleForward?.classList.add("hidden");
    
    // Hide the home button on the initial screen
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) homeBtn.classList.add('hidden');
    
    clearInlineError();
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
          "Google review link missing. Add place_id or google_review_url to config.js.";
      }
      return;
    }
    
    // Open Google Reviews in a new tab
    window.open(state.googleReviewUrl, '_blank', 'noopener,noreferrer');
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
    
    // Show home button
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) homeBtn.classList.remove('hidden');
    
    // Update thank you message based on discount availability and rating
    if (state.discountEnabled) {
      if (elements.thankYouMessage) {
        // Special message for 5-star ratings (Google Reviews flow)
        if (state.selectedRating >= state.reviewThreshold) {
          elements.thankYouMessage.textContent = 
            "Vielen Dank für Ihre 5-Sterne-Bewertung! Wir haben Google Bewertungen in einem neuen Tab für Sie geöffnet. Als Dankeschön erhalten Sie hier Ihren exklusiven Rabattcode!";
        } else {
          elements.thankYouMessage.textContent = 
            "Wir schätzen es sehr, dass Sie sich die Zeit genommen haben, uns zu helfen, besser zu werden. Ihr Feedback hilft uns direkt dabei, unseren Service zu verbessern.";
        }
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
      if (config.referral_enabled !== false) {
        elements.shareLoveSection?.classList.remove("hidden");
      } else {
        elements.shareLoveSection?.classList.add("hidden");
      }
    } else {
      if (elements.thankYouMessage) {
        elements.thankYouMessage.textContent = 
          "Wir schätzen es sehr, dass Sie sich die Zeit nehmen, uns zu helfen, besser zu werden. Wir hoffen Sie bald wieder bei uns begrüßen zu dürfen!";
      }
      elements.discountSection?.classList.add("hidden");
      elements.shareLoveSection?.classList.add("hidden");
    }
    
    clearInlineError();
  };

  const handleHighRatingFlow = () => {
    // Open Google Reviews in new tab automatically
    if (state.googleReviewUrl) {
      const newWindow = window.open(state.googleReviewUrl, '_blank', 'noopener,noreferrer');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        console.log('Popup was blocked by browser');
      }
    }
    
    // Show thank you page directly with discount code
    showThankYouPage();
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

    // Only generate discount code if discounts are enabled
    let generatedCode = '';
    let expiryDateStr = '';
    
    if (state.discountEnabled) {
      generatedCode = generateDiscountCode(name);
      state.currentDiscountCode = generatedCode;
      expiryDateStr = formatExpiryDate(state.discountValidDays);
    }

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
      discountPercentage: state.discountEnabled ? state.discountPercentage : '',
      discountValidDays: state.discountEnabled ? state.discountValidDays : '',
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
      if (state.selectedRating >= state.reviewThreshold) {
        handleHighRatingFlow();
      } else {
        showFollowupForm(state.selectedRating);
      }
    });

    elements.feedbackForm?.addEventListener("submit", handleFeedbackSubmit);

    elements.copyCodeBtn?.addEventListener("click", copyDiscountCode);
    
    elements.shareWhatsAppBtn?.addEventListener("click", shareViaWhatsApp);
    
    elements.shareSMSBtn?.addEventListener("click", shareViaSMS);
    
    elements.copyLinkBtn?.addEventListener("click", copyReviewLink);
    
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
      homeBtn.addEventListener('click', resetToHome);
    }
  };

  const applyConfigToDom = () => {
    if (elements.businessName) elements.businessName.textContent = state.businessName;
    const categoryDisplay = state.businessCategory || state.businessName;
    if (elements.categoryLabel) elements.categoryLabel.textContent = categoryDisplay;

    // Apply hero image if configured
    const heroImageContainer = document.getElementById('hero-image-container');
    const heroImage = document.getElementById('hero-image');
    const config = window.REVIEW_TOOL_CONFIG || {};
    
    if (config.hero_image && heroImage && heroImageContainer) {
      // If hero_image is just a filename (no protocol), prepend /images/
      const imageSrc = config.hero_image.startsWith('http') 
        ? config.hero_image 
        : `/images/${config.hero_image}`;
      heroImage.src = imageSrc;
      heroImage.alt = state.businessName;
      heroImageContainer.classList.remove('hidden');
    } else if (heroImageContainer) {
      heroImageContainer.classList.add('hidden');
    }

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

  const applyTranslations = () => {
    // Apply translations to all elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(element => {
      const key = element.getAttribute('data-translate');
      const translation = t(key);
      if (translation) {
        element.textContent = translation;
      }
    });

    // Apply placeholder translations
    document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
      const key = element.getAttribute('data-translate-placeholder');
      const translation = t(key);
      if (translation) {
        element.placeholder = translation;
      }
    });
  };

  const init = () => {
    // Debug: Log config status
    console.log('=== Config Debug ===');
    console.log('REVIEW_CONFIGS available:', typeof window.REVIEW_CONFIGS !== 'undefined');
    console.log('REVIEW_TOOL_CONFIG:', window.REVIEW_TOOL_CONFIG);
    console.log('Config keys:', window.REVIEW_CONFIGS ? Object.keys(window.REVIEW_CONFIGS) : 'none');
    
    initializeState();
    
    // Debug: Log state after initialization
    console.log('State after init:', {
      businessName: state.businessName,
      businessCategory: state.businessCategory,
      placeId: state.placeId,
      discountEnabled: state.discountEnabled,
      discountPercentage: state.discountPercentage
    });
    
    attachListeners();
    applyConfigToDom();
    applyTranslations();
    setupVisibilityListener();
    checkForGoogleReturn();
  };

  // Initialize immediately - config.js has already loaded
  init();
})();
