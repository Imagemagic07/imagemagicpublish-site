/* =========================================================================
   ImageMagicPublish, App logic
   Router · i18n binding · gold particle system · 3D tilt · scroll reveals
   ========================================================================= */
(function () {
  "use strict";

  /* =========================================================================
     CONFIG, paste your links/keys here (the only place you need to edit).
     Leave a value as "" and the site degrades gracefully until you fill it.
     Secret keys (Resend, MailerLite, Turnstile SECRET) are NOT here, those
     live as environment variables in the Cloudflare Pages dashboard.
     ========================================================================= */
  const CONFIG = {
    // Amazon product links (language-aware). Buy the Book opens the reader's language.
    amazonBookUrl:    { en: "https://www.amazon.com/dp/B0FSGFVDD8", fr: "https://www.amazon.com/dp/B0FSZWJSS9" },
    calendlyUrl:      "https://calendly.com/imagemagicpublish/30min", // Calendly booking link (Book a Call button)
    turnstileSiteKey: "",             // Cloudflare Turnstile SITE key (public) for the contact form
    contactEndpoint:  "/api/contact", // fallback if Web3Forms not set
    web3formsKey:     "3db72f96-5be3-4d30-83d2-d599841e0f0e", // Web3Forms → contact/booking emails you
    subscribeEndpoint:"/api/subscribe", // MailerLite subscribe Function (leave as-is)
    // MailerLite group IDs (public, find them in MailerLite → Subscribers → Groups):
    newsletterGroup:  "192834696228373545", // "Awakened Message" (Join the Awakening newsletter)
    lostChapterGroup: "192834650597492326", // "Lost Chapter" (free chapter lead magnet)
    // Free chapter PDFs, delivered instantly on signup (hosted on the site):
    lostChapterPdf:   { en: "assets/lost-chapter-en.pdf", fr: "assets/lost-chapter-fr.pdf" }
  };

  const body = document.body;
  const COVERS = { en: "assets/cover-en.png", fr: "assets/cover-fr.png" };
  const ONESHEET = { en: "assets/speaker-onesheet.pdf?v=3", fr: "assets/speaker-onesheet-fr.pdf?v=3" };
  let lang = "en";

  /* ----------------------------------------------------------------- i18n */
  function t(key) {
    const dict = window.I18N[lang] || {};
    return dict[key] !== undefined ? dict[key] : (window.I18N.en[key] || "");
  }

  function applyLang() {
    document.documentElement.lang = lang;
    body.dataset.lang = lang;

    // text / html bindings
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-i18n"));
    });

    // placeholders
    document.querySelectorAll("[data-ph]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-ph")));
    });

    // dynamic lists (ul / grids)
    document.querySelectorAll("[data-list]").forEach((el) => {
      renderList(el, t(el.getAttribute("data-list")));
    });

    // select options
    document.querySelectorAll("[data-list-options]").forEach((sel) => {
      const opts = t(sel.getAttribute("data-list-options")) || [];
      sel.innerHTML = "";
      opts.forEach((o) => {
        const opt = document.createElement("option");
        opt.textContent = o;
        sel.appendChild(opt);
      });
    });

    // swap every book cover (hero, featured, book page) to the active language
    document.querySelectorAll(".js-cover").forEach((img) => { img.src = COVERS[lang]; });

    // swap the speaker one-sheet download to the active language
    document.querySelectorAll(".js-onesheet").forEach((a) => { a.href = ONESHEET[lang]; });

    // lang button state
    document.querySelectorAll("[data-lang-btn]").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.langBtn === lang)
    );

    if (typeof updateHead === "function") updateHead(currentRoute());
    refreshReveals();
  }

  function renderList(el, items) {
    if (!Array.isArray(items)) return;
    el.innerHTML = "";
    const kind = el.dataset.kind || el.className;

    items.forEach((item, i) => {
      if (el.classList.contains("theme-grid")) {
        const card = document.createElement("article");
        card.className = "theme-card reveal";
        card.setAttribute("data-tilt", "");
        card.innerHTML = `<span class="theme-card__no">${String(i + 1).padStart(2, "0")}</span><h3>${item}</h3>`;
        el.appendChild(card);
      } else if (el.classList.contains("role-grid")) {
        const card = document.createElement("article");
        card.className = "role-card reveal";
        card.setAttribute("data-tilt", "");
        card.innerHTML = `<h3>${item[0]}</h3><p>${item[1]}</p>`;
        el.appendChild(card);
      } else if (el.classList.contains("explore-grid")) {
        const card = document.createElement("article");
        card.className = "explore-card reveal";
        card.setAttribute("data-tilt", "");
        card.innerHTML = `<span class="explore-card__mark" aria-hidden="true">✦</span><p>${item}</p>`;
        el.appendChild(card);
      } else if (el.classList.contains("praise-grid")) {
        const card = document.createElement("figure");
        card.className = "praise-card reveal";
        card.innerHTML = `<div class="praise-card__stars" aria-hidden="true">★★★★★</div>` +
          `<blockquote>${item[0]}</blockquote><figcaption>${item[1]}</figcaption>`;
        el.appendChild(card);
      } else if (el.classList.contains("faq-list")) {
        const d = document.createElement("details");
        d.className = "faq reveal";
        d.innerHTML = `<summary>${item[0]}<span class="faq__icon" aria-hidden="true"></span></summary><div class="faq__a">${item[1]}</div>`;
        el.appendChild(d);
      } else {
        const li = document.createElement("li");
        li.innerHTML = `<span>${item}</span>`;
        el.appendChild(li);
      }
    });
    bindTilt(el);
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    try { localStorage.setItem("imp_lang", lang); } catch (e) {}
    applyLang();
  }

  /* --------------------------------------------------------------- router */
  const pages = document.querySelectorAll(".page");
  const SITE = "ImageMagicPublish";
  const TITLES = {
    home:     { en: "The Sacred Taboo & Guard Your Temple, Dentz-Roll Bonheur", fr: "Le Tabou Sacré & Garde Ton Temple, Dentz-Roll Bonheur" },
    book:     { en: "The Sacred Taboo: Secrets of Sex That Awaken, Book", fr: "Le Tabou Sacré : Les Secrets du Sexe qui Éveille, Livre" },
    temple:   { en: "Guard Your Temple, Conference Project", fr: "Garde Ton Temple, Projet de Conférence" },
    about:    { en: "About Dentz-Roll Bonheur, MBA", fr: "À Propos de Dentz-Roll Bonheur, MBA" },
    speaking: { en: "Speaking & Keynotes, Book Dentz-Roll Bonheur", fr: "Conférences & Keynotes, Réservez Dentz-Roll Bonheur" },
    contact:  { en: "Contact & Booking", fr: "Contact et Réservation" },
    privacy:  { en: "Privacy Policy", fr: "Politique de Confidentialité" },
    terms:    { en: "Terms & Disclaimer", fr: "Conditions & Avertissement" }
  };
  function updateHead(route) {
    const tt = TITLES[route] || TITLES.home;
    document.title = (tt[lang] || tt.en) + " · " + SITE;
  }

  function go(route, opts) {
    let found = false;
    pages.forEach((p) => {
      const active = p.dataset.page === route;
      p.classList.toggle("is-active", active);
      if (active) found = true;
    });
    if (!found) return;
    // nav active state
    document.querySelectorAll(".nav__links a").forEach((a) =>
      a.classList.toggle("is-current", a.dataset.route === route)
    );
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    closeMenu();
    refreshReveals();
    updateHead(route);
    // move focus to the new page's first heading for keyboard/screen-reader users
    if (!opts || !opts.silent) {
      const active = document.querySelector(".page.is-active");
      const h = active && active.querySelector("h1, h2");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    }
    if (location.hash !== "#" + route) {
      history.pushState({ route }, "", "#" + route);
    }
  }

  function routeFromHash(silent) {
    const r = (location.hash || "#home").replace("#", "");
    go(document.querySelector('[data-page="' + r + '"]') ? r : "home", { silent: !!silent });
  }
  function currentRoute() {
    const r = (location.hash || "#home").replace("#", "");
    return document.querySelector('[data-page="' + r + '"]') ? r : "home";
  }

  document.addEventListener("click", (e) => {
    // external links (Buy the Book, Book a Call) once configured via CONFIG
    const hrefEl = e.target.closest("[data-href]");
    if (hrefEl && hrefEl.dataset.href) {
      e.preventDefault();
      window.open(hrefEl.dataset.href, "_blank", "noopener");
      return;
    }
    // Buy the Book → open Amazon in the reader's language (fallback: Book page)
    const buyEl = e.target.closest("[data-buy]");
    if (buyEl) {
      e.preventDefault();
      const a = CONFIG.amazonBookUrl;
      const url = (typeof a === "string") ? a : (a && (a[lang] || a.en || a.fr)) || "";
      if (url) window.open(url, "_blank", "noopener");
      else go("book");
      return;
    }
    // internal SPA navigation
    const el = e.target.closest("[data-route]");
    if (el) {
      e.preventDefault();
      go(el.dataset.route);
    }
  });
  window.addEventListener("popstate", function () { routeFromHash(false); });

  /* ----------------------------------------------------------- mobile nav */
  const navToggle = document.getElementById("navToggle");
  const nav = document.getElementById("nav");
  function closeMenu() {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  // shrink nav on scroll
  window.addEventListener("scroll", () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 30);
  }, { passive: true });

  /* ------------------------------------------------ language button wiring */
  document.querySelectorAll("[data-lang-btn]").forEach((b) =>
    b.addEventListener("click", () => setLang(b.dataset.langBtn))
  );

  /* -------------------------------------------------- includes (templates) */
  function hydrateIncludes() {
    document.querySelectorAll("[data-include]").forEach((slot) => {
      const tpl = document.getElementById("tpl-" + slot.dataset.include);
      if (tpl) slot.appendChild(tpl.content.cloneNode(true));
    });
  }

  /* --------------------------------------------------------- scroll reveal */
  let io;
  function refreshReveals() {
    const active = document.querySelector(".page.is-active");
    if (!active || !io) return;
    active.querySelectorAll(".reveal:not(.in-view)").forEach((el) => {
      // Reveal anything already on screen right now, observe the rest.
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.95 && r.bottom > 0) el.classList.add("in-view");
      else io.observe(el);
    });
  }
  function initReveals() {
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in-view");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });
    refreshReveals();
    // Safety net: never let content stay invisible if observers miss an edge case.
    window.addEventListener("load", refreshReveals);
  }

  /* ----------------------------------------------------------- 3D tilt fx */
  function bindTilt(scope) {
    (scope || document).querySelectorAll("[data-tilt]").forEach((el) => {
      if (el._tilt) return;
      el._tilt = true;
      const max = 9;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", (px * max).toFixed(2) + "deg");
        el.style.setProperty("--rx", (-py * max).toFixed(2) + "deg");
        el.style.setProperty("--mx", (px * 100 + 50).toFixed(1) + "%");
        el.style.setProperty("--my", (py * 100 + 50).toFixed(1) + "%");
      });
      el.addEventListener("mouseleave", () => {
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--rx", "0deg");
      });
    });
  }

  /* ------------------------------------------------------------ forms */
  function mailtoFallback(d) {
    const subject = `[${d.reason || "Message"}], ${d.name || ""}`;
    const bodyLines = [
      `Name: ${d.name || ""}`, `Email: ${d.email || ""}`, `Phone: ${d.phone || ""}`,
      `Organization: ${d.organization || ""}`, `Reason: ${d.reason || ""}`, ``, `${d.message || ""}`
    ].join("\n");
    window.location.href =
      `mailto:imagemagicpublish@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines)}`;
  }

  function initForms() {
    const cf = document.getElementById("contactForm");
    if (cf) {
      cf.addEventListener("submit", async (e) => {
        e.preventDefault();
        const note = document.getElementById("formNote");
        const btn = cf.querySelector('button[type="submit"]');
        const fd = new FormData(cf);
        const data = Object.fromEntries(fd.entries());
        data.token = (cf.querySelector('[name="cf-turnstile-response"]') || {}).value || "";
        data.lang = lang;

        const setNote = (key, ok) => {
          if (!note) return;
          note.textContent = t(key);
          note.classList.toggle("form-note--err", !ok);
          note.hidden = false;
        };
        // honeypot: a filled hidden field means a bot → look successful, send nothing
        if ((data.company || "").trim()) { setNote("form.sent", true); cf.reset(); applyLang(); return; }

        btn.disabled = true; setNote("form.sending", true);

        try {
          let ok = false;
          if (CONFIG.web3formsKey) {
            // Web3Forms → emails the inquiry straight to your inbox
            const res = await fetch("https://api.web3forms.com/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({
                access_key: CONFIG.web3formsKey,
                subject: `[${data.reason || "Message"}] ${data.name || ""}`,
                from_name: "ImageMagicPublish Website",
                name: data.name, email: data.email, phone: data.phone,
                organization: data.organization, reason: data.reason,
                language: data.lang, message: data.message
              })
            });
            const j = await res.json().catch(() => ({ success: false }));
            ok = res.ok && j.success;
          } else {
            const res = await fetch(CONFIG.contactEndpoint, {
              method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
            });
            ok = res.ok;
          }
          if (!ok) throw new Error("send failed");
          setNote("form.sent", true);
          cf.reset(); applyLang();
          if (window.turnstile) try { window.turnstile.reset(); } catch (_) {}
        } catch (err) {
          // Nothing configured / send failed → don't lose the inquiry: open email draft.
          setNote("form.error", false);
          mailtoFallback(data);
        } finally {
          btn.disabled = false;
        }
      });
    }

    // "Join the Awakening" newsletter forms → MailerLite (newsletter group)
    document.querySelectorAll("[data-email-form]").forEach((f) => {
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        const note = f.parentElement.querySelector("[data-email-note]");
        subscribeForm(f, CONFIG.newsletterGroup, note, "email.thanks", "Newsletter");
      });
    });

    // Lost Chapter modal form → add to MailerLite (best-effort) + INSTANT PDF download
    const lc = document.getElementById("lostChapterForm");
    if (lc) {
      lc.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = lc.querySelector('button[type="submit"]');
        const note = document.getElementById("lcNote");
        const dl = document.getElementById("lcDownload");
        const fd = new FormData(lc);
        const email = (fd.get("email") || "").trim();
        if (!email) return;
        btn.disabled = true;
        // add to the list (best-effort, never block delivery of the promised chapter)
        try {
          await fetch(CONFIG.subscribeEndpoint, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name: fd.get("name") || "", group: CONFIG.lostChapterGroup || "", company: fd.get("company") || "", language: lang, source: "Free Chapter" })
          });
        } catch (_) {}
        // always deliver the free chapter, in the visitor's language
        const pdf = (CONFIG.lostChapterPdf && (CONFIG.lostChapterPdf[lang] || CONFIG.lostChapterPdf.en)) || "";
        if (dl && pdf) { dl.href = pdf; dl.hidden = false; }
        if (note) { note.textContent = t("lc.thanks"); note.classList.remove("form-note--err"); note.hidden = false; }
        lc.hidden = true;
        btn.disabled = false;
      });
    }
  }

  async function subscribeForm(form, group, note, successKey, source) {
    const btn = form.querySelector('button[type="submit"]');
    const fd = new FormData(form);
    const payload = { email: fd.get("email") || "", name: fd.get("name") || "", group: group || "", company: fd.get("company") || "", language: lang, source: source || "Website" };
    const setNote = (msg, ok) => { if (note) { note.textContent = msg; note.classList.toggle("form-note--err", !ok); note.hidden = false; } };
    if (btn) btn.disabled = true;
    try {
      const res = await fetch(CONFIG.subscribeEndpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      // 501 = MailerLite not connected yet → don't alarm visitors, just thank them
      if (res.ok || res.status === 501) { setNote(t(successKey), true); form.reset(); }
      else throw new Error("status " + res.status);
    } catch (err) {
      setNote(t("email.error"), false);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /* ------------------------------------------------------ lost-chapter modal */
  function initModal() {
    const modal = document.getElementById("lostChapterModal");
    if (!modal) return;
    let lastFocus = null;
    const open = () => {
      lastFocus = document.activeElement;
      // reset to the initial form state (in case it was submitted before)
      const form = document.getElementById("lostChapterForm");
      const note = document.getElementById("lcNote");
      const dl = document.getElementById("lcDownload");
      if (form) { form.hidden = false; form.reset(); }
      if (note) note.hidden = true;
      if (dl) dl.hidden = true;
      modal.hidden = false; modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      const input = modal.querySelector("input");
      if (input) setTimeout(() => input.focus(), 40);
    };
    const close = () => {
      modal.hidden = true; modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      const note = document.getElementById("lcNote"); if (note) note.hidden = true;
      if (lastFocus) try { lastFocus.focus(); } catch (_) {}
    };
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-lostchapter]")) { e.preventDefault(); open(); }
      else if (e.target.closest("[data-modal-close]")) { close(); }
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });
  }

  /* ------------------------------------- integrations wired from CONFIG */
  function mountTurnstile() {
    if (!CONFIG.turnstileSiteKey) return; // no key yet → no widget, form still works
    const mount = document.getElementById("turnstileMount");
    if (!mount) return;
    mount.innerHTML = '<div class="cf-turnstile" data-sitekey="' + CONFIG.turnstileSiteKey + '" data-theme="dark"></div>';
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }
  function wireIntegrations() {
    // Buy-the-Book buttons are handled at click time (language-aware), nothing to set here.
    // Calendly "Book a Call" buttons, show only when configured
    document.querySelectorAll("[data-calendly]").forEach((b) => {
      if (CONFIG.calendlyUrl) { b.hidden = false; b.dataset.href = CONFIG.calendlyUrl; }
      else { b.hidden = true; }
    });
    mountTurnstile();
  }

  /* =================================================================
     GOLD LIVING PARTICLE SYSTEM
     Slow drifting golden fireflies. Density adapts to active section.
     ================================================================= */
  function initParticles() {
    const canvas = document.getElementById("particles");
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W, H, DPR, particles = [], raf;

    const mobile = window.innerWidth < 760;
    const COUNT = reduce ? 0 : (mobile ? 46 : 96);

    // mouse parallax, gently shifts the whole field so the site feels alive
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    window.addEventListener("mousemove", (e) => {
      tmx = (e.clientX / innerWidth - 0.5) * 2;   // -1..1
      tmy = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.width = Math.floor(innerWidth * DPR);
      H = canvas.height = Math.floor(innerHeight * DPR);
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
    }

    function spark() {
      const z = Math.random() * 0.7 + 0.3;             // depth 0.3 (far) .. 1 (near)
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        z: z,
        r: (z * 1.7 + 0.5) * DPR,                       // nearer = larger
        baseA: (Math.random() * 0.45 + 0.25) * z,       // nearer = brighter
        a: 0,
        tw: Math.random() * Math.PI * 2,                // twinkle phase
        tws: (Math.random() * 0.011 + 0.004),           // twinkle speed
        sharp: Math.random() * 1.8 + 1.2,               // firefly blink sharpness
        vy: -(Math.random() * 0.16 + 0.04) * z * DPR,   // slow upward drift
        vx: (Math.random() - 0.5) * 0.12 * z * DPR,     // gentle horizontal
        sway: Math.random() * Math.PI * 2,
        sws: Math.random() * 0.009 + 0.0025,
        par: z * 14 * DPR                               // parallax amplitude
      };
    }

    function build() { particles = Array.from({ length: COUNT }, spark); }

    // intensity by section under viewport center (cream softer, hero/final strongest)
    function intensity() {
      const mid = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      const sec = mid && mid.closest(".section, .hero, .temple-hero, .subhero, .footer");
      if (!sec) return 1;
      // cream = reading sections → whisper-soft so text stays clean/editorial
      if (sec.classList.contains("section--cream") || sec.classList.contains("subhero")) return 0.32;
      if (sec.classList.contains("hero") || sec.classList.contains("section--final") ||
          sec.classList.contains("temple-hero")) return 1.25;
      return 0.95; // navy, alive
    }

    let curI = 0.8;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      const targetI = intensity();
      curI += (targetI - curI) * 0.04;
      mx += (tmx - mx) * 0.05;                          // smooth parallax follow
      my += (tmy - my) * 0.05;

      for (const p of particles) {
        p.tw += p.tws;
        p.sway += p.sws;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.sway) * 0.11 * p.z * DPR;

        if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
        if (p.x < -12) p.x = W + 12;
        if (p.x > W + 12) p.x = -12;

        // firefly blink: sharpened twinkle so sparks bloom and fade like fireflies
        const tw = Math.pow((Math.sin(p.tw) + 1) / 2, p.sharp);
        p.a = Math.min(0.92, p.baseA * (0.18 + tw * 1.05) * curI);
        if (p.a <= 0.01) continue;

        const px = p.x - mx * p.par;                    // parallax offset
        const py = p.y - my * p.par;
        const R = p.r * 4.2;

        // soft golden halo, saturated gold reads on BOTH cream and navy
        const grd = ctx.createRadialGradient(px, py, 0, px, py, R);
        grd.addColorStop(0,    `rgba(232,190,96,${p.a})`);
        grd.addColorStop(0.4,  `rgba(212,166,58,${p.a * 0.55})`);
        grd.addColorStop(1,    "rgba(196,150,46,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, R, 0, Math.PI * 2);
        ctx.fill();

        // bright shiny core
        ctx.fillStyle = `rgba(255,238,190,${p.a})`;
        ctx.beginPath();
        ctx.arc(px, py, p.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    resize(); build();
    if (!reduce) frame();
    window.addEventListener("resize", () => { cancelAnimationFrame(raf); resize(); build(); if (!reduce) frame(); });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduce) { cancelAnimationFrame(raf); frame(); }
    });
  }

  /* ----------------------------------------------------------------- init */
  function init() {
    try { lang = localStorage.getItem("imp_lang") || "en"; } catch (e) {}
    hydrateIncludes();
    applyLang();
    bindTilt(document);
    initReveals();
    initForms();
    initModal();
    wireIntegrations();
    initParticles();
    routeFromHash(true); // initial load: no focus-steal
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
    window.addEventListener("scroll", refreshReveals, { passive: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
