export function mountBrandScroller(section) {
  if (!section) return () => {};
  const viewport = section.querySelector('.landing-brand-viewport');
  const group = section.querySelector('.landing-brand-logos');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const options = { signal: events.signal, passive: true };
  let reducedMotion = motion.matches;
  let hovered = false;
  let focused = false;
  let interacting = false;
  let visible = false;
  let resumeAt = 0;
  let position = viewport.scrollLeft;
  let loopWidth = group.getBoundingClientRect().width;
  let previousTime = 0;
  let frame;
  let paused = false;
  const controls = document.createElement('div'); controls.className = 'landing-brand-controls';
  controls.innerHTML = '<button class="brand-scroll-control" type="button" aria-label="Previous brands">←</button><button class="brand-scroll-control" type="button" aria-pressed="false">Pause scrolling</button><button class="brand-scroll-control" type="button" aria-label="Next brands">→</button>';
  viewport.after(controls);
  const [previous, pause, next] = controls.children;
  previous.addEventListener('click', () => { viewport.scrollLeft = Math.max(0, viewport.scrollLeft - 250); position = viewport.scrollLeft; resumeAt = performance.now() + 4000; }, { signal: events.signal });
  next.addEventListener('click', () => { viewport.scrollLeft += 250; position = viewport.scrollLeft; resumeAt = performance.now() + 4000; }, { signal: events.signal });
  pause.addEventListener('click', () => { paused = !paused; pause.textContent = paused ? 'Resume scrolling' : 'Pause scrolling'; pause.setAttribute('aria-pressed', String(paused)); }, { signal: events.signal });

  const deferResume = () => { interacting = false; resumeAt = performance.now() + 1600; };

  viewport.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovered = true; }, options);
  viewport.addEventListener('pointerleave', () => { hovered = false; }, options);
  viewport.addEventListener('focusin', () => { focused = true; }, options);
  viewport.addEventListener('focusout', () => { focused = false; }, options);
  viewport.addEventListener('pointerdown', () => { interacting = true; }, options);
  document.addEventListener('pointerup', deferResume, options);
  document.addEventListener('pointercancel', deferResume, options);
  viewport.addEventListener('touchmove', () => { resumeAt = performance.now() + 1600; }, options);
  viewport.addEventListener('wheel', () => { resumeAt = performance.now() + 1600; }, options);
  motion.addEventListener('change', () => { reducedMotion = motion.matches; }, { signal: events.signal });

  const resize = new ResizeObserver(() => {
    loopWidth = group.getBoundingClientRect().width;
    position = viewport.scrollLeft;
  });
  resize.observe(group);
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  visibility.observe(viewport);

  const animate = time => {
    const elapsed = previousTime ? Math.min(time - previousTime, 64) : 0;
    previousTime = time;
    if (visible && !paused && !document.hidden && !reducedMotion && !hovered && !focused && !interacting && time >= resumeAt && loopWidth > viewport.clientWidth) {
      position = (position + elapsed * 0.032) % loopWidth;
      viewport.scrollLeft = position;
    } else {
      position = viewport.scrollLeft;
    }
    frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);
  return () => {
    cancelAnimationFrame(frame);
    events.abort();
    resize.disconnect();
    visibility.disconnect();
    controls.remove();
  };
}
