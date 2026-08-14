/* ============================================================
   Sakib Ahmed — Personal Site
   assets/js/main.js  ·  vanilla, no dependencies
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. Theme (dark default, persisted, follows OS on first visit)
     --------------------------------------------------------- */
  (function theme() {
    var root   = document.documentElement;
    var toggle = $('#themeToggle');
    var KEY    = 'sa-theme';
    var saved  = null;

    try { saved = localStorage.getItem(KEY); } catch (e) { /* private mode */ }

    if (!saved) {
      saved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    root.setAttribute('data-theme', saved);
    syncMeta(saved);

    if (!toggle) return;
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      syncMeta(next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* noop */ }
    });

    function syncMeta(mode) {
      var meta = $('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', mode === 'dark' ? '#07090f' : '#f6f8fc');
    }
  })();

  /* ---------------------------------------------------------
     2. Navigation — sticky state, mobile menu, scroll spy
     --------------------------------------------------------- */
  (function nav() {
    var header = $('#nav');
    var burger = $('#burger');
    var links  = $('#navLinks');
    var items  = $$('[data-nav]');

    if (burger && links) {
      burger.addEventListener('click', function () {
        var open = links.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      links.addEventListener('click', function (e) {
        if (e.target.closest('a')) closeMenu();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
      });
      window.addEventListener('resize', function () {
        if (window.innerWidth > 780) closeMenu();
      });
    }

    function closeMenu() {
      if (!links || !links.classList.contains('is-open')) return;
      links.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
    }

    // sticky shrink + progress bar (single rAF-throttled scroll handler)
    var bar    = $('#progressBar');
    var ticking = false;

    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      if (header) header.classList.toggle('is-stuck', y > 24);

      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (max > 0 ? Math.min(y / max, 1) * 100 : 0) + '%';
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    // scroll spy
    var sections = items
      .map(function (a) { return $(a.getAttribute('href')); })
      .filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var id = en.target.id;
          items.forEach(function (a) {
            a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      sections.forEach(function (s) { spy.observe(s); });
    }
  })();

  /* ---------------------------------------------------------
     3. Reveal on scroll
     --------------------------------------------------------- */
  (function reveal() {
    var els = $$('[data-anim]');
    if (!els.length) return;

    // Reduced motion still gets the reveal — CSS downgrades it to a pure
    // opacity fade with no travel. Only a missing observer skips it entirely.
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.style.setProperty('--d', (el.dataset.delay || 0) + 'ms');
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------------
     4. Hero role rotator (typewriter)
     --------------------------------------------------------- */
  (function rotator() {
    var out = $('#rotatorText');
    if (!out) return;

    var phrases = [
      'intelligent connected systems.',
      'computer vision that runs on real cameras.',
      'firmware that survives bad networks.',
      'backends that talk to hardware.',
      'edge AI for industrial automation.'
    ];

    var i = 0, ch = 0, deleting = false;

    function tick() {
      var text = phrases[i];
      ch += deleting ? -1 : 1;
      out.textContent = text.slice(0, ch);

      var delay = deleting ? 32 : 55;

      if (!deleting && ch === text.length) {
        // Reduced motion types the first phrase once, then stops — an entrance,
        // not a loop. Continuously cycling text is the part that's a problem.
        if (reduceMotion) return;
        deleting = true;
        delay = 2100;
      } else if (deleting && ch === 0) {
        deleting = false;
        i = (i + 1) % phrases.length;
        delay = 380;
      }
      setTimeout(tick, delay);
    }
    setTimeout(tick, 700);
  })();

  /* ---------------------------------------------------------
     5. Animated counters
     --------------------------------------------------------- */
  (function counters() {
    var els = $$('.counter');
    if (!els.length) return;

    // A number ticking up is small-area and non-vestibular, so it runs either way.
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.textContent = el.dataset.to + (el.dataset.suffix || ''); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        run(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.5 });

    els.forEach(function (el) { io.observe(el); });

    function run(el) {
      var target = parseFloat(el.dataset.to) || 0;
      var suffix = el.dataset.suffix || '';
      var dur    = 1500;
      var start  = performance.now();

      (function step(now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);            // easeOutCubic
        el.textContent = Math.round(target * eased) + (p === 1 ? suffix : '');
        if (p < 1) requestAnimationFrame(step);
      })(start);
    }
  })();

  /* ---------------------------------------------------------
     6. Project filtering
     --------------------------------------------------------- */
  (function filters() {
    var buttons = $$('.filter');
    var cards   = $$('.proj');
    if (!buttons.length || !cards.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var want = btn.dataset.filter;

        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', String(on));
        });

        cards.forEach(function (card) {
          var cats  = (card.dataset.cat || '').split(/\s+/);
          var match = want === 'all' || cats.indexOf(want) !== -1;

          card.classList.remove('is-entering');
          card.classList.toggle('is-hidden', !match);

          if (match && !reduceMotion) {
            void card.offsetWidth;                      // restart the animation
            card.classList.add('is-entering');
          }
        });
      });
    });
  })();

  /* ---------------------------------------------------------
     7. Pointer-follow spotlight on expertise cards
     --------------------------------------------------------- */
  (function spotlight() {
    // Pure lighting — nothing moves — so this is fine under reduced motion.
    if (!window.matchMedia('(hover: hover)').matches) return;

    $$('.card--tilt').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top)  / r.height * 100) + '%');
      });
    });
  })();

  /* ---------------------------------------------------------
     8. Hero canvas — drifting node network
     --------------------------------------------------------- */
  (function network() {
    var canvas = $('#heroCanvas');
    if (!canvas || reduceMotion) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dpr    = Math.min(window.devicePixelRatio || 1, 2);
    var nodes  = [];
    var w = 0, h = 0;
    var raf = null;
    var visible = true;
    var pointer = { x: -9999, y: -9999 };

    function accent() {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--c1').trim();
      return v || '#00e5ff';
    }
    var stroke = accent();

    function resize() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      var density = Math.min(Math.round((w * h) / 16000), 90);
      nodes = [];
      for (var i = 0; i < density; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.5 + 0.7
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;

        // gentle attraction toward the pointer
        var pdx = pointer.x - n.x, pdy = pointer.y - n.y;
        var pd  = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pd < 150 && pd > 0) {
          n.x += (pdx / pd) * 0.34;
          n.y += (pdy / pd) * 0.34;
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = stroke;
        ctx.globalAlpha = 0.5;
        ctx.fill();

        for (var j = i + 1; j < nodes.length; j++) {
          var m  = nodes[j];
          var dx = n.x - m.x, dy = n.y - m.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 16900) {                             // 130px
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = stroke;
            ctx.globalAlpha = (1 - Math.sqrt(d2) / 130) * 0.16;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf && visible) raf = requestAnimationFrame(frame); }
    function stop()  { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    resize();
    start();

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { dpr = Math.min(window.devicePixelRatio || 1, 2); resize(); }, 180);
    });

    window.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    }, { passive: true });

    window.addEventListener('pointerleave', function () { pointer.x = pointer.y = -9999; });

    // don't burn cycles when the hero is offscreen or the tab is hidden
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        visible ? start() : stop();
      }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    // recolour when the theme flips
    var themeBtn = $('#themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        setTimeout(function () { stroke = accent(); }, 60);
      });
    }
  })();

  /* ---------------------------------------------------------
     9. Footer year
     --------------------------------------------------------- */
  (function year() {
    var el = $('#year');
    if (el) el.textContent = String(new Date().getFullYear());
  })();

})();
