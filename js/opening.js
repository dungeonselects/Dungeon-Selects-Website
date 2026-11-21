(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!root.classList.contains('opening-pending') || motion.matches || document.hidden) {
    root.classList.remove('opening-pending');
    return;
  }

  const opening = document.querySelector('.opening-dialog');
  const doors = [...opening.querySelectorAll('.opening-door')];
  const sign = opening.querySelector('.opening-sign');
  const light = opening.querySelector('.opening-light');
  const hero = document.querySelector('.hero');
  let timer;

  function rememberOpening() {
    try {
      sessionStorage.setItem('ds-opening-seen-v1', '1');
    } catch {
      // The intro still runs when browser storage is unavailable.
    }
  }

  function finish(early = false) {
    if (!opening.open) return;
    clearTimeout(timer);
    if (early) hero.classList.remove('hero-introduced');
    opening.close();
  }

  function skip() {
    if (!opening.open || opening.classList.contains('is-skipping')) return;
    if (motion.matches || document.hidden) {
      finish(true);
      return;
    }

    clearTimeout(timer);
    const leftTransform = getComputedStyle(doors[0]).transform;
    const travelled = leftTransform === 'none' ? 0 : Math.abs(new DOMMatrix(leftTransform).e);
    const remaining = Math.max(0, 1 - travelled / (doors[0].offsetWidth * 1.01));
    const duration = Math.round(190 + 380 * remaining);
    for (const part of [...doors, sign, light]) {
      const style = getComputedStyle(part);
      part.style.setProperty('--skip-from', style.transform);
      part.style.setProperty('--skip-opacity', style.opacity);
    }
    if (travelled < 2) {
      hero.classList.remove('hero-introduced');
      hero.classList.add('hero-skip-reveal');
    }
    opening.style.setProperty('--skip-duration', duration + 'ms');
    opening.classList.add('is-skipping');
    timer = setTimeout(finish, duration + 85);
  }

  opening.addEventListener('click', skip);
  opening.addEventListener('cancel', (event) => {
    event.preventDefault();
    skip();
  });
  opening.addEventListener('animationend', (event) => {
    if (event.target === doors[0] && event.animationName === 'skip-door') finish();
  });
  opening.addEventListener('close', () => {
    opening.classList.remove('is-playing', 'is-skipping');
  });
  motion.addEventListener('change', () => {
    if (motion.matches) finish(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) finish(true);
  });

  try {
    opening.classList.add('is-playing');
    opening.showModal();
    hero.classList.add('hero-introduced');
    rememberOpening();
    timer = setTimeout(finish, 2090);
  } finally {
    root.classList.remove('opening-pending');
  }
})();
