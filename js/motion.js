(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const hero = document.querySelector('.hero');
  const revealTargets = [...document.querySelectorAll([
    '.stats-heading', '.stat', '.section-heading', '.about-gallery', '.about-card',
    '.highlight', '.step', '.build-option', '.build-sheet', '.arena-stage', '.loot-slot', '.plan-card', '.download-panel', '.faq-list details',
    '.footer-grid > div', '.copyright',
  ].join(', '))];
  const revealed = new WeakSet();

  function reveal(target) {
    target.classList.remove('awaiting-entrance');
    observer.unobserve(target);
    revealed.add(target);
  }

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    if (preference.matches) return;
    let entering = 0;
    for (const {target, isIntersecting} of entries) {
      if (!isIntersecting || revealed.has(target)) continue;
      target.style.setProperty('--entrance-delay', Math.min(entering++, 3) * 46 + 'ms');
      reveal(target);
      target.classList.add('entered-viewport');
    }
  }, { rootMargin: '0px 0px 48px 0px' }) : null;

  document.addEventListener('focusin', (event) => {
    const target = event.target.closest('.awaiting-entrance, .entered-viewport');
    if (!target) return;
    reveal(target);
    target.classList.remove('entered-viewport');
  });

  let torchFrame = 0;
  let pointerX;
  let pointerY;

  function positionTorch() {
    torchFrame = 0;
    const bounds = hero.getBoundingClientRect();
    hero.style.setProperty('--torch-x', pointerX - bounds.left + 'px');
    hero.style.setProperty('--torch-y', pointerY - bounds.top + 'px');
    hero.classList.add('torch-lit');
  }

  function extinguishTorch() {
    cancelAnimationFrame(torchFrame);
    torchFrame = 0;
    hero.classList.remove('torch-lit');
  }

  hero.addEventListener('pointermove', (event) => {
    if (preference.matches || !finePointer.matches || event.pointerType === 'touch') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!torchFrame) torchFrame = requestAnimationFrame(positionTorch);
  }, { passive: true });
  hero.addEventListener('pointerleave', extinguishTorch);

  function updatePreference() {
    if (preference.matches) {
      observer?.disconnect();
      revealTargets.forEach((target) => target.classList.remove('awaiting-entrance', 'entered-viewport'));
      extinguishTorch();
      return;
    }
    if (!observer) return;
    const unseen = revealTargets.filter((target) => !revealed.has(target));
    const belowFold = unseen.map((target) => target.getBoundingClientRect().top > window.innerHeight + 32);
    for (const [index, target] of unseen.entries()) {
      if (!belowFold[index]) {
        reveal(target);
        continue;
      }
      target.classList.add('awaiting-entrance');
      observer.observe(target);
    }
  }

  preference.addEventListener('change', updatePreference);
  updatePreference();
})();
