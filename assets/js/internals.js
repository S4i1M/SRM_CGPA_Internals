/* ==========================================================================
   Internal marks calculator
   Raw component scores → scaled internal marks out of the chosen total.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.SRM;
  var num = S.num, r1 = S.r1;
  var $ = function (s) { return document.querySelector(s); };

  var KEY = 'srm.internals';

  var PRESETS = {
    '30': [
      { name: 'Cycle Test 1', score: '', outOf: 50, weight: 15 },
      { name: 'Cycle Test 2', score: '', outOf: 50, weight: 15 }
    ],
    '50': [
      { name: 'Cycle Test 1', score: '', outOf: 50, weight: 15 },
      { name: 'Cycle Test 2', score: '', outOf: 50, weight: 15 },
      { name: 'Assignment',   score: '', outOf: 10, weight: 10 },
      { name: 'Attendance',   score: '', outOf: 10, weight: 10 }
    ],
    '60': [
      { name: 'Cycle Test 1', score: '', outOf: 50, weight: 15 },
      { name: 'Cycle Test 2', score: '', outOf: 50, weight: 15 },
      { name: 'Assignment',   score: '', outOf: 10, weight: 10 },
      { name: 'Attendance',   score: '', outOf: 10, weight: 10 },
      { name: 'Quiz / other', score: '', outOf: 10, weight: 10 }
    ]
  };

  var rows = [];
  var blankFull = true;

  /* ---------- state ---------- */
  function load() {
    var saved = S.store.json(KEY);
    if (saved && Array.isArray(saved.rows) && saved.rows.length) {
      rows = saved.rows.map(function (r) {
        return {
          name: String(r.name || 'Component').slice(0, 28),
          score: r.score === '' || r.score == null ? '' : num(r.score),
          outOf: Math.max(1, num(r.outOf) || 50),
          weight: Math.max(0, num(r.weight))
        };
      });
      blankFull = saved.blankFull !== false;
    } else {
      rows = clone(PRESETS['50']);
    }
    $('#blankFull').checked = blankFull;
  }

  function clone(arr) {
    return arr.map(function (r) {
      return { name: r.name, score: r.score, outOf: r.outOf, weight: r.weight };
    });
  }

  function save() {
    S.store.set(KEY, JSON.stringify({ rows: rows, blankFull: blankFull }));
  }

  /* ---------- maths ---------- */
  function scaled(r) {
    var max = Math.max(1, num(r.outOf));
    var raw = r.score === '' ? (blankFull ? max : 0) : Math.min(num(r.score), max);
    return (raw / max) * Math.max(0, num(r.weight));
  }

  function totals() {
    var total = 0, max = 0;
    rows.forEach(function (r) {
      total += scaled(r);
      max += Math.max(0, num(r.weight));
    });
    return { total: total, max: max, pct: max ? (total / max) * 100 : 0 };
  }

  /* ---------- rendering ---------- */
  function renderRows() {
    $('#compRows').innerHTML = rows.map(function (r, i) {
      return '<tr data-i="' + i + '">' +
        '<td><div class="input-wrap"><input data-role="name" type="text" value="' + esc(r.name) +
          '" aria-label="Component name ' + (i + 1) + '" style="font-weight:600"></div></td>' +
        '<td><div class="input-wrap"><input data-role="score" type="number" min="0" step="0.5" value="' + r.score +
          '" inputmode="decimal" placeholder="—" aria-label="Score for ' + esc(r.name) + '"></div></td>' +
        '<td><div class="input-wrap"><input data-role="outOf" type="number" min="1" step="1" value="' + r.outOf +
          '" inputmode="numeric" aria-label="Maximum for ' + esc(r.name) + '"></div></td>' +
        '<td><div class="input-wrap"><input data-role="weight" type="number" min="0" step="0.5" value="' + r.weight +
          '" inputmode="decimal" aria-label="Marks ' + esc(r.name) + ' counts for"></div></td>' +
        '<td><button class="btn-icon" data-role="remove" aria-label="Remove ' + esc(r.name) + '" title="Remove">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
          '<path d="M6 6l12 12M18 6L6 18"/></svg></button></td>' +
      '</tr>';
    }).join('');
    $('#rowCount').textContent = rows.length + (rows.length === 1 ? ' component' : ' components');
  }

  function renderResult() {
    var t = totals();
    $('#total').textContent = r1(Math.round(t.total * 10) / 10);
    $('#totalOf').textContent = '/ ' + S.fmt(t.max);
    $('#barGot').style.width = S.clamp(t.pct, 0, 100) + '%';
    $('#barBasis').textContent = 'of ' + S.fmt(t.max) + ' marks';

    var chip = $('#pctChip');
    chip.textContent = t.max ? t.pct.toFixed(0) + '% OF INTERNAL' : '—';
    chip.className = 'verdict ' + (t.pct >= 80 ? 'v-ok' : t.pct >= 50 ? 'v-warn' : 'v-bad');

    $('#totalLede').innerHTML = t.max
      ? 'That is <b>' + t.pct.toFixed(1) + '%</b> of the ' + S.fmt(t.max) + ' internal marks available in this split.' +
        (t.pct >= 90 ? ' Very strong — you are close to a full internal.' : t.pct >= 60 ? ' Solid, with room to push a few components up.' : ' Worth pushing: every internal mark here is one you do not have to earn again in the end sem.')
      : 'Add at least one component with a weight to see your total.';

    /* breakdown bars */
    $('#breakdown').innerHTML = rows.map(function (r) {
      var s = scaled(r), w = Math.max(0, num(r.weight));
      var pct = w ? (s / w) * 100 : 0;
      return '<div>' +
        '<div class="row" style="justify-content:space-between;gap:8px">' +
          '<span style="font-size:12.5px;font-weight:600">' + esc(r.name) + '</span>' +
          '<span class="mono" style="font-size:12px;color:var(--dim)">' + r1(Math.round(s * 10) / 10) + ' / ' + S.fmt(w) + '</span>' +
        '</div>' +
        '<div class="pbar" style="height:8px;margin-top:6px"><i style="width:' + S.clamp(pct, 0, 100) + '%;background:var(--accent)"></i></div>' +
      '</div>';
    }).join('');

    /* handoff to the predictor — only when the total matches a regulation */
    var btn = $('#sendToPredictor'), hint = $('#sendHint');
    if (t.max === 60 || t.max === 50) {
      btn.hidden = false;
      btn.setAttribute('data-total', t.total);
      btn.setAttribute('data-max', t.max);
      hint.textContent = 'Sends ' + r1(Math.round(t.total * 10) / 10) + ' / ' + t.max + ' across and picks the matching regulation.';
    } else {
      btn.hidden = true;
      hint.textContent = 'Set your components to total 60 (2021 regulation) or 50 (2026 regulation) to send these marks to the predictor.';
    }

    save();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- events ---------- */
  function wire() {
    var body = $('#compRows');

    body.addEventListener('input', function (e) {
      var role = e.target.getAttribute('data-role');
      if (!role || role === 'remove') return;
      var tr = e.target.closest('tr');
      var i = Number(tr.getAttribute('data-i'));
      var v = e.target.value;

      if (role === 'name') {
        rows[i].name = v.slice(0, 28);
        renderResult();
        return;
      }
      if (role === 'score') {
        rows[i].score = v === '' ? '' : Math.max(0, num(v));
      } else if (role === 'outOf') {
        rows[i].outOf = Math.max(1, num(v) || 1);
      } else if (role === 'weight') {
        rows[i].weight = Math.max(0, num(v));
      }
      renderResult();
    });

    body.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-role="remove"]');
      if (!btn) return;
      var tr = btn.closest('tr');
      var i = Number(tr.getAttribute('data-i'));
      rows.splice(i, 1);
      if (!rows.length) rows = clone(PRESETS['50']).slice(0, 1);
      renderRows();
      renderResult();
    });

    $('#addRow').addEventListener('click', function () {
      rows.push({ name: 'Component ' + (rows.length + 1), score: '', outOf: 10, weight: 5 });
      renderRows();
      renderResult();
      var trs = body.querySelectorAll('tr');
      var last = trs[trs.length - 1];
      if (last) last.querySelector('input').focus();
    });

    $('#blankFull').addEventListener('change', function (e) {
      blankFull = e.target.checked;
      renderResult();
    });

    document.querySelectorAll('#presets button').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-preset');
        rows = clone(PRESETS[key]);
        document.querySelectorAll('#presets button').forEach(function (x) {
          x.setAttribute('aria-pressed', String(x === b));
        });
        renderRows();
        renderResult();
      });
    });

    $('#sendToPredictor').addEventListener('click', function () {
      var total = num(this.getAttribute('data-total'));
      var max = num(this.getAttribute('data-max'));
      S.store.set('srm.prefillIa', JSON.stringify({
        ia: Math.round(total * 10) / 10,
        iaMax: max,
        reg: max === 60 ? '2021' : '2026'
      }));
      location.href = 'grade-predictor.html';
    });
  }

  /* ---------- boot ---------- */
  S.ready(function () {
    load();
    renderRows();
    wire();
    renderResult();
    /* highlight the preset whose total matches what was loaded */
    var max = totals().max;
    document.querySelectorAll('#presets button').forEach(function (x) {
      x.setAttribute('aria-pressed', String(Number(x.getAttribute('data-preset')) === max));
    });
  });
})();
