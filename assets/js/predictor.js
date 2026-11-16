/* ==========================================================================
   Grade predictor
   Internals are on the course's internal maximum (60 for the 2021
   regulation, 50 for 2026). The end-semester paper is written out of
   whatever the paper carries (75 by default) and then scaled to its
   weight — 40 or 50 — before it is added to the internals.

   The result always aims at O. If O is out of reach it drops to the next
   grade that is still possible and shows what that needs.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.SRM;
  var num = S.num, clamp = S.clamp, fmt = S.fmt, up = S.up, r1 = S.r1;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var REGS = {
    '2021': { iaMax: 60, esWeight: 40, minEsPct: null, note: '2021 regulation · 60 / 40' },
    '2026': { iaMax: 50, esWeight: 50, minEsPct: 45, note: '2026 regulation · 50 / 50' }
  };
  var GRADES = [
    { g: 'O',  gp: 10, min: 91 },
    { g: 'A+', gp: 9,  min: 81 },
    { g: 'A',  gp: 8,  min: 71 },
    { g: 'B+', gp: 7,  min: 61 },
    { g: 'B',  gp: 6,  min: 56 },
    { g: 'C',  gp: 5,  min: 50 }
  ];
  var PASS_TOTAL = 50;
  var KEY = 'srm.predictor';

  var reg = '2021';
  var target = 'auto';           /* 'auto' | 'O' | 'A+' | … */

  function cfg() { return REGS[reg]; }

  /* paper marks <-> the weighted marks that count towards the 100 */
  function paperMax() {
    var v = num($('#paperInput').value);
    return v > 0 ? v : 75;
  }
  function wToRaw(w) { return (w / cfg().esWeight) * paperMax(); }
  function rawToW(r) { return (r / paperMax()) * cfg().esWeight; }

  function passWeighted() {
    var c = cfg();
    var byTotal = PASS_TOTAL - num($('#iaInput').value);
    var byExam = c.minEsPct ? c.esWeight * c.minEsPct / 100 : 0;
    return clamp(Math.max(byTotal, byExam), 0, c.esWeight);
  }
  function gradeForTotal(total) {
    for (var i = 0; i < GRADES.length; i++) if (total >= GRADES[i].min) return GRADES[i];
    return { g: 'F', gp: 0, min: 0 };
  }
  function bestGrade() {
    return gradeForTotal(num($('#iaInput').value) + cfg().esWeight);
  }
  function autoGrade() {
    var c = cfg(), ia = num($('#iaInput').value);
    for (var i = 0; i < GRADES.length; i++) if ((GRADES[i].min - ia) <= c.esWeight) return GRADES[i];
    return GRADES[GRADES.length - 1];
  }
  function activeGrade() {
    if (target === 'auto') return autoGrade();
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i].g === target) return GRADES[i];
    return autoGrade();
  }
  function statusOf(x) {
    var ia = num($('#iaInput').value), pm = paperMax();
    var needRaw = wToRaw(x.min - ia);
    if (needRaw <= 0) return 'done';
    if (needRaw > pm) return 'bad';
    return (needRaw / pm) >= 0.85 ? 'tight' : 'ok';
  }

  /* ---------- chips ---------- */
  function buildChips() {
    var html = '<button class="chip wide" data-g="auto" aria-pressed="' + (target === 'auto') + '">Auto<small>highest</small></button>';
    html += GRADES.map(function (x) {
      return '<button class="chip" data-g="' + x.g + '" aria-pressed="' + (target === x.g) + '">' +
        x.g + '<small>' + x.min + '+</small></button>';
    }).join('');
    $('#gradeChips').innerHTML = html;
    $$('#gradeChips .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        target = b.getAttribute('data-g');
        buildChips();
        render();
      });
    });
  }

  function buildPaperChips() {
    $$('#paperChips .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        $('#paperInput').value = b.getAttribute('data-p');
        syncPaper();
        render();
      });
    });
  }

  function syncPaper() {
    var pm = paperMax();
    $$('#paperChips .chip').forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-p')) === pm));
    });
    var wr = $('#whatRange');
    wr.max = pm;
    if (num(wr.value) > pm) wr.value = pm;
  }

  /* ---------- main render ---------- */
  function render() {
    var c = cfg();
    var pm = paperMax();
    var ia = num($('#iaInput').value);

    $('#iaOf').textContent = '/ ' + c.iaMax;
    $('#iaHint').textContent = '(out of ' + c.iaMax + ')';
    $('#needOf').textContent = '/ ' + pm;
    $('#ladderNote').textContent = c.note;

    var t = activeGrade();
    var auto = target === 'auto';
    var oGrade = GRADES[0];

    var needRawTrue = wToRaw(t.min - ia);
    var needRaw = clamp(needRawTrue, 0, pm);
    var needW = rawToW(needRaw);
    var pct = (Math.max(0, needRawTrue) / pm) * 100;
    var total = ia + needW;
    var best = bestGrade();
    var secured = (t.min - ia) <= 0;
    var impossible = needRawTrue > pm;
    var needShown = up(Math.max(0, needRawTrue));
    var passRaw = wToRaw(passWeighted());
    var cr = num($('#credits').value);

    /* headline */
    $('#needNum').textContent = needShown;
    $('#needPct').textContent = pct.toFixed(0) + '%';

    $('#lede').innerHTML = secured
      ? 'You already have <b>' + fmt(ia) + '</b> internal marks, which clears the <b>' + t.g +
        '</b> band on its own — the end semester cannot pull you below it. Scoring <b>' + needShown +
        '</b> or more keeps the cushion comfortable.'
      : impossible
        ? 'A grade of <b>' + t.g + '</b> needs a total of <b>' + t.min + '</b>, so <b>' + needShown +
          '</b> marks on a ' + pm + '-mark paper — that is <b>' + up(needRawTrue - pm) +
          '</b> more than the paper allows. With <b>' + fmt(ia) + '</b> internal marks the best you can reach is <b>' +
          best.g + '</b> (' + best.gp + ' GP).'
        : 'Score <b>' + needShown + ' out of ' + pm + '</b> in the end semester to finish on <b>' + r1(total) +
          '</b> and take home <b>' + t.g + '</b>. That is <b>' + pct.toFixed(0) + '%</b> of the paper, worth <b>' +
          fmt(needW) + '</b> of the ' + c.esWeight + ' end-sem marks that count. You can afford to lose <b>' +
          Math.max(0, pm - needShown) + '</b> marks.';

    /* verdict */
    var v = $('#verdict');
    if (secured) { v.className = 'verdict v-info'; v.textContent = t.g + ' SECURED'; }
    else if (impossible) { v.className = 'verdict v-bad'; v.textContent = t.g + ' OUT OF REACH'; }
    else if (pct >= 85) { v.className = 'verdict v-warn'; v.textContent = 'TIGHT — NEED ' + Math.round(pct) + '%'; }
    else { v.className = 'verdict v-ok'; v.textContent = t.g + ' — ACHIEVABLE'; }

    /* O first, else next best */
    var nb = $('#nextBest');
    if (auto) {
      var oNeed = up(Math.max(0, wToRaw(oGrade.min - ia)));
      var oPossible = wToRaw(oGrade.min - ia) <= pm;
      if (oPossible) {
        nb.className = 'note ok';
        nb.innerHTML = 'Highest grade <b>O</b> is still within reach — <b>' + oNeed + '</b> of ' + pm +
          ' gets you there, and anything from <b>A+</b> down is already safe with your internals.';
      } else {
        var gap = up(wToRaw(oGrade.min - ia) - pm);
        var next = autoGrade();
        var after = GRADES[GRADES.indexOf(next) + 1];
        nb.className = 'note';
        nb.innerHTML = '<b>O is out of reach</b> — it needs <b>' + oNeed + '</b> of ' + pm + ', ' + gap +
          ' more than the paper allows. So the target drops to <b>' + next.g + '</b>: score <b>' + needShown +
          '</b> of ' + pm + ' for it' +
          (after ? ', or <b>' + up(Math.max(0, wToRaw(after.min - ia))) + '</b> for a safe <b>' + after.g + '</b>' : '') + '.';
      }
      nb.hidden = false;
    } else {
      nb.hidden = true;
    }

    /* progress */
    $('#barGot').style.width = clamp(ia, 0, 100) + '%';
    $('#barNeed').style.width = clamp(needW, 0, 100) + '%';
    $('#lgGot').textContent = fmt(ia) + ' / ' + c.iaMax;
    $('#lgNeed').textContent = needShown + ' / ' + pm;
    $('#lgWeight').innerHTML = 'counts as <b style="color:var(--text)">' + fmt(needW) + '</b> of ' + c.esWeight;

    /* kpis */
    $('#maxTotal').innerHTML = fmt(ia + c.esWeight) + ' <small>/ 100</small>';
    $('#bestGrade').innerHTML = best.g + ' <small>' + best.gp + ' GP</small>';
    $('#passNeed').innerHTML = up(passRaw) + ' <small>/ ' + pm + '</small>';
    $('#gpOut').textContent = cr ? (t.gp * cr).toFixed(1) + ' grade points' : '';

    /* grade plan tiles */
    $('#gradePlan').innerHTML = GRADES.map(function (x) {
      var st = statusOf(x);
      var need = st === 'done' ? 0 : up(Math.max(0, wToRaw(x.min - ia)));
      var label = st === 'done' ? 'secured' : st === 'bad' ? 'no' : st === 'tight' ? 'tight' : 'ok';
      var isActive = x.g === t.g;
      return '<div class="ptile ' + st + (isActive ? ' active' : '') + '" role="listitem" title="' + x.g + ': ' +
        (st === 'bad' ? 'needs ' + need + ', more than the paper allows' : need + ' / ' + pm + ' on the paper') + '">' +
        '<span class="pg">' + x.g + '</span>' +
        '<span class="pn">' + (st === 'done' ? '0' : need) + '<small>/' + pm + '</small></span>' +
        '<span class="pst">' + label + '</span></div>';
    }).join('');

    /* ladder */
    $('#ladder').innerHTML =
      '<div class="lrow head-row"><span>Grade</span><span>Share of the paper</span><span class="lneed">Need</span><span class="lstat">Status</span></div>' +
      GRADES.map(function (x) {
        var trueRaw = wToRaw(x.min - ia);
        var done = (x.min - ia) <= 0;
        var out = trueRaw > pm;
        var p = (Math.max(0, trueRaw) / pm) * 100;
        var cls = done ? 't-done' : out ? 't-bad' : p >= 85 ? 't-warn' : 't-ok';
        var stat = done ? 'secured' : out ? 'not possible' : p >= 85 ? 'tight' : 'reachable';
        var colour = done ? 'var(--accent)' : out ? 'var(--bad)' : p >= 85 ? 'var(--warn)' : 'var(--good)';
        return '<div class="lrow" title="' + x.g + ': ' + up(Math.max(0, trueRaw)) + ' / ' + pm + ' on the paper = ' +
          fmt(clamp(x.min - ia, 0, c.esWeight)) + ' of ' + c.esWeight + '">' +
          '<span class="lg">' + x.g + '<small>' + x.min + '+</small></span>' +
          '<span class="ltrack"><i style="width:' + clamp(p, 0, 100) + '%;background:' + colour + ';opacity:' + (done ? 0.5 : 1) + '"></i></span>' +
          '<span class="lneed ' + cls + '">' + (done ? '0' : up(Math.max(0, trueRaw))) + ' <small>/ ' + pm + '</small></span>' +
          '<span class="lstat ' + cls + '">' + stat + '</span></div>';
      }).join('');

    /* what-if */
    var wr = $('#whatRange');
    wr.max = pm;
    var ws = num(wr.value);
    var wTotal = ia + rawToW(ws);
    var wGrade = gradeForTotal(wTotal);
    $('#whatScore').textContent = fmt(ws) + ' / ' + pm;
    var wg = $('#whatGrade');
    wg.textContent = wGrade.g + ' · ' + Math.round(wTotal) + '/100';
    wg.style.color = wGrade.g === 'F' ? 'var(--bad)' : 'var(--good)';
    wg.style.borderColor = wGrade.g === 'F' ? 'var(--bad)' : 'var(--good)';
    $('#whatLede').innerHTML = wGrade.g === 'F'
      ? '<b>' + fmt(ws) + '</b> out of ' + pm + ' becomes <b>' + fmt(rawToW(ws)) + '</b> of the ' + c.esWeight +
        ' end-sem marks, so your total is <b>' + r1(wTotal) + '</b> of 100 — below 50, which is a fail.'
      : '<b>' + fmt(ws) + '</b> out of ' + pm + ' becomes <b>' + fmt(rawToW(ws)) + '</b> of the ' + c.esWeight +
        ' end-sem marks → total <b>' + r1(wTotal) + '</b> of 100, grade <b>' + wGrade.g + '</b> (' + wGrade.gp +
        ' grade points)' + (cr ? ', worth <b>' + (wGrade.gp * cr).toFixed(1) + '</b> across ' + cr + ' credits' : '') + '.';

    /* mobile bar */
    $('#miniGrade').textContent = t.g;
    $('#miniText').textContent = secured ? t.g + ' already secured' : needShown + ' of ' + pm + ' needed in the end sem';
    $('#miniGrade').style.color = secured ? 'var(--accent)'
      : impossible ? 'var(--bad)' : pct >= 85 ? 'var(--warn)' : 'var(--good)';

    S.store.set(KEY, JSON.stringify({ reg: reg, target: target, ia: ia, cr: cr, ws: ws, pm: pm }));
  }

  /* ---------- wiring ---------- */
  function wire() {
    $$('#regs button').forEach(function (b) {
      b.addEventListener('click', function () {
        reg = b.getAttribute('data-reg');
        $$('#regs button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        var c = cfg();
        $('#iaInput').value = Math.min(num($('#iaInput').value), c.iaMax);
        $('#iaRange').value = $('#iaInput').value;
        $('#iaRange').max = c.iaMax;
        $('#whatRange').max = paperMax();
        $('#whatRange').value = Math.min(num($('#whatRange').value), paperMax());
        render();
      });
    });

    $('#iaInput').addEventListener('input', function (e) {
      var c = cfg();
      var v = num(e.target.value);
      if (v > c.iaMax) { v = c.iaMax; e.target.value = c.iaMax; }
      if (v < 0) { v = 0; e.target.value = 0; }
      $('#iaRange').value = v;
      render();
    });

    $('#iaRange').addEventListener('input', function (e) {
      $('#iaInput').value = e.target.value;
      render();
    });

    $('#paperInput').addEventListener('input', function () {
      if (num($('#paperInput').value) < 1) $('#paperInput').value = 1;
      syncPaper();
      render();
    });

    $('#credits').addEventListener('input', render);
    $('#whatRange').addEventListener('input', render);

    /* mini result bar */
    var bar = $('#miniBar'), card = $('#answerCard');
    bar.addEventListener('click', function () {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      card.setAttribute('tabindex', '-1');
      card.focus({ preventScroll: true });
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { bar.classList.toggle('hide', en.isIntersecting); });
      }, { threshold: 0.25 }).observe(card);
    }
  }

  /* ---------- boot ---------- */
  S.ready(function () {
    /* restore */
    var saved = S.store.json(KEY);
    if (saved) {
      if (REGS[saved.reg]) reg = saved.reg;
      if (saved.target === 'auto' || GRADES.some(function (g) { return g.g === saved.target; })) target = saved.target;
      if (saved.ia != null) $('#iaInput').value = saved.ia;
      if (saved.cr != null) $('#credits').value = saved.cr;
      if (saved.pm) $('#paperInput').value = saved.pm;
    }

    /* handoff from the internals calculator */
    var pre = S.store.json('srm.prefillIa');
    if (pre && typeof pre.ia === 'number' && pre.iaMax) {
      reg = pre.reg === '2021' ? '2021' : '2026';
      $('#iaInput').value = Math.min(pre.ia, REGS[reg].iaMax);
      S.store.del('srm.prefillIa');
    }

    $$('#regs button').forEach(function (x) {
      x.setAttribute('aria-pressed', String(x.getAttribute('data-reg') === reg));
    });
    var c = cfg();
    $('#iaInput').max = c.iaMax;
    $('#iaRange').max = c.iaMax;
    $('#iaRange').value = $('#iaInput').value;
    $('#whatRange').max = paperMax();
    if (!num($('#whatRange').value)) $('#whatRange').value = Math.round(paperMax() * 0.6);

    buildChips();
    buildPaperChips();
    syncPaper();
    wire();
    render();
  });
})();
