(() => {
  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Header scroll
  const header = document.getElementById("header");
  const onScroll = () => {
    if (!header) return;
    if (window.scrollY > 10) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  };
  window.addEventListener("scroll", onScroll);
  onScroll();

  // Burger menu
  const nav = document.getElementById("nav");
  const navToggle = document.getElementById("navToggle");
  if (nav && navToggle) {
    navToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      nav.classList.toggle("nav-mobile-open");
    });
    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target)) nav.classList.remove("nav-mobile-open");
    });
  }

  // Splash
  const splash = document.getElementById("splash");
  const splashUI = document.getElementById("splashUI");
  const btn = document.getElementById("splashContinue");
  const skip = document.getElementById("splashSkip");
  const flashEl = document.getElementById("flash");
  const soundHint = document.getElementById("soundHint");

  if (!splash) return;

  function closeSplash() {
    splash.classList.add("splash-hide");
    document.body.style.overflow = "";
    setTimeout(() => splash.classList.add("hidden"), 650);
  }

  if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); closeSplash(); });
  if (skip) skip.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); closeSplash(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSplash();
  });

  // Lock scroll while intro is visible
  document.body.style.overflow = "hidden";

  // Audio FX (optional)
  const sfxBounce = document.getElementById("sfxBounce");
  const sfxBoom = document.getElementById("sfxBoom");
  let audioEnabled = false;

  function enableAudioOnce() {
    if (audioEnabled) return;
    audioEnabled = true;
    if (soundHint) soundHint.style.display = "none";

    [sfxBounce, sfxBoom].forEach(a => {
      if (!a) return;
      try {
        a.volume = 0.7;
        const p = a.play();
        if (p && p.then) {
          p.then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
        } else {
          a.pause(); a.currentTime = 0;
        }
      } catch (_) {}
    });
  }

  function playSfx(a, volume = 0.9) {
    if (!audioEnabled || !a) return;
    try {
      a.pause();
      a.currentTime = 0;
      a.volume = Math.max(0, Math.min(1, volume));
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (_) {}
  }

  splash.addEventListener("pointerdown", enableAudioOnce);

  // Canvas intro
  const canvas = document.getElementById("introCanvas");
  const ctx = canvas?.getContext("2d", { alpha: true });
  if (!canvas || !ctx) return;

  let w = 1, h = 1;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let raf = null;

  function resizeCanvas() {
    w = window.innerWidth || 1;
    h = window.innerHeight || 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Ball image
  const ballImg = new Image();
  ballImg.src = "images/ballon.png";

  const groundY = () => h * 0.74;

  // Projectors
  const spots = [
    { a: 0.4, sp: 0.55, x: 0.22, y: 0.18, intensity: 1.00 },
    { a: 1.8, sp: 0.42, x: 0.52, y: 0.14, intensity: 1.15 },
    { a: 2.9, sp: 0.60, x: 0.80, y: 0.19, intensity: 0.95 },
  ];

  // Camera shake
  let shake = 0;
  function triggerShake(power = 14) { shake = Math.max(shake, power); }
  function beginCamera() {
    ctx.save();
    if (shake > 0.01) {
      const sx = (Math.random() * 2 - 1) * shake;
      const sy = (Math.random() * 2 - 1) * shake * 0.7;
      ctx.translate(sx, sy);
      shake *= 0.88;
    }
  }
  function endCamera() { ctx.restore(); }

  // Ball physics
  const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 26, scale: 1, bounces: 0, active: true };
  let spin = 0;
  let particles = [];

  let phase = "intro";
  let last = performance.now();
  let startAt = last;
  let revealAt = 0;

  function resetBall() {
    ball.x = w * 0.16;
    ball.y = h * 0.22;
    ball.vx = w * 0.0022;
    ball.vy = 0;
    ball.r = Math.max(22, Math.min(34, w * 0.02));
    ball.scale = 1;
    ball.bounces = 0;
    ball.active = true;
    spin = 0;
    particles = [];
  }

  function spawnExplosion(px, py, count = 340) {
    particles = [];
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 9.0;
      particles.push({
        x: px, y: py,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 95 + Math.random() * 60,
        max: 175,
        size: 2 + Math.random() * 4.6,
      });
    }
  }

  function drawProjectors(now) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (const S of spots) {
      const t = (now * 0.001) * S.sp + S.a;

      const headX = w * (S.x + Math.sin(t) * 0.05);
      const headY = h * (S.y + Math.cos(t * 1.25) * 0.03);

      const targetX = w * (S.x + Math.sin(t * 0.9) * 0.14);
      const targetY = groundY() - h * 0.06;

      const coneW = w * (0.26 + 0.05 * Math.sin(t * 1.1));
      const coneAlpha = 0.14 * S.intensity;

      const lg = ctx.createLinearGradient(headX, headY, targetX, targetY);
      lg.addColorStop(0, "rgba(255,215,130,0)");
      lg.addColorStop(0.45, `rgba(255,215,130,${coneAlpha})`);
      lg.addColorStop(1, "rgba(213,165,82,0)");

      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(headX, headY);
      ctx.lineTo(targetX - coneW / 2, targetY);
      ctx.lineTo(targetX + coneW / 2, targetY);
      ctx.closePath();
      ctx.fill();

      const r = Math.min(w, h) * 0.95;
      const g = ctx.createRadialGradient(headX, headY, 20, headX, headY, r);
      g.addColorStop(0, "rgba(255,215,130,0.16)");
      g.addColorStop(0.45, "rgba(213,165,82,0.06)");
      g.addColorStop(1, "rgba(213,165,82,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(headX, headY, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // haze band
    ctx.globalAlpha = 0.18 + 0.06 * Math.sin(now * 0.0012);
    const haze = ctx.createLinearGradient(0, groundY() - 180, 0, h);
    haze.addColorStop(0, "rgba(255,255,255,0)");
    haze.addColorStop(0.45, "rgba(255,255,255,0.08)");
    haze.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  function drawGround(now) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.10 + 0.06 * Math.sin(now * 0.0014);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.10, groundY());
    ctx.lineTo(w * 0.90, groundY());
    ctx.stroke();
    ctx.restore();
  }

  function drawBall() {
    if (!ball.active) return;

    const x = ball.x, y = ball.y;
    const r = ball.r * ball.scale;

    // shadow
    ctx.save();
    const sy = groundY() + 14;
    const sw = Math.max(18, r * 1.85);
    const sh = Math.max(6, r * 0.42);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.beginPath();
    ctx.ellipse(x, sy, sw, sh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // spin with speed
    const speed = Math.max(0.001, Math.abs(ball.vx) / (w || 1));
    spin += speed * 10.0;

    if (ballImg.complete && ballImg.naturalWidth > 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.drawImage(ballImg, -r, -r, r * 2, r * 2);

      // sheen
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.14;
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.15, 0, 0, r);
      g.addColorStop(0, "rgba(255,255,255,0.90)");
      g.addColorStop(0.35, "rgba(255,255,255,0.20)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    // fallback
    ctx.save();
    ctx.fillStyle = "rgba(201,107,34,1)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    if (!particles.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const p of particles) {
      const lifeRatio = Math.max(0, p.life / p.max);
      ctx.globalAlpha = 0.95 * lifeRatio;
      ctx.fillStyle = "rgba(213,165,82,0.95)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.7 + (1 - lifeRatio)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function safeFlash() {
    if (!flashEl) return;
    flashEl.classList.remove("on");
    void flashEl.offsetWidth;
    flashEl.classList.add("on");
  }

  function startIntro() {
    cancelAnimationFrame(raf);
    resizeCanvas();
    resetBall();

    if (flashEl) flashEl.classList.remove("on");
    if (splashUI) splashUI.classList.remove("is-visible");

    phase = "intro";
    last = performance.now();
    startAt = last;
    revealAt = 0;
    shake = 0;

    raf = requestAnimationFrame(loop);
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    if (splash.classList.contains("hidden")) return;

    // trail
    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    beginCamera();

    drawProjectors(now);
    drawGround(now);

    if (phase === "intro") {
      if (now - startAt > 450) phase = "bounce";
    }

    if (phase === "bounce") {
      const floorY = groundY() - 40;

      ball.vy += 1450 * dt;
      ball.x += ball.vx * (dt * 60);
      ball.y += ball.vy * dt;

      if (ball.y + ball.r * ball.scale >= floorY) {
        ball.y = floorY - ball.r * ball.scale;
        ball.vy *= -0.62;
        ball.vx *= 0.986;

        ball.bounces += 1;
        ball.scale *= 1.14;
        ball.vx += w * 0.00020;

        playSfx(sfxBounce, 0.85);
        triggerShake(4);

        if (ball.bounces >= 4 || ball.scale > 2.35) {
          phase = "explode";
          ball.active = false;

          safeFlash();
          playSfx(sfxBoom, 0.95);
          triggerShake(16);

          spawnExplosion(ball.x, ball.y, 340);
          revealAt = now + 420;
        }
      }

      ball.x = Math.min(w * 0.86, Math.max(w * 0.10, ball.x));
      drawBall();
    }

    if (phase === "explode") {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.12;
        p.life -= 1;
      }
      particles = particles.filter(p => p.life > 0);
      drawParticles();

      if (now >= revealAt) {
        if (splashUI) splashUI.classList.add("is-visible");
        phase = "reveal";
      }
    }

    if (phase === "reveal") {
      for (const p of particles) p.life -= 1;
      particles = particles.filter(p => p.life > 0);
      drawParticles();
    }

    endCamera();
    raf = requestAnimationFrame(loop);
  }

  startIntro();
})();
(async function initMatchTicker(){
  const el = document.getElementById("matchTicker");
  if (!el) return;

  const TEAM_ID = "200000005158393";
  const WORKER_URL = "https://bclc-ffbb.anthonyfatre.workers.dev";

  try{
    const res = await fetch(`${WORKER_URL}?team=${encodeURIComponent(TEAM_ID)}`, { cache: "no-store" });
    const data = await res.json();
    if (!data || data.ok !== true || !data.nextMatch) throw new Error("Pas de prochain match");

    const m = data.nextMatch;
    const shortDE = String(m.lieu || "").toLowerCase().startsWith("dom") ? "D" :
                    String(m.lieu || "").toLowerCase().startsWith("ext") ? "E" : "";

    const text = `Prochain match • J${m.journee} • ${m.dateTime} • ${shortDE} ${m.lieu} • vs ${m.adversaire} • Allez les Téméraires 🦁`;

    // Duplique pour un scroll fluide
    el.innerHTML = `
      <div class="ticker-track">
        <span class="ticker-item">${escapeHtml(text)}</span>
        <span class="ticker-item">${escapeHtml(text)}</span>
        <span class="ticker-item">${escapeHtml(text)}</span>
        <span class="ticker-item">${escapeHtml(text)}</span>
      </div>
    `;
  } catch(e){
    el.innerHTML = `
      <div class="ticker-track">
        <span class="ticker-item">Suivez le club • Infos matchs FFBB • Basket Club Lay-St-Christophe 🦁</span>
        <span class="ticker-item">Suivez le club • Infos matchs FFBB • Basket Club Lay-St-Christophe 🦁</span>
      </div>
    `;
  }

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }
})();
// ===== Reels modal (Instagram) =====
const reelModal = document.getElementById("reelModal");
const reelEmbedWrap = document.getElementById("reelEmbedWrap");
const reelCloseBtn = document.getElementById("reelCloseBtn");
const reelOpenInsta = document.getElementById("reelOpenInsta");
const reelModalText = document.getElementById("reelModalText");
const reelModalPill = document.getElementById("reelModalPill");

