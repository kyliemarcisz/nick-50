/* ═══════════════════════════════════════════════════
   main.js — Nick at Fifty
   No frameworks. No libraries. Just craft.
═══════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────
   PAGE TRANSITION — JS fallback
   Only activates when CSS @view-transition
   navigation is NOT supported (Firefox, Safari).
───────────────────────────────────────── */
(function initTransitionFallback() {
  // MPA view transitions are available in Chrome 126+ via CSS alone.
  // For other browsers, we intercept internal link clicks and show
  // a full-screen overlay before navigating.
  const supported = 'startViewTransition' in document;
  if (supported) return;

  const overlay = document.getElementById('page-overlay');
  if (!overlay) return;

  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    // Only intercept same-origin, same-page-type links
    try {
      const url = new URL(link.href);
      if (url.origin !== location.origin) return;
      if (url.href === location.href) return;
      if (link.target === '_blank') return;
    } catch {
      return;
    }

    e.preventDefault();
    const dest = link.href;

    overlay.classList.add('is-active');

    overlay.addEventListener('transitionend', () => {
      window.location.href = dest;
    }, { once: true });
  });

  // Fade out overlay on page show (back/forward cache)
  window.addEventListener('pageshow', () => {
    overlay.classList.remove('is-active');
  });
})();


/* ─────────────────────────────────────────
   INTERSECTION OBSERVER — staggered reveals
   Single shared instance. Reads data-delay
   from each element and writes it as --delay
   CSS custom property so the transition
   timing is pure CSS, not JS setTimeout hacks.
───────────────────────────────────────── */
(function initRevealObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const el = entry.target;
      const delay = el.dataset.delay ?? '0';
      el.style.setProperty('--delay', `${delay}ms`);
      el.classList.add('is-visible');

      // Stop observing — elements don't hide again
      observer.unobserve(el);
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px',
  });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();


/* ─────────────────────────────────────────
   CANVAS PARTICLE SYSTEM
   Slow-drifting gold embers. requestAnimationFrame
   loop. Pauses when tab is hidden. Respects
   prefers-reduced-motion. Caps at 30 particles
   on mobile.
───────────────────────────────────────── */
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.maxParticles = window.innerWidth < 768 ? 30 : 60;

    this._loop = this._loop.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onVisibility = this._onVisibility.bind(this);

    this._resize();
    this._populate();
    this._bindEvents();
    this.start();
  }

  _resize() {
    // Match CSS size exactly — avoid blurry canvas on high-DPR displays
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width  = rect.width  * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this._w = rect.width;
    this._h = rect.height;
  }

  _createParticle(atBottom = false) {
    return {
      x:      Math.random() * this._w,
      y:      atBottom ? this._h + Math.random() * 20 : Math.random() * this._h,
      r:      Math.random() * 2.5 + 0.5,
      vx:     (Math.random() - 0.5) * 0.35,
      vy:     -(Math.random() * 0.5 + 0.15),  // drift upward
      alpha:  Math.random() * 0.55 + 0.08,
      decay:  Math.random() * 0.004 + 0.001,
    };
  }

  _populate() {
    this.particles = Array.from(
      { length: this.maxParticles },
      () => this._createParticle(false)
    );
  }

  _update() {
    this.particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.y < -10 || p.alpha <= 0) {
        this.particles[i] = this._createParticle(true);
      }
    });
  }

  _draw() {
    this.ctx.clearRect(0, 0, this._w, this._h);
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = '#FFB612';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  _loop() {
    this._update();
    this._draw();
    this.animationId = requestAnimationFrame(this._loop);
  }

  start() {
    if (!this.animationId) this._loop();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  _onResize() {
    this._resize();
  }

  _onVisibility() {
    document.hidden ? this.stop() : this.start();
  }

  _bindEvents() {
    window.addEventListener('resize', this._onResize, { passive: true });
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibility);
  }
}

(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  // Respect prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  new ParticleSystem(canvas);
})();


/* ─────────────────────────────────────────
   CLIP-PATH REVEAL — Portugal hero
   Adds .is-revealed on load which triggers
   the CSS clip-path wipe animation.
───────────────────────────────────────── */
(function initClipReveal() {
  const els = document.querySelectorAll('.clip-reveal');
  if (!els.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('load', () => {
    els.forEach(el => {
      if (prefersReduced) {
        // Skip animation — just show it
        el.style.clipPath = 'inset(0 0% 0 0)';
        return;
      }
      // Single rAF to ensure paint has happened before class add
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('is-revealed'));
      });
    });
  });
})();
