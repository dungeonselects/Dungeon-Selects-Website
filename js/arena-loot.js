const arenaLoot = (() => {
  const key = 'ds-arena-inventory';
  const items = {
    blade: { icon: 'sword', rarity: 'common', slot: 'weapon', bonus: { power: 1 } },
    bow: { icon: 'bow', rarity: 'uncommon', slot: 'weapon', bonus: { speed: 2 } },
    talisman: { icon: 'gem', rarity: 'common', slot: 'accessory', bonus: { armor: 1 } },
    'ember-blade': { icon: 'sword', rarity: 'uncommon', slot: 'weapon', bonus: { power: 2, speed: 1 } },
    relic: { icon: 'gem', rarity: 'rare', slot: 'accessory', bonus: { power: 2 } },
    'stone-charm': { icon: 'stone', rarity: 'rare', slot: 'accessory', bonus: { armor: 2 } },
    ward: { icon: 'shield', rarity: 'epic', slot: 'accessory', bonus: { armor: 3 } },
    'shade-bow': { icon: 'bow', rarity: 'epic', slot: 'weapon', bonus: { power: 1, speed: 4 } },
    staff: { icon: 'staff', rarity: 'legendary', slot: 'weapon', bonus: { power: 4, speed: 1 } },
  };

  function load() {
    const counts = { blade: 1, bow: 1 };
    const equipped = { weapon: null, accessory: null };
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved) {
        for (const item of Object.keys(items)) {
          const count = saved.counts?.[item];
          if (Number.isSafeInteger(count) && count > 0) counts[item] = count;
        }
        for (const slot of Object.keys(equipped)) {
          const item = saved.equipped?.[slot];
          if (Object.hasOwn(items, item) && items[item].slot === slot && counts[item]) equipped[slot] = item;
        }
      } else {
        const unlocked = JSON.parse(localStorage.getItem('ds-arena-loot'));
        if (Array.isArray(unlocked)) {
          for (const item of Object.keys(items)) {
            if (unlocked.includes(item)) counts[item] = 1;
          }
        }
      }
    } catch {
      // The starter inventory is also usable without local storage.
    }
    return { counts, equipped };
  }

  function save(inventory) {
    try {
      localStorage.setItem(key, JSON.stringify(inventory));
    } catch {
      // Keep the inventory available for this visit.
    }
  }

  function draw(pool) {
    let roll = Math.random() * 100;
    for (const [item, chance] of pool) {
      roll -= chance;
      if (roll < 0) return item;
    }
  }

  function combatStats(build, equipped) {
    const stats = { ...build };
    for (const item of Object.values(equipped)) {
      if (!item) continue;
      for (const [stat, value] of Object.entries(items[item].bonus)) stats[stat] += value;
    }
    return stats;
  }

  return { items, load, save, draw, combatStats };
})();
