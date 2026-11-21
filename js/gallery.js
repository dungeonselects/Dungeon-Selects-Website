(() => {
  const thumbs = [...document.querySelectorAll('.hero-thumb')];
  const heroZoom = document.querySelector('.hero-zoom');
  const atmosphere = document.querySelector('.hero-atmosphere');
  const sceneTitle = document.querySelector('.hero-scene-title');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const imageGroups = [...document.querySelectorAll('.about-gallery, .highlight-grid')]
    .map((group) => [...group.querySelectorAll('.gallery-trigger')]);
  const dialog = document.querySelector('.gallery-dialog');
  const title = dialog.querySelector('h2');
  const stage = dialog.querySelector('.gallery-stage');
  const largeImage = stage.querySelector('img');
  const count = dialog.querySelector('.gallery-count');
  const close = dialog.querySelector('.gallery-close');
  let heroIndex = 0;
  let heroImage = atmosphere.querySelector('img');
  let outgoing;
  let gallery;
  let activeIndex;
  let opener;
  let touchOrigin;
  let imageEntrance;

  function copy(key) {
    return translations[document.documentElement.lang === 'pt-BR' ? 'pt' : 'en'][key];
  }

  function describeImage(link, scene) {
    link.setAttribute('aria-label', copy('gallery-open') + ': ' + copy(scene));
  }

  function updateLabels() {
    const scene = thumbs[heroIndex].dataset.scene;
    sceneTitle.textContent = copy(scene);
    describeImage(heroZoom, scene);
    imageGroups.flat().forEach(link => describeImage(link, link.dataset.scene));
    if (dialog.open) title.textContent = copy(gallery[activeIndex].dataset.scene);
  }

  async function displayScene(index) {
    const item = thumbs[index];
    const next = new Image();
    next.className = 'hero-image';
    next.dataset.scene = item.dataset.scene;
    next.alt = '';
    if (next.dataset.scene === 'scene-stronghold') {
      next.sizes = '(max-width: 819px) 100vw, 83vw';
      next.srcset = 'images/stronghold-small.webp 800w, images/stronghold.webp 1440w';
    }
    next.src = item.href;
    try {
      await next.decode();
    } catch {
      return;
    }
    if (heroIndex !== index || heroImage.dataset.scene === next.dataset.scene) return;

    outgoing?.remove();
    const previous = heroImage;
    heroImage = next;
    atmosphere.prepend(next);
    if (motion.matches) {
      previous.remove();
      return;
    }
    outgoing = previous;
    previous.classList.add('hero-image-outgoing');
    const removePrevious = () => {
      previous.remove();
      if (outgoing === previous) outgoing = null;
    };
    previous.animate([{opacity: 1}, {opacity: 0}], {
      duration: 310, easing: 'ease-out', fill: 'forwards',
    }).finished.then(removePrevious, removePrevious);
  }

  function setHero(index) {
    if (heroIndex === index) return;
    thumbs[heroIndex].removeAttribute('aria-current');
    heroIndex = index;
    const selected = thumbs[index];
    selected.setAttribute('aria-current', 'true');
    heroZoom.href = selected.href;
    updateLabels();
    displayScene(index);
  }

  function renderSlide(index, transition = true) {
    activeIndex = (index + gallery.length) % gallery.length;
    const item = gallery[activeIndex];
    title.textContent = copy(item.dataset.scene);
    largeImage.src = item.href;
    count.textContent = String(activeIndex + 1) + ' / ' + gallery.length;
    if (gallery === thumbs) setHero(activeIndex);
    imageEntrance?.cancel();
    if (transition && !motion.matches) {
      largeImage.decode().then(() => {
        if (!dialog.open || motion.matches || largeImage.src !== item.href) return;
        imageEntrance?.cancel();
        imageEntrance = largeImage.animate([
          { opacity: .38, scale: '.985' }, { opacity: 1, scale: '1' },
        ], { duration: 270, easing: 'ease-out' });
      }, () => {});
    }
  }

  function openGallery(event, items, index) {
    if (!canOpen(event) || typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    opener = event.currentTarget;
    gallery = items;
    renderSlide(index, false);
    dialog.showModal();
  }

  function canOpen(event) {
    return !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
  }

  thumbs.forEach((thumb, index) => {
    thumb.addEventListener('click', (event) => {
      if (!canOpen(event)) return;
      event.preventDefault();
      setHero(index);
    });
    thumb.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const next = (index + step + thumbs.length) % thumbs.length;
      setHero(next);
      thumbs[next].focus();
    });
  });

  heroZoom.addEventListener('click', (event) => openGallery(event, thumbs, heroIndex));
  imageGroups.forEach((items) => {
    items.forEach((link, index) => {
      link.addEventListener('click', (event) => openGallery(event, items, index));
    });
  });
  close.addEventListener('click', () => dialog.close());
  dialog.querySelector('.gallery-previous').addEventListener('click', () => renderSlide(activeIndex - 1));
  dialog.querySelector('.gallery-next').addEventListener('click', () => renderSlide(activeIndex + 1));

  dialog.addEventListener('keydown', (event) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    renderSlide(activeIndex + step);
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    touchOrigin = null;
    imageEntrance?.cancel();
    if (document.activeElement === document.body) opener?.focus({ preventScroll: true });
  });

  stage.addEventListener('touchstart', (event) => {
    touchOrigin = event.touches.length === 1 ? event.touches[0] : null;
  }, { passive: true });
  stage.addEventListener('touchcancel', () => { touchOrigin = null; });
  stage.addEventListener('touchend', (event) => {
    if (!touchOrigin || event.touches.length > 0) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchOrigin.clientX;
    const dy = touch.clientY - touchOrigin.clientY;
    touchOrigin = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > 1.35 * Math.abs(dy)) {
      renderSlide(activeIndex + (dx > 0 ? -1 : 1));
    }
  }, { passive: true });

  updateLabels();
  document.addEventListener('site-language-change', updateLabels);
})();
