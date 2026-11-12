(function () {
  var C = window.CONFIG, sb = null, uid = null, dirty = false, busy = false;
  function score(s) { return s.level * 1e6 + s.xp; }
  window.Cloud = {
    mark: function () { dirty = true; },
    enabled: function () { return !!sb; },
    leaderboard: async function () {
      if (!sb) return null;
      var r = await sb.from('leaderboard').select('name,level');
      return r.error ? null : r.data;
    },
    init: async function (G) {
      if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY || !window.supabase) return;
      try {
        sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
        var ses = (await sb.auth.getSession()).data.session;
        if (!ses) { var r = await sb.auth.signInAnonymously(); if (r.error) throw r.error; ses = r.data.session; }
        uid = ses.user.id;
        var q = await sb.from('saves').select('data').eq('user_id', uid).maybeSingle();
        if (q.data && q.data.data && score(q.data.data) > score(G.state)) G.setState(q.data.data);
        setInterval(function () { if (dirty) Cloud.push(G); }, 15000);
        document.addEventListener('visibilitychange', function () { if (document.hidden && dirty) Cloud.push(G); });
        dirty = true; Cloud.push(G);
      } catch (e) { console.warn('Cloud save off:', e.message || e); sb = null; }
    },
    push: async function (G) {
      if (!sb || !uid || busy) return;
      busy = true; dirty = false;
      var s = G.state;
      var r = await sb.from('saves').upsert({ user_id: uid, name: s.name, level: s.level, data: s, updated_at: new Date().toISOString() });
      if (r.error) { dirty = true; console.warn(r.error.message); }
      busy = false;
    }
  };
})();
