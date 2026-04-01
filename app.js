/* palabras.js — modificado: expone startAnimation para que el HTML pueda llamarla */

window.__PALABRAS_INIT__ = function () {

  var canvas = document.getElementById("palabras-canvas");
  var ctx = canvas.getContext("2d");
  var bgMusic = document.getElementById("bgMusic");

  function getCanvasDims() {
    if (window.innerWidth < 1000) {
      return {
        w: window.innerHeight,
        h: window.innerWidth
      };
    }
    return {
      w: window.innerWidth,
      h: window.innerHeight
    };
  }

  var dims = getCanvasDims();
  canvas.width = dims.w;
  canvas.height = dims.h;

  var particles = [];
  var currentWordIndex = 0;
  var animationStarted = false;
  var heartExploded = false;
  var rafId = null;

  var state = "stable";
  var timer = 0;
  var heartFormed = false;

  var flashOverlay = document.createElement("div");
  flashOverlay.style.cssText = [
    "position:fixed", "inset:0", "z-index:55", "pointer-events:none",
    "opacity:0", "background:radial-gradient(ellipse at center,",
    "rgba(255,255,255,1) 0%, rgba(180,240,255,0.95) 30%,",
    "rgba(100,200,255,0.7) 60%, rgba(0,150,255,0.3) 80%, transparent 100%)",
    "transition:none"
  ].join(";");
  document.body.appendChild(flashOverlay);

  var words = [
    ["SABÍAS QUE LAS", "FLORES BLANCAS"],
    "SIGNIFICAN",
    "AMOR PURO Y SINCERO"
  ];

  window.handleBtnClick = function (e) {
    var btn = document.getElementById("startBtn");
    if (btn.classList.contains("filling")) return;
    btn.classList.add("filling");
    bgMusic.volume = 0.7;
    bgMusic.play().catch(function (err) { console.log("Audio:", err); });
    setTimeout(function () { startAnimation(); }, 300);
  };

  function startAnimation() {
    var intro = document.getElementById("intro");
    intro.classList.add("hidden");
    canvas.classList.add("visible");

    setTimeout(function () {
      intro.style.display = "none";
      if (!animationStarted) {
        animationStarted = true;
        createWord(words[0], true);
        launchBurstOut();
        animate();
      }
    }, 900);
  }

  window.__startPalabraAnimation__ = startAnimation;

  function launchBurstOut() {
    particles.forEach(function (p) {
      var angle = Math.random() * Math.PI * 2;
      var force = Math.random() * 20 + 8;
      p.vx = Math.cos(angle) * force;
      p.vy = Math.sin(angle) * force;
    });
    state = "burst-out";
    timer = 0;
  }

  function advanceToNext() {
    currentWordIndex++;
    if (currentWordIndex < words.length) {
      createWord(words[currentWordIndex], false);
    } else {
      createHeart();
    }
  }

  /* ─── Partícula con color y brillo propios ─── */
  function Particle(x, y, color, glowColor, size) {
    this.x = x; this.y = y;
    this.targetX = x; this.targetY = y;
    this.vx = 0; this.vy = 0;
    this.size = size || 2;
    this.baseSize = this.size;
    this.alpha = 1;
    this.color = color || "white";
    this.glowColor = glowColor || "cyan";
  }
  Particle.prototype.update = function () {
    if (state === "forming") {
      var dx = this.targetX - this.x;
      var dy = this.targetY - this.y;
      var pull = heartFormed ? 0.022 : 0.018;
      var drag = heartFormed ? 0.82 : 0.84;
      this.vx += dx * pull;
      this.vy += dy * pull;
      this.vx *= drag;
      this.vy *= drag;
      this.x += this.vx;
      this.y += this.vy;
    }
    if (state === "exploding" || state === "burst-out") {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.96;
      this.vy *= 0.96;
    }
    if (state === "heart-explode") {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.94;
      this.vy *= 0.94;
      this.alpha = Math.max(0, this.alpha - 0.025);
      this.size = Math.max(0.3, this.size - 0.04);
    }
  };
  var glowCache = {};
  function getGlowImage(color, glowColor, size) {
    var key = color + glowColor + size.toFixed(1);
    var canvas2 = glowCache[key];
    if (canvas2) return canvas2;
    canvas2 = document.createElement("canvas");
    var s = size * 8;
    canvas2.width = s; canvas2.height = s;
    var ctx2 = canvas2.getContext("2d");
    ctx2.shadowColor = glowColor;
    ctx2.shadowBlur = size * 5;
    ctx2.fillStyle = color;
    ctx2.beginPath();
    ctx2.arc(s / 2, s / 2, size, 0, Math.PI * 2);
    ctx2.fill();
    glowCache[key] = canvas2;
    return canvas2;
  }
  Particle.prototype.draw = function () {
    if (this.alpha <= 0.02) return;
    var img = getGlowImage(this.color, this.glowColor, this.size);
    ctx.globalAlpha = this.alpha;
    ctx.drawImage(img, this.x - img.width / 2, this.y - img.height / 2);
  };;
  Particle.prototype.explode = function () {
    var angle = Math.random() * Math.PI * 2;
    var force = Math.random() * 15 + 5;
    this.vx = Math.cos(angle) * force;
    this.vy = Math.sin(angle) * force;
  };
  Particle.prototype.heartExplode = function (cx, cy) {
    var dx = this.x - cx;
    var dy = this.y - cy;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var force = 22 + Math.random() * 28;
    this.vx = (dx / dist) * force + (Math.random() - 0.5) * 10;
    this.vy = (dy / dist) * force + (Math.random() - 0.5) * 10;
    this.alpha = 1;
  };
  Particle.prototype.resetVelocity = function () { this.vx = 0; this.vy = 0; };

  function getFontSizeForText(text, maxWidth, tc) {
    var fs = 90;
    tc.font = "bold " + fs + "px 'Verdana', sans-serif";
    while (tc.measureText(text).width > maxWidth && fs > 20) {
      fs--;
      tc.font = "bold " + fs + "px 'Verdana', sans-serif";
    }
    return fs; // sin límites adicionales — maxWidth ya lo controla
  }

  function createWord(entry, instant) {
    var tmp = document.createElement("canvas");
    var tc = tmp.getContext("2d");
    tmp.width = canvas.width;
    tmp.height = canvas.height;

    var maxW = canvas.width * 0.9;
    var points = [];

    if (Array.isArray(entry)) {
      var line1 = entry[0], line2 = entry[1];
      var fs1 = getFontSizeForText(line1, maxW, tc);
      var fs2 = getFontSizeForText(line2, maxW, tc);
      var baseFontSize = Math.min(fs1, fs2);
      if (window.innerWidth < 1000) {
        baseFontSize = Math.min(baseFontSize, 88); // Máximo 38px
      }

      tc.font = "bold " + baseFontSize + "px 'Verdana', sans-serif";
      var w1 = tc.measureText(line1).width;
      var w2 = tc.measureText(line2).width;
      var targetWidth = Math.max(w1, w2);
      var lineHeight = baseFontSize * 1.2;
      var totalHeight = lineHeight * 2;
      var startY = (canvas.height - totalHeight) / 2 + lineHeight * 0.5;

      [line1, line2].forEach(function (line, li) {
        var w = li === 0 ? w1 : w2;
        var scaleX = targetWidth / w;
        var y = startY + li * lineHeight;
        tc.save();
        tc.font = "bold " + baseFontSize + "px 'Verdana', sans-serif";
        tc.textAlign = "center";
        tc.textBaseline = "middle";
        tc.fillStyle = "white";
        tc.setTransform(scaleX, 0, 0, 1, 0, 0);
        tc.fillText(line, canvas.width / 2 / scaleX, y);
        tc.restore();
      });
    } else {
      var fs = getFontSizeForText(entry, maxW, tc);
      tc.font = "bold " + fs + "px 'Verdana', sans-serif";
      tc.textAlign = "center";
      tc.textBaseline = "middle";
      tc.fillStyle = "white";
      tc.fillText(entry, canvas.width / 2, canvas.height / 2);
    }

    var imageData = tc.getImageData(0, 0, canvas.width, canvas.height);
    var step = window.innerWidth < 1000 ? 4 : 6;
for (var y = 0; y < canvas.height; y += step)
  for (var x = 0; x < canvas.width; x += step)
        if (imageData.data[(y * canvas.width + x) * 4 + 3] > 128)
          points.push({ x: x, y: y });

    if (instant) {
      particles = points.map(function (p) { return new Particle(p.x, p.y); });
      state = "stable"; timer = 0;
    } else {
      if (particles.length === 0) {
        particles = points.map(function (p) {
          var part = new Particle(p.x, p.y);
          part.x = Math.random() * canvas.width;
          part.y = Math.random() * canvas.height;
          return part;
        });
      } else {
        particles.forEach(function (particle, i) {
          var point = points[i % points.length];
          particle.resetVelocity();
          particle.targetX = point.x;
          particle.targetY = point.y;
        });
      }
      state = "forming"; timer = 0;
    }
  }

  /* ═══════════════════════════════════════════════════
     CORAZÓN MEJORADO — doble corazón concéntrico
     Exterior: blanco con glow rosa
     Interior: cyan suave con glow azul
     Relleno:  puntos rosados tenues dentro
     ═══════════════════════════════════════════════════ */
  function heartXY(t, cx, cy, scale) {
    var x = 16 * Math.pow(Math.sin(t), 3);
    var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x: cx + x * scale, y: cy - y * scale };
  }

  function createHeart() {
    heartFormed = true;
    var cx = canvas.width / 2;
    var cy = canvas.height / 2;

    // Escala dinámica del corazón respecto al tamaño del lienzo (la dimensión más pequeña)
    var minDim = Math.min(canvas.width, canvas.height);
    var baseScale = minDim / 45; // ajusta este número si lo quieres más grande o más pequeño

    var allPoints = [];

    /* — Corazón exterior: blanco, glow rosa — */
    for (var t = 0; t < Math.PI * 2; t += 0.018) {
      var p = heartXY(t, cx, cy, baseScale);
      allPoints.push({ x: p.x, y: p.y, color: "rgba(255,255,255,1)", glow: "rgba(255,150,190,0.95)", size: 2.3 });
    }

    /* — Corazón interior: cyan, glow azul — */
    for (var t2 = 0; t2 < Math.PI * 2; t2 += 0.025) {
      var p2 = heartXY(t2, cx, cy, baseScale * 0.54);
      allPoints.push({ x: p2.x, y: p2.y, color: "rgba(140,220,255,0.95)", glow: "rgba(60,190,255,1)", size: 1.7 });
    }

    /* — Relleno interior: puntos rosados tenues — */
    var fillScale = baseScale * 0.46;
    for (var ft = 0; ft < Math.PI * 2; ft += 0.055) {
      for (var fr = 0.2; fr < 0.92; fr += 0.28) {
        var px = 16 * Math.pow(Math.sin(ft), 3);
        var py = 13 * Math.cos(ft) - 5 * Math.cos(2 * ft) - 2 * Math.cos(3 * ft) - Math.cos(4 * ft);
        allPoints.push({
          x: cx + px * fillScale * fr,
          y: cy - py * fillScale * fr,
          color: "rgba(255,190,215,0.45)",
          glow: "rgba(255,80,150,0.4)",
          size: 1.1
        });
      }
    }

    /* — Anillo medio: cyan tenue — */
    for (var t3 = 0; t3 < Math.PI * 2; t3 += 0.035) {
      var p3 = heartXY(t3, cx, cy, baseScale * 0.77);
      allPoints.push({ x: p3.x, y: p3.y, color: "rgba(210,240,255,0.6)", glow: "rgba(150,220,255,0.6)", size: 1.4 });
    }

    /* — Asignar / crear partículas — */
    while (particles.length < allPoints.length) {
      particles.push(new Particle(
        Math.random() * canvas.width,
        Math.random() * canvas.height
      ));
    }

    particles.forEach(function (p, i) {
      var pt = allPoints[i % allPoints.length];
      p.resetVelocity();
      p.alpha = 1;
      p.targetX = pt.x;
      p.targetY = pt.y;
      p.color = pt.color;
      p.glowColor = pt.glow;
      p.size = pt.size;
      p.baseSize = pt.size;
    });

    state = "forming"; timer = 0;
  }
  /* ═══════════════════════════════════════════════════ */

  function triggerHeartExplosionTransition() {
    heartExploded = true;
    cancelAnimationFrame(rafId);

    var cx = canvas.width / 2;
    var cy = canvas.height / 2;

    particles.forEach(function (p) { p.heartExplode(cx, cy); });
    state = "heart-explode";
    timer = 0;

    var explodeRaf;
    var explodeStart = performance.now();

    function animateExplosion(now) {
      var elapsed = now - explodeStart;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function (p) { p.update(); p.draw(); });

      if (elapsed < 500) {
        explodeRaf = requestAnimationFrame(animateExplosion);
      } else {
        doFlash();
      }
    }
    explodeRaf = requestAnimationFrame(animateExplosion);

    function doFlash() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      flashOverlay.style.transition = "none";
      flashOverlay.style.opacity = "1";

      var rippleStart = performance.now();
      var ripples = [
        { r: 0, maxR: Math.max(canvas.width, canvas.height) * 0.8, alpha: 0.9, color: "rgba(255,255,255," },
        { r: 0, maxR: Math.max(canvas.width, canvas.height) * 0.6, alpha: 0.6, color: "rgba(100,220,255," },
        { r: 0, maxR: Math.max(canvas.width, canvas.height) * 0.4, alpha: 0.5, color: "rgba(200,240,255," },
      ];
      var rippleDelay = [0, 80, 160];

      function animateRipple(now) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var anyAlive = false;

        ripples.forEach(function (rp, i) {
          var elapsed = Math.max(0, now - rippleStart - rippleDelay[i]);
          if (elapsed <= 0) return;
          var prog = Math.min(elapsed / 600, 1);
          rp.r = prog * rp.maxR;
          var a = rp.alpha * (1 - prog);
          if (a > 0.01) {
            ctx.beginPath();
            ctx.arc(cx, cy, rp.r, 0, Math.PI * 2);
            ctx.strokeStyle = rp.color + a + ")";
            ctx.lineWidth = 6 * (1 - prog * 0.7);
            ctx.stroke();
            anyAlive = true;
          }
        });

        if (anyAlive) {
          requestAnimationFrame(animateRipple);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          beginFadeOut();
        }
      }
      requestAnimationFrame(animateRipple);
    }

    function beginFadeOut() {
      document.getElementById('lirios-mount').innerHTML = window.__LIRIOS_HTML__ || "";
      document.getElementById('paniculata-mount').innerHTML = window.__PANICULATA_HTML__ || "";
      document.getElementById('corazon-mount').innerHTML = window.__CORAZON_HTML__ || "";
      document.getElementById('particulas-mount').innerHTML = window.__PARTICULAS_HTML__ || "";

      // Fix stem growth: measure real SVG path lengths and restart animation
      requestAnimationFrame(function() {
        // --- Stem animation ---
        var stemPaths = document.querySelectorAll('.stem-path');
        stemPaths.forEach(function(path) {
          var len = path.getTotalLength();
          path.style.strokeDasharray = len;
          path.style.strokeDashoffset = len;
          // Force browser to acknowledge the initial state before animating
          path.getBoundingClientRect();
          path.style.transition = 'stroke-dashoffset 2s ease-in-out';
          path.style.strokeDashoffset = '0';
        });
      });

      var escena = document.getElementById('escena-flores');
      escena.style.opacity = "0";
      escena.style.transition = "none";
      escena.classList.remove('paused');
      escena.getBoundingClientRect();
      escena.classList.add('visible');

      requestAnimationFrame(function () {
        if (typeof window.__CORAZON_INIT__ === 'function') window.__CORAZON_INIT__();
        if (typeof window.__PARTICULAS_INIT__ === 'function') window.__PARTICULAS_INIT__();
        if (typeof window.initPaniculata === 'function') window.initPaniculata();
      });

      setTimeout(function () {
        flashOverlay.style.transition = "opacity 1.4s cubic-bezier(0.4,0,0.2,1)";
        flashOverlay.style.opacity = "0";
      }, 100);

      canvas.style.transition = "opacity 1.0s ease";
      canvas.style.opacity = "0";

      setTimeout(function () {
        escena.style.transition = "opacity 1.8s cubic-bezier(0.2,0,0.1,1)";
        escena.style.opacity = "1";
      }, 400);

      setTimeout(function () {
        window.dispatchEvent(new CustomEvent("palabrasTerminadas"));
      }, 50);
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(function (p) { p.update(); p.draw(); });
    timer++;

    if (state === "burst-out" && timer > 55) {
      particles.forEach(function (p) { p.resetVelocity(); });
      state = "forming"; timer = 0;
    }

    if (state === "forming" && timer > (heartFormed ? 55 : 60)) {
      state = "stable"; timer = 0;
    }

    var stableThreshold = heartFormed ? 25 : 70;
    if (state === "stable" && timer > stableThreshold) {
      state = "exploding";
      particles.forEach(function (p) { p.explode(); });
      timer = 0;
    }

    if (state === "exploding" && timer === (heartFormed ? 30 : 70)) {
      if (heartFormed && !heartExploded) {
        triggerHeartExplosionTransition();
        return;
      }
      advanceToNext();
    }

    rafId = requestAnimationFrame(animate);
  }

  window.addEventListener("resize", function () {
    var dims = getCanvasDims();
    canvas.width = dims.w;
    canvas.height = dims.h;
    if (animationStarted)
      createWord(words[Math.min(currentWordIndex, words.length - 1)], true);
  });

}; 
window.__LIRIOS_HTML__ = `
<div class="flowers">
<div class="flower">
  <!-- Flor 1 -->
  <div class="flower__leafs flower__leafs--1">
    <div class="contenedor-flor">
      <div class="brillo-central"></div>
      <div class="flor">
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="centro"><div class="pistilo"></div><div class="pistilo"></div><div class="pistilo"></div><div class="pistilo"></div></div>
      </div>
    </div>
  </div>
  <!-- Flor 2 -->
  <div class="flower__leafs flower__leafs--2">
    <div class="contenedor-flor">
      <div class="brillo-central"></div>
      <div class="flor">
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="centro"><div class="pistilo"></div><div class="pistilo"></div><div class="pistilo"></div><div class="pistilo"></div></div>
      </div>
    </div>
  </div>
  <!-- Flor 3 -->
  <div class="flower__leafs flower__leafs--3">
    <div class="contenedor-flor">
      <div class="brillo-central"></div>
      <div class="flor">
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="centro"><div class="pistilo"></div><div class="pistilo"></div><div class="pistilo"></div><div class="pistilo"></div></div>
      </div>
    </div>
  </div>
  <!-- Flor 4 -->
  <div class="flower__leafs flower__leafs--4">
    <div class="contenedor-flor">
      <div class="brillo-central"></div>
      <div class="flor">
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="petalo"><div class="venas"><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div><div class="vena"></div></div></div>
        <div class="centro"><div class="pistilo"></div><div class="pistilo"></div><div class="pistilo"></div><div class="pistilo"></div></div>
      </div>
    </div>
  </div>
  <!-- Tallos y hojas -->
  <div class="stem-container stem-container--1">
    <svg preserveAspectRatio="xMidYMin meet" viewBox="0 0 30 55">
      <defs>
        <linearGradient id="stemGradient1" x1="0%" x2="0%" y1="100%" y2="0%">
          <stop offset="0%" style="stop-color:#1a3a1a;stop-opacity:1"/>
          <stop offset="50%" style="stop-color:#2d5a2d;stop-opacity:1"/>
          <stop offset="100%" style="stop-color:#3a6e3a;stop-opacity:1"/>
        </linearGradient>
      </defs>
      <path class="stem-path" d="M 15 55 C 13 48, 10 40, 6 32 C 2 24, -3 16, -8 8 C -10 4, -12 2, -13 0" stroke="url(#stemGradient1)"/>
    </svg>
    <div class="leaf-svg-container leaf-svg--1a">
      <svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="leafGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" style="stop-color:rgba(20,40,20,0.95)"/>
            <stop offset="33%" style="stop-color:#2d4a2d"/>
            <stop offset="66%" style="stop-color:#3a5e3a"/>
            <stop offset="100%" style="stop-color:#4a7c4a"/>
          </linearGradient>
        </defs>
        <g class="leaf-group" transform="translate(110,120) rotate(150) scale(1.2, 1)">
          <path class="leaf-fill" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z"/>
          <path class="draw" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z" stroke-width="7" style="--len:320px; --dur:1.4s; --delay:0.1s;"/>
          <line class="draw vein" stroke-width="1.3" style="--len:120px; --dur:0.7s; --delay:1.6s;" x1="0" x2="-2" y1="56" y2="-46"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2s;" x1="-2" x2="-22" y1="20" y2="2"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="-26" y1="4" y2="-12"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="-24" y1="-14" y2="-26"/>
          <line class="vein" style="--len:24px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="-18" y1="-28" y2="-38"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2.0s;" x1="-2" x2="20" y1="20" y2="4"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="24" y1="4" y2="-10"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="22" y1="-14" y2="-26"/>
          <line class="vein" style="--len:22px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="16" y1="-28" y2="-37"/>
          <line class="hatch" style="--len:18px; --delay:2.6s;" x1="-14" x2="-4" y1="-5" y2="10"/>
          <line class="hatch" style="--len:18px; --delay:2.65s;" x1="-18" x2="-8" y1="0" y2="15"/>
          <line class="hatch" style="--len:14px; --delay:2.7s;" x1="-10" x2="-2" y1="-18" y2="-6"/>
          <line class="hatch" style="--len:14px; --delay:2.75s;" x1="-16" x2="-6" y1="-12" y2="-1"/>
        </g>
      </svg>
    </div>
    <div class="leaf-svg-container leaf-svg--1b">
      <svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="leafGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" style="stop-color:rgba(20,40,20,0.95)"/>
            <stop offset="33%" style="stop-color:#2d4a2d"/>
            <stop offset="66%" style="stop-color:#3a5e3a"/>
            <stop offset="100%" style="stop-color:#4a7c4a"/>
          </linearGradient>
        </defs>
        <g class="leaf-group" transform="translate(110,120) rotate(150) scale(1.2, 1)">
          <path class="leaf-fill" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z"/>
          <path class="draw" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z" stroke-width="7" style="--len:320px; --dur:1.4s; --delay:0.1s;"/>
          <line class="draw vein" stroke-width="1.3" style="--len:120px; --dur:0.7s; --delay:1.6s;" x1="0" x2="-2" y1="56" y2="-46"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2s;" x1="-2" x2="-22" y1="20" y2="2"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="-26" y1="4" y2="-12"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="-24" y1="-14" y2="-26"/>
          <line class="vein" style="--len:24px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="-18" y1="-28" y2="-38"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2.0s;" x1="-2" x2="20" y1="20" y2="4"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="24" y1="4" y2="-10"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="22" y1="-14" y2="-26"/>
          <line class="vein" style="--len:22px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="16" y1="-28" y2="-37"/>
          <line class="hatch" style="--len:18px; --delay:2.6s;" x1="-14" x2="-4" y1="-5" y2="10"/>
          <line class="hatch" style="--len:18px; --delay:2.65s;" x1="-18" x2="-8" y1="0" y2="15"/>
          <line class="hatch" style="--len:14px; --delay:2.7s;" x1="-10" x2="-2" y1="-18" y2="-6"/>
          <line class="hatch" style="--len:14px; --delay:2.75s;" x1="-16" x2="-6" y1="-12" y2="-1"/>
        </g>
      </svg>
    </div>
  </div>
  <div class="stem-container stem-container--2">
    <svg preserveAspectRatio="xMidYMin meet" viewBox="0 0 30 55">
      <defs>
        <linearGradient id="stemGradient2" x1="0%" x2="0%" y1="100%" y2="0%">
          <stop offset="0%" style="stop-color:#1a3a1a;stop-opacity:1"/>
          <stop offset="50%" style="stop-color:#2d5a2d;stop-opacity:1"/>
          <stop offset="100%" style="stop-color:#3a6e3a;stop-opacity:1"/>
        </linearGradient>
      </defs>
      <path class="stem-path" d="M 15 55 C 14.5 47, 13 38, 11 30 C 9 22, 7 14, 5 6 C 4 3, 3.5 1, 3 0" stroke="url(#stemGradient2)"/>
    </svg>
    <div class="leaf-svg-container leaf-svg--2a">
      <svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="leafGrad3" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" style="stop-color:rgba(20,40,20,0.95)"/>
            <stop offset="33%" style="stop-color:#2d4a2d"/>
            <stop offset="66%" style="stop-color:#3a5e3a"/>
            <stop offset="100%" style="stop-color:#4a7c4a"/>
          </linearGradient>
        </defs>
        <g class="leaf-group" transform="translate(110,120) rotate(150) scale(1.1, 1)">
          <path class="leaf-fill" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z"/>
          <path class="draw" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z" stroke-width="7" style="--len:320px; --dur:1.4s; --delay:0.1s;"/>
          <line class="draw vein" stroke-width="1.3" style="--len:120px; --dur:0.7s; --delay:1.6s;" x1="0" x2="-2" y1="56" y2="-46"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2s;" x1="-2" x2="-22" y1="20" y2="2"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="-26" y1="4" y2="-12"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="-24" y1="-14" y2="-26"/>
          <line class="vein" style="--len:24px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="-18" y1="-28" y2="-38"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2.0s;" x1="-2" x2="20" y1="20" y2="4"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="24" y1="4" y2="-10"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="22" y1="-14" y2="-26"/>
          <line class="vein" style="--len:22px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="16" y1="-28" y2="-37"/>
          <line class="hatch" style="--len:18px; --delay:2.6s;" x1="-14" x2="-4" y1="-5" y2="10"/>
          <line class="hatch" style="--len:18px; --delay:2.65s;" x1="-18" x2="-8" y1="0" y2="15"/>
          <line class="hatch" style="--len:14px; --delay:2.7s;" x1="-10" x2="-2" y1="-18" y2="-6"/>
          <line class="hatch" style="--len:14px; --delay:2.75s;" x1="-16" x2="-6" y1="-12" y2="-1"/>
        </g>
      </svg>
    </div>
    <div class="leaf-svg-container leaf-svg--2b">
      <svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="leafGrad4" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" style="stop-color:rgba(20,40,20,0.95)"/>
            <stop offset="33%" style="stop-color:#2d4a2d"/>
            <stop offset="66%" style="stop-color:#3a5e3a"/>
            <stop offset="100%" style="stop-color:#4a7c4a"/>
          </linearGradient>
        </defs>
        <g class="leaf-group" transform="translate(110,120) rotate(150) scale(1.1, 1)">
          <path class="leaf-fill" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z"/>
          <path class="draw" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z" stroke-width="7" style="--len:320px; --dur:1.4s; --delay:0.1s;"/>
          <line class="draw vein" stroke-width="1.3" style="--len:120px; --dur:0.7s; --delay:1.6s;" x1="0" x2="-2" y1="56" y2="-46"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2s;" x1="-2" x2="-22" y1="20" y2="2"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="-26" y1="4" y2="-12"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="-24" y1="-14" y2="-26"/>
          <line class="vein" style="--len:24px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="-18" y1="-28" y2="-38"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2.0s;" x1="-2" x2="20" y1="20" y2="4"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="24" y1="4" y2="-10"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="22" y1="-14" y2="-26"/>
          <line class="vein" style="--len:22px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="16" y1="-28" y2="-37"/>
          <line class="hatch" style="--len:18px; --delay:2.6s;" x1="-14" x2="-4" y1="-5" y2="10"/>
          <line class="hatch" style="--len:18px; --delay:2.65s;" x1="-18" x2="-8" y1="0" y2="15"/>
          <line class="hatch" style="--len:14px; --delay:2.7s;" x1="-10" x2="-2" y1="-18" y2="-6"/>
          <line class="hatch" style="--len:14px; --delay:2.75s;" x1="-16" x2="-6" y1="-12" y2="-1"/>
        </g>
      </svg>
    </div>
  </div>
  <div class="stem-container stem-container--3">
    <svg preserveAspectRatio="xMidYMin meet" viewBox="0 0 30 55">
      <defs>
        <linearGradient id="stemGradient3" x1="0%" x2="0%" y1="100%" y2="0%">
          <stop offset="0%" style="stop-color:#1a3a1a;stop-opacity:1"/>
          <stop offset="50%" style="stop-color:#2d5a2d;stop-opacity:1"/>
          <stop offset="100%" style="stop-color:#3a6e3a;stop-opacity:1"/>
        </linearGradient>
      </defs>
      <path class="stem-path" d="M 15 55 C 15.5 47, 17 38, 19 30 C 21 22, 23 14, 25 6 C 26 3, 26.5 1, 27 0" stroke="url(#stemGradient3)"/>
    </svg>
    <div class="leaf-svg-container leaf-svg--3a">
      <svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="leafGrad5" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" style="stop-color:rgba(20,40,20,0.95)"/>
            <stop offset="33%" style="stop-color:#2d4a2d"/>
            <stop offset="66%" style="stop-color:#3a5e3a"/>
            <stop offset="100%" style="stop-color:#4a7c4a"/>
          </linearGradient>
        </defs>
        <g class="leaf-group" transform="translate(110,120) rotate(150) scale(1.1, 1)">
          <path class="leaf-fill" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z"/>
          <path class="draw" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z" stroke-width="7" style="--len:320px; --dur:1.4s; --delay:0.1s;"/>
          <line class="draw vein" stroke-width="1.3" style="--len:120px; --dur:0.7s; --delay:1.6s;" x1="0" x2="-2" y1="56" y2="-46"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2s;" x1="-2" x2="-22" y1="20" y2="2"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="-26" y1="4" y2="-12"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="-24" y1="-14" y2="-26"/>
          <line class="vein" style="--len:24px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="-18" y1="-28" y2="-38"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2.0s;" x1="-2" x2="20" y1="20" y2="4"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="24" y1="4" y2="-10"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="22" y1="-14" y2="-26"/>
          <line class="vein" style="--len:22px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="16" y1="-28" y2="-37"/>
          <line class="hatch" style="--len:18px; --delay:2.6s;" x1="-14" x2="-4" y1="-5" y2="10"/>
          <line class="hatch" style="--len:18px; --delay:2.65s;" x1="-18" x2="-8" y1="0" y2="15"/>
          <line class="hatch" style="--len:14px; --delay:2.7s;" x1="-10" x2="-2" y1="-18" y2="-6"/>
          <line class="hatch" style="--len:14px; --delay:2.75s;" x1="-16" x2="-6" y1="-12" y2="-1"/>
        </g>
      </svg>
    </div>
    <div class="leaf-svg-container leaf-svg--3b">
      <svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="leafGrad6" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" style="stop-color:rgba(20,40,20,0.95)"/>
            <stop offset="33%" style="stop-color:#2d4a2d"/>
            <stop offset="66%" style="stop-color:#3a5e3a"/>
            <stop offset="100%" style="stop-color:#4a7c4a"/>
          </linearGradient>
        </defs>
        <g class="leaf-group" transform="translate(110,120) rotate(150) scale(1.1, 1)">
          <path class="leaf-fill" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z"/>
          <path class="draw" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z" stroke-width="7" style="--len:320px; --dur:1.4s; --delay:0.1s;"/>
          <line class="draw vein" stroke-width="1.3" style="--len:120px; --dur:0.7s; --delay:1.6s;" x1="0" x2="-2" y1="56" y2="-46"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2s;" x1="-2" x2="-22" y1="20" y2="2"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="-26" y1="4" y2="-12"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="-24" y1="-14" y2="-26"/>
          <line class="vein" style="--len:24px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="-18" y1="-28" y2="-38"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2.0s;" x1="-2" x2="20" y1="20" y2="4"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="24" y1="4" y2="-10"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="22" y1="-14" y2="-26"/>
          <line class="vein" style="--len:22px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="16" y1="-28" y2="-37"/>
          <line class="hatch" style="--len:18px; --delay:2.6s;" x1="-14" x2="-4" y1="-5" y2="10"/>
          <line class="hatch" style="--len:18px; --delay:2.65s;" x1="-18" x2="-8" y1="0" y2="15"/>
          <line class="hatch" style="--len:14px; --delay:2.7s;" x1="-10" x2="-2" y1="-18" y2="-6"/>
          <line class="hatch" style="--len:14px; --delay:2.75s;" x1="-16" x2="-6" y1="-12" y2="-1"/>
        </g>
      </svg>
    </div>
  </div>
  <div class="stem-container stem-container--4">
    <svg preserveAspectRatio="xMidYMin meet" viewBox="0 0 30 55">
      <defs>
        <linearGradient id="stemGradient4" x1="0%" x2="0%" y1="100%" y2="0%">
          <stop offset="0%" style="stop-color:#1a3a1a;stop-opacity:1"/>
          <stop offset="50%" style="stop-color:#2d5a2d;stop-opacity:1"/>
          <stop offset="100%" style="stop-color:#3a6e3a;stop-opacity:1"/>
        </linearGradient>
      </defs>
      <path class="stem-path" d="M 15 55 C 17 48, 20 40, 24 32 C 28 24, 33 16, 38 8 C 40 4, 42 2, 43 0" stroke="url(#stemGradient4)"/>
    </svg>
    <div class="leaf-svg-container leaf-svg--4a">
      <svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="leafGrad7" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" style="stop-color:rgba(20,40,20,0.95)"/>
            <stop offset="33%" style="stop-color:#2d4a2d"/>
            <stop offset="66%" style="stop-color:#3a5e3a"/>
            <stop offset="100%" style="stop-color:#4a7c4a"/>
          </linearGradient>
        </defs>
        <g class="leaf-group" transform="translate(110,120) rotate(150) scale(1.2, 1)">
          <path class="leaf-fill" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z"/>
          <path class="draw" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z" stroke-width="7" style="--len:320px; --dur:1.4s; --delay:0.1s;"/>
          <line class="draw vein" stroke-width="1.3" style="--len:120px; --dur:0.7s; --delay:1.6s;" x1="0" x2="-2" y1="56" y2="-46"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2s;" x1="-2" x2="-22" y1="20" y2="2"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="-26" y1="4" y2="-12"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="-24" y1="-14" y2="-26"/>
          <line class="vein" style="--len:24px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="-18" y1="-28" y2="-38"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2.0s;" x1="-2" x2="20" y1="20" y2="4"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="24" y1="4" y2="-10"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="22" y1="-14" y2="-26"/>
          <line class="vein" style="--len:22px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="16" y1="-28" y2="-37"/>
          <line class="hatch" style="--len:18px; --delay:2.6s;" x1="-14" x2="-4" y1="-5" y2="10"/>
          <line class="hatch" style="--len:18px; --delay:2.65s;" x1="-18" x2="-8" y1="0" y2="15"/>
          <line class="hatch" style="--len:14px; --delay:2.7s;" x1="-10" x2="-2" y1="-18" y2="-6"/>
          <line class="hatch" style="--len:14px; --delay:2.75s;" x1="-16" x2="-6" y1="-12" y2="-1"/>
        </g>
      </svg>
    </div>
    <div class="leaf-svg-container leaf-svg--4b">
      <svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="leafGrad8" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" style="stop-color:rgba(20,40,20,0.95)"/>
            <stop offset="33%" style="stop-color:#2d4a2d"/>
            <stop offset="66%" style="stop-color:#3a5e3a"/>
            <stop offset="100%" style="stop-color:#4a7c4a"/>
          </linearGradient>
        </defs>
        <g class="leaf-group" transform="translate(110,120) rotate(150) scale(1.2, 1)">
          <path class="leaf-fill" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z"/>
          <path class="draw" d="M0,60 C-30,30 -35,-15 -15,-52 C-6,-72 0,-90 0,-90 C0,-90 6,-72 15,-52 C35,-15 30,30 0,60 Z" stroke-width="7" style="--len:320px; --dur:1.4s; --delay:0.1s;"/>
          <line class="draw vein" stroke-width="1.3" style="--len:120px; --dur:0.7s; --delay:1.6s;" x1="0" x2="-2" y1="56" y2="-46"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2s;" x1="-2" x2="-22" y1="20" y2="2"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="-26" y1="4" y2="-12"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="-24" y1="-14" y2="-26"/>
          <line class="vein" style="--len:24px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="-18" y1="-28" y2="-38"/>
          <line class="vein" style="--len:40px; --dur:0.3s; --delay:2.0s;" x1="-2" x2="20" y1="20" y2="4"/>
          <line class="vein" style="--len:36px; --dur:0.3s; --delay:2.1s;" x1="-2" x2="24" y1="4" y2="-10"/>
          <line class="vein" style="--len:30px; --dur:0.3s; --delay:2.2s;" x1="-2" x2="22" y1="-14" y2="-26"/>
          <line class="vein" style="--len:22px; --dur:0.3s; --delay:2.3s;" x1="-2" x2="16" y1="-28" y2="-37"/>
          <line class="hatch" style="--len:18px; --delay:2.6s;" x1="-14" x2="-4" y1="-5" y2="10"/>
          <line class="hatch" style="--len:18px; --delay:2.65s;" x1="-18" x2="-8" y1="0" y2="15"/>
          <line class="hatch" style="--len:14px; --delay:2.7s;" x1="-10" x2="-2" y1="-18" y2="-6"/>
          <line class="hatch" style="--len:14px; --delay:2.75s;" x1="-16" x2="-6" y1="-12" y2="-1"/>
        </g>
      </svg>
    </div>
  </div>
</div>
</div>
`;
window.__PANICULATA_HTML__ = `
<div class="bouquet-wrapper">
  <div class="bouquet-container">
    <svg width="600" height="700" viewBox="-50 0 600 700" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="flowerShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
          <feOffset dx="0.5" dy="0.5" result="offsetblur"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="flowerGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1"/>
          <feColorMatrix in="blur1" type="matrix" values="1 1 1 0 0.15  1 1 1 0 0.15  1 1 1 0 0.15  0 0 0 0.7 0" result="glow1"/>
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur2"/>
          <feColorMatrix in="blur2" type="matrix" values="1 1 1 0 0.08  1 1 1 0 0.08  1 1 1 0 0.08  0 0 0 0.4 0" result="glow2"/>
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur3"/>
          <feColorMatrix in="blur3" type="matrix" values="1 1 1 0 0.03  1 1 1 0 0.03  1 1 1 0 0.03  0 0 0 0.2 0" result="glow3"/>
          <feMerge>
            <feMergeNode in="glow3"/>
            <feMergeNode in="glow2"/>
            <feMergeNode in="glow1"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <g id="tinyFlower">
          <ellipse cx="0" cy="-1.2" rx="0.8" ry="1.5" fill="#fff" opacity="0.95"/>
          <ellipse cx="1" cy="-0.6" rx="0.8" ry="1.5" fill="#fff" opacity="0.95" transform="rotate(72 0 0)"/>
          <ellipse cx="0.6" cy="1" rx="0.8" ry="1.5" fill="#fff" opacity="0.95" transform="rotate(144 0 0)"/>
          <ellipse cx="-0.6" cy="1" rx="0.8" ry="1.5" fill="#fff" opacity="0.95" transform="rotate(216 0 0)"/>
          <ellipse cx="-1" cy="-0.6" rx="0.8" ry="1.5" fill="#fff" opacity="0.95" transform="rotate(288 0 0)"/>
          <circle cx="0" cy="0" r="0.7" fill="#fffacd"/>
        </g>
        <g id="smallFlower">
          <ellipse cx="0" cy="-2" rx="1.5" ry="2.5" fill="#fff" opacity="0.95"/>
          <ellipse cx="1.7" cy="-1" rx="1.5" ry="2.5" fill="#fff" opacity="0.95" transform="rotate(72 0 0)"/>
          <ellipse cx="1.1" cy="1.6" rx="1.5" ry="2.5" fill="#fff" opacity="0.95" transform="rotate(144 0 0)"/>
          <ellipse cx="-1.1" cy="1.6" rx="1.5" ry="2.5" fill="#fff" opacity="0.95" transform="rotate(216 0 0)"/>
          <ellipse cx="-1.7" cy="-1" rx="1.5" ry="2.5" fill="#fff" opacity="0.95" transform="rotate(288 0 0)"/>
          <circle cx="0" cy="0" r="1.2" fill="#fffacd"/>
        </g>
        <g id="mediumFlower">
          <ellipse cx="0" cy="-2.5" rx="2" ry="3" fill="#fff" opacity="0.95"/>
          <ellipse cx="2.2" cy="-1.2" rx="2" ry="3" fill="#fff" opacity="0.95" transform="rotate(72 0 0)"/>
          <ellipse cx="1.4" cy="2" rx="2" ry="3" fill="#fff" opacity="0.95" transform="rotate(144 0 0)"/>
          <ellipse cx="-1.4" cy="2" rx="2" ry="3" fill="#fff" opacity="0.95" transform="rotate(216 0 0)"/>
          <ellipse cx="-2.2" cy="-1.2" rx="2" ry="3" fill="#fff" opacity="0.95" transform="rotate(288 0 0)"/>
          <circle cx="0" cy="0" r="1.5" fill="#fffacd"/>
        </g>
        <g id="largeFlower">
          <ellipse cx="0" cy="-3" rx="2.5" ry="3.5" fill="#fff" opacity="0.95"/>
          <ellipse cx="2.6" cy="-1.5" rx="2.5" ry="3.5" fill="#fff" opacity="0.95" transform="rotate(72 0 0)"/>
          <ellipse cx="1.6" cy="2.4" rx="2.5" ry="3.5" fill="#fff" opacity="0.95" transform="rotate(144 0 0)"/>
          <ellipse cx="-1.6" cy="2.4" rx="2.5" ry="3.5" fill="#fff" opacity="0.95" transform="rotate(216 0 0)"/>
          <ellipse cx="-2.6" cy="-1.5" rx="2.5" ry="3.5" fill="#fff" opacity="0.95" transform="rotate(288 0 0)"/>
          <circle cx="0" cy="0" r="2" fill="#fffacd"/>
        </g>
      </defs>
      <g id="allContent">
        <g class="stems">
          <path class="stem" d="M 250 550 Q 240 400, 180 200" stroke-width="3"/>
          <path class="stem" d="M 250 550 Q 250 400, 250 150" stroke-width="3"/>
          <path class="stem" d="M 250 550 Q 260 400, 320 180" stroke-width="3"/>
          <path class="stem" d="M 250 550 Q 230 420, 150 250" stroke-width="2.5"/>
          <path class="stem" d="M 250 550 Q 270 420, 350 230" stroke-width="2.5"/>
          <path class="stem" d="M 250 550 Q 245 380, 200 280" stroke-width="2"/>
          <path class="stem" d="M 250 550 Q 255 380, 300 260" stroke-width="2"/>
          <path class="stem" d="M 250 550 Q 235 450, 190 350" stroke-width="2"/>
          <path class="stem" d="M 250 550 Q 265 450, 310 340" stroke-width="2"/>
          <path class="stem" d="M 250 550 Q 210 430, 100 280" stroke-width="2.5"/>
          <path class="stem" d="M 250 550 Q 290 430, 400 260" stroke-width="2.5"/>
          <path class="stem" d="M 250 550 Q 220 460, 130 360" stroke-width="2"/>
          <path class="stem" d="M 250 550 Q 280 460, 370 350" stroke-width="2"/>
          <path class="stem" d="M 250 550 Q 235 410, 160 310" stroke-width="1.8"/>
          <path class="stem" d="M 250 550 Q 265 410, 340 300" stroke-width="1.8"/>
          <path class="stem" d="M 250 550 Q 200 380, 80 230" stroke-width="2"/>
          <path class="stem" d="M 250 550 Q 300 380, 420 210" stroke-width="2"/>
          <path class="stem" d="M 250 550 Q 250 350, 250 120" stroke-width="1.5"/>
          <path class="stem" d="M 250 550 Q 225 390, 120 200" stroke-width="1.8"/>
          <path class="stem" d="M 250 550 Q 275 390, 380 190" stroke-width="1.8"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 180 200 L 140 160" stroke-width="1.5"/>
          <use href="#largeFlower" x="140" y="160"/>
          <path class="stem" d="M 140 160 L 125 145" stroke-width="1"/>
          <use href="#mediumFlower" x="125" y="145"/>
          <path class="stem" d="M 140 160 L 155 150" stroke-width="1"/>
          <use href="#mediumFlower" x="155" y="150"/>
          <path class="stem" d="M 140 160 L 135 175" stroke-width="1"/>
          <use href="#smallFlower" x="135" y="175"/>
          <path class="stem" d="M 125 145 L 115 135" stroke-width="0.7"/>
          <use href="#smallFlower" x="115" y="135"/>
          <path class="stem" d="M 125 145 L 120 155" stroke-width="0.7"/>
          <use href="#tinyFlower" x="120" y="155"/>
          <path class="stem" d="M 155 150 L 165 140" stroke-width="0.7"/>
          <use href="#smallFlower" x="165" y="140"/>
          <path class="stem" d="M 155 150 L 160 162" stroke-width="0.7"/>
          <use href="#tinyFlower" x="160" y="162"/>
          <path class="stem" d="M 180 200 L 170 185" stroke-width="1"/>
          <use href="#mediumFlower" x="170" y="185"/>
          <path class="stem" d="M 170 185 L 165 175" stroke-width="0.7"/>
          <use href="#smallFlower" x="165" y="175"/>
          <path class="stem" d="M 170 185 L 175 170" stroke-width="0.7"/>
          <use href="#tinyFlower" x="175" y="170"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 250 150 L 240 100" stroke-width="1.5"/>
          <use href="#largeFlower" x="240" y="100"/>
          <path class="stem" d="M 240 100 L 230 85" stroke-width="1"/>
          <use href="#mediumFlower" x="230" y="85"/>
          <path class="stem" d="M 240 100 L 250 80" stroke-width="1"/>
          <use href="#mediumFlower" x="250" y="80"/>
          <path class="stem" d="M 240 100 L 245 115" stroke-width="1"/>
          <use href="#smallFlower" x="245" y="115"/>
          <path class="stem" d="M 230 85 L 220 75" stroke-width="0.7"/>
          <use href="#smallFlower" x="220" y="75"/>
          <path class="stem" d="M 230 85 L 235 70" stroke-width="0.7"/>
          <use href="#tinyFlower" x="235" y="70"/>
          <path class="stem" d="M 250 80 L 260 70" stroke-width="0.7"/>
          <use href="#smallFlower" x="260" y="70"/>
          <path class="stem" d="M 250 80 L 248 65" stroke-width="0.7"/>
          <use href="#tinyFlower" x="248" y="65"/>
          <path class="stem" d="M 250 150 L 255 120" stroke-width="1"/>
          <use href="#mediumFlower" x="255" y="120"/>
          <path class="stem" d="M 255 120 L 265 110" stroke-width="0.7"/>
          <use href="#smallFlower" x="265" y="110"/>
          <path class="stem" d="M 255 120 L 252 105" stroke-width="0.7"/>
          <use href="#tinyFlower" x="252" y="105"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 320 180 L 360 150" stroke-width="1.5"/>
          <use href="#largeFlower" x="360" y="150"/>
          <path class="stem" d="M 360 150 L 375 140" stroke-width="1"/>
          <use href="#mediumFlower" x="375" y="140"/>
          <path class="stem" d="M 360 150 L 345 140" stroke-width="1"/>
          <use href="#mediumFlower" x="345" y="140"/>
          <path class="stem" d="M 360 150 L 365 165" stroke-width="1"/>
          <use href="#smallFlower" x="365" y="165"/>
          <path class="stem" d="M 375 140 L 385 130" stroke-width="0.7"/>
          <use href="#smallFlower" x="385" y="130"/>
          <path class="stem" d="M 375 140 L 380 150" stroke-width="0.7"/>
          <use href="#tinyFlower" x="380" y="150"/>
          <path class="stem" d="M 345 140 L 335 130" stroke-width="0.7"/>
          <use href="#smallFlower" x="335" y="130"/>
          <path class="stem" d="M 345 140 L 340 152" stroke-width="0.7"/>
          <use href="#tinyFlower" x="340" y="152"/>
          <path class="stem" d="M 320 180 L 330 170" stroke-width="1"/>
          <use href="#mediumFlower" x="330" y="170"/>
          <path class="stem" d="M 330 170 L 325 160" stroke-width="0.7"/>
          <use href="#smallFlower" x="325" y="160"/>
          <path class="stem" d="M 330 170 L 338 162" stroke-width="0.7"/>
          <use href="#tinyFlower" x="338" y="162"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 150 250 L 110 230" stroke-width="1.5"/>
          <use href="#largeFlower" x="110" y="230"/>
          <path class="stem" d="M 110 230 L 95 220" stroke-width="1"/>
          <use href="#mediumFlower" x="95" y="220"/>
          <path class="stem" d="M 110 230 L 120 215" stroke-width="1"/>
          <use href="#mediumFlower" x="120" y="215"/>
          <path class="stem" d="M 110 230 L 105 245" stroke-width="1"/>
          <use href="#smallFlower" x="105" y="245"/>
          <path class="stem" d="M 95 220 L 85 210" stroke-width="0.7"/>
          <use href="#smallFlower" x="85" y="210"/>
          <path class="stem" d="M 95 220 L 90 230" stroke-width="0.7"/>
          <use href="#tinyFlower" x="90" y="230"/>
          <path class="stem" d="M 120 215 L 130 205" stroke-width="0.7"/>
          <use href="#smallFlower" x="130" y="205"/>
          <path class="stem" d="M 120 215 L 115 205" stroke-width="0.7"/>
          <use href="#tinyFlower" x="115" y="205"/>
          <path class="stem" d="M 150 250 L 140 240" stroke-width="1"/>
          <use href="#mediumFlower" x="140" y="240"/>
          <path class="stem" d="M 140 240 L 135 230" stroke-width="0.7"/>
          <use href="#smallFlower" x="135" y="230"/>
          <path class="stem" d="M 140 240 L 145 228" stroke-width="0.7"/>
          <use href="#tinyFlower" x="145" y="228"/>
          <path class="stem" d="M 150 250 L 155 235" stroke-width="1"/>
          <use href="#smallFlower" x="155" y="235"/>
          <path class="stem" d="M 155 235 L 160 225" stroke-width="0.7"/>
          <use href="#tinyFlower" x="160" y="225"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 200 280 L 170 250" stroke-width="1.5"/>
          <use href="#largeFlower" x="170" y="250"/>
          <path class="stem" d="M 170 250 L 160 240" stroke-width="1"/>
          <use href="#mediumFlower" x="160" y="240"/>
          <path class="stem" d="M 170 250 L 180 238" stroke-width="1"/>
          <use href="#mediumFlower" x="180" y="238"/>
          <path class="stem" d="M 170 250 L 165 265" stroke-width="1"/>
          <use href="#smallFlower" x="165" y="265"/>
          <path class="stem" d="M 160 240 L 150 230" stroke-width="0.7"/>
          <use href="#smallFlower" x="150" y="230"/>
          <path class="stem" d="M 160 240 L 155 250" stroke-width="0.7"/>
          <use href="#tinyFlower" x="155" y="250"/>
          <path class="stem" d="M 180 238 L 190 228" stroke-width="0.7"/>
          <use href="#smallFlower" x="190" y="228"/>
          <path class="stem" d="M 180 238 L 185 248" stroke-width="0.7"/>
          <use href="#tinyFlower" x="185" y="248"/>
          <path class="stem" d="M 200 280 L 190 268" stroke-width="1"/>
          <use href="#mediumFlower" x="190" y="268"/>
          <path class="stem" d="M 190 268 L 185 258" stroke-width="0.7"/>
          <use href="#smallFlower" x="185" y="258"/>
          <path class="stem" d="M 190 268 L 195 256" stroke-width="0.7"/>
          <use href="#tinyFlower" x="195" y="256"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 250 200 L 230 180" stroke-width="1.5"/>
          <use href="#largeFlower" x="230" y="180"/>
          <path class="stem" d="M 230 180 L 220 170" stroke-width="1"/>
          <use href="#mediumFlower" x="220" y="170"/>
          <path class="stem" d="M 230 180 L 240 170" stroke-width="1"/>
          <use href="#mediumFlower" x="240" y="170"/>
          <path class="stem" d="M 230 180 L 225 195" stroke-width="1"/>
          <use href="#smallFlower" x="225" y="195"/>
          <path class="stem" d="M 220 170 L 210 160" stroke-width="0.7"/>
          <use href="#smallFlower" x="210" y="160"/>
          <path class="stem" d="M 220 170 L 215 180" stroke-width="0.7"/>
          <use href="#tinyFlower" x="215" y="180"/>
          <path class="stem" d="M 240 170 L 250 160" stroke-width="0.7"/>
          <use href="#smallFlower" x="250" y="160"/>
          <path class="stem" d="M 240 170 L 245 180" stroke-width="0.7"/>
          <use href="#tinyFlower" x="245" y="180"/>
          <path class="stem" d="M 250 220 L 270 200" stroke-width="1.5"/>
          <use href="#largeFlower" x="270" y="200"/>
          <path class="stem" d="M 270 200 L 280 190" stroke-width="1"/>
          <use href="#mediumFlower" x="280" y="190"/>
          <path class="stem" d="M 270 200 L 260 190" stroke-width="1"/>
          <use href="#mediumFlower" x="260" y="190"/>
          <path class="stem" d="M 270 200 L 275 215" stroke-width="1"/>
          <use href="#smallFlower" x="275" y="215"/>
          <path class="stem" d="M 280 190 L 290 180" stroke-width="0.7"/>
          <use href="#smallFlower" x="290" y="180"/>
          <path class="stem" d="M 280 190 L 285 200" stroke-width="0.7"/>
          <use href="#tinyFlower" x="285" y="200"/>
          <path class="stem" d="M 260 190 L 252 180" stroke-width="0.7"/>
          <use href="#smallFlower" x="252" y="180"/>
          <path class="stem" d="M 260 190 L 255 200" stroke-width="0.7"/>
          <use href="#tinyFlower" x="255" y="200"/>
          <path class="stem" d="M 250 240 L 245 225" stroke-width="1"/>
          <use href="#mediumFlower" x="245" y="225"/>
          <path class="stem" d="M 245 225 L 240 215" stroke-width="0.7"/>
          <use href="#smallFlower" x="240" y="215"/>
          <path class="stem" d="M 245 225 L 250 215" stroke-width="0.7"/>
          <use href="#tinyFlower" x="250" y="215"/>
          <path class="stem" d="M 250 240 L 255 228" stroke-width="1"/>
          <use href="#mediumFlower" x="255" y="228"/>
          <path class="stem" d="M 255 228 L 260 218" stroke-width="0.7"/>
          <use href="#smallFlower" x="260" y="218"/>
          <path class="stem" d="M 255 228 L 252 238" stroke-width="0.7"/>
          <use href="#tinyFlower" x="252" y="238"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 300 260 L 330 240" stroke-width="1.5"/>
          <use href="#largeFlower" x="330" y="240"/>
          <path class="stem" d="M 330 240 L 340 230" stroke-width="1"/>
          <use href="#mediumFlower" x="340" y="230"/>
          <path class="stem" d="M 330 240 L 320 230" stroke-width="1"/>
          <use href="#mediumFlower" x="320" y="230"/>
          <path class="stem" d="M 330 240 L 335 255" stroke-width="1"/>
          <use href="#smallFlower" x="335" y="255"/>
          <path class="stem" d="M 340 230 L 350 220" stroke-width="0.7"/>
          <use href="#smallFlower" x="350" y="220"/>
          <path class="stem" d="M 340 230 L 345 240" stroke-width="0.7"/>
          <use href="#tinyFlower" x="345" y="240"/>
          <path class="stem" d="M 320 230 L 310 220" stroke-width="0.7"/>
          <use href="#smallFlower" x="310" y="220"/>
          <path class="stem" d="M 320 230 L 315 240" stroke-width="0.7"/>
          <use href="#tinyFlower" x="315" y="240"/>
          <path class="stem" d="M 300 260 L 310 248" stroke-width="1"/>
          <use href="#mediumFlower" x="310" y="248"/>
          <path class="stem" d="M 310 248 L 305 238" stroke-width="0.7"/>
          <use href="#smallFlower" x="305" y="238"/>
          <path class="stem" d="M 310 248 L 315 256" stroke-width="0.7"/>
          <use href="#tinyFlower" x="315" y="256"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 350 230 L 385 210" stroke-width="1.5"/>
          <use href="#largeFlower" x="385" y="210"/>
          <path class="stem" d="M 385 210 L 395 200" stroke-width="1"/>
          <use href="#mediumFlower" x="395" y="200"/>
          <path class="stem" d="M 385 210 L 375 200" stroke-width="1"/>
          <use href="#mediumFlower" x="375" y="200"/>
          <path class="stem" d="M 385 210 L 390 225" stroke-width="1"/>
          <use href="#smallFlower" x="390" y="225"/>
          <path class="stem" d="M 395 200 L 405 190" stroke-width="0.7"/>
          <use href="#smallFlower" x="405" y="190"/>
          <path class="stem" d="M 395 200 L 400 210" stroke-width="0.7"/>
          <use href="#tinyFlower" x="400" y="210"/>
          <path class="stem" d="M 375 200 L 365 190" stroke-width="0.7"/>
          <use href="#smallFlower" x="365" y="190"/>
          <path class="stem" d="M 375 200 L 370 210" stroke-width="0.7"/>
          <use href="#tinyFlower" x="370" y="210"/>
          <path class="stem" d="M 350 230 L 360 218" stroke-width="1"/>
          <use href="#mediumFlower" x="360" y="218"/>
          <path class="stem" d="M 360 218 L 355 208" stroke-width="0.7"/>
          <use href="#smallFlower" x="355" y="208"/>
          <path class="stem" d="M 360 218 L 368 210" stroke-width="0.7"/>
          <use href="#tinyFlower" x="368" y="210"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 190 350 L 160 320" stroke-width="1.5"/>
          <use href="#largeFlower" x="160" y="320"/>
          <path class="stem" d="M 160 320 L 150 310" stroke-width="1"/>
          <use href="#mediumFlower" x="150" y="310"/>
          <path class="stem" d="M 160 320 L 170 310" stroke-width="1"/>
          <use href="#mediumFlower" x="170" y="310"/>
          <path class="stem" d="M 160 320 L 155 335" stroke-width="1"/>
          <use href="#smallFlower" x="155" y="335"/>
          <path class="stem" d="M 150 310 L 140 300" stroke-width="0.7"/>
          <use href="#smallFlower" x="140" y="300"/>
          <path class="stem" d="M 150 310 L 145 320" stroke-width="0.7"/>
          <use href="#tinyFlower" x="145" y="320"/>
          <path class="stem" d="M 170 310 L 180 300" stroke-width="0.7"/>
          <use href="#smallFlower" x="180" y="300"/>
          <path class="stem" d="M 170 310 L 175 320" stroke-width="0.7"/>
          <use href="#tinyFlower" x="175" y="320"/>
          <path class="stem" d="M 190 350 L 180 335" stroke-width="1"/>
          <use href="#mediumFlower" x="180" y="335"/>
          <path class="stem" d="M 180 335 L 175 325" stroke-width="0.7"/>
          <use href="#smallFlower" x="175" y="325"/>
          <path class="stem" d="M 180 335 L 185 345" stroke-width="0.7"/>
          <use href="#tinyFlower" x="185" y="345"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 250 300 L 235 280" stroke-width="1.5"/>
          <use href="#largeFlower" x="235" y="280"/>
          <path class="stem" d="M 235 280 L 225 270" stroke-width="1"/>
          <use href="#mediumFlower" x="225" y="270"/>
          <path class="stem" d="M 235 280 L 245 270" stroke-width="1"/>
          <use href="#mediumFlower" x="245" y="270"/>
          <path class="stem" d="M 235 280 L 230 295" stroke-width="1"/>
          <use href="#smallFlower" x="230" y="295"/>
          <path class="stem" d="M 225 270 L 215 260" stroke-width="0.7"/>
          <use href="#smallFlower" x="215" y="260"/>
          <path class="stem" d="M 225 270 L 220 280" stroke-width="0.7"/>
          <use href="#tinyFlower" x="220" y="280"/>
          <path class="stem" d="M 245 270 L 255 260" stroke-width="0.7"/>
          <use href="#smallFlower" x="255" y="260"/>
          <path class="stem" d="M 245 270 L 250 280" stroke-width="0.7"/>
          <use href="#tinyFlower" x="250" y="280"/>
          <path class="stem" d="M 250 300 L 265 285" stroke-width="1.5"/>
          <use href="#largeFlower" x="265" y="285"/>
          <path class="stem" d="M 265 285 L 275 275" stroke-width="1"/>
          <use href="#mediumFlower" x="275" y="275"/>
          <path class="stem" d="M 265 285 L 255 275" stroke-width="1"/>
          <use href="#mediumFlower" x="255" y="275"/>
          <path class="stem" d="M 265 285 L 270 300" stroke-width="1"/>
          <use href="#smallFlower" x="270" y="300"/>
          <path class="stem" d="M 275 275 L 285 265" stroke-width="0.7"/>
          <use href="#smallFlower" x="285" y="265"/>
          <path class="stem" d="M 275 275 L 280 285" stroke-width="0.7"/>
          <use href="#tinyFlower" x="280" y="285"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 310 340 L 340 320" stroke-width="1.5"/>
          <use href="#largeFlower" x="340" y="320"/>
          <path class="stem" d="M 340 320 L 350 310" stroke-width="1"/>
          <use href="#mediumFlower" x="350" y="310"/>
          <path class="stem" d="M 340 320 L 330 310" stroke-width="1"/>
          <use href="#mediumFlower" x="330" y="310"/>
          <path class="stem" d="M 340 320 L 345 335" stroke-width="1"/>
          <use href="#smallFlower" x="345" y="335"/>
          <path class="stem" d="M 350 310 L 360 300" stroke-width="0.7"/>
          <use href="#smallFlower" x="360" y="300"/>
          <path class="stem" d="M 350 310 L 355 320" stroke-width="0.7"/>
          <use href="#tinyFlower" x="355" y="320"/>
          <path class="stem" d="M 330 310 L 320 300" stroke-width="0.7"/>
          <use href="#smallFlower" x="320" y="300"/>
          <path class="stem" d="M 330 310 L 325 320" stroke-width="0.7"/>
          <use href="#tinyFlower" x="325" y="320"/>
          <path class="stem" d="M 310 340 L 320 328" stroke-width="1"/>
          <use href="#mediumFlower" x="320" y="328"/>
          <path class="stem" d="M 320 328 L 315 318" stroke-width="0.7"/>
          <use href="#smallFlower" x="315" y="318"/>
          <path class="stem" d="M 320 328 L 328 338" stroke-width="0.7"/>
          <use href="#tinyFlower" x="328" y="338"/>
        </g>
        <g class="fill-flowers">
          <path class="stem" d="M 180 220 L 175 210" stroke-width="0.7"/><use href="#smallFlower" x="175" y="210"/>
          <path class="stem" d="M 160 270 L 155 260" stroke-width="0.7"/><use href="#tinyFlower" x="155" y="260"/>
          <path class="stem" d="M 195 290 L 190 280" stroke-width="0.7"/><use href="#smallFlower" x="190" y="280"/>
          <path class="stem" d="M 145 195 L 140 185" stroke-width="0.7"/><use href="#tinyFlower" x="140" y="185"/>
          <path class="stem" d="M 125 225 L 120 215" stroke-width="0.7"/><use href="#smallFlower" x="120" y="215"/>
          <path class="stem" d="M 320 220 L 325 210" stroke-width="0.7"/><use href="#smallFlower" x="325" y="210"/>
          <path class="stem" d="M 340 270 L 345 260" stroke-width="0.7"/><use href="#tinyFlower" x="345" y="260"/>
          <path class="stem" d="M 305 290 L 310 280" stroke-width="0.7"/><use href="#smallFlower" x="310" y="280"/>
          <path class="stem" d="M 355 195 L 360 185" stroke-width="0.7"/><use href="#tinyFlower" x="360" y="185"/>
          <path class="stem" d="M 375 225 L 380 215" stroke-width="0.7"/><use href="#smallFlower" x="380" y="215"/>
          <path class="stem" d="M 240 255 L 235 245" stroke-width="0.7"/><use href="#tinyFlower" x="235" y="245"/>
          <path class="stem" d="M 260 255 L 265 245" stroke-width="0.7"/><use href="#tinyFlower" x="265" y="245"/>
          <path class="stem" d="M 248 135 L 243 125" stroke-width="0.7"/><use href="#tinyFlower" x="243" y="125"/>
          <path class="stem" d="M 252 138 L 257 128" stroke-width="0.7"/><use href="#tinyFlower" x="257" y="128"/>
          <path class="stem" d="M 245 305 L 240 295" stroke-width="0.7"/><use href="#smallFlower" x="240" y="295"/>
          <path class="stem" d="M 255 305 L 260 295" stroke-width="0.7"/><use href="#smallFlower" x="260" y="295"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 100 280 L 65 255" stroke-width="1.5"/><use href="#largeFlower" x="65" y="255"/>
          <path class="stem" d="M 65 255 L 50 245" stroke-width="1"/><use href="#mediumFlower" x="50" y="245"/>
          <path class="stem" d="M 65 255 L 75 242" stroke-width="1"/><use href="#mediumFlower" x="75" y="242"/>
          <path class="stem" d="M 65 255 L 60 270" stroke-width="1"/><use href="#smallFlower" x="60" y="270"/>
          <path class="stem" d="M 50 245 L 40 235" stroke-width="0.7"/><use href="#smallFlower" x="40" y="235"/>
          <path class="stem" d="M 50 245 L 45 258" stroke-width="0.7"/><use href="#tinyFlower" x="45" y="258"/>
          <path class="stem" d="M 75 242 L 85 232" stroke-width="0.7"/><use href="#smallFlower" x="85" y="232"/>
          <path class="stem" d="M 75 242 L 70 255" stroke-width="0.7"/><use href="#tinyFlower" x="70" y="255"/>
          <path class="stem" d="M 40 235 L 30 225" stroke-width="0.7"/><use href="#tinyFlower" x="30" y="225"/>
          <path class="stem" d="M 40 235 L 35 248" stroke-width="0.7"/><use href="#tinyFlower" x="35" y="248"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 130 360 L 95 340" stroke-width="1.5"/><use href="#largeFlower" x="95" y="340"/>
          <path class="stem" d="M 95 340 L 80 330" stroke-width="1"/><use href="#mediumFlower" x="80" y="330"/>
          <path class="stem" d="M 95 340 L 105 328" stroke-width="1"/><use href="#mediumFlower" x="105" y="328"/>
          <path class="stem" d="M 95 340 L 90 355" stroke-width="1"/><use href="#smallFlower" x="90" y="355"/>
          <path class="stem" d="M 80 330 L 68 320" stroke-width="0.7"/><use href="#smallFlower" x="68" y="320"/>
          <path class="stem" d="M 80 330 L 75 343" stroke-width="0.7"/><use href="#tinyFlower" x="75" y="343"/>
          <path class="stem" d="M 105 328 L 115 318" stroke-width="0.7"/><use href="#smallFlower" x="115" y="318"/>
          <path class="stem" d="M 105 328 L 100 340" stroke-width="0.7"/><use href="#tinyFlower" x="100" y="340"/>
          <path class="stem" d="M 68 320 L 55 310" stroke-width="0.7"/><use href="#tinyFlower" x="55" y="310"/>
          <path class="stem" d="M 68 320 L 62 333" stroke-width="0.7"/><use href="#tinyFlower" x="62" y="333"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 400 260 L 435 238" stroke-width="1.5"/><use href="#largeFlower" x="435" y="238"/>
          <path class="stem" d="M 435 238 L 448 228" stroke-width="1"/><use href="#mediumFlower" x="448" y="228"/>
          <path class="stem" d="M 435 238 L 425 226" stroke-width="1"/><use href="#mediumFlower" x="425" y="226"/>
          <path class="stem" d="M 435 238 L 440 252" stroke-width="1"/><use href="#smallFlower" x="440" y="252"/>
          <path class="stem" d="M 448 228 L 460 218" stroke-width="0.7"/><use href="#smallFlower" x="460" y="218"/>
          <path class="stem" d="M 448 228 L 453 240" stroke-width="0.7"/><use href="#tinyFlower" x="453" y="240"/>
          <path class="stem" d="M 425 226 L 415 216" stroke-width="0.7"/><use href="#smallFlower" x="415" y="216"/>
          <path class="stem" d="M 425 226 L 420 238" stroke-width="0.7"/><use href="#tinyFlower" x="420" y="238"/>
          <path class="stem" d="M 460 218 L 472 208" stroke-width="0.7"/><use href="#tinyFlower" x="472" y="208"/>
          <path class="stem" d="M 460 218 L 465 230" stroke-width="0.7"/><use href="#tinyFlower" x="465" y="230"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 370 350 L 405 330" stroke-width="1.5"/><use href="#largeFlower" x="405" y="330"/>
          <path class="stem" d="M 405 330 L 418 320" stroke-width="1"/><use href="#mediumFlower" x="418" y="320"/>
          <path class="stem" d="M 405 330 L 395 318" stroke-width="1"/><use href="#mediumFlower" x="395" y="318"/>
          <path class="stem" d="M 405 330 L 410 345" stroke-width="1"/><use href="#smallFlower" x="410" y="345"/>
          <path class="stem" d="M 418 320 L 430 310" stroke-width="0.7"/><use href="#smallFlower" x="430" y="310"/>
          <path class="stem" d="M 418 320 L 423 332" stroke-width="0.7"/><use href="#tinyFlower" x="423" y="332"/>
          <path class="stem" d="M 395 318 L 385 308" stroke-width="0.7"/><use href="#smallFlower" x="385" y="308"/>
          <path class="stem" d="M 395 318 L 390 330" stroke-width="0.7"/><use href="#tinyFlower" x="390" y="330"/>
          <path class="stem" d="M 430 310 L 443 300" stroke-width="0.7"/><use href="#tinyFlower" x="443" y="300"/>
          <path class="stem" d="M 430 310 L 435 322" stroke-width="0.7"/><use href="#tinyFlower" x="435" y="322"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 120 200 L 85 170" stroke-width="1.5"/><use href="#largeFlower" x="85" y="170"/>
          <path class="stem" d="M 85 170 L 70 158" stroke-width="1"/><use href="#mediumFlower" x="70" y="158"/>
          <path class="stem" d="M 85 170 L 98 158" stroke-width="1"/><use href="#mediumFlower" x="98" y="158"/>
          <path class="stem" d="M 85 170 L 80 185" stroke-width="1"/><use href="#smallFlower" x="80" y="185"/>
          <path class="stem" d="M 70 158 L 58 148" stroke-width="0.7"/><use href="#smallFlower" x="58" y="148"/>
          <path class="stem" d="M 70 158 L 65 170" stroke-width="0.7"/><use href="#tinyFlower" x="65" y="170"/>
          <path class="stem" d="M 98 158 L 108 147" stroke-width="0.7"/><use href="#smallFlower" x="108" y="147"/>
          <path class="stem" d="M 98 158 L 93 170" stroke-width="0.7"/><use href="#tinyFlower" x="93" y="170"/>
          <path class="stem" d="M 58 148 L 46 138" stroke-width="0.7"/><use href="#tinyFlower" x="46" y="138"/>
          <path class="stem" d="M 58 148 L 53 160" stroke-width="0.7"/><use href="#tinyFlower" x="53" y="160"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 380 190 L 415 162" stroke-width="1.5"/><use href="#largeFlower" x="415" y="162"/>
          <path class="stem" d="M 415 162 L 428 150" stroke-width="1"/><use href="#mediumFlower" x="428" y="150"/>
          <path class="stem" d="M 415 162 L 403 150" stroke-width="1"/><use href="#mediumFlower" x="403" y="150"/>
          <path class="stem" d="M 415 162 L 420 176" stroke-width="1"/><use href="#smallFlower" x="420" y="176"/>
          <path class="stem" d="M 428 150 L 440 140" stroke-width="0.7"/><use href="#smallFlower" x="440" y="140"/>
          <path class="stem" d="M 428 150 L 433 162" stroke-width="0.7"/><use href="#tinyFlower" x="433" y="162"/>
          <path class="stem" d="M 403 150 L 393 140" stroke-width="0.7"/><use href="#smallFlower" x="393" y="140"/>
          <path class="stem" d="M 403 150 L 398 162" stroke-width="0.7"/><use href="#tinyFlower" x="398" y="162"/>
          <path class="stem" d="M 440 140 L 452 130" stroke-width="0.7"/><use href="#tinyFlower" x="452" y="130"/>
          <path class="stem" d="M 440 140 L 445 152" stroke-width="0.7"/><use href="#tinyFlower" x="445" y="152"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 250 120 L 245 90" stroke-width="1.2"/><use href="#largeFlower" x="245" y="90"/>
          <path class="stem" d="M 245 90 L 235 78" stroke-width="0.9"/><use href="#mediumFlower" x="235" y="78"/>
          <path class="stem" d="M 245 90 L 257 78" stroke-width="0.9"/><use href="#mediumFlower" x="257" y="78"/>
          <path class="stem" d="M 245 90 L 240 104" stroke-width="0.9"/><use href="#smallFlower" x="240" y="104"/>
          <path class="stem" d="M 235 78 L 225 67" stroke-width="0.7"/><use href="#smallFlower" x="225" y="67"/>
          <path class="stem" d="M 235 78 L 230 90" stroke-width="0.7"/><use href="#tinyFlower" x="230" y="90"/>
          <path class="stem" d="M 257 78 L 267 67" stroke-width="0.7"/><use href="#smallFlower" x="267" y="67"/>
          <path class="stem" d="M 257 78 L 262 90" stroke-width="0.7"/><use href="#tinyFlower" x="262" y="90"/>
          <path class="stem" d="M 225 67 L 218 55" stroke-width="0.7"/><use href="#tinyFlower" x="218" y="55"/>
          <path class="stem" d="M 267 67 L 274 55" stroke-width="0.7"/><use href="#tinyFlower" x="274" y="55"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 160 310 L 130 300" stroke-width="1.2"/><use href="#mediumFlower" x="130" y="300"/>
          <path class="stem" d="M 130 300 L 120 290" stroke-width="0.9"/><use href="#smallFlower" x="120" y="290"/>
          <path class="stem" d="M 130 300 L 140 290" stroke-width="0.9"/><use href="#smallFlower" x="140" y="290"/>
          <path class="stem" d="M 120 290 L 112 280" stroke-width="0.7"/><use href="#tinyFlower" x="112" y="280"/>
          <path class="stem" d="M 120 290 L 115 302" stroke-width="0.7"/><use href="#tinyFlower" x="115" y="302"/>
          <path class="stem" d="M 140 290 L 148 280" stroke-width="0.7"/><use href="#tinyFlower" x="148" y="280"/>
          <path class="stem" d="M 140 290 L 145 302" stroke-width="0.7"/><use href="#tinyFlower" x="145" y="302"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 340 300 L 370 290" stroke-width="1.2"/><use href="#mediumFlower" x="370" y="290"/>
          <path class="stem" d="M 370 290 L 380 280" stroke-width="0.9"/><use href="#smallFlower" x="380" y="280"/>
          <path class="stem" d="M 370 290 L 360 280" stroke-width="0.9"/><use href="#smallFlower" x="360" y="280"/>
          <path class="stem" d="M 380 280 L 390 270" stroke-width="0.7"/><use href="#tinyFlower" x="390" y="270"/>
          <path class="stem" d="M 380 280 L 385 292" stroke-width="0.7"/><use href="#tinyFlower" x="385" y="292"/>
          <path class="stem" d="M 360 280 L 352 270" stroke-width="0.7"/><use href="#tinyFlower" x="352" y="270"/>
          <path class="stem" d="M 360 280 L 355 292" stroke-width="0.7"/><use href="#tinyFlower" x="355" y="292"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 100 280 L 75 270" stroke-width="1"/><use href="#mediumFlower" x="75" y="270"/>
          <path class="stem" d="M 75 270 L 63 260" stroke-width="0.7"/><use href="#smallFlower" x="63" y="260"/>
          <path class="stem" d="M 75 270 L 80 258" stroke-width="0.7"/><use href="#smallFlower" x="80" y="258"/>
          <path class="stem" d="M 75 270 L 70 282" stroke-width="0.7"/><use href="#tinyFlower" x="70" y="282"/>
          <path class="stem" d="M 63 260 L 52 250" stroke-width="0.7"/><use href="#tinyFlower" x="52" y="250"/>
          <path class="stem" d="M 63 260 L 58 272" stroke-width="0.7"/><use href="#tinyFlower" x="58" y="272"/>
        </g>
        <g class="flower-cluster">
          <path class="stem" d="M 400 260 L 425 250" stroke-width="1"/><use href="#mediumFlower" x="425" y="250"/>
          <path class="stem" d="M 425 250 L 437 240" stroke-width="0.7"/><use href="#smallFlower" x="437" y="240"/>
          <path class="stem" d="M 425 250 L 420 238" stroke-width="0.7"/><use href="#smallFlower" x="420" y="238"/>
          <path class="stem" d="M 425 250 L 430 262" stroke-width="0.7"/><use href="#tinyFlower" x="430" y="262"/>
          <path class="stem" d="M 437 240 L 448 230" stroke-width="0.7"/><use href="#tinyFlower" x="448" y="230"/>
          <path class="stem" d="M 437 240 L 442 252" stroke-width="0.7"/><use href="#tinyFlower" x="442" y="252"/>
        </g>
        <path class="stem" d="M 250 550 Q 215 450, 90 190" stroke-width="2"/>
        <g class="flower-cluster">
          <path class="stem" d="M 90 190 L 60 165" stroke-width="1.5"/><use href="#largeFlower" x="60" y="165"/>
          <path class="stem" d="M 60 165 L 45 152" stroke-width="1"/><use href="#mediumFlower" x="45" y="152"/>
          <path class="stem" d="M 60 165 L 72 150" stroke-width="1"/><use href="#mediumFlower" x="72" y="150"/>
          <path class="stem" d="M 60 165 L 55 180" stroke-width="1"/><use href="#smallFlower" x="55" y="180"/>
          <path class="stem" d="M 45 152 L 33 140" stroke-width="0.7"/><use href="#smallFlower" x="33" y="140"/>
          <path class="stem" d="M 45 152 L 40 165" stroke-width="0.7"/><use href="#tinyFlower" x="40" y="165"/>
          <path class="stem" d="M 72 150 L 82 140" stroke-width="0.7"/><use href="#smallFlower" x="82" y="140"/>
          <path class="stem" d="M 72 150 L 68 163" stroke-width="0.7"/><use href="#tinyFlower" x="68" y="163"/>
          <path class="stem" d="M 33 140 L 22 128" stroke-width="0.7"/><use href="#tinyFlower" x="22" y="128"/>
          <path class="stem" d="M 33 140 L 28 153" stroke-width="0.7"/><use href="#tinyFlower" x="28" y="153"/>
          <path class="stem" d="M 90 190 L 78 178" stroke-width="1"/><use href="#mediumFlower" x="78" y="178"/>
          <path class="stem" d="M 78 178 L 68 168" stroke-width="0.7"/><use href="#smallFlower" x="68" y="168"/>
          <path class="stem" d="M 78 178 L 82 165" stroke-width="0.7"/><use href="#tinyFlower" x="82" y="165"/>
        </g>
        <path class="stem" d="M 250 550 Q 285 450, 410 190" stroke-width="2"/>
        <g class="flower-cluster">
          <path class="stem" d="M 410 190 L 440 165" stroke-width="1.5"/><use href="#largeFlower" x="440" y="165"/>
          <path class="stem" d="M 440 165 L 455 152" stroke-width="1"/><use href="#mediumFlower" x="455" y="152"/>
          <path class="stem" d="M 440 165 L 428 150" stroke-width="1"/><use href="#mediumFlower" x="428" y="150"/>
          <path class="stem" d="M 440 165 L 445 180" stroke-width="1"/><use href="#smallFlower" x="445" y="180"/>
          <path class="stem" d="M 455 152 L 467 140" stroke-width="0.7"/><use href="#smallFlower" x="467" y="140"/>
          <path class="stem" d="M 455 152 L 460 165" stroke-width="0.7"/><use href="#tinyFlower" x="460" y="165"/>
          <path class="stem" d="M 428 150 L 418 140" stroke-width="0.7"/><use href="#smallFlower" x="418" y="140"/>
          <path class="stem" d="M 428 150 L 422 163" stroke-width="0.7"/><use href="#tinyFlower" x="422" y="163"/>
          <path class="stem" d="M 467 140 L 478 128" stroke-width="0.7"/><use href="#tinyFlower" x="478" y="128"/>
          <path class="stem" d="M 467 140 L 472 153" stroke-width="0.7"/><use href="#tinyFlower" x="472" y="153"/>
          <path class="stem" d="M 410 190 L 422 178" stroke-width="1"/><use href="#mediumFlower" x="422" y="178"/>
          <path class="stem" d="M 422 178 L 432 168" stroke-width="0.7"/><use href="#smallFlower" x="432" y="168"/>
          <path class="stem" d="M 422 178 L 418 165" stroke-width="0.7"/><use href="#tinyFlower" x="418" y="165"/>
        </g>
        <path class="stem" d="M 250 550 Q 228 470, 175 380" stroke-width="1.8"/>
        <g class="flower-cluster">
          <path class="stem" d="M 175 380 L 148 358" stroke-width="1.5"/><use href="#largeFlower" x="148" y="358"/>
          <path class="stem" d="M 148 358 L 135 345" stroke-width="1"/><use href="#mediumFlower" x="135" y="345"/>
          <path class="stem" d="M 148 358 L 160 343" stroke-width="1"/><use href="#mediumFlower" x="160" y="343"/>
          <path class="stem" d="M 148 358 L 143 373" stroke-width="1"/><use href="#smallFlower" x="143" y="373"/>
          <path class="stem" d="M 135 345 L 123 333" stroke-width="0.7"/><use href="#smallFlower" x="123" y="333"/>
          <path class="stem" d="M 135 345 L 129 358" stroke-width="0.7"/><use href="#tinyFlower" x="129" y="358"/>
          <path class="stem" d="M 160 343 L 170 332" stroke-width="0.7"/><use href="#smallFlower" x="170" y="332"/>
          <path class="stem" d="M 160 343 L 165 356" stroke-width="0.7"/><use href="#tinyFlower" x="165" y="356"/>
          <path class="stem" d="M 175 380 L 163 368" stroke-width="1"/><use href="#mediumFlower" x="163" y="368"/>
          <path class="stem" d="M 163 368 L 155 357" stroke-width="0.7"/><use href="#smallFlower" x="155" y="357"/>
          <path class="stem" d="M 163 368 L 168 355" stroke-width="0.7"/><use href="#tinyFlower" x="168" y="355"/>
        </g>
        <path class="stem" d="M 250 550 Q 272 470, 325 380" stroke-width="1.8"/>
        <g class="flower-cluster">
          <path class="stem" d="M 325 380 L 352 358" stroke-width="1.5"/><use href="#largeFlower" x="352" y="358"/>
          <path class="stem" d="M 352 358 L 365 345" stroke-width="1"/><use href="#mediumFlower" x="365" y="345"/>
          <path class="stem" d="M 352 358 L 340 343" stroke-width="1"/><use href="#mediumFlower" x="340" y="343"/>
          <path class="stem" d="M 352 358 L 357 373" stroke-width="1"/><use href="#smallFlower" x="357" y="373"/>
          <path class="stem" d="M 365 345 L 377 333" stroke-width="0.7"/><use href="#smallFlower" x="377" y="333"/>
          <path class="stem" d="M 365 345 L 371 358" stroke-width="0.7"/><use href="#tinyFlower" x="371" y="358"/>
          <path class="stem" d="M 340 343 L 330 332" stroke-width="0.7"/><use href="#smallFlower" x="330" y="332"/>
          <path class="stem" d="M 340 343 L 335 356" stroke-width="0.7"/><use href="#tinyFlower" x="335" y="356"/>
          <path class="stem" d="M 325 380 L 337 368" stroke-width="1"/><use href="#mediumFlower" x="337" y="368"/>
          <path class="stem" d="M 337 368 L 345 357" stroke-width="0.7"/><use href="#smallFlower" x="345" y="357"/>
          <path class="stem" d="M 337 368 L 332 355" stroke-width="0.7"/><use href="#tinyFlower" x="332" y="355"/>
        </g>
        <path class="stem" d="M 250 550 Q 242 380, 210 130" stroke-width="1.5"/>
        <g class="flower-cluster">
          <path class="stem" d="M 210 130 L 188 105" stroke-width="1.5"/><use href="#largeFlower" x="188" y="105"/>
          <path class="stem" d="M 188 105 L 174 92" stroke-width="1"/><use href="#mediumFlower" x="174" y="92"/>
          <path class="stem" d="M 188 105 L 200 90" stroke-width="1"/><use href="#mediumFlower" x="200" y="90"/>
          <path class="stem" d="M 188 105 L 183 120" stroke-width="1"/><use href="#smallFlower" x="183" y="120"/>
          <path class="stem" d="M 174 92 L 162 80" stroke-width="0.7"/><use href="#smallFlower" x="162" y="80"/>
          <path class="stem" d="M 174 92 L 168 105" stroke-width="0.7"/><use href="#tinyFlower" x="168" y="105"/>
          <path class="stem" d="M 200 90 L 212 78" stroke-width="0.7"/><use href="#smallFlower" x="212" y="78"/>
          <path class="stem" d="M 200 90 L 205 103" stroke-width="0.7"/><use href="#tinyFlower" x="205" y="103"/>
          <path class="stem" d="M 162 80 L 152 68" stroke-width="0.7"/><use href="#tinyFlower" x="152" y="68"/>
          <path class="stem" d="M 210 130 L 200 118" stroke-width="1"/><use href="#mediumFlower" x="200" y="118"/>
          <path class="stem" d="M 200 118 L 192 107" stroke-width="0.7"/><use href="#smallFlower" x="192" y="107"/>
          <path class="stem" d="M 200 118 L 206 105" stroke-width="0.7"/><use href="#tinyFlower" x="206" y="105"/>
        </g>
        <path class="stem" d="M 250 550 Q 258 380, 290 130" stroke-width="1.5"/>
        <g class="flower-cluster">
          <path class="stem" d="M 290 130 L 312 105" stroke-width="1.5"/><use href="#largeFlower" x="312" y="105"/>
          <path class="stem" d="M 312 105 L 326 92" stroke-width="1"/><use href="#mediumFlower" x="326" y="92"/>
          <path class="stem" d="M 312 105 L 300 90" stroke-width="1"/><use href="#mediumFlower" x="300" y="90"/>
          <path class="stem" d="M 312 105 L 317 120" stroke-width="1"/><use href="#smallFlower" x="317" y="120"/>
          <path class="stem" d="M 326 92 L 338 80" stroke-width="0.7"/><use href="#smallFlower" x="338" y="80"/>
          <path class="stem" d="M 326 92 L 332 105" stroke-width="0.7"/><use href="#tinyFlower" x="332" y="105"/>
          <path class="stem" d="M 300 90 L 288 78" stroke-width="0.7"/><use href="#smallFlower" x="288" y="78"/>
          <path class="stem" d="M 300 90 L 295 103" stroke-width="0.7"/><use href="#tinyFlower" x="295" y="103"/>
          <path class="stem" d="M 338 80 L 348 68" stroke-width="0.7"/><use href="#tinyFlower" x="348" y="68"/>
          <path class="stem" d="M 290 130 L 300 118" stroke-width="1"/><use href="#mediumFlower" x="300" y="118"/>
          <path class="stem" d="M 300 118 L 308 107" stroke-width="0.7"/><use href="#smallFlower" x="308" y="107"/>
          <path class="stem" d="M 300 118 L 294 105" stroke-width="0.7"/><use href="#tinyFlower" x="294" y="105"/>
        </g>
        <g class="fill-flowers">
          <path class="stem" d="M 108 295 L 100 283" stroke-width="0.7"/><use href="#smallFlower" x="100" y="283"/>
          <path class="stem" d="M 112 318 L 105 307" stroke-width="0.7"/><use href="#tinyFlower" x="105" y="307"/>
          <path class="stem" d="M 95 265 L 88 255" stroke-width="0.7"/><use href="#tinyFlower" x="88" y="255"/>
          <path class="stem" d="M 75 290 L 68 280" stroke-width="0.7"/><use href="#smallFlower" x="68" y="280"/>
          <path class="stem" d="M 55 270 L 48 260" stroke-width="0.7"/><use href="#tinyFlower" x="48" y="260"/>
          <path class="stem" d="M 115 245 L 108 235" stroke-width="0.7"/><use href="#tinyFlower" x="108" y="235"/>
          <path class="stem" d="M 75 340 L 68 330" stroke-width="0.7"/><use href="#tinyFlower" x="68" y="330"/>
          <path class="stem" d="M 100 370 L 93 360" stroke-width="0.7"/><use href="#smallFlower" x="93" y="360"/>
          <path class="stem" d="M 392 278 L 400 267" stroke-width="0.7"/><use href="#smallFlower" x="400" y="267"/>
          <path class="stem" d="M 388 302 L 396 291" stroke-width="0.7"/><use href="#tinyFlower" x="396" y="291"/>
          <path class="stem" d="M 405 250 L 413 240" stroke-width="0.7"/><use href="#tinyFlower" x="413" y="240"/>
          <path class="stem" d="M 425 270 L 432 260" stroke-width="0.7"/><use href="#smallFlower" x="432" y="260"/>
          <path class="stem" d="M 445 250 L 452 240" stroke-width="0.7"/><use href="#tinyFlower" x="452" y="240"/>
          <path class="stem" d="M 385 228 L 393 218" stroke-width="0.7"/><use href="#tinyFlower" x="393" y="218"/>
          <path class="stem" d="M 425 348 L 433 338" stroke-width="0.7"/><use href="#tinyFlower" x="433" y="338"/>
          <path class="stem" d="M 400 365 L 408 355" stroke-width="0.7"/><use href="#smallFlower" x="408" y="355"/>
          <path class="stem" d="M 210 88 L 205 76" stroke-width="0.7"/><use href="#tinyFlower" x="205" y="76"/>
          <path class="stem" d="M 273 85 L 278 73" stroke-width="0.7"/><use href="#tinyFlower" x="278" y="73"/>
          <path class="stem" d="M 195 115 L 190 103" stroke-width="0.7"/><use href="#smallFlower" x="190" y="103"/>
          <path class="stem" d="M 288 112 L 293 100" stroke-width="0.7"/><use href="#smallFlower" x="293" y="100"/>
          <path class="stem" d="M 218 310 L 213 300" stroke-width="0.7"/><use href="#tinyFlower" x="213" y="300"/>
          <path class="stem" d="M 282 310 L 287 300" stroke-width="0.7"/><use href="#tinyFlower" x="287" y="300"/>
          <path class="stem" d="M 225 340 L 220 328" stroke-width="0.7"/><use href="#smallFlower" x="220" y="328"/>
          <path class="stem" d="M 275 338 L 280 326" stroke-width="0.7"/><use href="#smallFlower" x="280" y="326"/>
          <path class="stem" d="M 250 360 L 245 348" stroke-width="0.7"/><use href="#smallFlower" x="245" y="348"/>
          <path class="stem" d="M 253 362 L 258 350" stroke-width="0.7"/><use href="#tinyFlower" x="258" y="350"/>
          <path class="stem" d="M 45 178 L 38 167" stroke-width="0.7"/><use href="#tinyFlower" x="38" y="167"/>
          <path class="stem" d="M 60 200 L 53 190" stroke-width="0.7"/><use href="#smallFlower" x="53" y="190"/>
          <path class="stem" d="M 40 260 L 33 250" stroke-width="0.7"/><use href="#tinyFlower" x="33" y="250"/>
          <path class="stem" d="M 55 340 L 48 330" stroke-width="0.7"/><use href="#smallFlower" x="48" y="330"/>
          <path class="stem" d="M 455 178 L 462 167" stroke-width="0.7"/><use href="#tinyFlower" x="462" y="167"/>
          <path class="stem" d="M 440 200 L 447 190" stroke-width="0.7"/><use href="#smallFlower" x="447" y="190"/>
          <path class="stem" d="M 460 260 L 467 250" stroke-width="0.7"/><use href="#tinyFlower" x="467" y="250"/>
          <path class="stem" d="M 445 340 L 452 330" stroke-width="0.7"/><use href="#smallFlower" x="452" y="330"/>
          <path class="stem" d="M 240 42 L 235 30" stroke-width="0.7"/><use href="#tinyFlower" x="235" y="30"/>
          <path class="stem" d="M 260 40 L 265 28" stroke-width="0.7"/><use href="#tinyFlower" x="265" y="28"/>
          <path class="stem" d="M 205 195 L 199 183" stroke-width="0.7"/><use href="#smallFlower" x="199" y="183"/>
          <path class="stem" d="M 295 195 L 301 183" stroke-width="0.7"/><use href="#smallFlower" x="301" y="183"/>
          <path class="stem" d="M 215 235 L 209 223" stroke-width="0.7"/><use href="#tinyFlower" x="209" y="223"/>
          <path class="stem" d="M 285 233 L 291 221" stroke-width="0.7"/><use href="#tinyFlower" x="291" y="221"/>
          <path class="stem" d="M 155 72 L 148 61" stroke-width="0.7"/><use href="#tinyFlower" x="148" y="61"/>
          <path class="stem" d="M 345 72 L 352 61" stroke-width="0.7"/><use href="#tinyFlower" x="352" y="61"/>
        </g>
        <g class="dense-center">
          <path class="stem" d="M 250 550 Q 248 480, 240 380" stroke-width="1.5"/><use href="#largeFlower" x="240" y="380"/>
          <path class="stem" d="M 240 380 L 228 368" stroke-width="1"/><use href="#mediumFlower" x="228" y="368"/>
          <path class="stem" d="M 240 380 L 252 365" stroke-width="1"/><use href="#mediumFlower" x="252" y="365"/>
          <path class="stem" d="M 228 368 L 218 356" stroke-width="0.7"/><use href="#smallFlower" x="218" y="356"/>
          <path class="stem" d="M 228 368 L 222 380" stroke-width="0.7"/><use href="#tinyFlower" x="222" y="380"/>
          <path class="stem" d="M 252 365 L 262 353" stroke-width="0.7"/><use href="#smallFlower" x="262" y="353"/>
          <path class="stem" d="M 252 365 L 258 377" stroke-width="0.7"/><use href="#tinyFlower" x="258" y="377"/>
          <path class="stem" d="M 218 356 L 208 344" stroke-width="0.7"/><use href="#tinyFlower" x="208" y="344"/>
          <path class="stem" d="M 262 353 L 272 341" stroke-width="0.7"/><use href="#tinyFlower" x="272" y="341"/>
          <path class="stem" d="M 250 550 Q 252 480, 260 380" stroke-width="1.5"/><use href="#largeFlower" x="260" y="380"/>
          <path class="stem" d="M 260 380 L 272 368" stroke-width="1"/><use href="#mediumFlower" x="272" y="368"/>
          <path class="stem" d="M 260 380 L 248 367" stroke-width="1"/><use href="#mediumFlower" x="248" y="367"/>
          <path class="stem" d="M 272 368 L 282 356" stroke-width="0.7"/><use href="#smallFlower" x="282" y="356"/>
          <path class="stem" d="M 272 368 L 278 380" stroke-width="0.7"/><use href="#tinyFlower" x="278" y="380"/>
          <path class="stem" d="M 248 367 L 238 355" stroke-width="0.7"/><use href="#smallFlower" x="238" y="355"/>
          <path class="stem" d="M 248 367 L 242 379" stroke-width="0.7"/><use href="#tinyFlower" x="242" y="379"/>
          <path class="stem" d="M 250 550 Q 238 490, 215 350" stroke-width="1.5"/><use href="#largeFlower" x="215" y="350"/>
          <path class="stem" d="M 215 350 L 202 337" stroke-width="1"/><use href="#mediumFlower" x="202" y="337"/>
          <path class="stem" d="M 215 350 L 227 335" stroke-width="1"/><use href="#mediumFlower" x="227" y="335"/>
          <path class="stem" d="M 215 350 L 210 365" stroke-width="1"/><use href="#smallFlower" x="210" y="365"/>
          <path class="stem" d="M 202 337 L 192 325" stroke-width="0.7"/><use href="#smallFlower" x="192" y="325"/>
          <path class="stem" d="M 202 337 L 196 349" stroke-width="0.7"/><use href="#tinyFlower" x="196" y="349"/>
          <path class="stem" d="M 227 335 L 237 323" stroke-width="0.7"/><use href="#smallFlower" x="237" y="323"/>
          <path class="stem" d="M 227 335 L 233 347" stroke-width="0.7"/><use href="#tinyFlower" x="233" y="347"/>
          <path class="stem" d="M 192 325 L 183 313" stroke-width="0.7"/><use href="#tinyFlower" x="183" y="313"/>
          <path class="stem" d="M 237 323 L 247 311" stroke-width="0.7"/><use href="#tinyFlower" x="247" y="311"/>
          <path class="stem" d="M 250 550 Q 262 490, 285 350" stroke-width="1.5"/><use href="#largeFlower" x="285" y="350"/>
          <path class="stem" d="M 285 350 L 298 337" stroke-width="1"/><use href="#mediumFlower" x="298" y="337"/>
          <path class="stem" d="M 285 350 L 273 335" stroke-width="1"/><use href="#mediumFlower" x="273" y="335"/>
          <path class="stem" d="M 285 350 L 290 365" stroke-width="1"/><use href="#smallFlower" x="290" y="365"/>
          <path class="stem" d="M 298 337 L 308 325" stroke-width="0.7"/><use href="#smallFlower" x="308" y="325"/>
          <path class="stem" d="M 298 337 L 304 349" stroke-width="0.7"/><use href="#tinyFlower" x="304" y="349"/>
          <path class="stem" d="M 273 335 L 263 323" stroke-width="0.7"/><use href="#smallFlower" x="263" y="323"/>
          <path class="stem" d="M 273 335 L 267 347" stroke-width="0.7"/><use href="#tinyFlower" x="267" y="347"/>
          <path class="stem" d="M 308 325 L 317 313" stroke-width="0.7"/><use href="#tinyFlower" x="317" y="313"/>
          <path class="stem" d="M 263 323 L 253 311" stroke-width="0.7"/><use href="#tinyFlower" x="253" y="311"/>
          <path class="stem" d="M 250 550 Q 244 510, 230 420" stroke-width="1.2"/><use href="#mediumFlower" x="230" y="420"/>
          <path class="stem" d="M 230 420 L 220 408" stroke-width="0.8"/><use href="#smallFlower" x="220" y="408"/>
          <path class="stem" d="M 230 420 L 240 407" stroke-width="0.8"/><use href="#smallFlower" x="240" y="407"/>
          <path class="stem" d="M 220 408 L 212 397" stroke-width="0.6"/><use href="#tinyFlower" x="212" y="397"/>
          <path class="stem" d="M 240 407 L 248 396" stroke-width="0.6"/><use href="#tinyFlower" x="248" y="396"/>
          <path class="stem" d="M 250 550 Q 250 510, 250 420" stroke-width="1.2"/><use href="#mediumFlower" x="250" y="420"/>
          <path class="stem" d="M 250 420 L 240 408" stroke-width="0.8"/><use href="#smallFlower" x="240" y="408"/>
          <path class="stem" d="M 250 420 L 260 406" stroke-width="0.8"/><use href="#smallFlower" x="260" y="406"/>
          <path class="stem" d="M 240 408 L 232 396" stroke-width="0.6"/><use href="#tinyFlower" x="232" y="396"/>
          <path class="stem" d="M 260 406 L 268 394" stroke-width="0.6"/><use href="#tinyFlower" x="268" y="394"/>
          <path class="stem" d="M 250 550 Q 256 510, 270 420" stroke-width="1.2"/><use href="#mediumFlower" x="270" y="420"/>
          <path class="stem" d="M 270 420 L 260 408" stroke-width="0.8"/><use href="#smallFlower" x="260" y="408"/>
          <path class="stem" d="M 270 420 L 280 407" stroke-width="0.8"/><use href="#smallFlower" x="280" y="407"/>
          <path class="stem" d="M 260 408 L 252 396" stroke-width="0.6"/><use href="#tinyFlower" x="252" y="396"/>
          <path class="stem" d="M 280 407 L 288 395" stroke-width="0.6"/><use href="#tinyFlower" x="288" y="395"/>
          <path class="stem" d="M 250 550 Q 242 520, 225 465" stroke-width="1"/><use href="#smallFlower" x="225" y="465"/>
          <path class="stem" d="M 225 465 L 215 453" stroke-width="0.7"/><use href="#tinyFlower" x="215" y="453"/>
          <path class="stem" d="M 225 465 L 235 452" stroke-width="0.7"/><use href="#tinyFlower" x="235" y="452"/>
          <path class="stem" d="M 250 550 Q 250 520, 250 468" stroke-width="1"/><use href="#smallFlower" x="250" y="468"/>
          <path class="stem" d="M 250 468 L 242 456" stroke-width="0.7"/><use href="#tinyFlower" x="242" y="456"/>
          <path class="stem" d="M 250 468 L 258 455" stroke-width="0.7"/><use href="#tinyFlower" x="258" y="455"/>
          <path class="stem" d="M 250 550 Q 258 520, 275 465" stroke-width="1"/><use href="#smallFlower" x="275" y="465"/>
          <path class="stem" d="M 275 465 L 265 453" stroke-width="0.7"/><use href="#tinyFlower" x="265" y="453"/>
          <path class="stem" d="M 275 465 L 285 452" stroke-width="0.7"/><use href="#tinyFlower" x="285" y="452"/>
          <path class="stem" d="M 250 550 Q 245 430, 232 310" stroke-width="1.3"/><use href="#largeFlower" x="232" y="310"/>
          <path class="stem" d="M 232 310 L 220 297" stroke-width="0.9"/><use href="#mediumFlower" x="220" y="297"/>
          <path class="stem" d="M 232 310 L 244 295" stroke-width="0.9"/><use href="#mediumFlower" x="244" y="295"/>
          <path class="stem" d="M 232 310 L 227 325" stroke-width="0.9"/><use href="#smallFlower" x="227" y="325"/>
          <path class="stem" d="M 220 297 L 210 285" stroke-width="0.7"/><use href="#smallFlower" x="210" y="285"/>
          <path class="stem" d="M 220 297 L 214 309" stroke-width="0.7"/><use href="#tinyFlower" x="214" y="309"/>
          <path class="stem" d="M 244 295 L 254 283" stroke-width="0.7"/><use href="#smallFlower" x="254" y="283"/>
          <path class="stem" d="M 244 295 L 250 307" stroke-width="0.7"/><use href="#tinyFlower" x="250" y="307"/>
          <path class="stem" d="M 250 550 Q 255 430, 268 310" stroke-width="1.3"/><use href="#largeFlower" x="268" y="310"/>
          <path class="stem" d="M 268 310 L 280 297" stroke-width="0.9"/><use href="#mediumFlower" x="280" y="297"/>
          <path class="stem" d="M 268 310 L 256 295" stroke-width="0.9"/><use href="#mediumFlower" x="256" y="295"/>
          <path class="stem" d="M 268 310 L 273 325" stroke-width="0.9"/><use href="#smallFlower" x="273" y="325"/>
          <path class="stem" d="M 280 297 L 290 285" stroke-width="0.7"/><use href="#smallFlower" x="290" y="285"/>
          <path class="stem" d="M 280 297 L 286 309" stroke-width="0.7"/><use href="#tinyFlower" x="286" y="309"/>
          <path class="stem" d="M 256 295 L 246 283" stroke-width="0.7"/><use href="#smallFlower" x="246" y="283"/>
          <path class="stem" d="M 256 295 L 250 307" stroke-width="0.7"/><use href="#tinyFlower" x="250" y="307"/>
          <path class="stem" d="M 250 550 Q 247 460, 243 400" stroke-width="0.8"/><use href="#smallFlower" x="243" y="400"/>
          <path class="stem" d="M 250 550 Q 253 460, 257 400" stroke-width="0.8"/><use href="#smallFlower" x="257" y="400"/>
          <path class="stem" d="M 250 550 Q 244 465, 235 430" stroke-width="0.8"/><use href="#tinyFlower" x="235" y="430"/>
          <path class="stem" d="M 250 550 Q 256 465, 265 430" stroke-width="0.8"/><use href="#tinyFlower" x="265" y="430"/>
          <path class="stem" d="M 250 550 Q 246 440, 238 390" stroke-width="0.8"/><use href="#tinyFlower" x="238" y="390"/>
          <path class="stem" d="M 250 550 Q 254 440, 262 390" stroke-width="0.8"/><use href="#tinyFlower" x="262" y="390"/>
          <path class="stem" d="M 250 550 Q 240 455, 218 400" stroke-width="0.8"/><use href="#tinyFlower" x="218" y="400"/>
          <path class="stem" d="M 250 550 Q 260 455, 282 400" stroke-width="0.8"/><use href="#tinyFlower" x="282" y="400"/>
          <path class="stem" d="M 250 550 Q 238 445, 205 360" stroke-width="0.8"/><use href="#smallFlower" x="205" y="360"/>
          <path class="stem" d="M 250 550 Q 262 445, 295 360" stroke-width="0.8"/><use href="#smallFlower" x="295" y="360"/>
          <path class="stem" d="M 250 550 Q 246 430, 240 340" stroke-width="0.8"/><use href="#tinyFlower" x="240" y="340"/>
          <path class="stem" d="M 250 550 Q 254 430, 260 340" stroke-width="0.8"/><use href="#tinyFlower" x="260" y="340"/>
        </g>
      </g>
    </svg>
  </div>
</div>
`;
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

  var isMobile = window.innerWidth < 1000; var N = isMobile ? 1200 : 4000;
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
// ── HTML del canvas de partículas ────────────────────────────────────
window.__PARTICULAS_HTML__ = '<canvas id="particulasCanvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;"></canvas>';

