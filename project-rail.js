/* A continuous desktop project rail with a native touch / reduced-motion fallback. */
'use strict';
window.createProjectRail = function ({ rail, prev, next, pause, onVerticalWheel, onLayout }) {
  const track = rail.querySelector('.project-grid');
  const cards = [...track.children];
  const hint = document.getElementById('rail-hint');
  let looping = false, visible = true, paused = false, hovered = false, keyboard = false;
  let x = 0, setWidth = 1, step = 1, speed = 0, velocity = 0, skew = 0;
  let frame = 0, time = 0, drag = null, tween = null, clickBlockedUntil = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const max = () => Math.max(0, rail.scrollWidth - rail.clientWidth);
  const offset = () => looping ? ((-x % setWidth) + setWidth) % setWidth : rail.scrollLeft;
  const copies = () => [...track.querySelectorAll('.project-loop-copy')];

  function measure() {
    step = cards[1].offsetLeft - cards[0].offsetLeft || cards[0].getBoundingClientRect().width + 34;
    setWidth = step * cards.length;
    render();
  }
  function controls() {
    prev.disabled = !looping && rail.scrollLeft < 2;
    next.disabled = !looping && rail.scrollLeft >= max() - 2;
    pause.disabled = !looping;
    pause.setAttribute('aria-pressed', String(paused || !looping));
    pause.setAttribute('aria-label', !looping ? 'Automatic project motion disabled' : paused ? 'Resume project motion' : 'Pause project motion');
    pause.textContent = paused || !looping ? '▶' : 'Ⅱ';
    const progress = looping ? .25 + offset() / setWidth * .75 : rail.clientWidth / Math.max(1, rail.scrollWidth) + (1 - rail.clientWidth / Math.max(1, rail.scrollWidth)) * (max() ? rail.scrollLeft / max() : 0);
    document.querySelector('.rail-position').style.setProperty('--rail-progress', progress);
  }
  function render() {
    if (looping) {
      x = x % setWidth;
      if (x > 0) x -= setWidth;
      track.style.transform = `translate3d(${x.toFixed(3)}px,0,0) skewX(${skew.toFixed(3)}deg)`;
    }
    controls();
  }
  function animate(now) {
    frame = 0;
    if (!looping || !visible || document.hidden) return;
    const dt = Math.min((now - time) / 1000 || .016, .05); time = now;
    const targetSpeed = paused || hovered || keyboard || drag || tween ? 0 : 42;
    speed += (targetSpeed - speed) * (1 - Math.exp(-dt * 9));
    if (tween) {
      tween.elapsed += dt;
      const p = Math.min(1, tween.elapsed / .72), eased = 1 - Math.pow(1 - p, 4);
      x = tween.start + tween.distance * eased;
      if (p === 1) { tween = null; speed = 0; }
    } else if (!drag) {
      velocity *= Math.exp(-dt * 3.7);
      if (Math.abs(velocity) < 1) velocity = 0;
      x += (velocity - speed) * dt;
    }
    const targetSkew = drag || Math.abs(velocity) > 100 ? clamp(velocity * -.002, -3.5, 3.5) : 0;
    skew += (targetSkew - skew) * (1 - Math.exp(-dt * 9));
    render();
    if ((!paused && !hovered && !keyboard) || drag || tween || Math.abs(velocity) > 1 || Math.abs(speed) > .1 || Math.abs(skew) > .01) wake();
  }
  function wake() {
    if (!frame && looping && visible && !document.hidden) { time = performance.now(); frame = requestAnimationFrame(animate); }
  }
  function stop() {
    cancelAnimationFrame(frame); frame = 0; velocity = 0; speed = 0; tween = null;
    drag = null; skew = 0; rail.classList.remove('is-dragging'); render();
  }
  function configure(enabled) {
    const logicalOffset = offset();
    stop(); copies().forEach(c => c.remove());
    looping = enabled; keyboard = false;
    hovered = rail.matches(':hover');
    rail.classList.toggle('is-looping', looping);
    track.style.transform = ''; rail.scrollLeft = 0;
    if (looping) {
      cards.forEach((card, i) => {
        card.dataset.projectIndex = i;
        const copy = card.cloneNode(true);
        copy.classList.add('project-loop-copy'); copy.setAttribute('aria-hidden', 'true');
        copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        copy.querySelectorAll('a,button,summary,[tabindex]').forEach(el => el.tabIndex = -1);
        track.append(copy);
      });
      rail.querySelectorAll('img,a').forEach(el => el.draggable = false);
      x = -logicalOffset; measure(); wake();
      hint.innerHTML = '<span aria-hidden="true">↔</span> Drag to explore. Hover to pause.';
    } else {
      rail.scrollLeft = logicalOffset;
      hint.innerHTML = '<span aria-hidden="true">↔</span> Swipe or drag to explore.';
      measure();
    }
  }
  rail.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovered = true; wake(); } });
  rail.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovered = false; wake(); } });
  rail.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('summary,button')) return;
    // Keep mouse focus from scrolling transformed cards behind the carousel.
    if (looping) e.preventDefault();
    keyboard = false; velocity = 0; speed = 0; tween = null; clickBlockedUntil = 0;
    drag = { id: e.pointerId, origin: e.clientX, last: e.clientX, at: e.timeStamp, moved: false };
    wake();
  });
  rail.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.last, dt = Math.max(1, e.timeStamp - drag.at);
    if (Math.abs(e.clientX - drag.origin) > 6) {
      if (!drag.moved) { rail.setPointerCapture(e.pointerId); rail.classList.add('is-dragging'); }
      drag.moved = true;
      if (looping) { x += dx; velocity = clamp(dx / dt * 1000, -2600, 2600); render(); }
      else rail.scrollLeft -= dx;
    }
    drag.last = e.clientX; drag.at = e.timeStamp;
  });
  function release(e) {
    if (!drag) return;
    const ended = drag; drag = null;
    if (rail.hasPointerCapture?.(ended.id)) rail.releasePointerCapture(ended.id);
    rail.classList.remove('is-dragging');
    if (ended.moved) clickBlockedUntil = performance.now() + 350;
    if (e.type === 'pointercancel' || e.timeStamp - ended.at > 100) velocity = 0;
    wake();
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => rail.addEventListener(type, release));
  rail.addEventListener('click', e => {
    if (e.detail !== 0 && performance.now() < clickBlockedUntil) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  rail.addEventListener('dragstart', e => e.preventDefault());
  rail.addEventListener('wheel', e => {
    velocity = 0; tween = null;
    if (looping && (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey)) {
      e.preventDefault(); x -= e.shiftKey ? e.deltaY : e.deltaX; render(); wake();
    } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault(); onVerticalWheel(e.deltaY);
    }
  }, { passive: false });
  function go(direction) {
    velocity = 0; speed = 0;
    if (looping) {
      tween = { start: x, distance: direction * -step, elapsed: 0 }; wake();
    } else rail.scrollTo({ left: clamp(rail.scrollLeft + direction * step, 0, max()), behavior: 'auto' });
  }
  prev.addEventListener('click', () => go(-1)); next.addEventListener('click', () => go(1));
  pause.addEventListener('click', () => { paused = !paused; velocity = 0; controls(); wake(); });
  rail.addEventListener('keydown', e => {
    if (e.target !== rail || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault(); keyboard = true; speed = 0;
    if (e.key.startsWith('Arrow')) go(e.key === 'ArrowRight' ? 1 : -1);
    else {
      const target = e.key === 'Home' ? 0 : (cards.length - 1) * step;
      if (looping) { tween = { start: x, distance: -target - x, elapsed: 0 }; wake(); }
      else rail.scrollTo({ left: target, behavior: 'auto' });
    }
  });
  rail.addEventListener('focusin', e => {
    if (!looping || !e.target.matches(':focus-visible')) return;
    keyboard = true; speed = 0; velocity = 0; tween = null;
    const card = e.target.closest('.project');
    if (card) { x = -Number(card.dataset.projectIndex) * step; rail.scrollLeft = 0; render(); }
  });
  rail.addEventListener('focusout', e => { if (!rail.contains(e.relatedTarget)) { keyboard = false; wake(); } });
  rail.addEventListener('scroll', () => { if (!looping) controls(); });
  track.addEventListener('toggle', e => {
    if (!e.target.matches('details')) return;
    const card = e.target.closest('.project'), index = card.dataset.projectIndex;
    if (index !== undefined) track.querySelectorAll(`[data-project-index="${index}"] details`).forEach(detail => {
      if (detail.open !== e.target.open) detail.open = e.target.open;
    });
    onLayout();
  }, true);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) wake(); else { cancelAnimationFrame(frame); frame = 0; }
    }, { rootMargin: '120px' }).observe(rail);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else wake();
  });
  addEventListener('resize', () => { measure(); wake(); });
  addEventListener('load', measure);
  document.fonts?.ready.then(measure);
  measure();
  return { configure, stop, wake };
};
