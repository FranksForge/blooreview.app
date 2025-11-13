(() => {
  'use strict';

  const elements = {
    form: document.getElementById('generate-form'),
    mapsUrlInput: document.getElementById('maps-url'),
    fetchDetailsBtn: document.getElementById('fetch-details-btn'),
    businessDetails: document.getElementById('business-details'),
    detailsContent: document.getElementById('details-content'),
    reviewPreview: document.getElementById('review-preview'),
    generateBtn: document.getElementById('generate-btn'),
    resetBtn: document.getElementById('reset-btn'),
    statusMessage: document.getElementById('status-message'),
    loading: document.getElementById('loading'),
    successView: document.getElementById('success-view'),
    qrCodeCanvas: document.getElementById('qr-code-canvas'),
    successReviewUrl: document.getElementById('success-review-url'),
    openReviewLink: document.getElementById('open-review-link'),
    downloadQrBtn: document.getElementById('download-qr-btn'),
    copySuccessUrlBtn: document.getElementById('copy-success-url-btn'),
    createAnotherBtn: document.getElementById('create-another-btn')
  };

  let fetchedBusinessData = null;

  // Show status message
  const showStatus = (message, type = 'info') => {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;
    elements.statusMessage.classList.remove('hidden');
    
    if (type === 'success') {
      setTimeout(() => {
        elements.statusMessage.classList.add('hidden');
      }, 5000);
    }
  };

  // Hide status message
  const hideStatus = () => {
    elements.statusMessage.classList.add('hidden');
  };

  // Show loading state
  const showLoading = () => {
    elements.loading.classList.remove('hidden');
    elements.fetchDetailsBtn.disabled = true;
    elements.generateBtn.disabled = true;
  };

  // Hide loading state
  const hideLoading = () => {
    elements.loading.classList.add('hidden');
    elements.fetchDetailsBtn.disabled = false;
    elements.generateBtn.disabled = false;
  };

  // Fetch business details from Maps API
  const fetchBusinessDetails = async (mapsUrl) => {
    try {
      showLoading();
      hideStatus();

      const response = await fetch('/api/admin/maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mapsUrl })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch business details');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching business details:', error);
      throw error;
    } finally {
      hideLoading();
    }
  };

  // Display business details with review page preview
  const displayBusinessDetails = (business) => {
    fetchedBusinessData = business;

    const slug = generateSlug(business.name);

    // Generate preview URL
    const hostname = window.location.hostname;
    let baseDomain = 'blooreview.app';
    
    // Extract base domain from current hostname
    if (hostname.includes('admin.')) {
      baseDomain = hostname.replace('admin.', '');
    } else if (hostname.includes('.')) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        baseDomain = parts.slice(-2).join('.'); // Get last two parts (e.g., blooreview.app)
      }
    }
    
    const previewUrl = `${window.location.protocol}//${slug}.${baseDomain}`;

    // Render full review page preview
    const heroImageHtml = business.heroImage ? `
      <div class="hero-image">
        <img src="${escapeHtml(business.heroImage)}" alt="${escapeHtml(business.name)}" />
      </div>
    ` : '';

    elements.reviewPreview.innerHTML = `
      <div class="card">
        <header id="preview-header">
          ${heroImageHtml}
          <h1>${escapeHtml(business.name)}</h1>
        </header>

        <section id="preview-rating-step">
          <p class="rating-prompt">How would you rate your experience?</p>
          <fieldset class="rating-fieldset">
            <legend class="sr-only">Select a star rating</legend>
            <div class="stars stars-display" role="img" aria-label="Star rating preview">
              <input type="radio" id="preview-star5" name="preview-rating" value="5" disabled />
              <label for="preview-star5" aria-label="5 stars">★</label>
              <input type="radio" id="preview-star4" name="preview-rating" value="4" disabled />
              <label for="preview-star4" aria-label="4 stars">★</label>
              <input type="radio" id="preview-star3" name="preview-rating" value="3" disabled />
              <label for="preview-star3" aria-label="3 stars">★</label>
              <input type="radio" id="preview-star2" name="preview-rating" value="2" disabled />
              <label for="preview-star2" aria-label="2 stars">★</label>
              <input type="radio" id="preview-star1" name="preview-rating" value="1" disabled />
              <label for="preview-star1" aria-label="1 star">★</label>
            </div>
          </fieldset>
          <div class="buttons-row">
            <button type="button" class="primary rating-confirm" disabled style="opacity: 0.6; cursor: not-allowed;">
              Preview only
            </button>
          </div>
          <p class="subtitle rating-subtitle">
            Taking 2 minutes to leave a review helps us improve and grow. We really appreciate you for taking the time!
          </p>
        </section>
      </div>
    `;

    elements.businessDetails.classList.remove('hidden');
    showStatus('Business details fetched successfully! Review the preview and click "Generate Review Page" to continue.', 'success');
  };

  // Generate slug from business name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  // Escape HTML to prevent XSS
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Generate review page
  const generateReviewPage = async (business) => {
    try {
      showLoading();
      hideStatus();

      const response = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          placeId: business.placeId,
          name: business.name,
          category: business.category,
          mapsUrl: business.mapsUrl,
          heroImage: business.heroImage
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate review page');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating review page:', error);
      throw error;
    } finally {
      hideLoading();
    }
  };

  // Generate QR code via API
  const generateQRCode = async (url) => {
    try {
      const encodedUrl = encodeURIComponent(url);
      const response = await fetch(`/api/admin/qrcode?url=${encodedUrl}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }
      
      const data = await response.json();
      
      if (data.success && data.dataUrl) {
        // Create an image from the data URL and draw it on canvas
        const img = new Image();
        img.onload = () => {
          const canvas = elements.qrCodeCanvas;
          const ctx = canvas.getContext('2d');
          canvas.width = 256;
          canvas.height = 256;
          ctx.drawImage(img, 0, 0);
        };
        img.src = data.dataUrl;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return false;
    }
  };

  // Download QR code as PNG
  const downloadQRCode = () => {
    const canvas = elements.qrCodeCanvas;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `qr-code-${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  // Copy URL to clipboard
  const copyUrlToClipboard = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      const originalText = elements.copySuccessUrlBtn.textContent;
      elements.copySuccessUrlBtn.textContent = 'Copied!';
      setTimeout(() => {
        elements.copySuccessUrlBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Error copying URL:', error);
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        const originalText = elements.copySuccessUrlBtn.textContent;
        elements.copySuccessUrlBtn.textContent = 'Copied!';
        setTimeout(() => {
          elements.copySuccessUrlBtn.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textarea);
    }
  };

  // Display success view with QR code
  const displaySuccessView = async (reviewUrl) => {
    // Set the review URL
    elements.successReviewUrl.value = reviewUrl;
    elements.openReviewLink.href = reviewUrl;
    
    // Hide form and show success view first
    elements.form.classList.add('hidden');
    elements.statusMessage.classList.add('hidden');
    elements.successView.classList.remove('hidden');
    
    // Scroll to top to show success view
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Generate QR code (non-blocking - show view even if it fails)
    try {
      await generateQRCode(reviewUrl);
    } catch (error) {
      console.error('QR code generation failed, but showing success view anyway:', error);
      // Optionally show a message that QR code couldn't be generated
    }
  };

  // Reset form
  const resetForm = () => {
    elements.form.reset();
    elements.businessDetails.classList.add('hidden');
    elements.detailsContent.innerHTML = '';
    elements.reviewPreview.innerHTML = '';
    elements.successView.classList.add('hidden');
    elements.form.classList.remove('hidden');
    fetchedBusinessData = null;
    hideStatus();
  };

  // Event listeners
  elements.fetchDetailsBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const mapsUrl = elements.mapsUrlInput.value.trim();

    if (!mapsUrl) {
      showStatus('Please enter a Google Maps URL', 'error');
      return;
    }

    try {
      const business = await fetchBusinessDetails(mapsUrl);
      displayBusinessDetails(business);
    } catch (error) {
      showStatus(error.message || 'Failed to fetch business details', 'error');
    }
  });

  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!fetchedBusinessData) {
      showStatus('Please fetch business details first', 'error');
      return;
    }

    try {
      const result = await generateReviewPage(fetchedBusinessData);
      
      // Display success view with QR code
      await displaySuccessView(result.previewUrl);
    } catch (error) {
      showStatus(error.message || 'Failed to generate review page', 'error');
    }
  });

  elements.resetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetForm();
  });

  // Success view event listeners
  elements.downloadQrBtn?.addEventListener('click', () => {
    downloadQRCode();
  });

  elements.copySuccessUrlBtn?.addEventListener('click', () => {
    const url = elements.successReviewUrl.value;
    if (url) {
      copyUrlToClipboard(url);
    }
  });

  elements.createAnotherBtn?.addEventListener('click', () => {
    resetForm();
  });
})();

