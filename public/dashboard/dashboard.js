(() => {
  'use strict';

  // DOM elements
  const elements = {
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    businessesGrid: document.getElementById('businesses-grid'),
    emptyState: document.getElementById('empty-state'),
    logoutBtn: document.getElementById('logout-btn')
  };

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
    const card = document.createElement('a');
    card.href = `/business/${business.slug}/settings`;
    card.className = 'business-card';

    const hostname = window.location.hostname;
    const baseDomain = hostname.includes('.') 
      ? hostname.split('.').slice(-2).join('.')
      : 'blooreview.app';
    const reviewUrl = `https://${business.slug}.${baseDomain}`;

    card.innerHTML = `
      ${business.heroImage ? `<img src="${business.heroImage}" alt="${business.name}" class="business-card-hero" />` : ''}
      <div class="business-card-header">
        <h3 class="business-card-name">${escapeHtml(business.name)}</h3>
      </div>
      <p class="business-card-category">${escapeHtml(business.category || 'Business')}</p>
      <div class="business-card-actions">
        <a href="/business/${business.slug}/reviews" class="secondary">Reviews</a>
        <a href="/business/${business.slug}/settings" class="secondary">Settings</a>
        <a href="${reviewUrl}" target="_blank" class="primary">View Page</a>
      </div>
    `;

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

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize on load
  init();
})();

