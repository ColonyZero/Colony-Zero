(function () {
  var G = window.Game, C = window.CONFIG;
  function S() { return G.state; }
  var cv = document.getElementById('scene');
  var R = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  var sc = new THREE.Scene(); sc.background = new THREE.Color(0x3b4258);
  var cam = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  sc.add(new THREE.AmbientLight(0xffffff, 0.8));
  var sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(12, 25, 10); sc.add(sun);
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function mesh(g, c, x, y, z) { var m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: c })); m.position.set(x, y, z); return m; }

  sc.add(mesh(new THREE.CylinderGeometry(20, 19, 2, 48), 0xb59b73, 0, -1, 0));
  var hq = new THREE.Group();
  hq.add(mesh(new THREE.BoxGeometry(3, 2, 3), 0x7F77DD, 0, 1, 0));
  var roof = mesh(new THREE.ConeGeometry(2.5, 1.3, 4), 0x534AB7, 0, 2.65, 0); roof.rotation.y = Math.PI / 4; hq.add(roof);
  sc.add(hq);

  var nodes = [], workers = [], drills = [];
  function setN(n) { n.g.scale.setScalar(n.amt > 0 ? 0.45 + 0.55 * n.amt / 8 : 0.001); }
  for (var i = 0; i < 8; i++) {
    var a = i * 0.785 + rnd(-0.2, 0.2), r = rnd(9, 15), col = i % 2 ? 0xEF9F27 : 0x5DCAA5, g = new THREE.Group();
    g.add(mesh(new THREE.DodecahedronGeometry(0.8), col, 0, 0.7, 0));
    g.add(mesh(new THREE.DodecahedronGeometry(0.5), col, 0.8, 0.4, 0.3));
    g.add(mesh(new THREE.DodecahedronGeometry(0.45), 0x888780, -0.7, 0.3, -0.3));
    g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    var n = { g: g, amt: 8, x: g.position.x, z: g.position.z, rs: 0 };
    g.userData.n = n; sc.add(g); nodes.push(n);
  }

  var avatar = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
  avatar.scale.set(3.4, 3.4, 1); avatar.position.set(0, 2.2, 4); avatar.visible = false; sc.add(avatar);
  var curSel = null, loader = new THREE.TextureLoader();
  function loadAvatar() {
    if (curSel === S().selected) return;
    curSel = S().selected;
    loader.load('assets/sprites/' + curSel + '.webp', function (t) { avatar.material.map = t; avatar.material.needsUpdate = true; avatar.visible = true; });
  }

  function addWorker() {
    var g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.7, 8), 0xD85A30, 0, 0.35, 0));
    g.add(mesh(new THREE.SphereGeometry(0.25, 10, 8), 0xf5c4b3, 0, 0.95, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.12, 8), 0xEF9F27, 0, 1.15, 0));
    g.position.set(rnd(-2, 2), 0, rnd(2, 3)); sc.add(g);
    workers.push({ g: g, st: 'go', node: null, t: 0 });
  }
  function addDrill() {
    var n = nodes[drills.length], g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), 0x444441, 0, 0.45, 0));
    var sp = mesh(new THREE.ConeGeometry(0.3, 0.9, 6), 0xA32D2D, 0, 1.35, 0); sp.rotation.x = Math.PI; g.add(sp);
    g.position.set(n.x + 1.6, 0, n.z); sc.add(g);
    drills.push({ g: g, n: n, sp: sp, t: 0 });
  }
  function sync() {
    var s = S();
    while (workers.length < s.workers) addWorker();
    while (workers.length > s.workers) sc.remove(workers.pop().g);
    while (drills.length < s.drills) addDrill();
    while (drills.length > s.drills) sc.remove(drills.pop().g);
  }

  var el = function (id) { return document.getElementById(id); };
  function wc() { return 5 + 4 * (S().workers - 2); }
  function dc() { return 15 + 10 * S().drills; }
  function ui() {
    var s = S();
    el('ore').textContent = s.ore; el('wk').textContent = s.workers; el('dr').textContent = s.drills;
    el('hire').textContent = s.workers >= 10 ? 'Workers maxed' : 'Hire worker (' + wc() + ' ore)';
    el('drill').textContent = s.drills >= 8 ? 'Drills maxed' : 'Build drill (' + dc() + ' ore)';
  }
  function say(t) { el('bmsg').textContent = t; }
  function gain(n) { S().ore += n; G.addXp(n * C.XP_PER_ORE); ui(); }

  el('hire').onclick = function () {
    var s = S();
    if (s.workers >= 10) return say('Max 10 workers');
    if (s.ore < wc()) return say('Need ' + (wc() - s.ore) + ' more ore');
    s.ore -= wc(); s.workers++; G.save(); sync(); ui(); say('New worker hired');
  };
  el('drill').onclick = function () {
    var s = S();
    if (s.drills >= 8) return say('Max 8 drills');
    if (s.ore < dc()) return say('Need ' + (dc() - s.ore) + ' more ore');
    s.ore -= dc(); s.drills++; G.save(); sync(); ui(); say('Drill built. It mines on its own');
  };

  var theta = 0.7, phi = 1.0, dist = 34, drag = false, lx = 0, ly = 0, sx = 0, sy = 0, st = 0, ray = new THREE.Raycaster();
  function tap(x, y) {
    var b = cv.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((x - b.left) / b.width * 2 - 1, -((y - b.top) / b.height) * 2 + 1), cam);
    var h = ray.intersectObjects(nodes.map(function (n) { return n.g; }), true)[0];
    var n = h && h.object.parent.userData.n;
    if (n && n.amt > 0) { n.amt--; setN(n); gain(1); }
  }
  cv.addEventListener('pointerdown', function (e) { drag = true; lx = sx = e.clientX; ly = sy = e.clientY; st = Date.now(); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointerup', function (e) {
    drag = false;
    if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) < 6 && Date.now() - st < 400) tap(e.clientX, e.clientY);
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    theta -= (e.clientX - lx) * 0.01; phi = Math.max(0.4, Math.min(1.35, phi - (e.clientY - ly) * 0.008));
    lx = e.clientX; ly = e.clientY;
  });

  function step(w, tx, tz, sp, stop) {
    var p = w.g.position, dx = tx - p.x, dz = tz - p.z, d = Math.sqrt(dx * dx + dz * dz);
    if (d > stop) { p.x += dx / d * sp; p.z += dz / d * sp; w.g.rotation.y = Math.atan2(dx, dz); }
    return d;
  }
  function pick(w) {
    var best = null, bd = 1e9;
    nodes.forEach(function (n) {
      if (n.amt <= 0) return;
      var d = Math.hypot(n.x - w.g.position.x, n.z - w.g.position.z) + rnd(0, 5);
      if (d < bd) { bd = d; best = n; }
    });
    w.node = best;
  }

  var clock = 0, fr = 0, lw = 0;
  function loop() {
    requestAnimationFrame(loop);
    if (!cv.clientWidth) return;
    if (cv.clientWidth !== lw) { lw = cv.clientWidth; R.setSize(lw, 340, false); cam.aspect = lw / 340; cam.updateProjectionMatrix(); }
    clock += 0.016;
    if (++fr % 60 === 0) { sync(); loadAvatar(); ui(); }
    if (!drag) theta += 0.0025;
    cam.position.set(dist * Math.sin(phi) * Math.cos(theta), dist * Math.cos(phi), dist * Math.sin(phi) * Math.sin(theta));
    cam.lookAt(0, 0, 0);
    avatar.position.y = 2.2 + Math.sin(clock * 3) * 0.12;
    workers.forEach(function (w) {
      if (w.st === 'go') {
        if (!w.node || w.node.amt <= 0) pick(w);
        if (w.node && step(w, w.node.x, w.node.z, 0.11, 1.1) < 1.2) { w.st = 'mine'; w.t = 0; }
      } else if (w.st === 'mine') {
        w.t += 0.016; w.g.rotation.z = Math.sin(clock * 14) * 0.12;
        if (w.node.amt <= 0) { w.st = 'go'; w.node = null; w.g.rotation.z = 0; }
        else if (w.t > 1) { w.node.amt--; setN(w.node); w.st = 'home'; w.g.rotation.z = 0; }
      } else if (step(w, 0, 0, 0.11, 2.3) < 2.4) { gain(1); w.st = 'go'; w.node = null; }
    });
    drills.forEach(function (d) {
      d.sp.rotation.y += 0.25; d.t += 0.016;
      if (d.t > 1.5) { d.t = 0; if (d.n.amt > 0) { d.n.amt--; setN(d.n); gain(1); } }
    });
    nodes.forEach(function (n) { if (n.amt <= 0 && (n.rs += 0.016) > 6) { n.amt = 8; n.rs = 0; setN(n); } });
    R.render(sc, cam);
  }

  document.querySelector('.tabs').addEventListener('click', function (e) {
    var t = e.target.getAttribute('data-tab');
    if (!t) return;
    ['base', 'chars', 'ranks'].forEach(function (k) {
      el('tab-' + k).hidden = k !== t;
      document.querySelector('[data-tab=' + k + ']').className = k === t ? 'on' : '';
    });
    if (t === 'ranks' && window.Ranks) Ranks.load();
  });

  window.Base = { gain: gain, ui: ui };
  sync(); loadAvatar(); ui(); loop();
})();
