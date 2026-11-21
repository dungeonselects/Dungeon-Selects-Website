(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const languageButton = document.querySelector('#lang-btn');
  const languagePicker = languageButton.closest('details');
  const languageOptions = [...languagePicker.querySelectorAll('[data-language]')];
  const languageLabel = document.querySelector('#lang-label');
  const flag = languageButton.querySelector('.flag');
  const menuButton = document.querySelector('#menu-btn');
  const nav = document.querySelector('#site-nav');
  const mobile = matchMedia('(max-width: 1080px)');
  const topButton = document.querySelector('.back-top');
  const downloadDialog = document.querySelector('.download-dialog');
  const downloadTitle = document.querySelector('#download-dialog-title');
  const downloadStatus = document.querySelector('#download-dialog-status');
  const downloadCursor = document.querySelector('.download-cursor');
  const downloadLinks = [...document.querySelectorAll('a[download]')];
  const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
  let language = 'en';
  let checkingDownload = false;
  let downloadOrigin;

  function applyLanguage(next) {
    language = next === 'pt' ? 'pt' : 'en';
    const copy = translations[language];
    root.lang = language === 'pt' ? 'pt-BR' : 'en';
    languageLabel.textContent = language.toUpperCase();
    flag.className = 'flag flag-' + language;
    for (const option of languageOptions) {
      if (option.dataset.language === language) option.setAttribute('aria-current', 'true');
      else option.removeAttribute('aria-current');
    }
    document.querySelectorAll('[data-copy]').forEach((element) => {
      element.textContent = copy[element.dataset.copy];
    });
    document.querySelectorAll('[data-copy-label]').forEach((element) => {
      element.setAttribute('aria-label', copy[element.dataset.copyLabel]);
    });
    document.dispatchEvent(new Event('site-language-change'));
  }

  try {
    language = localStorage.getItem('nd-lang') || 'en';
  } catch {
    // The language still works during this visit if storage is unavailable.
  }
  applyLanguage(language);
  languageButton.hidden = false;
  for (const option of languageOptions) {
    option.addEventListener('click', () => {
      applyLanguage(option.dataset.language);
      languagePicker.open = false;
      languageButton.focus();
      try {
        localStorage.setItem('nd-lang', language);
      } catch {
        // Storage can be blocked by browser privacy settings.
      }
    });
  }
  document.addEventListener('click', (event) => {
    if (!languagePicker.contains(event.target)) languagePicker.open = false;
  });
  languagePicker.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && languagePicker.open) {
      languagePicker.open = false;
      languageButton.focus();
    }
  });

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    nav.inert = mobile.matches && !open;
    menuButton.setAttribute('aria-expanded', String(open));
    if (open) navLinks[0].focus({ preventScroll: true });
  }

  setMenu(false);
  menuButton.hidden = false;
  root.classList.remove('site-starting');
  menuButton.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  mobile.addEventListener('change', () => setMenu(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenu(false);
      menuButton.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!nav.contains(event.target) && !menuButton.contains(event.target)) setMenu(false);
  });
  document.addEventListener('focusin', (event) => {
    if (!event.target.closest('.site-header') && nav.classList.contains('is-open')) setMenu(false);
  });

  const sectionLinks = new Set(navLinks.map((link) => link.hash));
  document.querySelectorAll('main section[id]').forEach((section) => {
    section.tabIndex = -1;
  });

  function updateCurrentLink() {
    for (const link of navLinks) {
      if (link.hash === location.hash) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  updateCurrentLink();
  window.addEventListener('hashchange', updateCurrentLink);
  navLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));

  function updateTopButton() {
    topButton.hidden = window.scrollY < 650 && document.activeElement !== topButton;
  }

  window.addEventListener('scroll', updateTopButton, { passive: true });
  topButton.addEventListener('blur', updateTopButton);
  topButton.addEventListener('click', () => {
    document.querySelector('.site-header .brand').focus({ preventScroll: true });
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    updateCurrentLink();
    window.scrollTo({ top: 0 });
  });
  updateTopButton();

  // The server may forward these events to Discord using its own private credential.
  const logEndpoint = window.__DOWNLOAD_LOG__?.endpoint;
  function logEvent(event, target) {
    if (!logEndpoint || !['https:', 'http:'].includes(location.protocol)) return;
    try {
      const url = new URL(logEndpoint, location.href);
      if (url.origin !== location.origin) return;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, target }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // A missing or invalid optional endpoint must not interrupt navigation.
    }
  }

  if (logEndpoint) {
    const visitKey = 'eld_discord_site_visit_logged_v1';
    try {
      if (!sessionStorage.getItem(visitKey)) {
        logEvent('visit', '/');
        sessionStorage.setItem(visitKey, '1');
      }
    } catch {
      // Without session storage, omit the visit event to avoid duplicates.
    }
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (link && sectionLinks.has(link.hash)) {
        logEvent(nav.contains(link) ? 'navigation' : 'anchor', link.hash);
      }
    });
  }

  function setDownloadState(state, titleKey, statusKey) {
    const copy = translations[language];
    downloadDialog.dataset.state = state;
    downloadTitle.dataset.copy = titleKey;
    downloadTitle.textContent = copy[titleKey];
    downloadStatus.dataset.copy = statusKey;
    downloadStatus.textContent = copy[statusKey];
  }

  function hideDownloadCursor() {
    downloadCursor.hidden = true;
  }

  function moveDownloadCursor(event) {
    const mouse = event.pointerType === 'mouse' ||
      (!event.pointerType && event.type === 'click' && event.detail > 0);
    if (!mouse || !downloadDialog.open || !document.hasFocus() || document.hidden || !downloadCursor.naturalWidth) {
      hideDownloadCursor();
      return;
    }

    downloadCursor.style.transform = `translate(${event.clientX - 10}px, ${event.clientY - 4}px)`;
    downloadCursor.hidden = false;
  }

  downloadDialog.addEventListener('pointermove', moveDownloadCursor);
  downloadDialog.addEventListener('pointerleave', hideDownloadCursor);
  window.addEventListener('blur', hideDownloadCursor);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hideDownloadCursor();
  });
  downloadDialog.addEventListener('close', () => {
    if (!downloadOrigin || downloadDialog.open) return;
    hideDownloadCursor();
    const { link, left, top } = downloadOrigin;
    downloadOrigin = null;
    link.focus({ preventScroll: true });
    window.scrollTo({ left, top, behavior: 'instant' });
  });

  async function downloadPackage(event) {
    const link = event.currentTarget;
    const nativeDownload = event.metaKey || event.ctrlKey || event.altKey || event.shiftKey ||
      typeof downloadDialog.showModal !== 'function';
    if (nativeDownload) {
      logEvent('download', link.getAttribute('href'));
      return;
    }

    event.preventDefault();
    if (checkingDownload || downloadDialog.open) return;
    downloadOrigin = { link, left: window.scrollX, top: window.scrollY };
    setDownloadState('preparing', 'download-preparing', 'download-locating');
    downloadDialog.showModal();
    moveDownloadCursor(event);
    if (location.protocol === 'file:') {
      setDownloadState('error', 'download-problem', 'download-start-site');
      return;
    }

    checkingDownload = true;
    logEvent('download', link.getAttribute('href'));

    try {
      const preparation = matchMedia('(prefers-reduced-motion: no-preference)').matches
        ? new Promise((resolve) => setTimeout(resolve, 850))
        : Promise.resolve();
      const [response] = await Promise.all([
        fetch(link.href, { method: 'HEAD', signal: AbortSignal.timeout(7000) }),
        preparation,
      ]);
      const htmlResponse = response.headers.get('Content-Type')?.includes('text/html');
      const unavailable = response.status === 404 || response.status === 410 || (response.ok && htmlResponse);
      if (unavailable) {
        setDownloadState('error', 'download-problem', 'download-unavailable');
        return;
      }
      if (!response.ok && response.status !== 405 && response.status !== 501) {
        setDownloadState('error', 'download-problem', 'download-error');
        return;
      }
      // The save dialog can take over without dispatching pointerleave.
      hideDownloadCursor();
      link.cloneNode(false).click();
      setDownloadState('started', 'download-started', 'download-next');
    } catch {
      setDownloadState('error', 'download-problem', 'download-error');
    } finally {
      checkingDownload = false;
    }
  }

  downloadLinks.forEach((link) => link.addEventListener('click', downloadPackage));
})();
