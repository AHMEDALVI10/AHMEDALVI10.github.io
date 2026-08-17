/* ============================================================
   Sakib Ahmed — Navigable Map
   assets/js/map/boot.js
   ------------------------------------------------------------
   Entry point. Sets the theme before anything paints, grows the
   layout, builds the world, wires the UI to it, and handles the
   one case that has to fail gracefully: no WebGL.
   ============================================================ */

import { layout, BY_ID } from './graph.js';
import { createUI } from './ui.js';

/* ── theme, before first paint ──────────────────────────────── */

(function initTheme() {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem('sa-theme'); } catch (_) {}
  if (!saved) {
    saved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  root.setAttribute('data-theme', saved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', saved === 'dark' ? '#07090f' : '#f6f8fc');
})();

/* ── the map ────────────────────────────────────────────────── */

const stage = document.getElementById('stage');
const canvas = document.getElementById('mapCanvas');
const loader = document.getElementById('loader');
const fallback = document.getElementById('nowebgl');

function fail(reason) {
  if (loader) loader.remove();
  if (stage) stage.classList.add('is-dead');
  if (fallback) {
    fallback.hidden = false;
    const why = fallback.querySelector('[data-reason]');
    if (why && reason) why.textContent = reason;
  }
  document.body.classList.add('no-map');
}

(async function boot() {
  /* WebGL check before we bother importing three.js — a clearer
     failure than a stack trace out of the renderer constructor. */
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl') ||
               probe.getContext('experimental-webgl');
    if (!gl) { fail('This browser reports no WebGL support.'); return; }
  } catch (e) {
    fail('This browser blocked WebGL.');
    return;
  }

  let createWorld;
  try {
    const mod = await import('./world.js');
    createWorld = mod.createWorld;
  } catch (e) {
    fail('The 3D engine failed to load.');
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const positions = layout();

  let ui = null;
  let world;

  try {
    world = createWorld({
      canvas: canvas,
      positions: positions,
      reduceMotion: reduceMotion,
      onFrame: function (screen, meta) { if (ui) ui.onFrame(screen, meta); },
      onSelect: function (id) {
        if (ui) ui.onSelect(id);
        /* shareable URL, without stacking history entries */
        try {
          const url = id ? '#' + id : location.pathname;
          history.replaceState(null, '', url);
        } catch (_) {}
      },
      onHover: function (id) { if (ui) ui.onHover(id); },
    });
  } catch (e) {
    fail('WebGL context creation failed on this device.');
    return;
  }

  ui = createUI({ world: world });
  world.start();

  /* first frame has rendered by the next tick — drop the loader */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      if (loader) loader.classList.add('is-gone');
      stage.classList.add('is-live');
    });
  });

  /* deep link: /#medical opens that node directly */
  const wanted = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (wanted && BY_ID.has(wanted)) {
    setTimeout(function () { world.select(wanted); }, 420);
  }

  window.addEventListener('hashchange', function () {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (id && BY_ID.has(id) && id !== world.getSelected()) world.select(id);
  });

  /* expose for debugging from the console; harmless */
  window.__map = world;
})();
