'use strict';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
document.getElementById('year').textContent = new Date().getFullYear();

// Navigation remains native, including browser history and anchor scrolling.
const header = document.querySelector('.header');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = Array.from(header.querySelectorAll('nav a'));
function setMenu(open) {
  header.classList.toggle('is-menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
}
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
navLinks.forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && header.classList.contains('is-menu-open')) {
    setMenu(false); menuToggle.focus();
  }
});
window.matchMedia('(max-width: 760px)').addEventListener('change', () => setMenu(false));

let scrollFrame = 0;
function updateProgress() {
  scrollFrame = 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  document.documentElement.style.setProperty('--page-progress', max > 0 ? clamp(window.scrollY / max, 0, 1) : 0);
}
window.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateProgress); }, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();
if ('IntersectionObserver' in window) {
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        const active = link.getAttribute('href') === '#' + entry.target.id;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });
  document.querySelectorAll('#home, #work, #about, #skills, #contact').forEach(section => navObserver.observe(section));
  if (!reducedMotion.matches) {
    document.documentElement.classList.add('js-motion');
    document.querySelectorAll('.skill-grid, .about-grid, .project-grid').forEach(group => {
      Array.from(group.children).forEach((child, index) => child.style.setProperty('--reveal-delay', Math.min(index, 3) * 65 + 'ms'));
    });
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); reveals.unobserve(entry.target); }
      });
    }, { threshold: .05 });
    document.querySelectorAll('.reveal').forEach(element => reveals.observe(element));
  }
}

const belt = document.querySelector('.skills-belt');
const beltToggle = document.querySelector('.belt-toggle');
beltToggle.addEventListener('click', () => {
  const paused = belt.classList.toggle('is-paused');
  beltToggle.setAttribute('aria-pressed', String(paused));
  beltToggle.setAttribute('aria-label', paused ? 'Resume skills animation' : 'Pause skills animation');
  beltToggle.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
});

