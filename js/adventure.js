(() => {
  const builds = {
    vanguard: { icon: 'sword', power: 7, armor: 7, speed: 5 },
    ranger: { icon: 'bow', power: 6, armor: 4, speed: 9 },
    arcanist: { icon: 'staff', power: 10, armor: 3, speed: 6 },
    sentinel: { icon: 'shield', power: 5, armor: 10, speed: 4 },
  };
  const guardians = {
    ash: { health: 78, damage: 18, image: 'arena-ash-drake', rewards: [['talisman', 55], ['ember-blade', 30], ['relic', 15]] },
    stone: { health: 103, damage: 21, image: 'arena-stone-warden', rewards: [['talisman', 55], ['stone-charm', 30], ['ward', 15]] },
    shade: { health: 91, damage: 23, image: 'arena-temple-shade', rewards: [['talisman', 55], ['shade-bow', 30], ['staff', 15]] },
  };
  const find = (selector) => document.querySelector(selector);
  const all = (selector) => [...document.querySelectorAll(selector)];
  const words = (key) => translations[document.documentElement.lang === 'pt-BR' ? 'pt' : 'en'][key];
  const fill = (key, values) => words(key).replace(/\{(\w+)\}/g, (_, token) => String(values[token]));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const buildSheet = find('.build-sheet');

  const sound = find('.sound-toggle');
  let audio;
  let soundEnabled = false;
  sound.hidden = typeof window.AudioContext !== 'function';
  sound.addEventListener('click', async () => {
    if (soundEnabled) {
      soundEnabled = false;
      sound.setAttribute('aria-pressed', 'false');
      return;
    }
    sound.disabled = true;
    try {
      audio ??= new AudioContext();
      await audio.resume();
      soundEnabled = true;
      sound.setAttribute('aria-pressed', 'true');
      tone(392);
    } catch {
      sound.title = words('sound-unavailable');
    } finally {
      sound.disabled = false;
    }
  });

  function tone(pitch) {
    if (!soundEnabled || audio?.state !== 'running') return;
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    const start = audio.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.value = pitch;
    volume.gain.setValueAtTime(.055, start);
    volume.gain.exponentialRampToValueAtTime(.001, start + .14);
    oscillator.connect(volume);
    volume.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + .15);
  }

  const buildButtons = all('[data-build]');
  const guardianButtons = all('[data-guardian]');
  const inventory = arenaLoot.load();
  const lootSlots = find('.loot-slots');
  const lootTemplate = find('#loot-slot-template');
  const lootButtons = Object.entries(arenaLoot.items).map(([id, item]) => {
    const button = lootTemplate.content.firstElementChild.cloneNode(true);
    button.dataset.loot = id;
    button.dataset.tier = item.rarity;
    button.querySelector('.pixel-icon').classList.add('icon-' + item.icon);
    lootSlots.append(button);
    return button;
  });
  const equipmentSlots = all('[data-equipped-slot]');
  const equip = find('#loot-equip');
  const rewardPreview = find('.arena-drop-preview');
  const rewardPool = find('#arena-reward-pool');
  const rewardCard = find('.arena-reward-card');
  const rewardLink = find('.arena-reward');
  const arenaImage = find('.arena-art img');
  const health = Object.fromEntries(all('[data-health]').map((bar) => [bar.dataset.health, bar]));
  const attack = find('[data-move="attack"]');
  const guard = find('[data-move="guard"]');
  let build = 'vanguard';
  let guardian = 'ash';
  let loot = inventory.equipped.weapon || inventory.equipped.accessory || 'blade';
  let fight;
  let hitAnimation;

  function select(buttons, key, value) {
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset[key] === value));
  }

  function renderBuild() {
    const choice = builds[build];
    const key = 'build-' + build;
    select(buildButtons, 'build', build);
    find('#build-icon').className = 'pixel-icon icon-' + choice.icon;
    find('#build-name').textContent = words(key);
    find('#build-role').textContent = words(key + '-role');
    find('#build-desc').textContent = words(key + '-desc');
    for (const name of ['power', 'armor', 'speed']) {
      find('[data-stat="' + name + '"]').value = choice[name];
      find('[data-value="' + name + '"]').textContent = choice[name];
    }
  }

  function renderLoot() {
    const item = arenaLoot.items[loot];
    const equipped = inventory.equipped[item.slot] === loot;
    select(lootButtons, 'loot', loot);
    find('#loot-icon').className = 'pixel-icon icon-' + item.icon;
    find('#loot-name').textContent = words('loot-' + loot);
    find('#loot-desc').textContent = words('loot-' + loot + '-desc');
    find('#loot-bonuses').textContent = Object.entries(item.bonus)
      .map(([stat, amount]) => '+' + amount + ' ' + words('build-' + stat)).join(' · ');
    find('#loot-state').textContent = [
      words('loot-' + item.slot),
      fill('loot-stock', { count: inventory.counts[loot] }),
      equipped ? words('loot-equipped') : '',
    ].filter(Boolean).join(' · ');
    equip.textContent = words(equipped ? 'loot-unequip' : 'loot-equip');
    const counts = Object.values(inventory.counts);
    find('#loot-count').textContent = fill('loot-count', {
      types: counts.length,
      total: counts.reduce((sum, count) => sum + count, 0),
    });
    for (const slot of equipmentSlots) {
      const id = inventory.equipped[slot.dataset.equippedSlot];
      slot.textContent = id ? words('loot-' + id) : words('loot-empty-slot');
    }
    for (const button of lootButtons) {
      const id = button.dataset.loot;
      const entry = arenaLoot.items[id];
      const count = inventory.counts[id];
      button.hidden = !count;
      button.querySelector('strong').textContent = words('loot-' + id);
      button.querySelector('small').textContent = words('loot-' + entry.rarity);
      button.querySelector('.loot-quantity').textContent = '×' + (count || 0);
      const badge = button.querySelector('.loot-equipped');
      badge.textContent = words('loot-equipped');
      badge.hidden = inventory.equipped[entry.slot] !== id;
    }
  }

  function renderArenaReward(pool) {
    const drop = fight.reward;
    rewardPreview.hidden = Boolean(drop);
    rewardCard.hidden = !drop;
    rewardLink.hidden = !drop;
    if (drop) {
      const item = arenaLoot.items[drop];
      rewardCard.dataset.tier = item.rarity;
      find('#arena-reward-icon').className = 'pixel-icon icon-' + item.icon;
      find('#arena-reward-name').textContent = words('loot-' + drop);
      find('#arena-reward-rarity').textContent = words('loot-' + item.rarity);
      find('#arena-reward-state').textContent = words('arena-reward-unlocked');
      find('#arena-reward-detail').textContent = fill('arena-reward-stored', { count: inventory.counts[drop] });
      return;
    }

    rewardPool.replaceChildren(...pool.map(([id, chance]) => {
      const item = arenaLoot.items[id];
      const row = document.createElement('li');
      row.className = 'arena-drop-option';
      row.dataset.tier = item.rarity;
      const name = document.createElement('strong');
      name.textContent = words('loot-' + id);
      const rarity = document.createElement('span');
      rarity.textContent = words('loot-' + item.rarity) + ' · ' + chance + '%';
      row.append(name, rarity);
      return row;
    }));
  }

  function renderArena() {
    const opponent = guardians[guardian];
    select(guardianButtons, 'guardian', guardian);
    find('#arena-name').textContent = words('arena-guardian-' + guardian);
    find('#arena-build').textContent = words('build-' + build);
    health.hero.max = 60 + fight.stats.armor * 3;
    health.enemy.max = opponent.health;
    for (const name of ['hero', 'enemy']) {
      health[name].value = fight[name];
      find('[data-health-text="' + name + '"]').textContent = fight[name] + ' / ' + health[name].max;
    }
    attack.disabled = fight.ended;
    guard.disabled = fight.ended || fight.guarded;
    renderArenaReward(opponent.rewards);
    const item = fight.reward ? words('loot-' + fight.reward) : '';
    find('#arena-status').textContent = fill(fight.status, { ...fight.values, item });
  }

  function resetFight() {
    hitAnimation?.cancel();
    const stats = arenaLoot.combatStats(builds[build], inventory.equipped);
    fight = {
      stats, hero: 60 + stats.armor * 3, enemy: guardians[guardian].health,
      guarded: false, ended: false, status: 'arena-ready', values: {}, reward: null,
    };
    const source = 'images/' + guardians[guardian].image + '.webp';
    if (arenaImage.getAttribute('src') !== source) arenaImage.src = source;
    renderArena();
  }

  function playRound(defending) {
    if (fight.ended || (defending && fight.guarded)) return;
    const choice = fight.stats;
    const opponent = guardians[guardian];
    const hit = defending ? 0 : choice.power * 2 + choice.speed + (fight.guarded ? 15 : 0);
    const threat = Math.max(4, opponent.damage - choice.armor);
    const counter = defending ? Math.ceil(threat / 4) : threat;
    fight.enemy = Math.max(0, fight.enemy - hit);
    fight.guarded = defending;
    if (fight.enemy === 0) {
      fight.ended = true;
      fight.status = 'arena-win';
      fight.reward = arenaLoot.draw(opponent.rewards);
      inventory.counts[fight.reward] = (inventory.counts[fight.reward] || 0) + 1;
      arenaLoot.save(inventory);
      renderLoot();
    } else {
      fight.hero = Math.max(0, fight.hero - counter);
      fight.ended = fight.hero === 0;
      fight.status = fight.ended ? 'arena-loss' : defending ? 'arena-block' : 'arena-hit';
    }
    fight.values = { hit, counter };
    renderArena();
    tone(fight.enemy === 0 ? 523 : defending ? 185 : 262);
    if (!defending && !reducedMotion.matches) {
      hitAnimation?.cancel();
      hitAnimation = arenaImage.animate([{ transform: 'scale(1.04)', filter: 'brightness(1.55)' }, {}], 220);
    }
  }

  for (const button of buildButtons) {
    button.addEventListener('click', () => {
      if (build === button.dataset.build) return;
      build = button.dataset.build;
      renderBuild();
      resetFight();
      if (!reducedMotion.matches) buildSheet.animate([{ opacity: .6, transform: 'translateY(4px)' }, {}], 250);
      tone(330);
    });
  }
  for (const button of guardianButtons) {
    button.addEventListener('click', () => {
      if (guardian === button.dataset.guardian) return;
      guardian = button.dataset.guardian;
      resetFight();
      tone(277);
    });
  }
  for (const button of lootButtons) {
    button.addEventListener('click', () => {
      loot = button.dataset.loot;
      renderLoot();
      tone(440);
    });
  }
  equip.addEventListener('click', () => {
    const { slot } = arenaLoot.items[loot];
    inventory.equipped[slot] = inventory.equipped[slot] === loot ? null : loot;
    arenaLoot.save(inventory);
    renderLoot();
    if (fight.status === 'arena-ready') resetFight();
    tone(440);
  });
  attack.addEventListener('click', () => playRound(false));
  guard.addEventListener('click', () => playRound(true));
  find('.reset-arena').addEventListener('click', resetFight);
  rewardLink.addEventListener('click', () => {
    loot = fight.reward;
    renderLoot();
  });

  const copy = find('.copy-path');
  copy.hidden = !navigator.clipboard;
  let copyTimer;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('%appdata%\\.minecraft\\mods');
      copy.textContent = words('install-copied');
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copy.textContent = words('install-copy'); }, 1400);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(copy.closest('.step').querySelector('.step-tip'));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });

  for (const id of ['arsenal', 'arena', 'loot']) {
    find('#' + id).hidden = false;
    find('#site-nav a[href="#' + id + '"]').closest('li').hidden = false;
  }
  find('.hero-actions a[href="#arena"]').hidden = false;

  for (const option of all('[data-plan]')) {
    option.addEventListener('click', () => tone(294));
  }

  const track = find('#world-track');
  const worldCards = [...track.children];
  const goBack = find('.world-prev');
  const goForward = find('.world-next');
  let cardIndex = 0;
  function worldPosition() {
    const maximum = track.scrollWidth - track.clientWidth;
    const position = Math.max(0, track.scrollLeft);
    cardIndex = worldCards.reduce((nearest, card, index) =>
      Math.abs(card.offsetLeft - position) < Math.abs(worldCards[nearest].offsetLeft - position) ? index : nearest, 0);
    goBack.disabled = position < 2;
    goForward.disabled = position > maximum - 2;
    find('.world-count').textContent = (goForward.disabled ? worldCards.length : cardIndex + 1) + ' / ' + worldCards.length;
  }
  function moveWorld(direction) {
    worldPosition();
    const target = worldCards[cardIndex + direction];
    if (!target) return;
    track.scrollTo({ left: target.offsetLeft, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    if (reducedMotion.matches) worldPosition();
  }
  goBack.addEventListener('click', () => moveWorld(-1));
  goForward.addEventListener('click', () => moveWorld(1));
  track.addEventListener('scroll', worldPosition, { passive: true });
  window.addEventListener('resize', worldPosition);
  find('.world-controls').hidden = false;
  worldPosition();

  const dock = find('.inventory-dock');
  const header = find('.site-header');
  const dockLinks = all('.dock-slots a');
  const navigationLinks = all('.dock-slots a, #site-nav a');
  const destinations = dockLinks.map((link) => document.getElementById(link.hash.slice(1)));
  const dockLabel = find('.dock-location');
  let scrollFrame = 0;
  let activeDestination = 0;
  function showDockLabel() {
    const hovered = dock.querySelector('.dock-slots a:hover');
    const focused = dock.querySelector('.dock-slots a:focus-visible');
    dockLabel.textContent = words((focused || hovered || dockLinks[activeDestination]).dataset.copyLabel);
  }

  function updateNavigation() {
    scrollFrame = 0;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
    dock.hidden = window.scrollY < 96 && !dock.contains(document.activeElement);
    const edge = window.innerHeight * .32;
    let selected = 0;
    for (const [index, destination] of destinations.entries()) {
      if (destination.getBoundingClientRect().top <= edge) selected = index;
    }
    activeDestination = selected;
    showDockLabel();
    for (const link of navigationLinks) {
      if (link.hash === dockLinks[selected].hash) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateNavigation);
  }, { passive: true });
  dock.addEventListener('pointerover', showDockLabel);
  dock.addEventListener('pointerleave', showDockLabel);
  dock.addEventListener('focusin', showDockLabel);
  dock.addEventListener('focusout', () => requestAnimationFrame(updateNavigation));
  dock.addEventListener('keydown', (event) => {
    const index = dockLinks.indexOf(document.activeElement);
    const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : -1;
    if (index < 0 || !dockLinks[next]) return;
    event.preventDefault();
    dockLinks[next].focus();
  });

  const chipColors = ['#ffe0a0', '#ffc46b', '#ddaefe', '#ff8d52'];
  let burst;
  let burstTimer;
  document.addEventListener('click', (event) => {
    if (reducedMotion.matches || !event.detail || event.target.closest('dialog')) return;
    burst?.remove();
    clearTimeout(burstTimer);
    burst = document.createElement('span');
    burst.className = 'pick-burst';
    burst.setAttribute('aria-hidden', 'true');
    burst.style.left = event.clientX + 'px';
    burst.style.top = event.clientY + 'px';
    for (let index = 0; index < 8; index++) {
      const angle = index * Math.PI / 4 + Math.random() * .4;
      const distance = 16 + Math.random() * 18;
      const chip = document.createElement('i');
      chip.style.setProperty('--chip-x', Math.cos(angle) * distance + 'px');
      chip.style.setProperty('--chip-y', Math.sin(angle) * distance + 'px');
      chip.style.setProperty('--chip-size', (index % 3 + 3) + 'px');
      chip.style.setProperty('--chip-color', chipColors[index % chipColors.length]);
      burst.append(chip);
    }
    document.body.append(burst);
    burstTimer = setTimeout(() => burst.remove(), 500);
    if (!event.target.closest('a,button,input,summary,label')) tone(225);
  });

  renderBuild();
  resetFight();
  renderLoot();
  updateNavigation();
  document.addEventListener('site-language-change', () => {
    renderBuild();
    renderArena();
    renderLoot();
    updateNavigation();
  });
})();
