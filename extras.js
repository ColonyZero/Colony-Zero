(function () {
  var G = window.Game, C = window.CONFIG, B = window.Base, away = 0;
  function el(i) { return document.getElementById(i); }
  function S() { return G.state; }
  function fmt(ms) { var m = Math.floor(ms / 60000), h = Math.floor(m / 60); return h ? h + 'h ' + (m % 60) + 'm' : m + 'm'; }

  function showOff() {
    var n = Math.floor(S().pending);
    el('offline').hidden = n < 1;
    if (n >= 1) el('offtxt').textContent = n + ' ore mined while you were away' + (away ? ' (' + fmt(away) + ')' : '');
  }
  function offline() {
    var s = S(), now = Date.now(), gap = now - s.last;
    if (gap > 60000) {
      away = Math.min(gap, C.OFFLINE_CAP_HOURS * 3600000);
      s.pending += away / 1000 * (s.workers * C.OFFLINE_WORKER_RATE + s.drills * C.OFFLINE_DRILL_RATE);
      G.save();
    }
    showOff();
  }
  el('offbtn').onclick = function () {
    var n = Math.floor(S().pending);
    if (n < 1) return;
    S().pending -= n; B.gain(n); showOff();
  };

  function day(offset) { return new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10); }
  function nextStreak() { return S().dayClaimed === day(1) ? S().streak + 1 : 1; }
  function reward(st) { return 20 + 10 * Math.min(st, 7); }
  function showDaily() {
    var ok = S().dayClaimed !== day(0);
    el('dailybox').hidden = !ok;
    if (ok) el('dailytxt').textContent = 'Daily bonus: day ' + nextStreak() + ', +' + reward(nextStreak()) + ' ore';
  }
  el('dailybtn').onclick = function () {
    var s = S();
    if (s.dayClaimed === day(0)) return;
    var st = nextStreak(); s.streak = st; s.dayClaimed = day(0);
    B.gain(reward(st)); showDaily();
  };

  window.Ranks = {
    load: async function () {
      var ul = el('ranklist'); ul.textContent = '';
      el('pname').value = S().name;
      function row(a, b, me) {
        var li = document.createElement('li'); if (me) li.className = 'me';
        var x = document.createElement('span'), y = document.createElement('span');
        x.textContent = a; y.textContent = b; li.appendChild(x); li.appendChild(y); ul.appendChild(li);
      }
      if (!window.Cloud || !Cloud.enabled()) return row('Ranks need Supabase. See SUPABASE_SETUP.md', '', false);
      var rows = await Cloud.leaderboard();
      if (!rows) return row('Could not load ranks. Try again later.', '', false);
      if (!rows.length) return row('No players yet', '', false);
      rows.forEach(function (r, i) { row((i + 1) + '. ' + r.name, 'Level ' + r.level, r.name === S().name); });
    }
  };
  el('savename').onclick = function () {
    var v = el('pname').value.trim().replace(/[^\w \-]/g, '').slice(0, 16);
    if (v.length < 2) { el('pname').value = S().name; return; }
    S().name = v; G.save();
    if (window.Cloud) Cloud.push(G);
    Ranks.load();
  };

  document.addEventListener('visibilitychange', function () { if (!document.hidden) { offline(); showDaily(); } });
  offline(); showDaily();
})();
