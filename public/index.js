(() => {
  'use strict';

  const form = document.getElementById('login-form');
  const emailEl = document.getElementById('email');
  const passwordEl = document.getElementById('password');
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message || 'Something went wrong. Please try again.';
      errorEl.classList.add('show');
    }
  }

  function clearError() {
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();

    const email = emailEl.value.trim();
    const password = passwordEl.value;

    if (!email || !password) {
      showError('Email and password are required');
      return;
    }

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Logging in...';

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(data.error || 'Invalid email or password');
      }

      window.location.assign('/dashboard');
    } catch (err) {
      showError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  form?.addEventListener('submit', handleSubmit);
})();


