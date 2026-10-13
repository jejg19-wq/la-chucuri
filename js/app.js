/* La Chucurí · sitio: navegación, portada animada, revelados, día/noche, comparadores, variaciones y visor de imágenes. */
(() => {
  "use strict";
  const root = document.documentElement;
  root.classList.add("js");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const gsap = window.gsap;

  /* ---------------- barra, progreso y sección actual ---------------- */
  const barra = $(".barra"), prog = $(".progreso"), donde = $(".donde");
  const secciones = $$("[data-titulo]");
  let tick = false;
  function alScroll() {
    tick = false;
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    barra.classList.toggle("solida", y > innerHeight * 0.6);
    prog.style.width = (h > 0 ? 100 * y / h : 0) + "%";
    let actual = secciones[0];
    secciones.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * 0.4) actual = s; });
    if (actual && donde.textContent !== actual.dataset.titulo) donde.textContent = actual.dataset.titulo;
  }
  addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(alScroll); } }, { passive: true });
  alScroll();

  /* ---------------- menú ---------------- */
  const menu = $("#menu"), bMenu = $(".b-menu");
  const abrirMenu = v => { menu.hidden = !v; bMenu.setAttribute("aria-expanded", v ? "true" : "false"); document.body.style.overflow = v ? "hidden" : ""; };
  bMenu.addEventListener("click", () => abrirMenu(menu.hidden));
  menu.addEventListener("click", e => { if (e.target.closest("a") || e.target.closest(".cerrar")) abrirMenu(false); });
  addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) abrirMenu(false); });

  /* ---------------- portada: fondos que se cruzan y título animado ---------------- */
  const fondos = $$(".hero-fondo img");
  let f = 0;
  if (fondos.length) {
    fondos[0].classList.add("on");
    if (!reduce && fondos.length > 1) setInterval(() => {
      fondos[f].classList.remove("on");
      f = (f + 1) % fondos.length;
      fondos[f].classList.add("on");
    }, 7000);
  }
  const titulo = $(".hero h1");
  if (titulo && gsap && !reduce) {
    titulo.innerHTML = titulo.textContent.split("").map(c => `<span class="letra">${c === " " ? "&nbsp;" : c}</span>`).join("");
    gsap.from(".hero h1 .letra", { yPercent: 110, opacity: 0, duration: 1.1, ease: "power4.out", stagger: 0.05, delay: 0.2 });
    gsap.from(".hero .trazo", { scaleX: 0, duration: 1.6, ease: "power3.inOut", delay: 0.6 });
    gsap.from(".hero .ceja, .hero .sub, .hero .lead, .hero .cifras li, .hero .acciones, .hero .aviso",
      { y: 26, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.08, delay: 0.7 });
  }

  /* ---------------- revelados al entrar en pantalla ---------------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver(ents => ents.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("visto"); io.unobserve(en.target); }
  }), { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }) : null;
  $$(".revelar, .cortina").forEach(el => io ? io.observe(el) : el.classList.add("visto"));

  /* contadores */
  const fmt = (v, dec) => v.toLocaleString("es-VE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const ioN = "IntersectionObserver" in window ? new IntersectionObserver(ents => ents.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target, fin = parseFloat(el.dataset.contar), dec = +(el.dataset.dec || 0), suf = el.dataset.suf || "";
    ioN.unobserve(el);
    if (reduce) { el.textContent = fmt(fin, dec) + suf; return; }
    const t0 = performance.now(), dur = 1600;
    const paso = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(fin * e, dec) + suf; if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }), { threshold: 0.6 }) : null;
  $$("[data-contar]").forEach(el => ioN && ioN.observe(el));

  /* parallax suave de las fotos grandes (GSAP ScrollTrigger) */
  if (gsap && window.ScrollTrigger && !reduce) {
    gsap.registerPlugin(window.ScrollTrigger);
    $$(".paralaje img").forEach(img => gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: "none",
      scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } }));
    $$(".caminos-graf .r-pie, .caminos-graf .r-carro").forEach(p => {
      const L = p.getTotalLength();
      p.style.strokeDasharray = p.classList.contains("r-carro") ? "2 10" : L;
      if (!p.classList.contains("r-carro")) gsap.fromTo(p, { strokeDashoffset: L }, { strokeDashoffset: 0, ease: "power2.inOut", duration: 2.4,
        scrollTrigger: { trigger: p.closest("svg"), start: "top 75%" } });
    });
  }

  /* ---------------- día / noche ---------------- */
  $$(".dn").forEach(dn => dn.addEventListener("click", e => {
    const b = e.target.closest("[data-dn]");
    if (!b) return;
    e.stopPropagation();
    dn.classList.toggle("es-noche", b.dataset.dn === "noche");
    $$("[data-dn]", dn).forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  }));

  /* ---------------- comparador hoy / propuesta ---------------- */
  $$(".cmp").forEach(c => {
    const r = $("input", c);
    const set = v => { c.style.setProperty("--pos", v + "%"); r.value = v; };
    r.addEventListener("input", () => { c.dataset.tocado = 1; set(+r.value); });
    if (!reduce && io) {
      const o = new IntersectionObserver(en => { if (!en[0].isIntersecting || c.dataset.tocado) return; o.disconnect();
        const t0 = performance.now();
        const anim = t => { if (c.dataset.tocado) return; const k = Math.min(1, (t - t0) / 2600); const v = 52 + 40 * Math.sin(k * Math.PI * 1.5) * (1 - k); set(v); if (k < 1) requestAnimationFrame(anim); };
        requestAnimationFrame(anim); }, { threshold: 0.5 });
      o.observe(c);
    }
  });

  /* ---------------- variaciones de la cima ---------------- */
  $$(".variaciones").forEach(v => v.addEventListener("click", e => {
    const b = e.target.closest("[data-v]");
    if (!b) return;
    $$(".v-escena img", v).forEach(i => i.classList.toggle("on", i.dataset.v === b.dataset.v));
    $$("[data-v]", v).forEach(x => { if (x.tagName === "BUTTON") x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
  }));

  /* ---------------- visor de imágenes ---------------- */
  const visor = $("#visor");
  let lista = [], pos = 0;
  function pintar() {
    const it = lista[pos];
    $("img", visor).src = it.src;
    $("img", visor).alt = it.texto;
    $(".visor-texto", visor).textContent = it.texto;
    $(".visor-num", visor).textContent = `${pos + 1} / ${lista.length}`;
  }
  window.Visor = {
    abrir(items, i = 0) { lista = items; pos = i; pintar(); visor.hidden = false; document.body.style.overflow = "hidden"; $(".cerrar", visor).focus(); },
    cerrar() { visor.hidden = true; document.body.style.overflow = ""; }
  };
  visor.addEventListener("click", e => {
    if (e.target.closest(".cerrar") || e.target === visor || e.target.classList.contains("visor-img")) window.Visor.cerrar();
    else if (e.target.closest(".ant")) { pos = (pos - 1 + lista.length) % lista.length; pintar(); }
    else if (e.target.closest(".sig")) { pos = (pos + 1) % lista.length; pintar(); }
  });
  addEventListener("keydown", e => {
    if (visor.hidden) return;
    if (e.key === "Escape") window.Visor.cerrar();
    if (e.key === "ArrowRight") { pos = (pos + 1) % lista.length; pintar(); }
    if (e.key === "ArrowLeft") { pos = (pos - 1 + lista.length) % lista.length; pintar(); }
  });
  let x0 = null;
  visor.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  visor.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) { pos = (pos + (dx < 0 ? 1 : -1) + lista.length) % lista.length; pintar(); }
  });
  /* cada foto abre el visor con las de su grupo */
  document.addEventListener("click", e => {
    const fig = e.target.closest(".foto");
    if (!fig || e.target.closest("button")) return;
    const grupo = fig.closest("[data-grupo]") || fig.parentElement;
    const figs = $$(".foto", grupo);
    window.Visor.abrir(figs.map(x => ({ src: x.dataset.grande, texto: x.dataset.texto })), figs.indexOf(fig));
  });
})();