function openReel({ permalink, title, tag }) {
  if (!reelModal) return;

  reelModalText.textContent = title || "Vidéo Instagram";
  reelModalPill.textContent = tag ? tag.charAt(0).toUpperCase() + tag.slice(1) : "Instagram";
  reelOpenInsta.href = permalink || "#";

  // inject embed
  reelEmbedWrap.innerHTML = `
    <blockquote class="instagram-media"
      data-instgrm-permalink="${permalink}"
      data-instgrm-version="14"
      style="background:#fff; border:0; margin:0; padding:0;">
    </blockquote>
  `;

  reelModal.classList.add("is-open");
  reelModal.setAttribute("aria-hidden", "false");

  // Force Instagram to process embeds (important)
  setTimeout(() => {
    if (window.instgrm && window.instgrm.Embeds && window.instgrm.Embeds.process) {
      window.instgrm.Embeds.process();
    }
  }, 150);
}

function closeReel(){
  if (!reelModal) return;
  reelModal.classList.remove("is-open");
  reelModal.setAttribute("aria-hidden","true");
  reelEmbedWrap.innerHTML = "";
}

document.querySelectorAll(".reel-card").forEach(btn => {
  btn.addEventListener("click", () => {
    openReel({
      permalink: btn.dataset.permalink,
      title: btn.dataset.title,
      tag: btn.dataset.tag
    });
  });
});

reelCloseBtn?.addEventListener("click", closeReel);
reelModal?.addEventListener("click", (e) => {
  if (e.target && e.target.dataset && e.target.dataset.close) closeReel();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeReel();
});
