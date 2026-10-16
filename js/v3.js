/* La Chucurí · sitio v3: menú que se transforma, videos que cargan al llegar, secuencias del dron controladas con el scroll,
   maqueta 360° liviana, barridos hoy/propuesta, cinco pisos en horizontal, historia ayer-hoy-mañana y el rosario que se enciende. */
(() => {
  "use strict";
  const root = document.documentElement;
  root.classList.add("js");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const con = navigator.connection || {};
  const ahorro = !!con.saveData || /(^|-)2g$/.test(con.effectiveType || "");
  const flojo = ahorro || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const hd = () => !ahorro && innerWidth * Math.min(devicePixelRatio || 1, 2) > 1400;
  if (reduce) root.classList.add("no-anim");

  /* ---------------------------------------------------------------- motor de scroll: un solo rAF para todo lo que depende del scroll */
  const alScroll = [];
  let pedido = false;
  const tick = () => { pedido = false; for (const f of alScroll) f(); };
  const pedir = () => { if (!pedido) { pedido = true; requestAnimationFrame(tick); } };
  addEventListener("scroll", pedir, { passive: true });
  addEventListener("resize", pedir);
  const progreso = (el, inicio = 0) => {   // 0 cuando el bloque llega arriba (o "inicio" px antes), 1 cuando su final llega abajo
    const r = el.getBoundingClientRect();
    const d = r.height - innerHeight;
    return d > 0 ? clamp((inicio - r.top) / d) : clamp((innerHeight - r.top) / (innerHeight + r.height));
  };

  /* scroll suave con la rueda (no en el tacto) */
  let lenis = null;
  if (!reduce && window.Lenis && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    lenis = new Lenis({ duration: 1.0, smoothWheel: true, syncTouch: false });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const irA = (dest) => {
    const el = typeof dest === "string" ? $(dest) : dest;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 }); else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute("data-abrir-video")) return;
    const h = a.getAttribute("href");
    if (h.length < 2 || !$(h)) return;
    e.preventDefault();
    cerrarMenus();
    irA(h);
    history.replaceState(null, "", h);
  });

  /* ---------------------------------------------------------------- cabecera: sólida al bajar, se esconde al bajar y vuelve al subir */
  const header = $("#header");
  let yAnt = scrollY;
  alScroll.push(() => {
    const y = scrollY;
    header.classList.toggle("solida", y > innerHeight * 0.75);
    const abierto = $("#dd").classList.contains("open") || $("#sheet").classList.contains("open");
    if (!abierto && Math.abs(y - yAnt) > 6) header.classList.toggle("oculta", y > yAnt && y > innerHeight * 1.2);
    yAnt = y;
  });

  /* ---------------------------------------------------------------- el desplegable que se transforma (como Halden) */
  const dd = $("#dd"), nav = $("#nav");
  const ORDEN = ["proyecto", "ver", "montana"];
  const PAD = 20;
  let actual = null, tCierre = 0;
  const panel = id => $(`.panel[data-panel="${id}"]`, dd);
  const disparador = id => $(`.trigger[data-menu="${id}"]`, nav);
  function place(id) {
    const p = panel(id), t = disparador(id);
    const w = p.offsetWidth, h = p.offsetHeight;
    const hr = header.getBoundingClientRect(), tr = t.getBoundingClientRect();
    let x = clamp(tr.left - PAD, hr.left + 12, hr.right - w - 12);
    x -= (dd.offsetParent || header).getBoundingClientRect().left;
    dd.style.setProperty("--x", x + "px");
    dd.style.setProperty("--w", w + "px");
    dd.style.setProperty("--h", h + "px");
  }
  function open(id) {
    clearTimeout(tCierre);
    cargarFotosMenu();
    if (id === actual) return;
    const nuevo = panel(id);
    if (!actual) {
      dd.classList.add("instant", "snap");
      $$(".panel", dd).forEach(p => { p.classList.add("snap"); p.removeAttribute("data-state"); });
      place(id);
      void dd.offsetWidth;
      dd.classList.remove("snap");
      $$(".panel", dd).forEach(p => p.classList.remove("snap"));
      dd.classList.add("open");
      requestAnimationFrame(() => dd.classList.remove("instant"));
    } else {
      const dir = ORDEN.indexOf(id) > ORDEN.indexOf(actual) ? 1 : -1;
      panel(actual).setAttribute("data-state", dir > 0 ? "exit-left" : "exit-right");
      nuevo.classList.add("snap");
      nuevo.setAttribute("data-state", dir > 0 ? "exit-right" : "exit-left");
      void nuevo.offsetWidth;
      nuevo.classList.remove("snap");
      place(id);
    }
    nuevo.setAttribute("data-state", "active");
    $$(".trigger", nav).forEach(t => t.setAttribute("aria-expanded", t.dataset.menu === id ? "true" : "false"));
    actual = id;
    header.classList.remove("oculta");
  }
  function close() {
    dd.classList.remove("open");
    if (actual) panel(actual).removeAttribute("data-state");
    $$(".trigger", nav).forEach(t => t.setAttribute("aria-expanded", "false"));
    actual = null;
  }
  const scheduleClose = (ms = 140) => { clearTimeout(tCierre); tCierre = setTimeout(close, ms); };
  $$(".trigger", nav).forEach(t => {
    t.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") open(t.dataset.menu); });
    t.addEventListener("click", () => (actual === t.dataset.menu ? close() : open(t.dataset.menu)));
  });
  $("#story-link").addEventListener("pointerenter", e => { if (e.pointerType === "mouse") scheduleClose(60); });
  // las fotos del menú no se descargan con la página: se piden la primera vez que el ratón o el foco llegan al menú
  let fotosMenu = false;
  const cargarFotosMenu = () => { if (fotosMenu) return; fotosMenu = true; $$("img[data-src]", dd).forEach(im => { im.src = im.dataset.src; }); };
  nav.addEventListener("pointerenter", cargarFotosMenu);
  nav.addEventListener("focusin", cargarFotosMenu);
  nav.addEventListener("pointerenter", () => clearTimeout(tCierre));
  nav.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") scheduleClose(); });
  nav.addEventListener("focusout", e => { if (!nav.contains(e.relatedTarget)) scheduleClose(0); });
  document.addEventListener("pointerdown", e => { if (actual && !nav.contains(e.target)) close(); });
  addEventListener("resize", () => { if (actual) place(actual); });
  $$(".d-item", dd).forEach(it => {
    const activar = () => {
      $$(".d-item", dd).forEach(x => x.classList.toggle("is-active", x === it));
      $$(".d-media img", dd).forEach((im, k) => im.classList.toggle("is-active", String(k) === it.dataset.img));
    };
    it.addEventListener("pointerenter", activar);
    it.addEventListener("focus", activar);
  });

  /* hoja del teléfono */
  const sheet = $("#sheet"), bMenu = $(".menu-btn");
  const abrirHoja = v => { sheet.classList.toggle("open", v); bMenu.setAttribute("aria-expanded", v ? "true" : "false"); if (v) header.classList.remove("oculta"); };
  bMenu.addEventListener("click", () => abrirHoja(!sheet.classList.contains("open")));
  sheet.addEventListener("click", e => { if (e.target.closest("a")) abrirHoja(false); });
  function cerrarMenus() { close(); abrirHoja(false); }
  addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (actual) { const t = disparador(actual); close(); t && t.focus(); }
    abrirHoja(false);
  });

  /* ---------------------------------------------------------------- revelados */
  const ver = "IntersectionObserver" in window ? new IntersectionObserver(ents => ents.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("visto"); ver.unobserve(en.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }) : null;
  const observar = el => (ver && !reduce ? ver.observe(el) : el.classList.add("visto"));

  // títulos: cada palabra sube desde una máscara (respeta las cursivas)
  function partirPalabras(el) {
    let i = 0;
    const recorrer = nodo => {
      Array.from(nodo.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(t => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(" ")); return; }
            const p = document.createElement("span"); p.className = "pal";
            const s = document.createElement("span"); s.style.setProperty("--i", i++); s.textContent = t;
            p.appendChild(s); frag.appendChild(p);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) recorrer(n);
      });
    };
    recorrer(el);
  }
  $$("[data-lineas]").forEach(el => { partirPalabras(el); observar(el); });
  $$("[data-sube], .fig, .wipe, .alt, [data-dibujar]").forEach(observar);

  // el nombre, letra por letra
  $$("[data-letras]").forEach(el => {
    el.innerHTML = el.textContent.split("").map((c, i) => `<span class="l" style="--i:${i}">${c === " " ? "&nbsp;" : c}</span>`).join("");
    observar(el);
  });

  // frases que se encienden palabra por palabra con el scroll
  $$("[data-palabras]").forEach(el => {
    const ws = [];
    const recorrer = nodo => Array.from(nodo.childNodes).forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(" ")); return; }
          const s = document.createElement("span"); s.className = "w"; s.textContent = t; ws.push(s); frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) recorrer(n);
    });
    recorrer(el);
    if (reduce) return;
    alScroll.push(() => {
      const r = el.getBoundingClientRect();
      const p = clamp((innerHeight * 0.92 - r.top) / (innerHeight * 0.55 + r.height * 0.6));
      const k = Math.round(p * ws.length);
      ws.forEach((w, i) => w.classList.toggle("on", i < k));
    });
  });

  // contadores
  const contar = el => {
    const fin = parseFloat(el.dataset.contar), dec = +el.dataset.dec || 0, suf = el.dataset.suf || "";
    const fmt = v => v.toLocaleString("es-VE", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
    if (reduce) { el.textContent = fmt(fin); return; }
    const t0 = performance.now(), d = 1600;
    const paso = t => { const k = clamp((t - t0) / d); el.textContent = fmt(fin * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  };
  const vc = "IntersectionObserver" in window ? new IntersectionObserver(ents => ents.forEach(en => {
    if (en.isIntersecting) { contar(en.target); vc.unobserve(en.target); }
  }), { threshold: 0.5 }) : null;
  $$("[data-contar]").forEach(el => (vc ? vc.observe(el) : contar(el)));

  /* ---------------------------------------------------------------- videos: cargan al acercarse, suenan solo en pantalla */
  const fuente = v => (hd() && v.dataset.srcHd ? v.dataset.srcHd : v.dataset.src);
  const ponerCartel = v => { if (v.dataset.poster && !v.getAttribute("poster")) v.poster = v.dataset.poster; };
  const cargarVideo = v => { ponerCartel(v); if (!v.src && v.dataset.src) { v.src = fuente(v); v.load(); } };
  const tocar = v => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const hero = $(".hero-video");
  if (hero) {
    if (!ahorro && !reduce) { cargarVideo(hero); tocar(hero); }   // sin animación: queda la foto del dron
    alScroll.push(() => {
      const y = scrollY;
      if (y < innerHeight * 1.2) {
        if (!reduce) $(".hero-bg").style.transform = `translateY(${y * 0.28}px) scale(${1 + y / innerHeight * 0.06})`;
        if (hero.paused && !reduce && !ahorro && y < innerHeight) tocar(hero);
      } else if (!hero.paused) hero.pause();
    });
  }
  const videos = $$("video.vid");
  if ("IntersectionObserver" in window) {
    const cerca = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) { cargarVideo(en.target); cerca.unobserve(en.target); } }),
      { rootMargin: "120% 0px" });
    const enVista = new IntersectionObserver(ents => ents.forEach(en => {
      const v = en.target;
      if (en.isIntersecting && en.intersectionRatio > 0.12) { cargarVideo(v); if (!reduce) tocar(v); } else if (!v.paused) v.pause();
    }), { threshold: [0, 0.12, 0.4] });
    const cartel = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) { ponerCartel(en.target); cartel.unobserve(en.target); } }),
      { rootMargin: "150% 0px" });
    videos.forEach(v => { cartel.observe(v); if (!ahorro) cerca.observe(v); enVista.observe(v); });
  } else videos.forEach(ponerCartel);
  // en movimiento reducido, los videos se tocan con un toque
  if (reduce) videos.forEach(v => v.addEventListener("click", () => { cargarVideo(v); v.paused ? tocar(v) : v.pause(); }));
  // las bandas de video se acercan levemente con el scroll
  $$(".banda, .contacto").forEach(b => {
    const m = $(".banda-media, .contacto-media", b);
    if (!m || reduce) return;
    alScroll.push(() => { const p = progreso(b); m.style.setProperty("--zoom", (1.16 - p * 0.12).toFixed(4)); });
  });

  /* ---------------------------------------------------------------- secuencias del dron controladas con el scroll */
  function cola(urls, alListo, max = 6) {
    let i = 0, activas = 0;
    const sig = () => {
      while (activas < max && i < urls.length) {
        const [k, u] = urls[i++];
        activas++;
        const im = new Image();
        im.decoding = "async";
        im.onload = () => { (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => { alListo(k, im); activas--; sig(); }); };
        im.onerror = () => { activas--; sig(); };
        im.src = u;
      }
    };
    sig();
  }
  const ordenCarga = n => {   // primero el primero y el último, después de 8 en 8, de 4 en 4, de 2 en 2 y el resto
    const vistos = new Set(), out = [];
    const add = k => { if (k >= 0 && k < n && !vistos.has(k)) { vistos.add(k); out.push(k); } };
    add(0); add(n - 1);
    for (const s of [8, 4, 2, 1]) for (let k = 0; k < n; k += s) add(k);
    return out;
  };
  function dibujarCubriendo(ctx, img, W, H, alfa = 1) {
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.globalAlpha = alfa;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    ctx.globalAlpha = 1;
  }
  $$(".seq").forEach(sec => {
    const n = +sec.dataset.n, ruta = sec.dataset.seq, cv = $("canvas", sec), ctx = cv.getContext("2d");
    const pasos = $$(".paso", sec), barra = $(".seq-barra i", sec);
    if (reduce || !ctx) { sec.classList.add("quieta"); return; }
    let talla = null, imgs = [], objetivo = 0, mostrado = -1, corriendo = false, cargada = false, completa = false, pedidos = new Set();
    const elegir = () => (innerWidth / innerHeight < 0.9 ? "p" : "g");
    const medir = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(cv.clientWidth * d); cv.height = Math.round(cv.clientHeight * d);
      mostrado = -1;
    };
    const cercano = k => { for (let d = 0; d < n; d++) { if (imgs[k - d]) return k - d; if (imgs[k + d]) return k + d; } return -1; };
    const dibujar = f => {
      const a = Math.floor(f), b = Math.min(n - 1, a + 1), t = f - a;
      const ka = cercano(a);
      if (ka < 0) return;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cv.width, cv.height);
      dibujarCubriendo(ctx, imgs[ka], cv.width, cv.height);
      if (t > 0.04 && imgs[b] && ka === a) dibujarCubriendo(ctx, imgs[b], cv.width, cv.height, t);   // fundido entre cuadros vecinos
      mostrado = f;
    };
    const pedirCuadros = ks => {
      const lista = imgs, t = talla;
      ks = ks.filter(k => !pedidos.has(k));
      ks.forEach(k => pedidos.add(k));
      cola(ks.map(k => [k, `${ruta}/${t}/${String(k).padStart(3, "0")}.webp`]), (k, im) => {
        if (lista !== imgs) return;   // cambió el tamaño mientras cargaba
        imgs[k] = im;
        if (Math.abs(k - objetivo) < 2 || mostrado < 0) dibujar(objetivo);
      });
    };
    const cargar = () => {   // fase 1, al acercarse: el primero, el último y uno de cada 8
      if (cargada) return;
      cargada = true; completa = false; talla = elegir(); imgs = new Array(n); pedidos = new Set();
      pedirCuadros(ordenCarga(n).filter(k => k % 8 === 0 || k === n - 1));
    };
    const completar = () => {   // fase 2, al llegar: el resto (en equipos flojos, uno de cada 2)
      if (!cargada) { medir(); cargar(); }
      if (completa) return;
      completa = true;
      pedirCuadros(ordenCarga(n).filter(k => !flojo || k % 2 === 0 || k === n - 1));
    };
    let actualF = 0;
    const animar = () => {
      actualF += (objetivo - actualF) * 0.2;
      if (Math.abs(objetivo - actualF) < 0.01) actualF = objetivo;
      if (actualF !== mostrado) dibujar(actualF);
      if (actualF !== objetivo) requestAnimationFrame(animar); else corriendo = false;
    };
    new IntersectionObserver(ents => { if (ents[0].isIntersecting) { medir(); cargar(); } }, { rootMargin: "150% 0px" }).observe(sec);
    new IntersectionObserver(ents => { if (ents[0].isIntersecting) completar(); }, { rootMargin: "35% 0px" }).observe(sec);
    addEventListener("resize", () => {
      if (!cargada) return;
      medir();
      if (elegir() !== talla) { const seguir = completa; cargada = false; cargar(); if (seguir) completar(); }
      dibujar(actualF);
    });
    alScroll.push(() => {
      const r = sec.getBoundingClientRect();
      if (r.bottom < -50 || r.top > innerHeight + 50) return;
      const p = progreso(sec);
      objetivo = p * (n - 1);
      barra.style.width = (p * 100).toFixed(2) + "%";
      pasos.forEach(el => el.classList.toggle("on", p >= +el.dataset.desde && p < +el.dataset.hasta));
      if (!corriendo) { corriendo = true; requestAnimationFrame(animar); }
    });
  });

  /* ---------------------------------------------------------------- barridos hoy / propuesta */
  $$(".wipe").forEach(w => {
    const r = $("input", w);
    const poner = v => w.style.setProperty("--pos", v + "%");
    r.addEventListener("input", () => poner(r.value));
    if (reduce || !("IntersectionObserver" in window)) return;
    // al llegar, la línea recorre la foto para mostrar que se puede deslizar
    const io = new IntersectionObserver(ents => {
      if (!ents[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), d = 2200, fin = +r.value;
      const paso = t => {
        const k = clamp((t - t0) / d);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        const v = k < 0.55 ? 92 - (92 - 12) * (e / 0.5 > 1 ? 1 : e / 0.5) : 12 + (fin - 12) * ((e - 0.5) / 0.5);
        poner(clamp(v, 0, 100).toFixed(1));
        if (k < 1) requestAnimationFrame(paso); else { poner(fin); r.value = fin; }
      };
      requestAnimationFrame(paso);
    }, { threshold: 0.55 });
    io.observe(w);
  });

  /* una toma con varias opciones */
  $$(".alt").forEach(a => {
    const bots = $$(".alt-bots .pild", a), capas = $$(".alt-img", a), etiqueta = $(".var-tag", a), fila = $(".alt-bots", a);
    // en el teléfono los botones van en una fila que se desliza: se desvanece el borde mientras quede algo por ver
    const marcar = () => { fila.classList.toggle("desliza", fila.scrollWidth > fila.clientWidth + 2); fila.classList.toggle("al-final", fila.scrollLeft + fila.clientWidth >= fila.scrollWidth - 2); };
    if (fila) { marcar(); fila.addEventListener("scroll", marcar, { passive: true }); addEventListener("resize", marcar); if (document.fonts) document.fonts.ready.then(marcar); }
    bots.forEach(b => b.addEventListener("click", () => {
      if (fila && fila.scrollWidth > fila.clientWidth + 2) fila.scrollTo({ left: Math.max(0, b.offsetLeft - (fila.clientWidth - b.offsetWidth) / 2), behavior: reduce ? "auto" : "smooth" });
      bots.forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      capas.forEach(c => c.classList.toggle("on", c.dataset.k === b.dataset.k));
      const c = capas.find(x => x.dataset.k === b.dataset.k);
      if (etiqueta && c && c.dataset.tag) {
        etiqueta.textContent = c.dataset.tag;
        etiqueta.classList.toggle("tag-real", /real/i.test(c.dataset.tag));
      }
    }));
  });

  /* galerías */
  $$(".gal").forEach(g => {
    const pista = $(".gal-pista", g);
    $$("[data-gal]", g).forEach(b => b.addEventListener("click", () => {
      const f = $(".fig", pista);
      pista.scrollBy({ left: (+b.dataset.gal) * (f ? f.offsetWidth + 18 : 400), behavior: reduce ? "auto" : "smooth" });
    }));
  });

  /* ---------------------------------------------------------------- cinco pisos: pista horizontal con el perfil real de la montaña */
  const pisos = $(".pisos");
  if (pisos) {
    const pista = $(".pisos-pista", pisos), pin = $(".pisos-pin", pisos), svg = $(".pf", pisos);
    const alts = svg.dataset.alturas.split(",").map(Number), N = alts.length - 1;
    const linea = $(".pf-linea", svg), punto = $(".pf-punto", svg), marcas = $$(".pf-marca", svg);
    const altTxt = $(".pisos-alt b", pisos), paneles = $$(".pz", pisos);
    // recorte de la línea encendida
    const ns = "http://www.w3.org/2000/svg";
    const clip = document.createElementNS(ns, "clipPath"); clip.id = "pfC";
    const rect = document.createElementNS(ns, "rect"); rect.setAttribute("x", 0); rect.setAttribute("y", -40); rect.setAttribute("height", 400); rect.setAttribute("width", 0);
    clip.appendChild(rect); $("defs", svg).appendChild(clip); linea.setAttribute("clip-path", "url(#pfC)");
    const X = k => 40 + 1520 * k / N;
    const Y = v => +svg.dataset.y0 - (v - 660) * +svg.dataset.ky;
    const MARCAS = [0.06, 0.30, 0.52, 0.70, 0.96];
    let dist = 0, horizontal = false;
    const medir = () => {
      horizontal = innerWidth > 900 && !reduce;
      if (!horizontal) { pisos.style.height = ""; pista.style.transform = ""; rect.setAttribute("width", 1640); marcas.forEach(m => m.classList.add("on")); return; }
      dist = Math.max(0, pista.scrollWidth - pista.clientWidth);
      pisos.style.height = (pin.offsetHeight + dist + innerHeight * 0.35) + "px";
    };
    medir();
    addEventListener("resize", () => { medir(); pedir(); });
    addEventListener("load", () => { medir(); pedir(); });
    alScroll.push(() => {
      if (!horizontal) return;
      const r = pisos.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = clamp(-r.top / Math.max(1, r.height - innerHeight));
      const pp = clamp((p - 0.04) / 0.86);
      pista.style.transform = `translate3d(${(-pp * dist).toFixed(1)}px,0,0)`;
      const f = MARCAS[0] + (MARCAS[4] - MARCAS[0]) * pp, k = Math.round(f * N);
      rect.setAttribute("width", X(f * N).toFixed(1));
      punto.setAttribute("cx", X(k).toFixed(1)); punto.setAttribute("cy", Y(alts[k]).toFixed(1));
      altTxt.textContent = Math.round(alts[k]).toLocaleString("es-VE");
      marcas.forEach((m, i) => m.classList.toggle("on", f >= MARCAS[i] - 0.005));
      const activo = Math.min(paneles.length - 1, Math.round(pp * (paneles.length - 1)));
      paneles.forEach((pz, i) => pz.classList.toggle("activo", i === activo));
    });
  }

  /* ---------------------------------------------------------------- la historia: ayer, hoy y mañana en la misma toma */
  const tiempo = $(".tiempo");
  if (tiempo && !reduce) {
    const capas = $$(".t-capa", tiempo), anios = $$(".t-anio span", tiempo), etis = $$(".t-eti span", tiempo), marcas = $$(".tiempo-marcas i", tiempo);
    alScroll.push(() => {
      const r = tiempo.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = progreso(tiempo);
      const a = clamp((p - 0.18) / 0.22), b = clamp((p - 0.6) / 0.22);
      capas[1].style.clipPath = `inset(0 0 0 ${(100 - a * 100).toFixed(2)}%)`;
      capas[2].style.clipPath = `inset(0 0 0 ${(100 - b * 100).toFixed(2)}%)`;
      capas.forEach((c, i) => { const img = $("img", c); img.style.transform = `scale(${(1.08 - 0.08 * clamp(p * 1.4 - i * 0.4)).toFixed(4)})`; });
      const etapa = b > 0.5 ? 2 : a > 0.5 ? 1 : 0;
      [anios, etis, marcas].forEach(g => g.forEach((s, i) => s.classList.toggle("on", i === etapa)));
    });
  } else if (tiempo) {
    $$(".t-anio span, .t-eti span, .tiempo-marcas i", tiempo).forEach((s, i) => s.classList.toggle("on", s.dataset.t === "2" || i === 2));
    $$(".t-capa", tiempo).forEach(c => (c.style.clipPath = c.dataset.t === "2" ? "none" : ""));
  }

  /* ---------------------------------------------------------------- el gran Rosario: 59 lámparas que se encienden */
  const ros = $(".rosario");
  if (ros) {
    const cuentas = $$(".cuenta", ros), cont = $(".ros-cont b", ros);
    let ultimo = -1;
    const poner = k => {
      if (k === ultimo) return; ultimo = k;
      cuentas.forEach((c, i) => c.classList.toggle("on", i < k));
      cont.textContent = k;
    };
    if (reduce) poner(cuentas.length);
    else alScroll.push(() => {
      const r = $(".rosario-anillo", ros).getBoundingClientRect();
      const p = clamp((innerHeight * 0.95 - r.top) / (innerHeight * 0.8));
      poner(Math.round(p * cuentas.length));
    });
  }

  /* ---------------------------------------------------------------- visor de imágenes */
  const visor = $("#visor"), vImg = $("img", visor), vT = $(".visor-t", visor), vN = $(".visor-n", visor);
  let lista = [], idx = 0, focoAntes = null;
  const mostrar = () => { const it = lista[idx]; vImg.src = it.src; vImg.alt = it.texto; vT.textContent = it.texto; vN.textContent = lista.length > 1 ? `${idx + 1} / ${lista.length}` : ""; };
  const abrirVisor = (l, i) => {
    lista = l; idx = i; focoAntes = document.activeElement; mostrar(); visor.hidden = false;
    $(".visor-f.ant", visor).hidden = $(".visor-f.sig", visor).hidden = l.length < 2;
    if (lenis) lenis.stop(); document.body.style.overflow = "hidden"; $(".modal-x", visor).focus();
  };
  const cerrarVisor = () => { visor.hidden = true; vImg.removeAttribute("src"); if (lenis) lenis.start(); document.body.style.overflow = ""; focoAntes && focoAntes.focus(); };
  window.VisorV3 = { abrir: abrirVisor };
  document.addEventListener("click", e => {
    const f = e.target.closest("[data-grande]");
    if (!f || e.target.closest("button, a, input")) return;
    const grupo = f.closest("[data-grupo], .fauna-grid, .bento, .dos, .tres") || f.parentElement;
    const figs = $$("[data-grande]", grupo);
    abrirVisor(figs.map(x => ({ src: x.dataset.grande, texto: x.dataset.texto || "" })), Math.max(0, figs.indexOf(f)));
  });
  $(".modal-x", visor).addEventListener("click", cerrarVisor);
  $(".visor-f.ant", visor).addEventListener("click", () => { idx = (idx - 1 + lista.length) % lista.length; mostrar(); });
  $(".visor-f.sig", visor).addEventListener("click", () => { idx = (idx + 1) % lista.length; mostrar(); });
  visor.addEventListener("click", e => { if (e.target === visor) cerrarVisor(); });
  let toque0 = null;
  visor.addEventListener("touchstart", e => { toque0 = e.touches[0].clientX; }, { passive: true });
  visor.addEventListener("touchend", e => {
    if (toque0 === null) return;
    const dx = e.changedTouches[0].clientX - toque0; toque0 = null;
    if (Math.abs(dx) > 50 && lista.length > 1) { idx = (idx + (dx < 0 ? 1 : -1) + lista.length) % lista.length; mostrar(); }
  });

  /* ---------------------------------------------------------------- la película en grande */
  const modal = $("#modal-video"), mVid = $("video", modal);
  const PELIS = { presentacion: { src: "media/video/presentacion_720.mp4", poster: "media/video/presentacion_720.webp", vertical: false },
                  corto: { src: "media/video/corto_720.mp4", poster: "media/video/corto_720.webp", vertical: true } };
  const abrirPeli = k => {
    const p = PELIS[k]; if (!p) return;
    cerrarMenus(); focoAntes = document.activeElement;
    modal.classList.toggle("vertical", p.vertical);
    mVid.poster = p.poster; mVid.src = p.src; modal.hidden = false;
    if (lenis) lenis.stop(); document.body.style.overflow = "hidden";
    tocar(mVid); $(".modal-x", modal).focus();
  };
  const cerrarPeli = () => { mVid.pause(); mVid.removeAttribute("src"); mVid.load(); modal.hidden = true; if (lenis) lenis.start(); document.body.style.overflow = ""; focoAntes && focoAntes.focus(); };
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-abrir-video]");
    if (!b) return;
    e.preventDefault(); abrirPeli(b.dataset.abrirVideo);
  });
  $(".modal-x", modal).addEventListener("click", cerrarPeli);
  modal.addEventListener("click", e => { if (e.target === modal) cerrarPeli(); });
  addEventListener("keydown", e => {
    if (e.key === "Escape") { if (!modal.hidden) cerrarPeli(); if (!visor.hidden) cerrarVisor(); }
    if (!visor.hidden && e.key === "ArrowRight") $(".visor-f.sig", visor).click();
    if (!visor.hidden && e.key === "ArrowLeft") $(".visor-f.ant", visor).click();
  });

  /* compartir */
  const copiar = $("#copiar");
  if (copiar) copiar.addEventListener("click", async () => {
    const url = location.href.split("#")[0];
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: document.title, url });
      else { await navigator.clipboard.writeText(url); copiar.textContent = "Enlace copiado"; setTimeout(() => (copiar.textContent = "Copiar el enlace"), 2200); }
    } catch { }
  });
  const wa = $("#compartir-wa");
  if (wa) wa.href = "https://wa.me/?text=" + encodeURIComponent("La Chucurí · Centro Internacional Biotemático · " + location.href.split("#")[0]);

  /* ---------------------------------------------------------------- la maqueta 360° */
  maqueta360();
  function maqueta360() {
    const raiz = $(".m360");
    if (!raiz) return;
    const lienzo = $(".m360-lienzo", raiz), cv = $("canvas", lienzo), ctx = cv.getContext("2d");
    const svg = $(".m360-lindero", raiz), lin = $(".lin", svg), linH = $(".lin-halo", svg);
    const capaP = $(".m360-puntos", raiz), rango = $(".m360-rango", raiz), ficha = $(".ficha", raiz);
    const bGirar = $("[data-girar]", raiz);
    let D = null, base = "", N = 72, modo = "dia", cuadros = {}, pos = 0, vel = 0, mostrado = -1, visible = false, girando = !reduce, tocado = false;
    let fichas = [], porId = {}, botones = {}, fichaAct = -1, imgAct = 0, W = 0, H = 0;

    const pad = k => String(k).padStart(3, "0");
    const talla = () => (lienzo.clientWidth * Math.min(devicePixelRatio || 1, 2) > 1100 ? "g" : "p");
    const medir = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      W = lienzo.clientWidth; H = lienzo.clientHeight;
      cv.width = Math.round(W * d); cv.height = Math.round(H * d);
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      mostrado = -1;
    };
    const cercano = (lista, k) => { for (let d = 0; d < N; d++) { const a = (k - d + N) % N, b = (k + d) % N; if (lista[a]) return a; if (lista[b]) return b; } return -1; };
    const pedidos360 = {}, completos = {};
    const pedir360 = (m, ks) => {
      const t = talla(), lista = cuadros[m], hechos = pedidos360[m];
      ks = ks.filter(k => !hechos.has(k));
      ks.forEach(k => hechos.add(k));
      cola(ks.map(k => [k, `${base}/${m}/${t}/${pad(k)}.webp`]), (k, im) => {
        lista[k] = im;
        if (k === 0) raiz.classList.add("listo");
        if (m === modo && Math.abs(k - Math.floor(pos)) <= 1) mostrado = -1;
      });
    };
    const cargar = m => {   // al acercarse: uno de cada 4 cuadros (alcanza para girar)
      if (cuadros[m]) return;
      cuadros[m] = new Array(N); pedidos360[m] = new Set();
      pedir360(m, ordenCarga(N).filter(k => k % 4 === 0));
    };
    const completar360 = m => {   // al verla: los demás
      cargar(m);
      if (completos[m]) return;
      completos[m] = true;
      pedir360(m, ordenCarga(N));
    };
    // mapeo de la foto (1920×1080) al lienzo, como object-fit: cover
    const mapa = () => { const s = Math.max(W / D.ancho, H / D.alto); return { s, ox: (W - D.ancho * s) / 2, oy: (H - D.alto * s) / 2 }; };
    function dibujar() {
      const lista = cuadros[modo]; if (!lista) return;
      const f = ((pos % N) + N) % N, a = Math.floor(f), b = (a + 1) % N, t = f - a;
      const ka = cercano(lista, a); if (ka < 0) return;
      dibujarCubriendo(ctx, lista[ka], cv.width, cv.height);
      if (t > 0.03 && ka === a && lista[b]) dibujarCubriendo(ctx, lista[b], cv.width, cv.height, t);
      mostrado = pos;
      superponer(a, b, ka === a ? t : 0);
      if (document.activeElement !== rango) rango.value = Math.round(f) % N;
    }
    function superponer(a, b, t) {
      const { s, ox, oy } = mapa();
      const P = (pa, pb) => {
        const vis = pa[2] && (t < 0.5 || pb[2]);
        const x = (pa[0] + (pb[0] - pa[0]) * t) * s + ox, y = (pa[1] + (pb[1] - pa[1]) * t) * s + oy;
        return [x, y, vis && x > -10 && x < W + 10 && y > -10 && y < H + 10];
      };
      const vis = {};
      for (const id in botones) {
        const arr = D.puntos[id]; if (!arr) continue;
        const [x, y, v] = P(arr[a], arr[b]);
        const bt = botones[id];
        bt.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        bt.classList.toggle("oculto", !v);
        if (v) vis[id] = [x, y];
      }
      etiquetas(vis);
      if (D.lindero && D.lindero[a]) {
        const la = D.lindero[a], lb = D.lindero[b] || la;
        let d = "", abierto = false;
        for (let i = 0; i < la.length; i++) {
          const [x, y, v] = P(la[i], lb[i] || la[i]);
          if (!v) { abierto = false; continue; }
          d += (abierto ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
          abierto = true;
        }
        lin.setAttribute("d", d); linH.setAttribute("d", d);
      }
    }
    // las etiquetas no se pisan: se muestran por prioridad y se esconde la que chocaría con otra etiqueta o con otro punto
    let medidas = null;
    const medirEtiquetas = () => {
      medidas = {};
      for (const id in botones) {
        const e = $(".hs-eti", botones[id]);
        if (botones[id].classList.contains("principal")) botones[id].classList.remove("sin-eti");
        medidas[id] = e.offsetWidth ? { l: e.offsetLeft, t: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight } : null;
      }
    };
    const choca = (c, d) => c[0] < d[2] && c[2] > d[0] && c[1] < d[3] && c[3] > d[1];
    function etiquetas(vis) {
      if (!medidas) medirEtiquetas();
      const aceptadas = [], M = 4;
      const activo = fichaAct >= 0 && !ficha.hidden ? fichas[fichaAct].id : null;
      const orden = fichas.filter(f => f.principal || f.id === activo).map(f => f.id).sort((p, q) => (q === activo) - (p === activo));
      for (const id of orden) {
        const bt = botones[id], p = vis[id];
        let m = medidas[id];
        if (bt && !m && id === activo) { const e = $(".hs-eti", bt); if (e.offsetWidth) m = medidas[id] = { l: e.offsetLeft, t: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }; }
        if (!bt || !m || !p) continue;
        const caja = [p[0] + m.l - M, p[1] + m.t - M, p[0] + m.l + m.w + M, p[1] + m.t + m.h + M];
        let libre = id === activo || (caja[2] < W - 4 && caja[0] > 4);
        if (libre && id !== activo) {
          for (const c of aceptadas) if (choca(caja, c)) { libre = false; break; }
          if (libre) for (const o in vis) {   // los puntos principales no se tapan; los secundarios, solo si la etiqueta cae encima del centro
            const R = botones[o].classList.contains("principal") ? 13 : 6;
            if (o !== id && choca(caja, [vis[o][0] - R, vis[o][1] - R, vis[o][0] + R, vis[o][1] + R])) { libre = false; break; }
          }
        }
        bt.classList.toggle("sin-eti", !libre);
        if (libre) aceptadas.push(caja);
      }
    }
    function bucle() {
      if (!visible) { corre = false; return; }
      if (girando && !arrastre) pos += 0.035;
      else if (!arrastre && Math.abs(vel) > 0.002) { pos += vel; vel *= 0.93; }
      if (pos !== mostrado) dibujar();
      requestAnimationFrame(bucle);
    }
    let corre = false;
    const arrancar = () => { if (!corre && D) { corre = true; requestAnimationFrame(bucle); } };

    // arrastrar para girar
    let arrastre = null;
    const marcarTocado = () => { if (!tocado) { tocado = true; raiz.classList.add("tocado"); } };
    const ponerGiro = v => { girando = v; bGirar.setAttribute("aria-pressed", v ? "true" : "false"); };
    lienzo.addEventListener("pointerdown", e => {
      if (e.target.closest(".hs")) return;
      arrastre = { x: e.clientX, y: e.clientY, pos, t: performance.now(), mov: false, id: e.pointerId };
      vel = 0; marcarTocado(); ponerGiro(false);
    });
    lienzo.addEventListener("pointermove", e => {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
      if (!arrastre.mov) {
        if (Math.abs(dx) < 6) return;
        if (e.pointerType !== "mouse" && Math.abs(dy) > Math.abs(dx)) { arrastre = null; return; }   // deja bajar la página
        arrastre.mov = true; lienzo.classList.add("arrastrando");
        try { lienzo.setPointerCapture(e.pointerId); } catch { }
      }
      const porPx = (N * 0.55) / Math.max(320, W);
      const nuevo = arrastre.pos - dx * porPx;
      const ahora = performance.now();
      vel = (nuevo - pos) / Math.max(1, ahora - arrastre.t) * 16;
      arrastre.t = ahora; pos = nuevo;
      if (!corre) dibujar();
    });
    const soltar = () => { if (arrastre) { lienzo.classList.remove("arrastrando"); arrastre = null; arrancar(); } };
    lienzo.addEventListener("pointerup", soltar);
    lienzo.addEventListener("pointercancel", soltar);
    lienzo.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); marcarTocado(); ponerGiro(false); pos += e.key === "ArrowRight" ? 1 : -1; dibujar(); }
    });
    rango.addEventListener("input", () => { marcarTocado(); ponerGiro(false); pos = +rango.value; dibujar(); });
    bGirar.addEventListener("click", () => { marcarTocado(); ponerGiro(!girando); arrancar(); });
    $$("[data-capa]", raiz).forEach(b => b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      raiz.classList.toggle("sin-" + b.dataset.capa, !on);
    }));
    $$("[data-modo]", raiz).forEach(b => b.addEventListener("click", () => {
      if (b.dataset.modo === modo || !D || !(D.modos || ["dia"]).includes(b.dataset.modo)) return;
      modo = b.dataset.modo; if (visible) completar360(modo); else cargar(modo);
      $$("[data-modo]", raiz).forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      mostrado = -1; dibujar();
    }));

    // fichas de los puntos
    const TIPO = { hoy: "Hoy · foto real", "recreación": "Recreación histórica" };
    const TIPO_VISOR = { hoy: "Foto real", "recreación": "Recreación histórica" };
    function abrirFicha(i) {
      fichaAct = (i + fichas.length) % fichas.length; imgAct = 0;
      const f = fichas[fichaAct];
      $$(".hs", capaP).forEach(b => b.classList.toggle("activo", b.dataset.id === f.id));
      $(".ficha-piso", ficha).textContent = f.piso;
      $("h3", ficha).textContent = f.titulo;
      $(".ficha-p", ficha).textContent = f.texto;
      $(".ficha-cred", ficha).textContent = f.credito || "";
      $(".ficha-ir", ficha).href = f.ancla;
      const mini = $(".ficha-mini", ficha);
      mini.innerHTML = f.imagenes.length > 1 ? f.imagenes.map((m, k) => `<button type="button" aria-pressed="${k === 0}" data-k="${k}" aria-label="${m.texto.replace(/"/g, "&quot;")}"><img src="${m.src}_640.webp" alt="" loading="lazy"></button>`).join("") : "";
      ponerImg(0);
      ficha.hidden = false;
      mostrado = -1;
    }
    function ponerImg(k) {
      const f = fichas[fichaAct], m = f.imagenes[k];
      imgAct = k;
      const im = $(".ficha-media img", ficha), tg = $(".ficha-media .tag", ficha);
      if (!m) { im.hidden = true; tg.hidden = true; $(".ficha-cap", ficha).textContent = ""; return; }
      im.hidden = false; tg.hidden = false;
      im.src = m.src + "_1200.webp"; im.alt = m.texto;
      const real = m.tipo === "hoy";
      tg.textContent = TIPO[m.tipo] || "Imagen referencial";
      tg.classList.toggle("tag-real", real);
      $(".ficha-cap", ficha).textContent = m.texto;
      $$(".ficha-mini button", ficha).forEach(b => b.setAttribute("aria-pressed", +b.dataset.k === k ? "true" : "false"));
    }
    ficha.addEventListener("click", e => {
      const b = e.target.closest(".ficha-mini button");
      if (b) { ponerImg(+b.dataset.k); return; }
      const nav = e.target.closest("[data-f]");
      if (nav) { abrirFicha(fichaAct + (+nav.dataset.f)); return; }
      if (e.target.closest(".ficha-x")) { ficha.hidden = true; $$(".hs", capaP).forEach(x => x.classList.remove("activo")); mostrado = -1; dibujar(); return; }
      if (e.target.matches(".ficha-media img")) {
        const f = fichas[fichaAct];
        abrirVisor(f.imagenes.map(m => ({ src: m.src + "_2400.webp", texto: (TIPO_VISOR[m.tipo] || "Imagen referencial") + " · " + m.texto })), imgAct);
      }
      if (e.target.closest(".ficha-ir")) ficha.hidden = true;
    });

    async function iniciar() {
      for (const f of raiz.dataset.fuentes.split(",")) {
        try { const r = await fetch(f + "/datos.json", { cache: "no-cache" }); if (r.ok) { D = await r.json(); base = f; break; } } catch { }
      }
      if (!D) { raiz.classList.add("listo"); $(".m360-carga p", raiz).textContent = "La maqueta no está disponible en este momento."; return; }
      N = D.frames || 72; rango.max = N - 1;
      if ((D.modos || []).includes("noche")) $('[data-modo="noche"]', raiz).hidden = false;
      else $(".m360-ui .grupo", raiz).hidden = true;   // con un solo modo, el botón "Día" sobra
      try { fichas = (await (await fetch(raiz.dataset.fichas)).json()).puntos.filter(f => D.puntos[f.id]); } catch { fichas = []; }
      fichas.forEach((f, i) => {
        porId[f.id] = i;
        const b = document.createElement("button");
        b.type = "button"; b.className = "hs oculto" + (f.principal ? " principal" : ""); b.dataset.id = f.id;
        b.innerHTML = `<span class="hs-dot"></span><span class="hs-eti">${f.corto}</span>`;
        b.setAttribute("aria-label", f.titulo);
        b.addEventListener("click", () => { marcarTocado(); ponerGiro(false); abrirFicha(i); });
        capaP.appendChild(b); botones[f.id] = b;
      });
      medir(); cargar(modo); dibujar();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { medidas = null; mostrado = -1; });
      new ResizeObserver(() => { medir(); dibujar(); }).observe(lienzo);
      new IntersectionObserver(ents => { visible = ents[0].isIntersecting; if (visible) { completar360(modo); arrancar(); } }, { threshold: 0.05 }).observe(lienzo);
      ponerGiro(girando);
    }
    new IntersectionObserver((ents, o) => { if (ents[0].isIntersecting) { o.disconnect(); iniciar(); } }, { rootMargin: "120% 0px" }).observe(raiz);
  }

  /* pausa todo cuando la pestaña no se ve */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { videos.forEach(v => v.pause()); if (hero) hero.pause(); }
    else pedir();
  });
  pedir();
})();