// The native scroll container preserves link semantics, touch swiping and tab access.
const rail = document.querySelector('.project-rail');
const cards = Array.from(rail.querySelectorAll('.project'));
const previous = document.querySelector('.rail-prev');
const next = document.querySelector('.rail-next');
const railPause = document.querySelector('.rail-pause');
let railFrame = 0, railLast = 0, railVisible = true, railHover = false;
let railPaused = false, railDirection = 1, railSpeed = 0, momentum = 0, manualUntil = 0;
let drag = null, suppressClickUntil = 0;
const maxRail = () => Math.max(0, rail.scrollWidth - rail.clientWidth);
function railState() {
  const max = maxRail();
  previous.disabled = rail.scrollLeft <= 1;
  next.disabled = rail.scrollLeft >= max - 1;
  document.querySelector('.rail-position').style.setProperty('--rail-progress', max ? .16 + .84 * rail.scrollLeft / max : 1);
}
function syncRail() {
  if (railFrame) cancelAnimationFrame(railFrame);
  railFrame = 0;
  if (railVisible && !document.hidden && !reducedMotion.matches && finePointer.matches) {
    railLast = performance.now(); railFrame = requestAnimationFrame(animateRail);
  }
  railState();
}
function animateRail(now) {
  railFrame = 0;
  if (!railVisible || document.hidden || reducedMotion.matches || !finePointer.matches) return;
  const dt = Math.min(Math.max((now - railLast) / 1000, 0), .04); railLast = now;
  const active = !railPaused && !railHover && !rail.contains(document.activeElement) && !drag && now > manualUntil;
  railSpeed += ((active ? 22 : 0) - railSpeed) * (1 - Math.exp(-dt * 8));
  if (!drag) {
    momentum *= Math.exp(-dt * 5);
    if (Math.abs(momentum) < 1) momentum = 0;
    const max = maxRail();
    if (max > 0) {
      const value = rail.scrollLeft + (railSpeed * railDirection + momentum) * dt;
      rail.scrollLeft = clamp(value, 0, max);
      if (value >= max) { railDirection = -1; momentum = 0; }
      if (value <= 0) { railDirection = 1; momentum = 0; }
    }
  }
  railState(); railFrame = requestAnimationFrame(animateRail);
}
function moveRail(direction) {
  momentum = 0; railSpeed = 0; manualUntil = performance.now() + 8000;
  const step = cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(rail.firstElementChild).gap || 0);
  rail.scrollTo({ left: clamp(rail.scrollLeft + direction * step, 0, maxRail()), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}
previous.addEventListener('click', () => moveRail(-1));
next.addEventListener('click', () => moveRail(1));
railPause.addEventListener('click', () => {
  railPaused = !railPaused; momentum = 0;
  railPause.setAttribute('aria-pressed', String(railPaused));
  railPause.setAttribute('aria-label', railPaused ? 'Resume project motion' : 'Pause project motion');
  railPause.textContent = railPaused ? '▷' : 'Ⅱ';
});
rail.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') railHover = true; });
rail.addEventListener('pointerleave', () => { railHover = false; });
rail.addEventListener('scroll', railState, { passive: true });
rail.addEventListener('wheel', event => {
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) { manualUntil = performance.now() + 8000; momentum = 0; }
}, { passive: true });
rail.querySelectorAll('a, img').forEach(element => { element.draggable = false; });
rail.addEventListener('dragstart', event => event.preventDefault());
rail.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.pointerType !== 'mouse' || !finePointer.matches) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastTime: performance.now(), left: rail.scrollLeft, moved: false };
  momentum = 0; railSpeed = 0;
});
rail.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (!drag.moved && Math.abs(dx) < 7) return;
  if (!drag.moved && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
  if (!drag.moved) { drag.moved = true; rail.classList.add('is-dragging'); rail.setPointerCapture(event.pointerId); cards.forEach(clearTilt); }
  event.preventDefault();
  const now = performance.now(), dt = Math.max(now - drag.lastTime, 8);
  momentum = clamp(-(event.clientX - drag.lastX) / dt * 1000, -900, 900);
  drag.lastX = event.clientX; drag.lastTime = now;
  rail.scrollLeft = clamp(drag.left - dx, 0, maxRail()); railState();
});
function endDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  if (drag.moved) {
    suppressClickUntil = performance.now() + 350; manualUntil = performance.now() + 8000;
    if (performance.now() - drag.lastTime > 100 || reducedMotion.matches || event.type === 'pointercancel') momentum = 0;
  } else momentum = 0;
  if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
  drag = null; rail.classList.remove('is-dragging');
}
rail.addEventListener('pointerup', endDrag);
rail.addEventListener('pointercancel', endDrag);
rail.addEventListener('lostpointercapture', () => { drag = null; rail.classList.remove('is-dragging'); });
rail.addEventListener('click', event => {
  if (event.detail !== 0 && performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
}, true);
rail.addEventListener('keydown', event => {
  if (event.target !== rail) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); moveRail(event.key === 'ArrowRight' ? 1 : -1); }
  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault(); momentum = 0; railSpeed = 0; manualUntil = performance.now() + 8000;
    rail.scrollTo({ left: event.key === 'Home' ? 0 : maxRail(), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
});
if ('IntersectionObserver' in window) new IntersectionObserver(entries => { railVisible = entries[0].isIntersecting; syncRail(); }).observe(rail);
if ('ResizeObserver' in window) new ResizeObserver(railState).observe(rail);
window.addEventListener('resize', railState);

// Small transform distances and eased CSS transitions keep hover motion restrained.
function clearTilt(card) {
  card.classList.remove('is-hovered'); card.style.setProperty('--tilt-x', '0deg'); card.style.setProperty('--tilt-y', '0deg');
}
cards.forEach(card => {
  card.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && finePointer.matches && !reducedMotion.matches && !drag) card.classList.add('is-hovered');
  });
  card.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches || drag) return;
    const rect = card.getBoundingClientRect(), x = clamp((event.clientX - rect.left) / rect.width, 0, 1), y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    card.style.setProperty('--tilt-x', (y - .5) * -5 + 'deg'); card.style.setProperty('--tilt-y', (x - .5) * 5 + 'deg');
    card.style.setProperty('--glare-x', x * 100 + '%'); card.style.setProperty('--glare-y', y * 100 + '%');
  });
  card.addEventListener('pointerleave', () => clearTilt(card));
});
document.querySelectorAll('.magnetic').forEach(button => {
  button.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches) return;
    const rect = button.getBoundingClientRect();
    button.style.setProperty('--mag-x', clamp((event.clientX - rect.left - rect.width / 2) * .08, -6, 6) + 'px');
    button.style.setProperty('--mag-y', clamp((event.clientY - rect.top - rect.height / 2) * .12, -5, 5) + 'px');
  });
  button.addEventListener('pointerleave', () => { button.style.setProperty('--mag-x', '0px'); button.style.setProperty('--mag-y', '0px'); });
});