// ── Lógica de partículas estilo Three.js (cyan + blancas, rotación, parallax) ──
window.__PARTICULAS_INIT__ = function () {
  var canvas = document.getElementById('particulasCanvas');
  var ctx = canvas.getContext('2d');
  var W, H;

  function resize() {
    var isMob = window.innerWidth < window.innerHeight; // portrait = mobile rotated
    if (isMob) {
      // Canvas is inside a rotated container: swap dimensions so circles stay circular
      W = canvas.width = window.innerHeight;
      H = canvas.height = window.innerWidth;
    } else {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Parámetros principales (equivalente a particleCount = 8000) ──
  var isMobile = window.innerWidth < 1000; var PARTICLE_COUNT = isMobile ? 300 : 1000;
  var STAR_COUNT = 0;
  var SPREAD = 15;   // equivale al * 15 del posArray
  var STAR_SPREAD = 20;

  var mouseX = 0;
  var mouseY = 0;
  window.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // ── Rotación acumulada (igual que Three.js) ──
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
    // Rotar en Y
    var cosY = Math.cos(ry), sinY = Math.sin(ry);
    var x1 = x * cosY + z * sinY;
    var z1 = -x * sinY + z * cosY;
    // Rotar en X
    var cosX = Math.cos(rx), sinX = Math.sin(rx);
    var y2 = y * cosX - z1 * sinX;
    var z2 = y * sinX + z1 * cosX;
    return { x: x1, y: y2, z: z2 };
  }

  function draw() {
    requestAnimationFrame(draw);

    // Fondo negro sólido (sin estelas, como Three.js)
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#00010e';
    ctx.fillRect(0, 0, W, H);

    // Actualizar rotación acumulada
    rotX += 0.0003;
    rotY += 0.0005;
    starRotX += 0.0001;
    starRotY += 0.0002;

    // Parallax suavizado
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

    // ── Dibujar partículas cyan principales ──
    for (var j = 0; j < particles.length; j++) {
      var pt = particles[j];
      var rp = rotateXY(pt.x, pt.y, pt.z, rotX, rotY);
      var pp = project(rp.x, rp.y, rp.z, cx, cy);
      var depth = (rp.z + SPREAD / 2) / SPREAD; // 0..1
      var alpha = 1 + depth * 0.3;
      var radius = Math.max(0.3, pp.scale * 2.2);

      ctx.beginPath();
      ctx.arc(pp.sx, pp.sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(2) + ')';
      ctx.fill();

      // var s = radius * 1.2;
      // ctx.beginPath();
      // ctx.save();
      // ctx.translate(pp.sx, pp.sy);
      // ctx.scale(s, s);
      // ctx.moveTo(0, -0.5);
      // ctx.bezierCurveTo(0.5, -1, 1, -0.3, 0, 0.6);
      // ctx.bezierCurveTo(-1, -0.3, -0.5, -1, 0, -0.5);
      // ctx.restore();
      // ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(2) + ')';
      // ctx.fill();
    }
  }

  draw();
};

/* --- Orchestration from index.html --- */
(function () {
  var FILL_DURATION = 2000;
  var fillEl = document.getElementById('btnFill');
  var progressEl = document.getElementById('btnProgressBar');
  var loadingText = document.getElementById('btnLoadingText');
  var rafId = null;
  var startTime = null;
  var loadingPhrases = ["Abriendo...", "Preparando...", "Ya casi..."];
  var phraseIndex = 0;
  var phraseInterval = null;

  function animateFill(timestamp) {
    if (!startTime) startTime = timestamp;
    var elapsed = timestamp - startTime;
    var progress = Math.min(elapsed / FILL_DURATION, 1);
    var eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    var pct = (eased * 100).toFixed(2) + '%';
    if (fillEl) fillEl.style.width = pct;
    if (progressEl) progressEl.style.width = pct;
    if (progress < 1) {
      rafId = requestAnimationFrame(animateFill);
    } else {
      if (fillEl) fillEl.style.width = '100%';
      if (progressEl) progressEl.style.width = '100%';
      clearInterval(phraseInterval);
      if (loadingText) loadingText.textContent = '✓';
      setTimeout(function () {
        if (window.__startPalabraAnimation__) window.__startPalabraAnimation__();
      }, 180);
    }
  }

  function startFillEffect() {
    phraseInterval = setInterval(function () {
      phraseIndex = (phraseIndex + 1) % loadingPhrases.length;
      if (loadingText) loadingText.textContent = loadingPhrases[phraseIndex];
    }, 480);
    startTime = null;
    rafId = requestAnimationFrame(animateFill);
  }

  var _originalInit = window.__PALABRAS_INIT__;
  window.__PALABRAS_INIT__ = function () {
    if (typeof _originalInit === 'function') _originalInit();
    window.handleBtnClick = function (e) {
      var btn = document.getElementById('startBtn');
      if (!btn || btn.classList.contains('filling')) return;
      btn.classList.add('filling');
      var bgMusic = document.getElementById('bgMusic');
      if (bgMusic) {
        bgMusic.volume = 0.7;
        bgMusic.play().catch(function () { });
      }
      startFillEffect();
    };
  };
})();

if (typeof window.__PALABRAS_INIT__ === 'function') window.__PALABRAS_INIT__();

window.addEventListener("palabrasTerminadas", function () {
  requestAnimationFrame(function () {
    requestAnimationFrame(window.initPaniculata);
  });
});

window.initPaniculata = function () {
  var svg = document.querySelector('.bouquet-container svg');
  if (!svg) return;
  var stems = Array.from(svg.querySelectorAll('path.stem'));
  var flowers = Array.from(svg.querySelectorAll('use'));

  function getPathEndY(path) {
    var d = path.getAttribute('d');
    if (!d) return 0;
    var nums = d.match(/-?[\d.]+/g).map(Number);
    return nums[nums.length - 1];
  }
  function getFlowerY(use) { return parseFloat(use.getAttribute('y') || 0); }

  // Pre-calculate and setup initial state in a single pass
  stems.forEach(function (stem) {
    try {
      var len = stem.getTotalLength();
      stem.style.strokeDasharray = len;
      stem.style.strokeDashoffset = len;
      stem.style.transition = 'none';
      stem._len = len; // Store length to avoid re-reading
    } catch (e) { }
  });
  flowers.forEach(function (f) { 
    f.style.opacity = '0'; 
    f.style.transition = 'none'; 
  });

  var stemsWithY = stems.map(function (s) { return { el: s, y: getPathEndY(s) }; }).sort(function (a, b) { return b.y - a.y; });
  var flowersWithY = flowers.map(function (f) { return { el: f, y: getFlowerY(f) }; }).sort(function (a, b) { return b.y - a.y; });

  var extraDelay = 2500;
  var totalStemDuration = 4200;
  var totalFlowerDur = 1200;
  var flowerStart = extraDelay + totalStemDuration * 0.2;

  // Batching updates: Group elements by timing buckets to reduce number of timers
  function batchAnimate(items, startTime, totalDuration, styleCallback) {
    var batchSize = Math.max(4, Math.ceil(items.length / 40)); // Group every ~40ms approximately
    for (var i = 0; i < items.length; i += batchSize) {
      (function(index) {
        var delay = startTime + (index * (totalDuration / items.length));
        setTimeout(function() {
          requestAnimationFrame(function() {
            for (var j = index; j < Math.min(index + batchSize, items.length); j++) {
              styleCallback(items[j].el, j);
            }
          });
        }, delay);
      })(i);
    }
  }

  // Animate stems in batches
  batchAnimate(stemsWithY, extraDelay, totalStemDuration, function(el) {
    el.style.transition = 'stroke-dashoffset 0.15s ease-out';
    el.style.strokeDashoffset = '0';
  });

  // Animate flowers in batches
  batchAnimate(flowersWithY, flowerStart, totalFlowerDur, function(el, i) {
    el.style.setProperty('--i', (i % 20).toString());
    el.style.transition = 'opacity 0.3s ease-in';
    el.style.opacity = '1';
  });
};
