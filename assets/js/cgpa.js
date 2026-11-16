/* ==========================================================================
   SGPA / CGPA calculator
   ========================================================================== */
(function () {
  'use strict';

  var S = window.SRM;
  var num = S.num, r2 = S.r2;

  var GRADES = [
    { g: 'O',  gp: 10 },
    { g: 'A+', gp: 9 },
    { g: 'A',  gp: 8 },
    { g: 'B+', gp: 7 },
    { g: 'B',  gp: 6 },
    { g: 'C',  gp: 5 },
    { g: 'F',  gp: 0 }
  ];
  var KEY = 'srm.cgpa';

  var $ = function (s) { return document.querySelector(s); };

  var subjects = [];
  var prev = { cgpa: 0, credits: 0 };

  /* ---------- state ---------- */
  function defaultSubjects() {
    var out = [];
    for (var i = 0; i < 5; i++) out.push({ grade: 'A+', credits: 4 });
    return out;
  }

  function load() {
    var saved = S.store.json(KEY);
    if (saved && Array.isArray(saved.subjects) && saved.subjects.length) {
      subjects = saved.subjects.map(function (s) {
        return {
          grade: GRADES.some(function (x) { return x.g === s.grade; }) ? s.grade : 'A+',
          credits: Math.max(0, num(s.credits))
        };
      });
      prev.cgpa = Math.min(10, Math.max(0, num(saved.prevCgpa)));
      prev.credits = Math.max(0, num(saved.prevCredits));
      if (saved.target != null) $('#targetCgpa').value = saved.target;
      if (saved.nextCredits != null) $('#nextCredits').value = saved.nextCredits;
    } else {
      subjects = defaultSubjects();
    }
    $('#prevCgpa').value = prev.cgpa;
    $('#prevCredits').value = prev.credits;
  }

  function save() {
    S.store.set(KEY, JSON.stringify({
      subjects: subjects,
      prevCgpa: num($('#prevCgpa').value),
      prevCredits: num($('#prevCredits').value),
      target: num($('#targetCgpa').value),
      nextCredits: num($('#nextCredits').value)
    }));
  }

  /* ---------- maths ---------- */
  function gpOf(grade) {
    var hit = GRADES.filter(function (x) { return x.g === grade; })[0];
    return hit ? hit.gp : 0;
  }

  function totals() {
    var credits = 0, points = 0;
    subjects.forEach(function (s) {
      credits += s.credits;
      points += s.credits * gpOf(s.grade);
    });
    var prevCgpa = num($('#prevCgpa').value);
    var prevCredits = num($('#prevCredits').value);
    var sgpa = credits ? points / credits : 0;
    var allCredits = credits + prevCredits;
    var cgpa = allCredits ? (points + prevCgpa * prevCredits) / allCredits : 0;
    return {
      credits: credits, points: points, sgpa: sgpa,
      prevCgpa: prevCgpa, prevCredits: prevCredits,
      allCredits: allCredits, cgpa: cgpa
    };
  }

  /* ---------- rendering ---------- */
  function renderRows() {
    var body = $('#subjectRows');
    body.innerHTML = subjects.map(function (s, i) {
      var options = GRADES.map(function (x) {
        return '<option value="' + x.g + '"' + (x.g === s.grade ? ' selected' : '') + '>' +
          x.g + ' · ' + x.gp + ' pts</option>';
      }).join('');
      return '<tr data-i="' + i + '">' +
        '<td><span class="idx">' + (i + 1) + '</span></td>' +
        '<td><select data-role="grade" aria-label="Grade for subject ' + (i + 1) + '">' + options + '</select></td>' +
        '<td><div class="input-wrap"><input data-role="credits" type="number" min="0" max="12" step="0.5" value="' +
          s.credits + '" inputmode="decimal" aria-label="Credits for subject ' + (i + 1) + '"></div></td>' +
        '<td><button class="btn-icon" data-role="remove" aria-label="Remove subject ' + (i + 1) + '" title="Remove">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
          '<path d="M6 6l12 12M18 6L6 18"/></svg></button></td>' +
      '</tr>';
    }).join('');
    $('#subjCount').textContent = subjects.length + (subjects.length === 1 ? ' subject' : ' subjects');
  }

  function renderResult() {
    var t = totals();
    $('#sgpa').textContent = r2(t.sgpa).toFixed(2);
    $('#cgpa').textContent = r2(t.cgpa).toFixed(2);
    $('#totalPoints').textContent = S.fmt(r2(t.points));
    $('#totalCredits').textContent = S.fmt(t.credits);

    var best = subjects.slice().sort(function (a, b) { return gpOf(b.grade) - gpOf(a.grade); })[0];
    $('#bestGrade').innerHTML = best
      ? best.grade + ' <small>' + gpOf(best.grade) + ' pts</small>'
      : '—';

    $('#cgpaBasis').textContent = t.prevCredits
      ? 'across ' + S.fmt(t.allCredits) + ' credits, including ' + S.fmt(t.prevCredits) + ' from earlier semesters'
      : 'first semester — CGPA matches SGPA';

    var delta = $('#cgpaDelta');
    if (!t.prevCredits) {
      delta.className = 'verdict v-info';
      delta.textContent = 'FIRST SEM';
    } else {
      var d = t.cgpa - t.prevCgpa;
      var sign = d >= 0 ? '+' : '';
      delta.className = 'verdict ' + (d >= 0 ? 'v-ok' : 'v-bad');
      delta.textContent = sign + d.toFixed(2) + ' VS PREV';
    }

    renderPlanner(t);
  }

  function renderPlanner(t) {
    var note = $('#plannerNote');
    var target = num($('#targetCgpa').value);
    var nextCr = num($('#nextCredits').value);

    if (!nextCr) {
      note.className = 'note';
      note.innerHTML = 'Enter how many credits next semester carries.';
      return;
    }

    var knownCredits = t.allCredits;
    var knownPoints = t.points + t.prevCgpa * t.prevCredits;
    var required = (target * (knownCredits + nextCr) - knownPoints) / nextCr;
    var maxCgpa = (knownPoints + 10 * nextCr) / (knownCredits + nextCr);

    if (required <= 0) {
      note.className = 'note ok';
      note.innerHTML = 'You are already at or above <b>' + target.toFixed(2) + '</b>. Even a 0 SGPA next semester keeps you there — ' +
        'the floor is <b>' + ((knownPoints) / (knownCredits + nextCr)).toFixed(2) + '</b>.';
    } else if (required > 10) {
      note.className = 'note';
      note.innerHTML = 'A <b>' + target.toFixed(2) + '</b> CGPA is out of reach next semester — you would need a ' +
        '<b>' + required.toFixed(2) + '</b> SGPA, and the maximum is 10. The best you can finish on is ' +
        '<b>' + maxCgpa.toFixed(2) + '</b>.';
    } else if (required > 9.5) {
      note.className = 'note';
      note.innerHTML = 'Tight. You need an SGPA of <b>' + required.toFixed(2) + '</b> next semester across ' + S.fmt(nextCr) +
        ' credits — that means almost all O grades. A full 10 SGPA would take you to <b>' + maxCgpa.toFixed(2) + '</b>.';
    } else {
      note.className = 'note info';
      note.innerHTML = 'You need an SGPA of <b>' + required.toFixed(2) + '</b> next semester across ' + S.fmt(nextCr) +
        ' credits to reach <b>' + target.toFixed(2) + '</b>. A perfect 10 would land you on <b>' + maxCgpa.toFixed(2) + '</b>.';
    }
  }

  function renderAll() {
    renderResult();
    save();
  }

  /* ---------- events ---------- */
  function wire() {
    var body = $('#subjectRows');

    body.addEventListener('change', function (e) {
      var tr = e.target.closest('tr');
      if (!tr) return;
      var i = Number(tr.getAttribute('data-i'));
      var role = e.target.getAttribute('data-role');
      if (role === 'grade') subjects[i].grade = e.target.value;
      if (role === 'credits') {
        var v = num(e.target.value);
        if (v < 0) { v = 0; e.target.value = 0; }
        if (v > 12) { v = 12; e.target.value = 12; }
        subjects[i].credits = v;
      }
      renderAll();
    });

    body.addEventListener('input', function (e) {
      if (e.target.getAttribute('data-role') !== 'credits') return;
      var tr = e.target.closest('tr');
      var i = Number(tr.getAttribute('data-i'));
      subjects[i].credits = Math.max(0, num(e.target.value));
      renderAll();
    });

    body.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-role="remove"]');
      if (!btn) return;
      var tr = btn.closest('tr');
      var i = Number(tr.getAttribute('data-i'));
      subjects.splice(i, 1);
      if (!subjects.length) subjects.push({ grade: 'A+', credits: 4 });
      renderRows();
      renderAll();
    });

    $('#addSubject').addEventListener('click', function () {
      subjects.push({ grade: 'A+', credits: 4 });
      renderRows();
      renderAll();
      var rows = body.querySelectorAll('tr');
      var last = rows[rows.length - 1];
      if (last) {
        var sel = last.querySelector('select');
        if (sel) sel.focus();
      }
    });

    $('#resetSubjects').addEventListener('click', function () {
      subjects = defaultSubjects();
      $('#prevCgpa').value = 0;
      $('#prevCredits').value = 0;
      renderRows();
      renderAll();
    });

    ['prevCgpa', 'prevCredits', 'targetCgpa', 'nextCredits'].forEach(function (id) {
      $('#' + id).addEventListener('input', function (e) {
        var v = num(e.target.value);
        if (id === 'prevCgpa' && v > 10) { e.target.value = 10; }
        if (v < 0) { e.target.value = 0; }
        renderAll();
      });
    });
  }

  /* ---------- boot ---------- */
  S.ready(function () {
    load();
    renderRows();
    wire();
    renderResult();
  });
})();
