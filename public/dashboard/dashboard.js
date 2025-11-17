(() => {
  'use strict';

  // DOM elements
  const elements = {
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    businessesGrid: document.getElementById('businesses-grid'),
    emptyState: document.getElementById('empty-state'),
    logoutBtn: document.getElementById('logout-btn'),
    qrModal: document.getElementById('qr-modal'),
    qrModalClose: document.getElementById('qr-modal-close'),
    qrModalTitle: document.getElementById('qr-modal-title'),
    qrCanvas: document.getElementById('qr-canvas'),
    downloadQrBtn: document.getElementById('download-qr-btn'),
    copyQrUrlBtn: document.getElementById('copy-qr-url-btn'),
    qrUrlInput: document.getElementById('qr-url-input')
  };

  // Current QR code data
  let currentQrUrl = null;

  // Initialize
  async function init() {
    // Check authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      window.location.href = '/signup';
      return;
    }

    // Load businesses
    await loadBusinesses();

    // Setup event listeners
    elements.logoutBtn?.addEventListener('click', handleLogout);
    elements.qrModalClose?.addEventListener('click', closeQrModal);
    elements.downloadQrBtn?.addEventListener('click', downloadQRCode);
    elements.copyQrUrlBtn?.addEventListener('click', copyQrUrl);
    
    // Close modal when clicking outside
    elements.qrModal?.addEventListener('click', (e) => {
      if (e.target === elements.qrModal) {
        closeQrModal();
      }
    });
  }

  // Check authentication
  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include'
      });

      if (!response.ok) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }

  // Load businesses
  async function loadBusinesses() {
    try {
      elements.loading.style.display = 'block';
      elements.error.classList.add('hidden');
      elements.businessesGrid.innerHTML = '';
      elements.emptyState.classList.add('hidden');

      const response = await fetch('/api/user/businesses', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/signup';
          return;
        }
        throw new Error('Failed to load businesses');
      }

      const data = await response.json();
      const businesses = data.businesses || [];

      elements.loading.style.display = 'none';

      if (businesses.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
      }

      // Render businesses
      businesses.forEach(business => {
        renderBusinessCard(business);
      });

    } catch (error) {
      console.error('Error loading businesses:', error);
      elements.loading.style.display = 'none';
      elements.error.textContent = error.message || 'Failed to load businesses';
      elements.error.classList.remove('hidden');
    }
  }

  // Render business card
  function renderBusinessCard(business) {
    const card = document.createElement('div');
    card.className = 'business-card';

    const hostname = window.location.hostname;
    const baseDomain = hostname.includes('.') 
      ? hostname.split('.').slice(-2).join('.')
      : 'blooreview.app';
    const reviewUrl = `https://${business.slug}.${baseDomain}`;

    card.innerHTML = `
      ${business.heroImage ? `<img src="${business.heroImage}" alt="${business.name}" class="business-card-hero" />` : ''}
      <div class="business-card-header">
        <div class="business-card-header-content">
          <h3 class="business-card-name">${escapeHtml(business.name)}</h3>
          <button type="button" class="qr-btn-header" data-slug="${escapeHtml(business.slug)}" data-url="${escapeHtml(reviewUrl)}" data-name="${escapeHtml(business.name)}" title="QR Code">
            <svg class="qr-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="5" height="5"></rect>
              <rect x="16" y="3" width="5" height="5"></rect>
              <rect x="3" y="16" width="5" height="5"></rect>
              <path d="M11 3h2v2h-2z"></path>
              <path d="M11 19h2v2h-2z"></path>
              <path d="M3 11h2v2H3z"></path>
              <path d="M19 11h2v2h-2z"></path>
              <path d="M8 11h2v2H8z"></path>
              <path d="M14 11h2v2h-2z"></path>
              <path d="M8 16h2v2H8z"></path>
              <path d="M14 16h2v2h-2z"></path>
              <path d="M16 8h2v2h-2z"></path>
            </svg>
          </button>
        </div>
      </div>
      <p class="business-card-category">${escapeHtml(business.category || 'Business')}</p>
      <div class="business-card-actions">
        <a href="/business/${business.slug}/reviews" class="secondary">Reviews</a>
        <a href="/business/${business.slug}/settings" class="secondary">Settings</a>
        <a href="${reviewUrl}" target="_blank" class="primary">View Page</a>
      </div>
    `;

    // Add click handler for QR button
    const qrBtn = card.querySelector('.qr-btn-header');
    if (qrBtn) {
      qrBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const slug = qrBtn.dataset.slug;
        const url = qrBtn.dataset.url;
        const name = qrBtn.dataset.name;
        showQrModal(url, name);
      });
    }

    elements.businessesGrid.appendChild(card);
  }

  // Handle logout
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      window.location.href = '/signup';
    } catch (error) {
      console.error('Logout failed:', error);
      // Redirect anyway
      window.location.href = '/signup';
    }
  }

  // Show QR Code Modal
  async function showQrModal(url, businessName) {
    currentQrUrl = url;
    
    if (elements.qrModalTitle) {
      elements.qrModalTitle.textContent = `${businessName} - QR Code`;
    }
    
    if (elements.qrUrlInput) {
      elements.qrUrlInput.value = url;
    }
    
    elements.qrModal?.classList.remove('hidden');
    
    // Generate QR code
    await generateQRCode(url);
  }

  // Close QR Code Modal
  function closeQrModal() {
    elements.qrModal?.classList.add('hidden');
    currentQrUrl = null;
  }

  // Generate QR code
  async function generateQRCode(url) {
    try {
      const response = await fetch(`/api/qrcode?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (data.success && data.dataUrl) {
        const img = new Image();
        img.onload = () => {
          const canvas = elements.qrCanvas;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 256;
            ctx.drawImage(img, 0, 0);
          }
        };
        img.src = data.dataUrl;
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  }

  // Download QR Code
  function downloadQRCode() {
    const canvas = elements.qrCanvas;
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `qr-code-${Date.now()}.png`;
    link.href = url;
    link.click();
  }

  // Copy QR URL
  async function copyQrUrl() {
    if (!currentQrUrl) return;
    
    try {
      await navigator.clipboard.writeText(currentQrUrl);
      const originalText = elements.copyQrUrlBtn.textContent;
      elements.copyQrUrlBtn.textContent = 'Copied!';
      setTimeout(() => {
        elements.copyQrUrlBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback: select the input
      if (elements.qrUrlInput) {
        elements.qrUrlInput.select();
        elements.qrUrlInput.setSelectionRange(0, 99999);
      }
    }
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize on load
  init();
})();

