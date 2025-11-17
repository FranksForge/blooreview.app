(() => {
  'use strict';

  // DOM elements
  const elements = {
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    reviewsList: document.getElementById('reviews-list'),
    emptyState: document.getElementById('empty-state'),
    businessName: document.getElementById('business-name'),
    logoutBtn: document.getElementById('logout-btn')
  };

  // Extract slug from URL
  function getSlugFromUrl() {
    const path = window.location.pathname;
    // Path format: /business/[slug]/reviews
    const match = path.match(/^\/business\/([^\/]+)\/reviews/);
    return match ? match[1] : null;
  }

  // Initialize
  async function init() {
    // Check authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      window.location.href = '/signup';
      return;
    }

    // Setup event listeners
    elements.logoutBtn?.addEventListener('click', handleLogout);

    // Load reviews
    await loadReviews();
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

  // Load reviews
  async function loadReviews() {
    try {
      const slug = getSlugFromUrl();
      if (!slug) {
        throw new Error('Invalid business slug');
      }

      elements.loading.style.display = 'block';
      elements.error.classList.add('hidden');
      elements.reviewsList.innerHTML = '';
      elements.emptyState.classList.add('hidden');

      const response = await fetch(`/api/business/${slug}/reviews`, {
        credentials: 'include'
      });

      if (!response.ok) {
        let errorMessage = 'Failed to load reviews';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        if (response.status === 401) {
          window.location.href = '/signup';
          return;
        }
        if (response.status === 403) {
          throw new Error('Access denied');
        }
        if (response.status === 404) {
          throw new Error('Business not found');
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const { businessName, reviews } = data;

      // Update business name in header
      if (businessName && elements.businessName) {
        elements.businessName.textContent = `${businessName} - Reviews`;
      }

      elements.loading.style.display = 'none';

      if (!reviews || reviews.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
      }

      // Render reviews
      reviews.forEach(review => {
        renderReview(review);
      });

    } catch (error) {
      console.error('Error loading reviews:', error);
      elements.loading.style.display = 'none';
      const errorMessage = error.message || 'Failed to load reviews';
      console.error('Error details:', errorMessage);
      elements.error.textContent = errorMessage;
      elements.error.classList.remove('hidden');
    }
  }

  // Render a single review
  function renderReview(review) {
    const reviewItem = document.createElement('div');
    reviewItem.className = 'review-item';

    // Format date
    const date = new Date(review.submittedAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Render stars
    const starsHtml = Array.from({ length: 5 }, (_, i) => {
      const isFilled = i < review.rating;
      return `<span class="${isFilled ? 'star-filled' : 'star-empty'}">${isFilled ? '★' : '☆'}</span>`;
    }).join('');

    // Name or Anonymous
    const nameDisplay = review.name || 'Anonymous';
    const nameClass = review.name ? '' : 'anonymous';

    reviewItem.innerHTML = `
      <div class="review-header">
        <div>
          <div class="review-rating">${starsHtml}</div>
          <div class="review-name ${nameClass}">${escapeHtml(nameDisplay)}</div>
        </div>
        <div class="review-date">${formattedDate}</div>
      </div>
      <p class="review-comments">${escapeHtml(review.comments)}</p>
    `;

    elements.reviewsList.appendChild(reviewItem);
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