const title = document.querySelector('.hero h1');
const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT), textNodes = [];
while (walker.nextNode()) textNodes.push(walker.currentNode);
textNodes.forEach(node => {
  const fragment = document.createDocumentFragment();
  Array.from(node.textContent).forEach(letter => {
    const span = document.createElement('span'); span.className = 'hero-char'; span.textContent = letter; span.setAttribute('aria-hidden', 'true'); fragment.appendChild(span);
  });
  node.replaceWith(fragment);
});
const chars = Array.from(title.querySelectorAll('.hero-char'));
title.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || reducedMotion.matches || !finePointer.matches) return;
  const offsets = chars.map(char => { const rect = char.getBoundingClientRect(); const distance = Math.hypot(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2); return -8 * Math.exp(-distance * distance / 12000); });
  chars.forEach((char, index) => char.style.setProperty('--char-y', offsets[index] + 'px'));
});
title.addEventListener('pointerleave', () => chars.forEach(char => char.style.setProperty('--char-y', '0px')));

const glow = document.querySelector('.cursor-glow'), pill = document.querySelector('.cursor-pill');
let cursorFrame = 0, cursorX = 0, cursorY = 0, targetCursorX = 0, targetCursorY = 0, cursorStarted = false;
function animateCursor() {
  cursorFrame = 0;
  cursorX += (targetCursorX - cursorX) * .18; cursorY += (targetCursorY - cursorY) * .18;
  glow.style.transform = 'translate3d(' + cursorX + 'px,' + cursorY + 'px,0)';
  pill.style.transform = 'translate3d(' + (cursorX + 18) + 'px,' + (cursorY + 18) + 'px,0)';
  if (Math.abs(targetCursorX - cursorX) + Math.abs(targetCursorY - cursorY) > .2) cursorFrame = requestAnimationFrame(animateCursor);
}
window.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches) return;
  targetCursorX = event.clientX; targetCursorY = event.clientY;
  if (!cursorStarted) { cursorX = targetCursorX; cursorY = targetCursorY; cursorStarted = true; }
  glow.style.opacity = '1';
  pill.style.opacity = event.target.closest('.project-rail') && !event.target.closest('a, button') ? '1' : '0';
  if (!cursorFrame) cursorFrame = requestAnimationFrame(animateCursor);
}, { passive: true });
function hideCursor() { glow.style.opacity = pill.style.opacity = '0'; if (cursorFrame) cancelAnimationFrame(cursorFrame); cursorFrame = 0; }
document.documentElement.addEventListener('pointerleave', hideCursor);
window.addEventListener('blur', hideCursor);

