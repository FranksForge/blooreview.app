(() => {
  'use strict';

  const elements = {
    loginForm: document.getElementById('login-form'),
    email: document.getElementById('email'),
    password: document.getElementById('password'),
    loginError: document.getElementById('login-error')
  };

  // Initialize
  function init() {
    setupEventListeners();
  }

  // Event listeners
  function setupEventListeners() {
    elements.loginForm?.addEventListener('submit', handleLoginSubmit);
  }

  // Login submission
  async function handleLoginSubmit(e) {
    e.preventDefault();
    hideError();

    const email = elements.email.value.trim();
    const password = elements.password.value;

    if (!email || !password) {
      showError('Email and password are required');
      return;
    }

    // Disable form during submission
    const submitBtn = elements.loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // Include cookies
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Success - redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      showError(error.message || 'Failed to sign in. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  // Error handling
  function showError(message) {
    if (elements.loginError) {
      elements.loginError.textContent = message;
      elements.loginError.classList.add('show');
    }
  }

  function hideError() {
    if (elements.loginError) {
      elements.loginError.textContent = '';
      elements.loginError.classList.remove('show');
    }
  }

  // Initialize on load
  init();
})();

