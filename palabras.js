/* palabras.js — modificado: expone startAnimation para que el HTML pueda llamarla */

window.__PALABRAS_INIT__ = function () {

  var canvas = document.getElementById("palabras-canvas");
  var ctx = canvas.getContext("2d");
  var bgMusic = document.getElementById("bgMusic");

  function getCanvasDims() {
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
  Particle.prototype.draw = function () {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
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

    var allPoints = [];

    /* — Corazón exterior: blanco, glow rosa suave, partículas 2.3px — */
    for (var t = 0; t < Math.PI * 2; t += 0.018) {
      var p = heartXY(t, cx, cy, 13);
      allPoints.push({ x: p.x, y: p.y, color: "rgba(255,255,255,1)", glow: "rgba(255,150,190,0.95)", size: 2.3 });
    }

    /* — Corazón interior: azul-cyan, glow cyan, partículas 1.7px — */
    for (var t2 = 0; t2 < Math.PI * 2; t2 += 0.025) {
      var p2 = heartXY(t2, cx, cy, 7);
      allPoints.push({ x: p2.x, y: p2.y, color: "rgba(140,220,255,0.95)", glow: "rgba(60,190,255,1)", size: 1.7 });
    }

    /* — Relleno interior: puntos dispersos rosados tenues — */
    for (var ft = 0; ft < Math.PI * 2; ft += 0.055) {
      for (var fr = 0.2; fr < 0.92; fr += 0.28) {
        var px = 16 * Math.pow(Math.sin(ft), 3);
        var py = 13 * Math.cos(ft) - 5 * Math.cos(2 * ft) - 2 * Math.cos(3 * ft) - Math.cos(4 * ft);
        allPoints.push({
          x: cx + px * 6 * fr,
          y: cy - py * 6 * fr,
          color: "rgba(255,190,215,0.45)",
          glow: "rgba(255,80,150,0.4)",
          size: 1.1
        });
      }
    }

    /* — Puntos extras entre corazón exterior e interior (anillo medio) — */
    for (var t3 = 0; t3 < Math.PI * 2; t3 += 0.035) {
      var p3 = heartXY(t3, cx, cy, 10);
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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (animationStarted)
      createWord(words[Math.min(currentWordIndex, words.length - 1)], true);
  });

}; 