// A projected trefoil sculpture: geometry is generated once, without WebGL/CDN dependencies.
const canvas = document.getElementById('flow-field'), ctx = canvas.getContext('2d');
let sceneFrame = 0, sceneVisible = true, sceneLast = 0, sceneTime = 0;
let width = 0, height = 0, yaw = -.2, pitch = .18, velocityX = 0, velocityY = 0;
let scenePointerX = 0, scenePointerY = 0, sceneTargetX = 0, sceneTargetY = 0, sceneDrag = null;
let rings = [], centers = [], sceneGradient;
let sceneRotation = { cx: 1, sx: 0, cy: 1, sy: 0, cz: Math.cos(-.35), sz: Math.sin(-.35) };
const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const normalize = vector => { const length = Math.hypot(vector.x, vector.y, vector.z) || 1; return { x: vector.x / length, y: vector.y / length, z: vector.z / length }; };
function center(t) { return { x: (1.2 + .4 * Math.cos(3 * t)) * Math.cos(2 * t), y: (1.2 + .4 * Math.cos(3 * t)) * Math.sin(2 * t), z: .64 * Math.sin(3 * t) }; }
function buildGeometry() {
  rings = []; centers = [];
  const count = width < 420 ? 78 : 108, sides = width < 420 ? 6 : 8;
  for (let index = 0; index < count; index++) {
    const t = index / count * Math.PI * 2, p = center(t), tangent = normalize(subtract(center(t + .01), center(t - .01)));
    const normal = normalize(cross(tangent, Math.abs(tangent.y) > .9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }));
    const binormal = cross(tangent, normal); centers.push(p);
    rings.push(Array.from({ length: sides }, (_, side) => {
      const a = side / sides * Math.PI * 2;
      return { x: p.x + .17 * (normal.x * Math.cos(a) + binormal.x * Math.sin(a)), y: p.y + .17 * (normal.y * Math.cos(a) + binormal.y * Math.sin(a)), z: p.z + .17 * (normal.z * Math.cos(a) + binormal.z * Math.sin(a)) };
    }));
  }
}
function project(p) {
  const { cx, sx, cy, sy, cz, sz } = sceneRotation;
  const y1 = p.y * cx - p.z * sx, z1 = p.y * sx + p.z * cx, x2 = p.x * cy + z1 * sy, z2 = -p.x * sy + z1 * cy;
  const x3 = x2 * cz - y1 * sz, y3 = x2 * sz + y1 * cz;
  const scale = Math.min(width, height) * .245 * 4.8 / (4.8 - z2);
  return { x: width * .5 + x3 * scale, y: height * .48 + y3 * scale, z: z2 };
}
function drawScene() {
  if (!ctx || !width || !height || !rings.length) return;
  ctx.clearRect(0, 0, width, height);
  const ax = pitch + scenePointerY * .13, ay = yaw + sceneTime * .11 + scenePointerX * .2;
  sceneRotation.cx = Math.cos(ax); sceneRotation.sx = Math.sin(ax); sceneRotation.cy = Math.cos(ay); sceneRotation.sy = Math.sin(ay);
  ctx.fillStyle = '#82b4ff25';
  for (let x = 24; x < width; x += 30) for (let y = 70; y < height - 65; y += 30) ctx.fillRect(x, y, 1, 1);
  const points = rings.map(ring => ring.map(project));
  ctx.strokeStyle = sceneGradient; ctx.lineWidth = .8;
  for (let side = 0; side < points[0].length; side++) {
    ctx.beginPath(); points.forEach((ring, index) => { const p = ring[side]; index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.closePath(); ctx.globalAlpha = .65; ctx.stroke();
  }
  for (let index = 0; index < points.length; index += 2) {
    ctx.beginPath(); points[index].forEach((p, side) => side ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    ctx.globalAlpha = clamp(.3 + (points[index][0].z + 1.8) * .12, .2, .7); ctx.lineWidth = .55; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let pulse = 0; pulse < 5; pulse++) {
    for (let tail = 7; tail >= 0; tail--) {
      const t = sceneTime * .25 + pulse * Math.PI * 2 / 5 - tail * .013, p = project(center(t));
      ctx.fillStyle = pulse % 2 ? 'rgba(255,137,110,' + (1 - tail / 8) + ')' : 'rgba(113,255,231,' + (1 - tail / 8) + ')';
      ctx.shadowColor = pulse % 2 ? '#ff896e' : '#47eadb'; ctx.shadowBlur = tail === 0 ? 12 : 0;
      const size = tail === 0 ? 3.2 : 1.5; ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
  }
  ctx.shadowBlur = 0;
}
function resizeScene() {
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height; if (!width || !height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sceneGradient = ctx.createLinearGradient(width * .1, height * .2, width * .9, height * .8);
  sceneGradient.addColorStop(0, '#47eadb'); sceneGradient.addColorStop(.5, '#82b4ff'); sceneGradient.addColorStop(1, '#ff896e');
  buildGeometry(); drawScene();
}
function animateScene(now) {
  sceneFrame = 0; if (!sceneVisible || document.hidden || reducedMotion.matches || !ctx) return;
  const elapsed = now - sceneLast;
  if (elapsed >= 15) {
    const dt = Math.min(elapsed / 1000, .04); sceneLast = now; sceneTime += dt;
    const easing = 1 - Math.exp(-dt * 5);
    scenePointerX += (sceneTargetX - scenePointerX) * easing; scenePointerY += (sceneTargetY - scenePointerY) * easing;
    if (!sceneDrag) { yaw += velocityY * dt; pitch = clamp(pitch + velocityX * dt, -1.1, 1.1); velocityX *= Math.exp(-dt * 5); velocityY *= Math.exp(-dt * 5); }
    drawScene();
  }
  sceneFrame = requestAnimationFrame(animateScene);
}
function syncScene() {
  if (sceneFrame) cancelAnimationFrame(sceneFrame); sceneFrame = 0;
  if (ctx && sceneVisible && !document.hidden && !reducedMotion.matches) { sceneLast = performance.now(); sceneFrame = requestAnimationFrame(animateScene); }
  else { if (reducedMotion.matches) scenePointerX = scenePointerY = 0; drawScene(); }
}
function resetScene() { yaw = -.2; pitch = .18; velocityX = velocityY = sceneTargetX = sceneTargetY = 0; drawScene(); }
document.querySelector('.scene-reset').addEventListener('click', resetScene);
canvas.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0 || reducedMotion.matches) return;
  event.preventDefault(); canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId);
  sceneDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, last: performance.now() }; velocityX = velocityY = 0; canvas.classList.add('is-dragging');
});
canvas.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
  const rect = canvas.getBoundingClientRect(); sceneTargetX = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1); sceneTargetY = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
  if (!sceneDrag || sceneDrag.id !== event.pointerId) return;
  const now = performance.now(), dt = Math.max((now - sceneDrag.last) / 1000, .01), dx = event.clientX - sceneDrag.x, dy = event.clientY - sceneDrag.y;
  yaw += dx * .006; pitch = clamp(pitch + dy * .006, -1.1, 1.1); velocityY = clamp(dx * .006 / dt, -1.5, 1.5); velocityX = clamp(dy * .006 / dt, -1.5, 1.5);
  sceneDrag.x = event.clientX; sceneDrag.y = event.clientY; sceneDrag.last = now;
});
function endSceneDrag(event) {
  if (!sceneDrag || sceneDrag.id !== event.pointerId) return;
  if (event.type === 'pointercancel' || performance.now() - sceneDrag.last > 100) velocityX = velocityY = 0;
  sceneDrag = null; canvas.classList.remove('is-dragging'); if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}
