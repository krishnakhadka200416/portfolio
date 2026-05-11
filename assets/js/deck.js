(function () {
  'use strict';

  const viewport = document.getElementById('viewport');
  const src = document.getElementById('src');
  const dotsEl = document.getElementById('dots');
  const curEl = document.getElementById('cur');
  const totEl = document.getElementById('tot');
  const snameEl = document.getElementById('sname');
  const brandBtn = document.getElementById('brand');

  if (!viewport || !src) return;

  function slug(s) {
    return s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // Parse source content into slides at h2 boundaries (capture refs first to avoid losing siblings on move)
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
    const idx = i + 2;
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
    viewport.appendChild(slide);
  });

  src.remove();

  const slides = Array.from(viewport.querySelectorAll('.slide'));
  const total = slides.length;
  totEl.textContent = String(total).padStart(2, '0');

  // Build dots rail (vertical, right edge)
  const dotEls = [];
  slides.forEach((s, i) => {
    const d = document.createElement('button');
    d.className = 'dot';
    d.type = 'button';
    d.setAttribute('aria-label', 'Slide ' + (i + 1) + ': ' + s.dataset.label);
    const tip = document.createElement('span');
    tip.className = 'dot-tip mono';
    tip.textContent = String(i + 1).padStart(2, '0') + ' · ' + s.dataset.label;
    d.appendChild(tip);
    d.addEventListener('click', () => scrollToSlide(i));
    dotsEl.appendChild(d);
    dotEls.push(d);
  });

  let activeIdx = 0;

  function setActive(i) {
    if (i === activeIdx) return;
    activeIdx = i;
    curEl.textContent = String(i + 1).padStart(2, '0');
    snameEl.textContent = slides[i].dataset.label;
    slides.forEach((s, j) => s.classList.toggle('active', j === i));
    dotEls.forEach((d, j) => d.classList.toggle('active', j === i));

    const s = slides[i].dataset.slug || slug(slides[i].dataset.label);
    if (s) {
      history.replaceState(null, '', '#' + s);
    }
  }

  function scrollToSlide(i) {
    const t = Math.max(0, Math.min(total - 1, i));
    slides[t].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Mark slides as "seen" the first time they enter the viewport — keeps the
  // reveal animation but never hides content once shown. Low threshold so tall
  // slides (e.g. Experience) trigger as soon as any part is visible.
  slides[0].classList.add('seen');
  const seenObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('seen');
        seenObserver.unobserve(e.target);
      }
    });
  }, {
    root: viewport,
    threshold: 0.05
  });

  slides.forEach((s) => seenObserver.observe(s));

  // Track active slide by scroll position — robust for slides taller than the
  // viewport (which can never reach a high intersectionRatio).
  let rafScheduled = false;
  function scheduleActiveUpdate() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      const scrollTop = viewport.scrollTop;
      const probe = scrollTop + viewport.clientHeight * 0.25;
      let activeI = 0;
      for (let i = 0; i < slides.length; i++) {
        if (slides[i].offsetTop <= probe) {
          activeI = i;
        } else {
          break;
        }
      }
      setActive(activeI);
    });
  }

  viewport.addEventListener('scroll', scheduleActiveUpdate, { passive: true });
  window.addEventListener('resize', scheduleActiveUpdate);

  // Initial hash routing
  function initFromHash() {
    if (!location.hash) return false;
    const target = location.hash.slice(1);
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i].dataset.slug || slug(slides[i].dataset.label || '');
      if (s === target) {
        // Skip smooth on initial load
        slides[i].scrollIntoView({ behavior: 'auto', block: 'start' });
        setActive(i);
        return true;
      }
    }
    return false;
  }

  initFromHash();

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      scrollToSlide(activeIdx + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      scrollToSlide(activeIdx - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      scrollToSlide(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      scrollToSlide(total - 1);
    }
  });

  if (brandBtn) {
    brandBtn.addEventListener('click', () => scrollToSlide(0));
  }

  window.addEventListener('hashchange', () => {
    if (!location.hash) return;
    const t = location.hash.slice(1);
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i].dataset.slug || slug(slides[i].dataset.label || '');
      if (s === t) {
        scrollToSlide(i);
        return;
      }
    }
  });
})();
