(function () {
  var C = window.CONFIG, CH = window.CHARACTERS;
  var state = load();

  function fresh() { return { level: 1, xp: 0, coins: 0, owned: ['c01'], selected: 'c01' }; }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(C.SAVE_KEY)); if (s && s.owned) return s; } catch (e) {}
    return fresh();
  }
  function save() { try { localStorage.setItem(C.SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
  function need(l) { return C.XP_BASE * l; }
  function byId(id) { return CH.filter(function (c) { return c.id === id; })[0]; }
  function owns(id) { return state.owned.indexOf(id) > -1; }
  function img(c) { return 'assets/characters/' + c.id + '.webp'; }

  var tt;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast show';
    clearTimeout(tt); tt = setTimeout(function () { t.className = 'toast'; }, 2600);
  }

  function unlockByLevel() {
    var got = [];
    CH.forEach(function (c) {
      if (c.unlockLevel && state.level >= c.unlockLevel && !owns(c.id)) { state.owned.push(c.id); got.push(c.name); }
    });
    return got;
  }

  function addXp(n) {
    var before = state.level;
    state.xp += n;
    while (state.xp >= need(state.level)) { state.xp -= need(state.level); state.level++; }
    var got = unlockByLevel();
    save(); render();
    if (state.level > before) toast('Level ' + state.level + (got.length ? ' reached. Unlocked ' + got.join(' and ') : ' reached'));
  }

  function select(id) { if (owns(id)) { state.selected = id; save(); render(); } }

  function buy(id) {
    var c = byId(id);
    if (owns(id)) return;
    if (c.unlockLevel) { toast('Reach level ' + c.unlockLevel + ' to unlock ' + c.name); return; }
    if (state.coins < c.price) { toast('Need ' + (c.price - state.coins) + ' more ' + C.TOKEN_SYMBOL); return; }
    state.coins -= c.price; state.owned.push(id); state.selected = id;
    save(); render(); toast(c.name + ' bought');
  }

  function render() {
    document.getElementById('coins').textContent = state.coins;
    document.getElementById('sym').textContent = C.TOKEN_SYMBOL;
    document.getElementById('lvl').textContent = 'Level ' + state.level;
    document.getElementById('xptxt').textContent = state.xp + ' / ' + need(state.level) + ' XP';
    document.getElementById('xpbar').style.width = (state.xp / need(state.level) * 100) + '%';

    var s = byId(state.selected);
    var hero = document.getElementById('hero');
    hero.style.background = s.bg;
    hero.innerHTML = '<img src="' + img(s) + '" alt="' + s.name + '"><div><b>' + s.name + '</b><span>' + s.rarity + '</span></div>';

    document.getElementById('grid').innerHTML = CH.map(function (c) {
      var sel = c.id === state.selected, own = owns(c.id);
      var locked = !own && c.unlockLevel;
      var act;
      if (sel) act = '<span class="chip on">Selected</span>';
      else if (own) act = '<button data-act="select" data-id="' + c.id + '">Select</button>';
      else if (locked) act = '<span class="chip">Unlocks at level ' + c.unlockLevel + '</span>';
      else act = '<button class="buy" data-act="buy" data-id="' + c.id + '">Buy ' + c.price + ' ' + C.TOKEN_SYMBOL + '</button>';
      return '<article class="card' + (sel ? ' sel' : '') + (!own ? ' lock' : '') + '">' +
        '<img src="' + img(c) + '" alt="' + c.name + '" loading="lazy" style="background:' + c.bg + '">' +
        '<div class="info"><div class="name">' + c.name + '</div><div class="rar">' + c.rarity + '</div>' + act + '</div></article>';
    }).join('');
  }

  document.getElementById('grid').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]');
    if (!b) return;
    if (b.dataset.act === 'buy') buy(b.dataset.id); else select(b.dataset.id);
  });

  document.querySelector('.dev').addEventListener('click', function (e) {
    var d = e.target.getAttribute('data-dev');
    if (d === 'xp') addXp(50);
    if (d === 'coins') { state.coins += 100; save(); render(); }
    if (d === 'reset' && confirm('Reset all progress?')) { state = fresh(); save(); render(); }
  });

  render();
})();
