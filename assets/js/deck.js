(function () {
  'use strict';

  const track = document.getElementById('track');
  const src = document.getElementById('src');
  const dotsEl = document.getElementById('dots');
  const curEl = document.getElementById('cur');
  const totEl = document.getElementById('tot');
  const snameEl = document.getElementById('sname');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');

  if (!track || !src) return;

  // Slugify for hash links
  function slug(s) {
    return s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // Group source content by h2 boundaries (collect references first to avoid losing siblings on move)
  const headings = Array.from(src.querySelectorAll('h2'));
  const groups = headings.map((h2) => {
    const group = [h2];
    let next = h2.nextElementSibling;
    while (next && next.tagName !== 'H2') {
      group.push(next);
      next = next.nextElementSibling;
    }
    return group;
  });

  groups.forEach((group, i) => {
    const idx = i + 2; // slide 01 is hero
    const slide = document.createElement('section');
    slide.className = 'slide slide-content';
    slide.dataset.label = group[0].textContent;
    slide.dataset.slug = slug(group[0].textContent);

    const frame = document.createElement('div');
    frame.className = 'slide-frame';

    const label = document.createElement('div');
    label.className = 'slide-label mono';
    label.textContent = 'Sect ' + String(idx).padStart(2, '0') + ' — ' + group[0].textContent;
    frame.appendChild(label);

    group.forEach((n) => frame.appendChild(n));
    slide.appendChild(frame);
    track.appendChild(slide);
  });

  src.remove();

  const slides = Array.from(track.querySelectorAll('.slide'));
  const total = slides.length;
  totEl.textContent = String(total).padStart(2, '0');

  // Build dots
  slides.forEach((s, i) => {
    const d = document.createElement('button');
    d.className = 'dot';
    d.dataset.idx = String(i);
    d.setAttribute('aria-label', 'Slide ' + (i + 1) + ': ' + s.dataset.label);
    d.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(d);
  });

  let current = 0;
  let isAnimating = false;

  function goTo(i, skipAnim) {
    const target = Math.max(0, Math.min(total - 1, i));
    if (target === current && !skipAnim) return;
    current = target;

    if (skipAnim) {
      track.style.transition = 'none';
      track.style.transform = 'translateX(-' + (current * 100) + 'vw)';
      requestAnimationFrame(() => {
        track.style.transition = '';
      });
    } else {
      track.style.transform = 'translateX(-' + (current * 100) + 'vw)';
    }

    curEl.textContent = String(current + 1).padStart(2, '0');
    snameEl.textContent = slides[current].dataset.label;

    slides.forEach((s, j) => s.classList.toggle('active', j === current));
    dotsEl.querySelectorAll('.dot').forEach((d, j) => d.classList.toggle('active', j === current));

    // Update URL hash
    const s = slides[current].dataset.slug || slug(slides[current].dataset.label);
    if (s) {
      history.replaceState(null, '', '#' + s);
    }

    // Update edge buttons disabled state
    prevBtn.toggleAttribute('disabled', current === 0);
    nextBtn.toggleAttribute('disabled', current === total - 1);

    // Reset slide internal scroll to top
    slides[current].scrollTop = 0;
  }

  // Initial hash navigation
  function initFromHash() {
    if (!location.hash) return false;
    const target = location.hash.slice(1);
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i].dataset.slug || slug(slides[i].dataset.label || '');
      if (s === target) {
        goTo(i, true);
        return true;
      }
    }
    return false;
  }

  if (!initFromHash()) {
    goTo(0, true);
  }

  // Keyboard
  document.addEventListener('keydown', (e) => {
    // Skip if user is in an input/contenteditable
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      goTo(current + 1);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      goTo(current - 1);
      e.preventDefault();
    } else if (e.key === 'Home') {
      goTo(0);
      e.preventDefault();
    } else if (e.key === 'End') {
      goTo(total - 1);
      e.preventDefault();
    }
  });

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // Touch swipe
  let touchStartX = null;
  let touchStartY = null;
  let touchActive = false;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchActive = true;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    if (!touchActive || touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      goTo(current + (dx < 0 ? 1 : -1));
    }
    touchStartX = null;
    touchStartY = null;
    touchActive = false;
  });

  // Re-align on resize (vw-based transform breaks when viewport width changes)
  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      goTo(current, true);
    });
  });

  // Respect hash changes after load (e.g. shareable links)
  window.addEventListener('hashchange', () => initFromHash());
})();
