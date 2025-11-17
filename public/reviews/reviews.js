(() => {
  'use strict';

  // DOM elements
  const elements = {
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    reviewsList: document.getElementById('reviews-list'),
    emptyState: document.getElementById('empty-state'),
    businessName: document.getElementById('business-name'),
    logoutBtn: document.getElementById('logout-btn'),
    getAnalyticsBtn: document.getElementById('get-analytics-btn'),
    analyticsSection: document.getElementById('analytics-section'),
    closeAnalyticsBtn: document.getElementById('close-analytics-btn'),
    statTotal: document.getElementById('stat-total'),
    statAverage: document.getElementById('stat-average'),
    ratingDistributionChart: document.getElementById('rating-distribution-chart'),
    timeSeriesCanvas: document.getElementById('time-series-canvas')
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
    elements.getAnalyticsBtn?.addEventListener('click', handleGetAnalytics);
    elements.closeAnalyticsBtn?.addEventListener('click', closeAnalytics);

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

  // Handle Get Analytics
  async function handleGetAnalytics() {
    try {
      const slug = getSlugFromUrl();
      if (!slug) {
        throw new Error('Invalid business slug');
      }

      // Show loading state
      if (elements.getAnalyticsBtn) {
        elements.getAnalyticsBtn.disabled = true;
        elements.getAnalyticsBtn.textContent = 'Loading...';
      }

      const response = await fetch(`/api/business/${slug}/reviews?analytics=true`, {
        credentials: 'include'
      });

      if (!response.ok) {
        let errorMessage = 'Failed to load analytics';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const { analytics } = data;

      // Display analytics
      displayAnalytics(analytics);

      // Show analytics section
      if (elements.analyticsSection) {
        elements.analyticsSection.classList.remove('hidden');
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
      alert(error.message || 'Failed to load analytics');
    } finally {
      // Reset button
      if (elements.getAnalyticsBtn) {
        elements.getAnalyticsBtn.disabled = false;
        elements.getAnalyticsBtn.textContent = 'Get Analytics';
      }
    }
  }

  // Close Analytics
  function closeAnalytics() {
    if (elements.analyticsSection) {
      elements.analyticsSection.classList.add('hidden');
    }
  }

  // Display Analytics
  function displayAnalytics(analytics) {
    // Update stats
    if (elements.statTotal) {
      elements.statTotal.textContent = analytics.totalReviews;
    }
    if (elements.statAverage) {
      elements.statAverage.textContent = analytics.averageRating.toFixed(1);
    }

    // Render rating distribution chart
    renderRatingDistribution(analytics.ratingDistribution);

    // Render time series chart
    renderTimeSeriesChart(analytics.timeSeries);
  }

  // Render Rating Distribution Bar Chart
  function renderRatingDistribution(distribution) {
    if (!elements.ratingDistributionChart) return;

    elements.ratingDistributionChart.innerHTML = '';

    const maxCount = Math.max(...Object.values(distribution.counts));
    const ratings = [1, 2, 3, 4, 5];

    ratings.forEach(rating => {
      const count = distribution.counts[rating] || 0;
      const percentage = distribution.percentages[rating] || 0;
      const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;

      const barContainer = document.createElement('div');
      barContainer.className = 'rating-bar-container';
      barContainer.innerHTML = `
        <div class="rating-bar-label">
          <span>${rating}★</span>
          <span class="rating-bar-count">${count}</span>
        </div>
        <div class="rating-bar-wrapper">
          <div class="rating-bar" style="width: ${barHeight}%"></div>
        </div>
        <div class="rating-bar-percentage">${percentage.toFixed(1)}%</div>
      `;
      elements.ratingDistributionChart.appendChild(barContainer);
    });
  }

  // Render Time Series Line Chart
  function renderTimeSeriesChart(timeSeries) {
    if (!elements.timeSeriesCanvas) return;

    const canvas = elements.timeSeriesCanvas;
    const ctx = canvas.getContext('2d');
    const padding = 40;
    const chartWidth = canvas.offsetWidth || 600;
    const chartHeight = 200;

    canvas.width = chartWidth;
    canvas.height = chartHeight;

    const maxCount = Math.max(...timeSeries.map(d => d.count), 1);
    const dataPoints = timeSeries.length;
    const stepX = (chartWidth - padding * 2) / (dataPoints - 1);

    // Clear canvas
    ctx.clearRect(0, 0, chartWidth, chartHeight);

    // Draw axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, chartHeight - padding);
    ctx.lineTo(chartWidth - padding, chartHeight - padding);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#f0f0f0';
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight - padding * 2) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(chartWidth - padding, y);
      ctx.stroke();
    }

    // Draw line
    ctx.strokeStyle = '#3365ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    timeSeries.forEach((point, index) => {
      const x = padding + index * stepX;
      const y = chartHeight - padding - (point.count / maxCount) * (chartHeight - padding * 2);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points
    ctx.fillStyle = '#3365ff';
    timeSeries.forEach((point, index) => {
      const x = padding + index * stepX;
      const y = chartHeight - padding - (point.count / maxCount) * (chartHeight - padding * 2);
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw labels (every 5 days)
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < dataPoints; i += 5) {
      const x = padding + i * stepX;
      const date = new Date(timeSeries[i].date);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      ctx.fillText(label, x, chartHeight - padding + 15);
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

