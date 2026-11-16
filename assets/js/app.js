/* ==========================================================================
   SRM CGPA & Internals — shared shell: theme, storage, small helpers
   Loaded on every page before the page-specific script.
   ========================================================================== */
(function () {
  'use strict';

  var THEME_KEY = 'srm.theme';

  /* storage that never throws (private mode, sandboxed iframes, file://) */
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { window.localStorage.removeItem(k); } catch (e) {} },
    json: function (k) {
      try { return JSON.parse(store.get(k) || 'null'); } catch (e) { return null; }
    }
  };

  function systemTheme() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    } catch (e) {}
    return 'dark';
  }

  function paintMeta(theme) {
    var m = document.querySelector('meta[name="theme-color"]:not([media])');
    if (m) m.setAttribute('content', theme === 'light' ? '#f4f6f8' : '#000000');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    paintMeta(theme);
  }

  /* set the theme before first paint so there is no flash */
  applyTheme(store.get(THEME_KEY) || systemTheme());

  function toggleTheme() {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    store.set(THEME_KEY, next);
  }

  /* small numeric helpers shared by the calculators */
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }
  function up(n) { return Math.ceil(n - 1e-9); }        /* round up to a whole mark */
  function r1(n) { return Math.round(n * 10) / 10; }     /* one decimal */
  function r2(n) { return Math.round(n * 100) / 100; }   /* two decimals */

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
    });

    /* mark the current page in the nav */
    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (here === '') here = 'index.html';
    document.querySelectorAll('.nav a[href]').forEach(function (a) {
      var target = a.getAttribute('href').split('/').pop().toLowerCase();
      if (target === here) a.setAttribute('aria-current', 'page');
    });

    /* footer year */
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });

    /* if the browser flips its own preference and the user never chose, follow it */
    try {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
        if (!store.get(THEME_KEY)) applyTheme(systemTheme());
      });
    } catch (e) {}
  });

  window.SRM = {
    store: store,
    num: num, clamp: clamp, fmt: fmt, up: up, r1: r1, r2: r2,
    ready: ready, toggleTheme: toggleTheme
  };
})();
