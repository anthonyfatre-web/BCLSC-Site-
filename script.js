(() => {
  "use strict";

  // =========================
  // Helpers
  // =========================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escapeHtml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  // Global config (override possible in pages via window.BCLSC_CONFIG)
  const CONFIG = Object.assign(
    {
      TEAM_ID: "200000005158393",
      WORKER_URL: "https://bclc-ffbb.anthonyfatre.workers.dev",
      SPLASH_FAILSAFE_MS: 5000,
      NAV_BREAKPOINT: 960,
    },
    window.BCLSC_CONFIG || {}
  );

  // =========================
  // Footer year
  // =========================
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // =========================
  // Header scroll effect
  // =========================
  const header = $("#header");
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 10) header.classList.add("is-scrolled");
      else header.classList.remove("is-scrolled");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // =========================
  // Mobile nav (burger + overlay + ESC + close on link + resize)
  // =========================
  const nav = $("#nav");
  const navToggle = $("#navToggle");

  let backdrop = $("#navBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "navBackdrop";
    document.body.appendChild(backdrop);
  }

  const closeNav = () => {
    if (!nav) return;
    nav.classList.remove("nav-mobile-open");
    document.body.classList.remove("nav-open");
    backdrop.classList.remove("is-active");
    navToggle?.setAttribute("aria-expanded", "false");
  };

  const openNav = () => {
    if (!nav) return;
    nav.classList.add("nav-mobile-open");
    document.body.classList.add("nav-open");
    backdrop.classList.add("is-active");
    navToggle?.setAttribute("aria-expanded", "true");

    // Focus first link for accessibility
    nav.querySelector(".nav-links a")?.focus?.();
  };

  if (nav && navToggle) {
    navToggle.setAttribute("aria-expanded", "false");

    navToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      nav.classList.contains("nav-mobile-open") ? closeNav() : openNav();
    });

    backdrop.addEventListener("click", closeNav);

    $$(".nav-links a", nav).forEach((a) => {
      a.addEventListener("click", () => closeNav());
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > CONFIG.NAV_BREAKPOINT) closeNav();
    });
  }

  // =========================
  // Splash / Intro (mobile-safe)
  // =========================
  const splash = $("#splash");
  if (splash) {
    const splashUI = $("#splashUI");
    const btn = $("#splashContinue");
    const skip = $("#splashSkip");
    const flashEl = $("#flash");
    const soundHint = $("#soundHint");
    const canvas = $("#introCanvas");

    // Always show UI even if canvas fails
    requestAnimationFrame(() => splashUI?.classList.add("is-visible"));

    let closed = false;
    let raf = 0;
    let audioEnabled = false;

    // Lock scroll while splash visible
    document.body.style.overflow = "hidden";

    const closeSplash = () => {
      if (closed) return;
      closed = true;

      try {
        cancelAnimationFrame(raf);
      } catch (_) {}

      splash.classList.add("splash-hide");
      document.body.style.overflow = "";
      setTimeout(() => splash.classList.add("hidden"), 650);
    };

    // Failsafe auto-close (if something blocks)
    const failsafe = window.setTimeout(() => {
      closeSplash();
    }, CONFIG.SPLASH_FAILSAFE_MS);

    // Allow close by buttons
    btn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSplash();
    });
    skip?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSplash();
    });

    // Allow close with ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeSplash();
    });

    // Audio FX (optional)
    const sfxBounce = $("#sfxBounce");
    const sfxBoom = $("#sfxBoom");

    const enableAudioOnce = () => {
      if (audioEnabled) return;
      audioEnabled = true;
      if (soundHint) soundHint.style.display = "none";

      [sfxBounce, sfxBoom].forEach((a) => {
        if (!a) return;
        try {
          a.volume = 0.7;
          const p = a.play();
          if (p && p.then) {
            p.then(() => {
              a.pause();
              a.currentTime = 0;
            }).catch(() => {});
          } else {
            a.pause();
            a.currentTime = 0;
          }
        } catch (_) {}
      });
    };

    const playSfx = (a, volume = 0.9) => {
      if (!audioEnabled || !a) return;
      try {
        a.pause();
        a.currentTime = 0;
        a.volume = Math.max(0, Math.min(1, volume));
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
      } catch (_) {}
    };

    // Tap anywhere on mobile to close (and enable audio on first interaction)
    splash.addEventListener("pointerdown", (e) => {
      enableAudioOnce();

      // If user taps outside the central UI / buttons, close
      const clickedInsideUI = splashUI && splashUI.contains(e.target);
      const clickedSkip = skip && skip.contains(e.target);
      const clickedBtn = btn && btn.contains(e.target);

      if (!clickedInsideUI && !clickedSkip && !clickedBtn) {
        closeSplash();
      }
    });

    // Clear failsafe once closed
    const closeAndClear = () => {
      window.clearTimeout(failsafe);
      closeSplash();
    };

    // Also close when user clicks Continue/Skip (ensures failsafe cleared)
    btn?.addEventListener("click", closeAndClear);
    skip?.addEventListener("click", closeAndClear);

    // Light “flash” helper
    const flash = () => {
      if (!flashEl) return;
      flashEl.classList.remove("on");
      // reflow
      void flashEl.offsetWidth;
      flashEl.classList.add("on");
    };

    // Canvas animation (safe)
    try {
      if (canvas) {
        const ctx = canvas.getContext("2d", { alpha: true });
        if (ctx) {
          let w = 1,
            h = 1;
          const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

          const resize = () => {
            w = window.innerWidth || 1;
            h = window.innerHeight || 1;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = w + "px";
            canvas.style.height = h + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          };
          resize();
          window.addEventListener("resize", resize);

          // Simple ball bounce (lighter, more stable than huge physics)
          const ballImg = new Image();
          ballImg.src = "images/ballon.png";

          const ball = {
            x: w * 0.2,
            y: h * 0.25,
            vx: w * 0.004,
            vy: 0,
            r: Math.max(22, Math.min(34, w * 0.02)),
          };

          const ground = () => h * 0.74;
          const gravity = () => Math.max(0.55, h * 0.0009);
          const bounce = 0.78;

          let lastT = performance.now();
          const loop = (t) => {
            if (closed) return;
            const dt = Math.min(32, t - lastT);
            lastT = t;

            ctx.clearRect(0, 0, w, h);

            // subtle lights
            const g = ctx.createRadialGradient(w * 0.5, h * 0.15, 10, w * 0.5, h * 0.15, Math.max(w, h));
            g.addColorStop(0, "rgba(213,165,82,0.18)");
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);

            // ground line
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = "rgba(255,255,255,0.55)";
            ctx.beginPath();
            ctx.moveTo(w * 0.12, ground());
            ctx.lineTo(w * 0.88, ground());
            ctx.stroke();
            ctx.globalAlpha = 1;

            // physics
            ball.vy += gravity() * (dt / 16);
            ball.x += ball.vx * (dt / 16);
            ball.y += ball.vy * (dt / 16);

            if (ball.y + ball.r >= ground()) {
              ball.y = ground() - ball.r;
              ball.vy = -ball.vy * bounce;
              playSfx(sfxBounce, 0.75);
              flash();
            }

            // keep within bounds
            if (ball.x < ball.r || ball.x > w - ball.r) {
              ball.vx *= -1;
            }

            // draw ball
            const size = ball.r * 2;
            if (ballImg.complete && ballImg.naturalWidth) {
              ctx.drawImage(ballImg, ball.x - ball.r, ball.y - ball.r, size, size);
            } else {
              ctx.fillStyle = "rgba(213,165,82,0.9)";
              ctx.beginPath();
              ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
              ctx.fill();
            }

            raf = requestAnimationFrame(loop);
          };

          raf = requestAnimationFrame(loop);
        }
      }
    } catch (_) {
      // Canvas failures must never block UI
    }
  }

  // =========================
  // Match ticker (optional global)
  // =========================
  (async () => {
    const el = $("#matchTicker");
    if (!el) return;

    // allow per-page override via data- attributes
    const team = el.getAttribute("data-team") || CONFIG.TEAM_ID;
    const worker = el.getAttribute("data-worker") || CONFIG.WORKER_URL;

    try {
      const res = await fetch(`${worker}?team=${encodeURIComponent(team)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("ticker fetch failed");
      const data = await res.json();
      if (!data || data.ok !== true || !data.nextMatch) throw new Error("ticker data invalid");

      const m = data.nextMatch;
      const text = `Prochain match • J${m.journee} • ${m.dateTime} • ${m.lieu} • vs ${m.adversaire} • Allez les Téméraires 🦁`;

      el.innerHTML = `
        <div class="ticker-track">
          <span class="ticker-item">${escapeHtml(text)}</span>
          <span class="ticker-item">${escapeHtml(text)}</span>
          <span class="ticker-item">${escapeHtml(text)}</span>
          <span class="ticker-item">${escapeHtml(text)}</span>
        </div>
      `;
    } catch (e) {
      // fallback (never break the page)
      el.innerHTML = `
        <div class="ticker-track">
          <span class="ticker-item">Suivez le club • Infos matchs FFBB • Basket Club Lay-St-Christophe 🦁</span>
          <span class="ticker-item">Suivez le club • Infos matchs FFBB • Basket Club Lay-St-Christophe 🦁</span>
        </div>
      `;
    }
  })();
})();