canvas.addEventListener('pointerup', endSceneDrag); canvas.addEventListener('pointercancel', endSceneDrag);
canvas.addEventListener('lostpointercapture', () => { sceneDrag = null; canvas.classList.remove('is-dragging'); });
canvas.addEventListener('pointerleave', () => { sceneTargetX = sceneTargetY = 0; });
canvas.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
  event.preventDefault(); if (event.key === 'Home') resetScene();
  else { yaw += event.key === 'ArrowLeft' ? -.15 : event.key === 'ArrowRight' ? .15 : 0; pitch = clamp(pitch + (event.key === 'ArrowUp' ? -.15 : event.key === 'ArrowDown' ? .15 : 0), -1.1, 1.1); drawScene(); }
});
if ('IntersectionObserver' in window) new IntersectionObserver(entries => { sceneVisible = entries[0].isIntersecting; syncScene(); }).observe(canvas);
if ('ResizeObserver' in window) new ResizeObserver(resizeScene).observe(canvas); else window.addEventListener('resize', resizeScene);
function motionChange() {
  if (reducedMotion.matches) {
    document.documentElement.classList.remove('js-motion'); momentum = railSpeed = velocityX = velocityY = 0; hideCursor(); cards.forEach(clearTilt);
    document.querySelectorAll('.magnetic').forEach(button => { button.style.setProperty('--mag-x', '0px'); button.style.setProperty('--mag-y', '0px'); });
    chars.forEach(char => char.style.setProperty('--char-y', '0px'));
  }
  railPause.disabled = reducedMotion.matches || !finePointer.matches;
  document.getElementById('rail-hint').textContent = !finePointer.matches ? 'Swipe to explore. Arrow buttons work too.' : reducedMotion.matches ? 'Drag to explore, or use the arrow buttons.' : '↔ Drag to explore. Hover to pause.';
  railPause.setAttribute('aria-label', railPause.disabled ? 'Automatic motion disabled by motion or touch settings' : railPaused ? 'Resume project motion' : 'Pause project motion');
  syncRail(); syncScene();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) hideCursor(); syncRail(); syncScene(); });
reducedMotion.addEventListener('change', motionChange); finePointer.addEventListener('change', motionChange);
resizeScene(); motionChange();
