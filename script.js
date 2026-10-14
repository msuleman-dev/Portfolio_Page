(() => {
  'use strict';
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const { gsap, ScrollTrigger, Lenis } = window;
  let manualPause = false, lenis = null, motionContext = null, tick = null;
  const motionButton = $('.motion-toggle');
  const motionAllowed = () => !manualPause && !reduced.matches;
  $('#year').textContent = new Date().getFullYear();

  // Navigation and content remain usable even when the animation libraries fail.
  const header = $('.header'), menu = $('.menu-toggle');
  function closeMenu() {
    header.classList.remove('is-menu-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
  }
  menu.addEventListener('click', () => {
    const open = header.classList.toggle('is-menu-open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && header.classList.contains('is-menu-open')) { closeMenu(); menu.focus(); }
  });
  document.addEventListener('click', e => { if (!header.contains(e.target)) closeMenu(); });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const target = document.getElementById(a.hash.slice(1));
    if (!target) return;
    e.preventDefault(); closeMenu();
    const arrive = () => {
      history.replaceState(null, '', a.hash);
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    if (lenis) lenis.scrollTo(target, { offset: -35, duration: 1.4, onComplete: arrive });
    else { target.scrollIntoView({ behavior: 'auto', block: 'start' }); arrive(); }
  }));
  const pageProgress = () => {
    const height = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty('--page-progress', height > 0 ? scrollY / height : 0);
  };
  addEventListener('scroll', pageProgress, { passive: true });
  addEventListener('resize', pageProgress); pageProgress();
  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) $$('.header nav a').forEach(a => a.classList.toggle('is-active', a.hash === '#' + entry.target.id));
    }), { rootMargin: '-20% 0px -55% 0px' });
    $$('main>section[id]').forEach(section => navObserver.observe(section));
  }

  // Native horizontal scrolling: mouse inertia, touch swipe, keyboard, and buttons.
  const rail = $('.project-rail'), cards = $$('.project'), prev = $('.rail-prev'), next = $('.rail-next');
  let drag = null, velocity = 0, inertiaFrame = 0, lastFrame = 0, blockClickUntil = 0;
  const railMax = () => Math.max(0, rail.scrollWidth - rail.clientWidth);
  function railProgress() {
    const max = railMax(), viewport = rail.clientWidth / Math.max(1, rail.scrollWidth);
    $('.rail-position').style.setProperty('--rail-progress', viewport + (1 - viewport) * (max ? rail.scrollLeft / max : 0));
    prev.disabled = rail.scrollLeft < 2; next.disabled = rail.scrollLeft > max - 2;
  }
  function stopInertia() { cancelAnimationFrame(inertiaFrame); inertiaFrame = 0; velocity = 0; }
  function coast(t) {
    const dt = Math.min((t - lastFrame) / 1000, .032); lastFrame = t;
    velocity *= Math.exp(-dt * 5);
    const before = rail.scrollLeft;
    rail.scrollLeft += velocity * dt;
    if (Math.abs(velocity) > 8 && Math.abs(before - rail.scrollLeft) > .05) inertiaFrame = requestAnimationFrame(coast);
    else stopInertia();
  }
  rail.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('summary,button')) return;
    stopInertia(); blockClickUntil = 0;
    drag = { id: e.pointerId, start: e.clientX, last: e.clientX, time: e.timeStamp, moved: false };
  });
  rail.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.last, dt = Math.max(1, e.timeStamp - drag.time);
    if (Math.abs(e.clientX - drag.start) > 6) {
      if (!drag.moved) { rail.setPointerCapture(e.pointerId); rail.classList.add('is-dragging'); }
      drag.moved = true; rail.scrollLeft -= dx;
      velocity = Math.max(-1800, Math.min(1800, -dx / dt * 1000));
    }
    drag.last = e.clientX; drag.time = e.timeStamp;
  });
  function release(e) {
    if (!drag) return;
    const ended = drag, moved = ended.moved;
    drag = null;
    if (rail.hasPointerCapture?.(ended.id)) rail.releasePointerCapture(ended.id);
    if (e.timeStamp - ended.time > 100) velocity = 0;
    rail.classList.remove('is-dragging');
    if (moved) {
      blockClickUntil = performance.now() + 300;
      if (motionAllowed() && e.type !== 'pointercancel') { lastFrame = performance.now(); inertiaFrame = requestAnimationFrame(coast); }
    }
  }
  rail.addEventListener('pointerup', release); rail.addEventListener('pointercancel', release);
  rail.addEventListener('lostpointercapture', e => { if (drag) release(e); });
  rail.addEventListener('click', e => { if (e.detail !== 0 && performance.now() < blockClickUntil) { e.preventDefault(); e.stopPropagation(); } }, true);
  rail.addEventListener('dragstart', e => e.preventDefault());
  rail.addEventListener('wheel', e => {
    stopInertia();
    // Let vertical wheel input continue through Lenis, horizontal gestures stay native.
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      if (lenis) lenis.scrollTo(lenis.targetScroll + e.deltaY, { programmatic: false });
      else window.scrollBy({ top: e.deltaY, behavior: 'auto' });
    }
  }, { passive: false });
  function goToProject(direction) {
    stopInertia();
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    rail.scrollTo({ left: Math.max(0, Math.min(railMax(), rail.scrollLeft + direction * step)), behavior: motionAllowed() ? 'smooth' : 'auto' });
  }
  prev.addEventListener('click', () => goToProject(-1)); next.addEventListener('click', () => goToProject(1));
  rail.addEventListener('keydown', e => {
    if (e.target !== rail) return;
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); stopInertia();
      if (e.key.startsWith('Arrow')) goToProject(e.key === 'ArrowRight' ? 1 : -1);
      else rail.scrollTo({ left: e.key === 'Home' ? 0 : railMax(), behavior: motionAllowed() ? 'smooth' : 'auto' });
    }
  });
  rail.addEventListener('scroll', railProgress, { passive: true });
  addEventListener('resize', railProgress); addEventListener('load', railProgress); railProgress();
  $$('.project-notes').forEach(d => d.addEventListener('toggle', () => ScrollTrigger?.refresh()));
  const belt = $('.skills-belt'), beltButton = $('.belt-toggle');
  beltButton.addEventListener('click', () => {
    const paused = belt.classList.toggle('is-paused');
    beltButton.setAttribute('aria-pressed', String(paused));
    beltButton.setAttribute('aria-label', paused ? 'Resume skills animation' : 'Pause skills animation');
    beltButton.textContent = paused ? '▶' : 'Ⅱ';
  });

  // Create semantic word/line masks once. All content is visible by default.
  const statement = $('.statement'), words = statement.textContent.trim().split(/\s+/);
  statement.setAttribute('aria-label', words.join(' ')); statement.textContent = '';
  words.forEach((word, index) => {
    const span = document.createElement('span'); span.className = 'word'; span.setAttribute('aria-hidden', 'true'); span.textContent = word;
    statement.append(span); if (index < words.length - 1) statement.append(' ');
  });
  $$('h2').forEach(h => {
    const original = h.innerHTML.split(/<br\s*\/?>/i);
    h.innerHTML = original.map(line => `<span class="heading-line"><span>${line}</span></span>`).join('');
  });
  const cleanups = [];
  function listen(el, type, cb) { el.addEventListener(type, cb); cleanups.push(() => el.removeEventListener(type, cb)); }
  function configureMotion() {
    cleanups.splice(0).forEach(fn => fn());
    motionContext?.revert(); motionContext = null;
    if (tick && gsap) gsap.ticker.remove(tick);
    lenis?.destroy(); lenis = null; stopInertia();
    const active = motionAllowed();
    document.body.classList.toggle('motion-paused', !active);
    motionButton.setAttribute('aria-pressed', String(!active));
    motionButton.setAttribute('aria-label', active ? 'Pause animations' : 'Resume animations');
    $('span', motionButton).textContent = active ? 'on' : 'off';
    if (!active || !gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    if (Lenis) {
      lenis = new Lenis({ lerp: .085, smoothWheel: true, syncTouch: false });
      lenis.on('scroll', ScrollTrigger.update);
      tick = time => lenis?.raf(time * 1000); gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    }
    motionContext = gsap.context(() => {
      // A fast, staged entrance; no loading gate or forced scroll-to-top.
      if (scrollY < 100) {
        gsap.from('.title-mask>span:not(.hero-star),.title-mask>em', { yPercent: 115, rotation: 3, duration: 1.45, stagger: .12, ease: 'expo.out' });
        gsap.from('.hero-top,.hero-copy>p,.hero-actions,.hero-bottom', { y: 28, opacity: 0, duration: 1.15, stagger: .1, delay: .3, ease: 'power3.out' });
        gsap.from('.gallery-back', { y: 90, rotation: -23, opacity: 0, duration: 1.65, ease: 'expo.out', delay: .2 });
        gsap.from('.gallery-front', { y: 110, rotation: 17, opacity: 0, duration: 1.65, ease: 'expo.out', delay: .4 });
        gsap.from('.gallery-sticker,.gallery-note', { scale: .7, opacity: 0, duration: 1.2, stagger: .1, delay: .7, ease: 'expo.out' });
      }
      gsap.to('.hero-copy', { y: -65, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 10%', scrub: .7 } });
      gsap.to('.hero-gallery', { y: 65, rotation: 3, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
      gsap.fromTo('.statement .word', { opacity: .18 }, { opacity: 1, stagger: .075, ease: 'none', scrollTrigger: { trigger: statement, start: 'top 83%', end: 'bottom 48%', scrub: .7 } });
      $$('.reveal').forEach(el => {
        // Heading masks own their movement; only fade the surrounding introduction.
        const heading = !!$('h2', el);
        gsap.from(el, { y: heading ? 0 : 48, opacity: 0, duration: 1.25, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
      });
      $$('h2').forEach(h => gsap.from($$('.heading-line>span', h), { yPercent: 108, rotation: 2, duration: 1.4, stagger: .13, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 91%', once: true } }));
      // Move the track entrance as one layer so every off-screen card stays available.
      gsap.from('.project-grid', { x: 100, opacity: 0, duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: rail, start: 'top 88%', once: true } });
      $$('.project-image img').forEach(img => gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: rail, start: 'top bottom', end: 'bottom top', scrub: 1 } }));
      $$('.job').forEach(job => ScrollTrigger.create({ trigger: job, start: 'top 70%', toggleClass: 'is-active' }));
      gsap.from('.contact .button,.contact .email,.contact-bottom', { y: 35, opacity: 0, duration: 1.2, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 68%', once: true } });
      if (fine.matches) {
        $$('.magnetic').forEach(button => {
          const x = gsap.quickTo(button, 'x', { duration: .7, ease: 'power3' });
          const y = gsap.quickTo(button, 'y', { duration: .7, ease: 'power3' });
          listen(button, 'pointermove', e => {
            const r = button.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * .18); y((e.clientY - r.top - r.height / 2) * .25);
          });
          listen(button, 'pointerleave', () => { x(0); y(0); });
        });
        $$('.project-image').forEach(image => {
          const rx = gsap.quickTo(image, 'rotationX', { duration: .7, ease: 'power3' });
          const ry = gsap.quickTo(image, 'rotationY', { duration: .7, ease: 'power3' });
          gsap.set(image, { transformPerspective: 1000 });
          listen(image, 'pointermove', e => {
            if (drag?.moved) return;
            const r = image.getBoundingClientRect(); rx(-(e.clientY - r.top - r.height / 2) / r.height * 5); ry((e.clientX - r.left - r.width / 2) / r.width * 5);
          });
          listen(image, 'pointerleave', () => { rx(0); ry(0); });
        });
        const pill = $('.cursor-pill');
        gsap.set(pill, { xPercent: -50, yPercent: -50 });
        const px = gsap.quickTo(pill, 'x', { duration: .35, ease: 'power3' });
        const py = gsap.quickTo(pill, 'y', { duration: .35, ease: 'power3' });
        listen(rail, 'pointermove', e => {
          px(e.clientX); py(e.clientY);
          gsap.to(pill, { opacity: e.target.closest('summary,.project-links') ? 0 : 1, scale: drag?.moved ? .85 : 1, duration: .25, overwrite: true });
        });
        listen(rail, 'pointerleave', () => gsap.to(pill, { opacity: 0, duration: .2 }));
      }
    });
    ScrollTrigger.refresh();
  }
  motionButton.addEventListener('click', () => {
    // System reduced-motion preference takes priority over optional effects.
    if (reduced.matches) return;
    manualPause = !manualPause; configureMotion();
  });
  reduced.addEventListener('change', configureMotion); fine.addEventListener('change', configureMotion);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopInertia(); lenis?.stop(); document.body.classList.add('motion-paused'); }
    else { lenis?.start(); document.body.classList.toggle('motion-paused', !motionAllowed()); }
  });
  configureMotion();
  document.fonts?.ready.then(() => ScrollTrigger?.refresh());
  addEventListener('load', () => ScrollTrigger?.refresh());
})();
