/**
 * Nuzzle — Discover
 * Browse the CodexPets.net community catalog by section and add pets on demand.
 * Only catalog metadata ships with the app; sprite sheets download when added.
 */
(() => {
  const SECTIONS = [
    { id: 'anime', label: 'Anime' },
    { id: 'animals', label: 'Animals' },
    { id: 'game', label: 'Game characters' },
    { id: 'robots', label: 'Robots & tech' },
    { id: 'pixel', label: 'Pixel art' },
    { id: 'cute', label: 'Cute & cozy' },
    { id: 'spooky', label: 'Weird & spooky' },
    { id: 'celeb', label: 'Icons & celebs' }
  ];
  // Every preview state maps to an atlas row in the shared sprite engine.
  const PREVIEW_STATES = [
    ['idle', 'Idle'], ['run', 'Run'], ['pat', 'Wave'], ['jump', 'Jump'],
    ['failed', 'Oops'], ['sleep', 'Wait'], ['work', 'Work'], ['review', 'Review']
  ];
  const SHELF_SIZE = 6;
  const PAGE_SIZE = 36;
  const MAX_PARALLEL_THUMBS = 4;
  const THUMB_CACHE_LIMIT = 240;

  const view = {
    catalog: null,
    loading: null,
    section: 'all',
    query: '',
    limit: PAGE_SIZE,
    installing: new Set(),
    previewSlug: null
  };

  const results = () => document.getElementById('discover-results');

  function loadCatalog() {
    if (view.catalog) return Promise.resolve(view.catalog);
    if (!view.loading) {
      view.loading = fetch('/catalog/codexpets.json')
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {
          view.catalog = data;
          const count = document.getElementById('nav-discover-count');
          if (count) count.textContent = data.pets.length;
          return data;
        })
        .catch(error => {
          view.loading = null;
          throw error;
        });
    }
    return view.loading;
  }

  const installedId = slug => `cp-${slug}`.slice(0, 64);
  const isInstalled = slug => PETS.some(pet => pet.id === installedId(slug));
  const sheetUrl = pet => `${view.catalog.cdn}${pet.sheet}`;
  const sectionLabel = id => SECTIONS.find(section => section.id === id)?.label || 'Community';

  function matches(pet, query) {
    if (!query) return true;
    return `${pet.name} ${pet.description} ${pet.tags.join(' ')} ${pet.author} ${sectionLabel(pet.section)}`
      .toLowerCase().includes(query);
  }

  // ── Thumbnails ───────────────────────────────────────────────────────────
  // Each community sheet is a full 1536×1872 atlas. We decode it once, keep only
  // the first idle frame as a small bitmap, and let the big image go — so a page
  // of cards costs a few MB of memory instead of hundreds.
  const thumbCache = new Map();
  const thumbQueue = [];
  let thumbsInFlight = 0;

  function cacheThumb(slug, bitmap) {
    thumbCache.set(slug, bitmap);
    if (thumbCache.size > THUMB_CACHE_LIMIT) {
      const [oldest, old] = thumbCache.entries().next().value;
      thumbCache.delete(oldest);
      old.close?.();
    }
  }

  function paintThumb(canvas, bitmap) {
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    canvas.closest('.discover-art')?.classList.add('is-loaded');
  }

  function pumpThumbs() {
    while (thumbsInFlight < MAX_PARALLEL_THUMBS && thumbQueue.length) {
      const canvas = thumbQueue.shift();
      if (!canvas.isConnected) continue;
      const slug = canvas.dataset.slug;
      if (thumbCache.has(slug)) {
        paintThumb(canvas, thumbCache.get(slug));
        continue;
      }
      thumbsInFlight += 1;
      const image = new Image();
      image.decoding = 'async';
      const finish = () => {
        // Detach handlers first: clearing src would otherwise fire a spurious error.
        image.onload = image.onerror = null;
        image.src = '';
        thumbsInFlight -= 1;
        pumpThumbs();
      };
      image.onload = async () => {
        try {
          const bitmap = window.createImageBitmap
            ? await createImageBitmap(image, 0, 0, 192, 208)
            : image;
          cacheThumb(slug, bitmap);
          document.querySelectorAll(`canvas[data-slug="${CSS.escape(slug)}"]`).forEach(node => paintThumb(node, bitmap));
        } catch {
          canvas.closest('.discover-art')?.classList.add('is-broken');
        }
        finish();
      };
      image.onerror = () => {
        // One quiet retry covers transient CDN hiccups before showing a placeholder.
        if (!canvas.dataset.retried) {
          canvas.dataset.retried = 'true';
          setTimeout(() => { thumbQueue.push(canvas); pumpThumbs(); }, 1500);
        } else {
          canvas.closest('.discover-art')?.classList.add('is-broken');
        }
        finish();
      };
      image.src = canvas.dataset.src;
    }
  }

  const thumbObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        thumbObserver.unobserve(entry.target);
        thumbQueue.push(entry.target);
      });
      pumpThumbs();
    }, { rootMargin: '240px 0px' })
    : null;

  function observeThumbs(root) {
    root.querySelectorAll('canvas[data-slug]').forEach(canvas => {
      const cached = thumbCache.get(canvas.dataset.slug);
      if (cached) paintThumb(canvas, cached);
      else if (thumbObserver) thumbObserver.observe(canvas);
      else thumbQueue.push(canvas);
    });
    pumpThumbs();
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  function actionButton(pet, compact = false) {
    if (view.installing.has(pet.slug)) {
      return `<button class="discover-add is-busy" disabled>Adding…</button>`;
    }
    if (isInstalled(pet.slug)) {
      const active = state.selectedPetId === installedId(pet.slug);
      return `<button class="discover-add is-installed" data-discover-use="${pet.slug}" ${active ? 'disabled' : ''}>${active ? '✓ Your companion' : compact ? 'Use' : 'Use as companion'}</button>`;
    }
    return `<button class="discover-add" data-discover-add="${pet.slug}">+ Add${compact ? '' : ' to library'}</button>`;
  }

  function cardHtml(pet) {
    const name = escapeHtml(pet.name);
    return `
      <article class="discover-card" data-slug="${pet.slug}">
        <button class="discover-art" data-discover-preview="${pet.slug}" aria-label="Preview ${name}">
          <canvas width="192" height="208" data-slug="${pet.slug}" data-src="${escapeHtml(sheetUrl(pet))}"></canvas>
          <span class="discover-art-hint">Preview</span>
        </button>
        <div class="discover-info">
          <strong title="${name}">${name}</strong>
          <small>by ${escapeHtml(pet.author)}</small>
        </div>
        ${actionButton(pet, true)}
      </article>
    `;
  }

  function renderSections(counts) {
    const container = document.getElementById('discover-sections');
    if (!container) return;
    const total = view.catalog.pets.length;
    const buttons = [{ id: 'all', label: 'All', count: total }, ...SECTIONS.map(section => ({ ...section, count: counts[section.id] || 0 }))];
    container.innerHTML = buttons.filter(button => button.count).map(button => `
      <button class="filter-button ${view.section === button.id ? 'active' : ''}" data-discover-section="${button.id}" aria-pressed="${view.section === button.id}">
        ${button.label} <span class="filter-count">${button.count}</span>
      </button>
    `).join('');
  }

  function render() {
    const root = results();
    if (!root || !view.catalog) return;
    const query = view.query.trim().toLowerCase();
    const visible = view.catalog.pets.filter(pet => matches(pet, query));
    const counts = {};
    visible.forEach(pet => { counts[pet.section] = (counts[pet.section] || 0) + 1; });
    renderSections(counts);

    const display = document.getElementById('discover-count-display');
    if (display) display.textContent = view.section === 'all' ? visible.length : (counts[view.section] || 0);

    if (!visible.length) {
      root.innerHTML = `<div class="empty-state">No community pets match “${escapeHtml(view.query)}”. Try <button class="text-button inline" data-view-target="maker">making one yourself <span>↗</span></button></div>`;
      return;
    }

    if (view.section === 'all' && !query) {
      // Shelves: a taste of every section, each with a jump to the full list.
      root.innerHTML = SECTIONS.map(section => {
        const pets = visible.filter(pet => pet.section === section.id);
        if (!pets.length) return '';
        return `
          <section class="library-section" aria-labelledby="discover-shelf-${section.id}">
            <header class="library-section-head">
              <h3 id="discover-shelf-${section.id}">${section.label} <span>${pets.length}</span></h3>
              <button class="text-button" data-discover-section="${section.id}">See all <span>→</span></button>
            </header>
            <div class="discover-grid">${pets.slice(0, SHELF_SIZE).map(cardHtml).join('')}</div>
          </section>
        `;
      }).join('') + creditHtml();
    } else {
      const list = view.section === 'all' ? visible : visible.filter(pet => pet.section === view.section);
      const shown = list.slice(0, view.limit);
      if (!shown.length) {
        root.innerHTML = `<div class="empty-state">Nothing in ${escapeHtml(sectionLabel(view.section))} matches. <button class="text-button inline" data-discover-section="all">Search all sections</button></div>`;
        return;
      }
      root.innerHTML = `
        <div class="discover-grid">${shown.map(cardHtml).join('')}</div>
        ${list.length > shown.length ? `<button class="full-width-button discover-more" data-discover-more>Show ${Math.min(PAGE_SIZE, list.length - shown.length)} more <span>${list.length - shown.length} left</span></button>` : ''}
        ${creditHtml()}
      `;
    }
    observeThumbs(root);
  }

  function creditHtml() {
    const synced = view.catalog.syncedAt ? ` · catalog snapshot ${escapeHtml(view.catalog.syncedAt)}` : '';
    return `<p class="discover-credit">Community pets are made by their listed authors and mirrored by <a href="https://codexpets.net/gallery" target="_blank" rel="noreferrer">CodexPets.net</a>${synced}. Fan characters belong to their owners.</p>`;
  }

  function showError(error) {
    const root = results();
    if (root) {
      root.innerHTML = `<div class="empty-state">Could not load the community catalog (${escapeHtml(error.message || error)}). <button class="text-button inline" data-discover-retry>Try again</button></div>`;
    }
  }

  function refresh() {
    loadCatalog().then(render).catch(showError);
  }

  // ── Install & preview ────────────────────────────────────────────────────
  const findPet = slug => view.catalog?.pets.find(pet => pet.slug === slug);

  async function addPet(slug) {
    const pet = findPet(slug);
    if (!pet || view.installing.has(slug)) return;
    if (!IS_NATIVE_APP) {
      showToast('Adding pets needs the Nuzzle Mac app — opening CodexPets instead.');
      window.open(`https://codexpets.net/gallery/${encodeURIComponent(slug)}`, '_blank', 'noopener');
      return;
    }
    view.installing.add(slug);
    updateButtons(slug);
    try {
      await invokeNative('install_catalog_pet', {
        slug: pet.slug,
        name: pet.name,
        description: pet.description,
        sheet: pet.sheet
      });
      await loadUserPets();
      playChime('bell');
      showToast(`${pet.name} joined your library.`, { type: 'done' });
    } catch (error) {
      showToast(`Could not add ${pet.name}: ${error}`, { type: 'error', duration: 4200 });
    } finally {
      view.installing.delete(slug);
      refreshPetViews();
    }
  }

  function usePet(slug) {
    selectCompanion(installedId(slug));
    closePreview();
  }

  function updateButtons(slug) {
    const pet = findPet(slug);
    if (!pet) return;
    document.querySelectorAll(`.discover-card[data-slug="${CSS.escape(slug)}"] .discover-add`).forEach(button => {
      button.outerHTML = actionButton(pet, true);
    });
    if (view.previewSlug === slug) renderPreviewActions(pet);
  }

  function renderPreviewActions(pet) {
    const actions = document.getElementById('discover-modal-actions');
    if (!actions) return;
    actions.innerHTML = `
      ${actionButton(pet)}
      <a class="text-button" href="https://codexpets.net/gallery/${encodeURIComponent(pet.slug)}" target="_blank" rel="noreferrer">View on CodexPets <span>↗</span></a>
    `;
  }

  function setPreviewState(stateName) {
    const art = document.getElementById('discover-modal-art');
    if (art) art.className = `preview-art state-${stateName}`;
    document.querySelectorAll('#discover-modal-states [data-preview-state]').forEach(button => {
      button.classList.toggle('active', button.dataset.previewState === stateName);
    });
  }

  let lastFocus = null;
  function openPreview(slug) {
    const pet = findPet(slug);
    const modal = document.getElementById('discover-modal');
    if (!pet || !modal) return;
    view.previewSlug = slug;
    lastFocus = document.activeElement;
    const art = document.getElementById('discover-modal-art');
    applyPetArtStyle(art, { src: sheetUrl(pet), spriteVersion: 1 });
    art.setAttribute('aria-label', `${pet.name} animation preview`);
    document.getElementById('discover-modal-name').textContent = pet.name;
    document.getElementById('discover-modal-author').textContent = `by ${pet.author} · ${sectionLabel(pet.section)}`;
    document.getElementById('discover-modal-desc').textContent = pet.description;
    document.getElementById('discover-modal-tags').innerHTML = pet.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
    document.getElementById('discover-modal-states').innerHTML = PREVIEW_STATES.map(([key, label]) =>
      `<button type="button" class="chip-button" data-preview-state="${key}">${label}</button>`).join('');
    setPreviewState('idle');
    renderPreviewActions(pet);
    modal.hidden = false;
    document.getElementById('discover-modal-close')?.focus();
  }

  function closePreview() {
    const modal = document.getElementById('discover-modal');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    view.previewSlug = null;
    // Drop the full-size sheet so its decoded bitmap can be freed.
    document.getElementById('discover-modal-art')?.style.removeProperty('background-image');
    lastFocus?.focus?.();
  }

  // ── Events ───────────────────────────────────────────────────────────────
  document.addEventListener('nuzzle:view', event => {
    if (event.detail === 'discover') refresh();
    else closePreview();
  });
  document.addEventListener('nuzzle:pets-changed', () => {
    if (state.currentView === 'discover' && view.catalog) {
      view.catalog.pets.forEach(pet => {
        if (document.querySelector(`.discover-card[data-slug="${CSS.escape(pet.slug)}"]`)) updateButtons(pet.slug);
      });
    }
  });

  let searchTimer = null;
  document.getElementById('discover-search')?.addEventListener('input', event => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      view.query = event.target.value;
      // Search spans every section; the chips then show where the matches are.
      if (view.query.trim()) view.section = 'all';
      view.limit = PAGE_SIZE;
      render();
    }, 120);
  });

  document.addEventListener('click', event => {
    const section = event.target.closest('[data-discover-section]');
    if (section) {
      view.section = section.dataset.discoverSection;
      view.limit = PAGE_SIZE;
      render();
      document.getElementById('discover-view')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (event.target.closest('[data-discover-more]')) {
      view.limit += PAGE_SIZE;
      render();
      return;
    }
    if (event.target.closest('[data-discover-retry]')) return refresh();
    const add = event.target.closest('[data-discover-add]');
    if (add) return addPet(add.dataset.discoverAdd);
    const use = event.target.closest('[data-discover-use]');
    if (use) return usePet(use.dataset.discoverUse);
    const preview = event.target.closest('[data-discover-preview]');
    if (preview) return openPreview(preview.dataset.discoverPreview);
    const previewState = event.target.closest('[data-preview-state]');
    if (previewState && previewState.closest('#discover-modal')) return setPreviewState(previewState.dataset.previewState);
    if (event.target.id === 'discover-modal' || event.target.closest('#discover-modal-close')) closePreview();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePreview();
  });
})();
