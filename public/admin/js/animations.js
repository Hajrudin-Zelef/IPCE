function animateValue(el, start, end, duration, formatter) {
  const startTime = performance.now();
  const step = (timestamp) => {
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * eased;
    el.textContent = formatter(current);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function animateCounters() {
  document.querySelectorAll('[data-count-to]').forEach(el => {
    const target = parseFloat(el.dataset.countTo);
    const suffix = el.dataset.countSuffix || '';
    const decimals = parseInt(el.dataset.countDecimals || '0');
    animateValue(el, 0, target, 1200, (v) => v.toFixed(decimals) + suffix);
  });
}

export function initFadeIn() {
  if (typeof IntersectionObserver === 'undefined') return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.observe-fade').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

export function setupDetailPanelClose() {
  const overlay = document.getElementById('detail-overlay');
  const panel = document.getElementById('detail-panel');
  if (!overlay || !panel) return;

  overlay.addEventListener('click', () => {
    panel.classList.remove('open');
    overlay.classList.remove('visible');
  });

  window.__closeDetailPanel = () => {
    panel.classList.remove('open');
    overlay.classList.remove('visible');
  };
}
