(() => {
  'use strict';

  // State management
  let state = {
    currentStep: 1,
    accountData: null,
    businessData: null,
    configData: null,
    selectedPlan: null
  };

  // DOM elements
  const elements = {
    // Forms
    accountForm: document.getElementById('account-form'),
    businessForm: document.getElementById('business-form'),
    configForm: document.getElementById('config-form'),

    // Step content
    step1: document.getElementById('step-1'),
    step2: document.getElementById('step-2'),
    step3: document.getElementById('step-3'),
    step4: document.getElementById('step-4'),
    step5: document.getElementById('step-5'),

    // Account step
    email: document.getElementById('email'),
    password: document.getElementById('password'),
    name: document.getElementById('name'),
    passwordStrength: document.getElementById('password-strength'),
    accountError: document.getElementById('account-error'),

    // Business step
    mapsUrl: document.getElementById('maps-url'),
    businessError: document.getElementById('business-error'),
    businessPreview: document.getElementById('business-preview'),
    previewHero: document.getElementById('preview-hero'),
    previewHeroImg: document.getElementById('preview-hero-img'),
    previewName: document.getElementById('preview-name'),
    previewCategory: document.getElementById('preview-category'),
    previewAddress: document.getElementById('preview-address'),
    fetchBusinessBtn: document.getElementById('fetch-business-btn'),
    confirmBusinessBtn: document.getElementById('confirm-business'),

    // Config step
    upgradeNotice: document.getElementById('upgrade-notice'),
    discountEnabled: document.getElementById('discount-enabled'),
    discountSettings: document.getElementById('discount-settings'),
    discountPercentage: document.getElementById('discount-percentage'),
    discountDays: document.getElementById('discount-days'),
    referralEnabled: document.getElementById('referral-enabled'),
    reviewThreshold: document.getElementById('review-threshold'),
    sheetScriptUrl: document.getElementById('sheet-script-url'),
    configError: document.getElementById('config-error'),

    // Payment step
    paymentError: document.getElementById('payment-error'),

    // Success step
    reviewUrl: document.getElementById('review-url'),
    viewReviewLink: document.getElementById('view-review-link'),
    qrCanvas: document.getElementById('qr-canvas'),
    copyUrlBtn: document.getElementById('copy-url-btn'),
    downloadQrBtn: document.getElementById('download-qr-btn')
  };

  // Initialize
  function init() {
    setupEventListeners();
    updateStepIndicator();
  }

  // Event listeners
  function setupEventListeners() {
    // Account form
    elements.accountForm?.addEventListener('submit', handleAccountSubmit);
    elements.password?.addEventListener('input', checkPasswordStrength);

    // Business form
    elements.businessForm?.addEventListener('submit', handleBusinessSubmit);
    elements.confirmBusinessBtn?.addEventListener('click', () => goToStep(4));
    document.getElementById('change-business')?.addEventListener('click', () => {
      elements.businessPreview?.classList.add('hidden');
      elements.mapsUrl.value = '';
    });

    // Config form
    elements.configForm?.addEventListener('submit', handleConfigSubmit);
    elements.discountEnabled?.addEventListener('change', toggleDiscountSettings);

    // Plan selection
    document.querySelectorAll('[data-plan]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const plan = e.target.getAttribute('data-plan');
        handlePlanSelection(plan);
      });
    });

    // Navigation buttons
    document.getElementById('back-to-plan')?.addEventListener('click', () => goToStep(1));
    document.getElementById('back-to-account')?.addEventListener('click', () => goToStep(2));
    document.getElementById('back-to-business')?.addEventListener('click', () => goToStep(3));

    // Success step
    elements.copyUrlBtn?.addEventListener('click', copyReviewUrl);
    elements.downloadQrBtn?.addEventListener('click', downloadQRCode);
  }

  // Step navigation
  function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(s => s.classList.remove('active'));
    
    // Show target step
    const stepElement = document.getElementById(`step-${step}`);
    if (stepElement) {
      stepElement.classList.add('active');
      state.currentStep = step;
      updateStepIndicator();
      
      // Apply plan restrictions when entering Settings step (step 4)
      if (step === 4 && state.selectedPlan) {
        applyPlanRestrictions(state.selectedPlan);
      }
    }
  }

  function updateStepIndicator() {
    document.querySelectorAll('.step').forEach((stepEl, index) => {
      const stepNum = index + 1;
      stepEl.classList.remove('active', 'completed');
      
      if (stepNum < state.currentStep) {
        stepEl.classList.add('completed');
      } else if (stepNum === state.currentStep) {
        stepEl.classList.add('active');
      }
    });
  }

  // Password strength checker
  function checkPasswordStrength() {
    const password = elements.password.value;
    const strengthEl = elements.passwordStrength;
    
    if (!password) {
      strengthEl.className = 'password-strength';
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) {
      strengthEl.className = 'password-strength weak';
    } else if (strength <= 3) {
      strengthEl.className = 'password-strength medium';
    } else {
      strengthEl.className = 'password-strength strong';
    }
  }

  // Account submission
  async function handleAccountSubmit(e) {
    e.preventDefault();
    hideError('account-error');

    const email = elements.email.value.trim();
    const password = elements.password.value;
    const name = elements.name.value.trim();

    if (!email || !password) {
      showError('account-error', 'Email and password are required');
      return;
    }

    if (password.length < 8) {
      showError('account-error', 'Password must be at least 8 characters');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || null })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store account data
      state.accountData = data.user;
      
      // Token is automatically set in cookie by the API

      // Move to next step (Business)
      goToStep(3);
    } catch (error) {
      showError('account-error', error.message);
    }
  }

  // Business lookup
  async function handleBusinessSubmit(e) {
    e.preventDefault();
    hideError('business-error');

    const mapsUrl = elements.mapsUrl.value.trim();

    if (!mapsUrl) {
      showError('business-error', 'Google Maps URL is required');
      return;
    }

    // Show loading state
    const btnText = elements.fetchBusinessBtn.querySelector('.btn-text');
    const btnLoader = elements.fetchBusinessBtn.querySelector('.btn-loader');
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    elements.fetchBusinessBtn.disabled = true;

    try {
      const response = await fetch('/api/business/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapsUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch business details');
      }

      // Store business data
      state.businessData = data;

      // Show preview
      displayBusinessPreview(data);

    } catch (error) {
      showError('business-error', error.message);
    } finally {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
      elements.fetchBusinessBtn.disabled = false;
    }
  }

  function displayBusinessPreview(business) {
    elements.previewName.textContent = business.name;
    elements.previewCategory.textContent = business.category || 'Business';
    elements.previewAddress.textContent = business.address || '';

    if (business.heroImage) {
      elements.previewHeroImg.src = business.heroImage;
      elements.previewHero.classList.remove('hidden');
    } else {
      elements.previewHero.classList.add('hidden');
    }

    elements.businessPreview.classList.remove('hidden');
  }

  // Apply plan restrictions to Settings
  function applyPlanRestrictions(plan) {
    const isFree = plan === 'free';
    const allConfigFields = [
      elements.discountEnabled,
      elements.discountPercentage,
      elements.discountDays,
      elements.referralEnabled,
      elements.reviewThreshold,
      elements.sheetScriptUrl
    ];

    if (isFree) {
      // Show upgrade notice
      elements.upgradeNotice?.classList.remove('hidden');
      
      // Disable all fields
      allConfigFields.forEach(field => {
        if (field) {
          field.disabled = true;
          field.classList.add('disabled-field');
        }
      });
      
      // Set Free plan defaults
      elements.discountEnabled.checked = false;
      elements.discountPercentage.value = '10';
      elements.discountDays.value = '30';
      elements.referralEnabled.checked = false;
      elements.reviewThreshold.value = '5';
      elements.sheetScriptUrl.value = '';
      
      // Hide discount settings
      elements.discountSettings.style.display = 'none';
    } else {
      // Hide upgrade notice
      elements.upgradeNotice?.classList.add('hidden');
      
      // Enable all fields
      allConfigFields.forEach(field => {
        if (field) {
          field.disabled = false;
          field.classList.remove('disabled-field');
        }
      });
      
      // Set Pro plan defaults (editable)
      elements.discountEnabled.checked = true;
      elements.discountPercentage.value = '10';
      elements.discountDays.value = '30';
      elements.referralEnabled.checked = true;
      elements.reviewThreshold.value = '5';
      elements.sheetScriptUrl.value = '';
      
      // Show discount settings if enabled
      toggleDiscountSettings();
    }
  }

  // Configuration submission
  async function handleConfigSubmit(e) {
    e.preventDefault();
    hideError('config-error');

    let config;
    
    if (state.selectedPlan === 'free') {
      // Free plan: Use hardcoded defaults (no discount, no referrals)
      config = {
        discount_enabled: false,
        discount_percentage: 10,
        discount_valid_days: 30,
        referral_enabled: false,
        review_threshold: 5,
        sheet_script_url: ''
      };
    } else {
      // Pro plan: Use form values
      config = {
        discount_enabled: elements.discountEnabled.checked,
        discount_percentage: parseInt(elements.discountPercentage.value) || 10,
        discount_valid_days: parseInt(elements.discountDays.value) || 30,
        referral_enabled: elements.referralEnabled.checked,
        review_threshold: parseInt(elements.reviewThreshold.value) || 5,
        sheet_script_url: elements.sheetScriptUrl.value.trim() || ''
      };
    }

    state.configData = config;

    // Create business and move to success
    await createBusiness();
  }

  // Plan selection
  async function handlePlanSelection(plan) {
    state.selectedPlan = plan;
    hideError('payment-error');
    
    // Apply plan restrictions to Settings step
    applyPlanRestrictions(plan);
    
    // Navigate to Account step
    goToStep(2);
  }

  // Create business
  async function createBusiness() {
    hideError('config-error');

    if (!state.businessData || !state.configData) {
      showError('config-error', 'Missing business or configuration data');
      return;
    }

    try {
      const response = await fetch('/api/business/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          placeId: state.businessData.placeId,
          name: state.businessData.name,
          category: state.businessData.category,
          googleMapsUrl: state.businessData.mapsUrl,
          heroImage: state.businessData.heroImage,
          config: state.configData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create business');
      }

      // Store business info
      state.business = data.business;
      state.reviewUrl = data.reviewUrl;

      // Show success page
      displaySuccessPage(data.reviewUrl);
      goToStep(5);

    } catch (error) {
      showError('config-error', error.message);
    }
  }

  // Display success page
  function displaySuccessPage(reviewUrl) {
    elements.reviewUrl.value = reviewUrl;
    elements.viewReviewLink.href = reviewUrl;
    
    // Generate QR code
    generateQRCode(reviewUrl);
  }

  // Generate QR code
  async function generateQRCode(url) {
    try {
      const response = await fetch(`/api/admin/qrcode?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (data.success && data.dataUrl) {
        const img = new Image();
        img.onload = () => {
          const canvas = elements.qrCanvas;
          const ctx = canvas.getContext('2d');
          canvas.width = 256;
          canvas.height = 256;
          ctx.drawImage(img, 0, 0);
        };
        img.src = data.dataUrl;
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  }

  // Copy review URL
  async function copyReviewUrl() {
    try {
      await navigator.clipboard.writeText(elements.reviewUrl.value);
      const originalText = elements.copyUrlBtn.textContent;
      elements.copyUrlBtn.textContent = 'Copied!';
      setTimeout(() => {
        elements.copyUrlBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  // Download QR code
  function downloadQRCode() {
    const canvas = elements.qrCanvas;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `qr-code-${Date.now()}.png`;
    link.href = url;
    link.click();
  }

  // Toggle discount settings
  function toggleDiscountSettings() {
    if (elements.discountEnabled.checked) {
      elements.discountSettings.style.display = 'block';
    } else {
      elements.discountSettings.style.display = 'none';
    }
  }

  // Error handling
  function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
  }

  function hideError(elementId) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  }

  // Initialize discount settings visibility
  toggleDiscountSettings();

  // Initialize on load
  init();
})();

