(() => {
  'use strict';

  const measurementId = 'G-YEXHBBHKEC';
  const disableKey = `ga-disable-${measurementId}`;
  const storageKey = 'listika-analytics-choice-v1';
  const sessionBlockKey = 'listika-analytics-block-v1';
  const choiceLifetime = 180 * 24 * 60 * 60 * 1000;
  const panel = document.getElementById('privacy-choice');
  const title = document.getElementById('privacy-choice-title');
  const message = document.getElementById('privacy-choice-message');
  const accept = document.getElementById('privacy-accept');
  const reject = document.getElementById('privacy-reject');
  const settings = document.getElementById('privacy-settings');
  const warning = document.getElementById('privacy-storage-warning');
  if (!panel || !title || !message || !accept || !reject || !settings || !warning || typeof panel.showModal !== 'function') return;

  let analyticsStarted = false;
  window[disableKey] = true;

  function gpcEnabled() {
    return navigator.globalPrivacyControl === true;
  }

  function readChoice() {
    try {
      if (sessionStorage.getItem(sessionBlockKey)) return null;
      const choice = JSON.parse(localStorage.getItem(storageKey));
      const now = Date.now();
      if (!choice || choice.version !== 1 || !['accepted', 'rejected'].includes(choice.analytics) ||
          !Number.isFinite(choice.savedAt) || !Number.isFinite(choice.expiresAt) ||
          choice.savedAt > now || choice.expiresAt <= now || choice.expiresAt !== choice.savedAt + choiceLifetime) return null;
      return choice.analytics;
    } catch {
      // No optional analytics when storage is unavailable or the choice is malformed.
      return null;
    }
  }

  function saveChoice(value) {
    try {
      // Keep the current tab blocked until the new choice is durably saved.
      sessionStorage.setItem(sessionBlockKey, '1');
      const savedAt = Date.now();
      const choice = JSON.stringify({ version: 1, analytics: value, savedAt, expiresAt: savedAt + choiceLifetime });
      localStorage.setItem(storageKey, choice);
      if (localStorage.getItem(storageKey) !== choice) throw new Error('Choice not saved');
      sessionStorage.removeItem(sessionBlockKey);
      return readChoice() === value;
    } catch {
      // Remove stale consent if possible and retain a tab-local block if not.
      try { localStorage.removeItem(storageKey); } catch { /* unavailable */ }
      try { sessionStorage.setItem(sessionBlockKey, '1'); } catch { /* unavailable */ }
      return false;
    }
  }

  function clearAnalyticsCookies() {
    const domains = location.hostname.split('.');
    for (const part of document.cookie.split(';')) {
      const name = part.trim().split('=')[0];
      if (!/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)) continue;
      const expired = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      document.cookie = expired;
      for (let i = 0; i < domains.length - 1; i++) {
        document.cookie = `${expired}; Domain=${domains.slice(i).join('.')}`;
      }
    }
  }

  function stopAnalytics() {
    window[disableKey] = true;
    clearAnalyticsCookies();
  }

  function startAnalytics() {
    if (analyticsStarted || gpcEnabled() || readChoice() !== 'accepted') return;
    analyticsStarted = true;
    window[disableKey] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { allow_google_signals: false, allow_ad_personalization_signals: false });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }

  function showPanel() {
    const gpc = gpcEnabled();
    accept.disabled = gpc;
    if (gpc) {
      message.textContent = 'Your browser has Global Privacy Control enabled. Analytics is off while this signal is on.';
      message.hidden = false;
    } else {
      message.textContent = '';
      message.hidden = true;
    }
    if (!panel.open) panel.showModal();
    title.focus();
  }

  function hidePanel() {
    if (panel.open) panel.close();
  }

  function showError() {
    message.textContent = 'Your choice could not be saved in this browser. Analytics remains off.';
    message.hidden = false;
    if (!panel.open) panel.showModal();
  }

  function choose(value) {
    if (value === 'accepted' && gpcEnabled()) return;
    // Stop first, even if storage has become unavailable since the last choice.
    if (value === 'rejected') stopAnalytics();
    if (!saveChoice(value)) {
      stopAnalytics();
      if (value === 'rejected') {
        hidePanel();
        warning.hidden = false;
      } else showError();
      return;
    }
    warning.hidden = true;
    hidePanel();
    if (value === 'accepted') startAnalytics();
    else if (analyticsStarted) {
      // Disable synchronously before reload so an already-loaded tag cannot keep measuring.
      location.reload();
      return;
    }
  }

  settings.hidden = false;
  settings.addEventListener('click', showPanel);
  panel.addEventListener('cancel', (event) => event.preventDefault());
  accept.addEventListener('click', () => choose('accepted'));
  reject.addEventListener('click', () => choose('rejected'));
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    const choice = readChoice();
    if (choice === 'accepted' && !gpcEnabled()) {
      hidePanel();
      startAnalytics();
    } else {
      stopAnalytics();
      if (analyticsStarted) location.reload();
      else if (location.pathname !== '/privacy/' && (!choice || (choice === 'accepted' && gpcEnabled()))) showPanel();
      else hidePanel();
    }
  });

  const choice = readChoice();
  if (choice === 'accepted' && !gpcEnabled()) startAnalytics();
  else {
    stopAnalytics();
    // The notice is readable before making a decision. The settings button
    // still opens the dialog there, and all optional measurement stays off.
    if (location.pathname !== '/privacy/' && (!choice || (choice === 'accepted' && gpcEnabled()))) showPanel();
  }
})();
