// ── HTML del canvas de partículas ────────────────────────────────────
window.__PARTICULAS_HTML__ = '<canvas id="particulasCanvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;"></canvas>';

// ── Lógica de partículas estilo Three.js (cyan + blancas, rotación, parallax) ──
window.__PARTICULAS_INIT__ = function () {
  var canvas = document.getElementById('particulasCanvas');
  var ctx = canvas.getContext('2d');
  var W, H;

  var isMobile = window.innerWidth < 768;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    isMobile = window.innerWidth < 768;
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Parámetros principales ──
  var PARTICLE_COUNT = isMobile ? 500 : 1000;
  var STAR_COUNT = 0;
  var SPREAD = isMobile ? 1 : 15;
  var STAR_SPREAD = 20;
  var FOV = isMobile ? 5 : 400;

  var mouseX = 0;
  var mouseY = 0;
  window.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // ── Rotación acumulada ──
  var rotX = 0, rotY = 0;
  var starRotX = 0, starRotY = 0;

  // ── Parallax suavizado ──
  var parallaxX = 0, parallaxY = 0;

  // ── Crear partículas ──
  function makeParticles(count, spread) {
    var arr = [];
    for (var i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * spread,
        y: (Math.random() - 0.5) * spread,
        z: (Math.random() - 0.5) * spread,
        size: Math.random() * 0.05 + 0.01
      });
    }
    return arr;
  }

  var particles = makeParticles(PARTICLE_COUNT, SPREAD);
  var stars = makeParticles(STAR_COUNT, STAR_SPREAD);

  // ── Proyección 3D → 2D ──
  var FOV = 400;

  function project(x, y, z, cx, cy) {
    var scale = FOV / (FOV + z * 30);
    return {
      sx: cx + x * scale * 80,
      sy: cy + y * scale * 80,
      scale: scale
    };
  }

  // ── Rotación 3D ──
  function rotateXY(x, y, z, rx, ry) {
    var cosY = Math.cos(ry), sinY = Math.sin(ry);
    var x1 = x * cosY + z * sinY;
    var z1 = -x * sinY + z * cosY;
    var cosX = Math.cos(rx), sinX = Math.sin(rx);
    var y2 = y * cosX - z1 * sinX;
    var z2 = y * sinX + z1 * cosX;
    return { x: x1, y: y2, z: z2 };
  }

  function draw() {
    requestAnimationFrame(draw);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#00010e';
    ctx.fillRect(0, 0, W, H);

    rotX += 0.0003;
    rotY += 0.0005;
    starRotX += 0.0001;
    starRotY += 0.0002;

    parallaxX += (mouseX * 0.1 - parallaxX) * 0.05;
    parallaxY += (mouseY * 0.1 - parallaxY) * 0.05;

    var cx = W / 2 + parallaxX * 80;
    var cy = H / 2 - parallaxY * 80;

    // ── Dibujar estrellas blancas ──
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var r = rotateXY(s.x, s.y, s.z, starRotX, starRotY);
      var p = project(r.x, r.y, r.z, W / 2, H / 2);
      var sz = Math.max(0.3, p.scale * 1.2);

      ctx.beginPath();
      ctx.arc(p.sx + parallaxX * 40, p.sy - parallaxY * 40, sz, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();
    }

    // ── Dibujar partículas principales ──
    for (var j = 0; j < particles.length; j++) {
      var pt = particles[j];
      var rp = rotateXY(pt.x, pt.y, pt.z, rotX, rotY);
      var pp = project(rp.x, rp.y, rp.z, cx, cy);
      var depth = (rp.z + SPREAD / 2) / SPREAD;
      var alpha = 1 + depth * 0.3;
      var radius = Math.max(0.3, pp.scale * 2.2);

      ctx.beginPath();
      ctx.arc(pp.sx, pp.sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(2) + ')';
      ctx.fill();
    }
  }

  draw();
};