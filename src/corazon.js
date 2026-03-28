// ── HTML del contenedor ─────────────────────────────────────────────
window.__CORAZON_HTML__ = `
<style>
  #corazon-wrapper {
    animation: heartReveal 2.5s cubic-bezier(0.2, 0, 0.4, 1) forwards;
  }
  @keyframes heartReveal {
    0%   { opacity: 0; transform: scale(0.3) translateY(80px); }
    100% { opacity: 1; transform: scale(1)   translateY(0);    }
  }
</style>
<div id="corazon-wrapper" style="position:fixed;left:-2vw;bottom:0;top:-40;width:760px;height:760px;z-index:10;pointer-events:none;">
  <canvas id="heartCanvas"></canvas>
</div>`;

// ── Lógica del corazón 3D ────────────────────────────────────────────
window.__CORAZON_INIT__ = function() {
  var canvas  = document.getElementById('heartCanvas');
  var ctx     = canvas.getContext('2d');
  var wrapper = document.getElementById('corazon-wrapper');
  var W, H;

  function resize() {
    W = canvas.width  = wrapper.offsetWidth;
    H = canvas.height = wrapper.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  var rotX = 0.25, rotY = 0;

  function heartSurface(u, v) {
    var x2d = 17 * Math.pow(Math.sin(u), 3);
    var y2d = -(14 * Math.cos(u) - 5 * Math.cos(2*u) - 2 * Math.cos(3*u) - Math.cos(4*u));
    var radius = Math.abs(x2d);
    var s = 1 / 17;
    return [radius * Math.cos(v) * s, y2d * s, radius * Math.sin(v) * s];
  }

  var N = 4000;
  var pts = [];
  for (var i = 0; i < N; i++) {
    var u = Math.random() * Math.PI * 2;
    var v = Math.random() * Math.PI * 2;
    var pos = heartSurface(u, v);
    pts.push({
      x: pos[0], y: pos[1], z: pos[2],
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
      r: 0.7 + Math.random() * 1.3
    });
  }

  function rotate(x, y, z, rx, ry) {
    var x1 =  x * Math.cos(ry) + z * Math.sin(ry);
    var z1 = -x * Math.sin(ry) + z * Math.cos(ry);
    var y2 =  y * Math.cos(rx) - z1 * Math.sin(rx);
    var z2 =  y * Math.sin(rx) + z1 * Math.cos(rx);
    return [x1, y2, z2];
  }

  function project(x, y, z) {
    var fov  = 3.0;
    var d    = fov + z;
    var size = Math.min(W, H) * 0.75;
    return [W/2 + (x/d)*size, H/2 + (y/d)*size, z];
  }

  var time = 0;

  function draw() {
    requestAnimationFrame(draw);
    time += 0.016;

    rotY += 0.007;

    ctx.clearRect(0, 0, W, H);

    var pulse = 1 + 0.05 * Math.sin(time * 2.5) + 0.02 * Math.sin(time * 5.0);
    var all = [];

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var wobble = 0.008 * Math.sin(p.phase + time * p.speed);
      var rot  = rotate(p.x * pulse + wobble, p.y * pulse + wobble, p.z * pulse + wobble, rotX, rotY);
      var proj = project(rot[0], rot[1], rot[2]);
      all.push({ sx: proj[0], sy: proj[1], sz: proj[2], rz: rot[1], r: p.r });
    }

    all.sort(function(a, b) { return a.sz - b.sz; });

    for (var j = 0; j < all.length; j++) {
      var d = all[j];
      var depth = Math.max(0, Math.min(1, (d.rz + 1) / 2));
      var alpha = 0.18 + depth * 0.82;
      var dotR  = Math.max(0.3, d.r * (0.4 + depth * 0.9));
      ctx.beginPath();
      ctx.arc(d.sx, d.sy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(2) + ')';
      ctx.fill();
    }

    var ga   = 0.04 + 0.03 * Math.sin(time * 2.5);
    var glow = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.min(W,H) * 0.25);
    glow.addColorStop(0, 'rgba(255,255,255,' + ga.toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  draw();
};