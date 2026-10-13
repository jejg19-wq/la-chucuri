/* La Chucurí · maqueta 3D de la montaña completa.
   Relieve real (Terrain Tiles / AWS) + imagen satelital (Esri) + caminos y quebradas (OpenFreeMap / OpenStreetMap)
   + capas propias: lindero oficial, cinco pisos, obras en volumen, teleférico, senderos y puntos con imágenes. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const seccion = $("#maqueta");
  if (!seccion || !window.maplibregl) return;

  /* vista general (ciudad + montaña + horizonte) y el acercamiento lento con que arranca */
  const VISTA = { center: [-72.2205, 7.7422], zoom: 14.4, pitch: 66, bearing: 162 };
  const VISTA_INTRO = { center: [-72.2197, 7.7400], zoom: 14.72, pitch: 64, bearing: 132 };
  const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
  const CIELO_DIA = { "sky-color": "#6fa8dc", "horizon-color": "#dfe8f3", "fog-color": "#e3ebf3", "fog-ground-blend": 0.55, "horizon-fog-blend": 0.75, "sky-horizon-blend": 0.6, "atmosphere-blend": 0.85 };
  const CIELO_NOCHE = { "sky-color": "#050c1a", "horizon-color": "#13233d", "fog-color": "#0a1424", "fog-ground-blend": 0.5, "horizon-fog-blend": 0.6, "sky-horizon-blend": 0.5, "atmosphere-blend": 0.6 };

  let mapa = null, puntos = [], marcadores = {}, noche = false, variante = "virgen", recorrido = null, modelos = null;
  /* versión de maqueta3d.js (la pone construir_sitio.py) para que el navegador no use una copia vieja */
  const V3D = (document.currentScript && document.currentScript.dataset.v3d) || "1";
  const ficha = $("#ficha"), cargando = $(".maq-carga"), ayuda = $(".maq-ayuda");

  function estilo() {
    return {
      version: 8,
      glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
      sources: {
        /* Esri tiene huecos en el nivel 18 de esta zona (responde sin CORS) y el 19 no existe: se pide hasta 17 y se amplía */
        satelite: { type: "raster", tiles: [ESRI], tileSize: 256, maxzoom: 17, attribution: "Imagen satelital: Esri, Maxar, Earthstar Geographics" },
        relieve: { type: "raster-dem", tiles: [DEM], tileSize: 256, maxzoom: 15, encoding: "terrarium", attribution: "Relieve: Terrain Tiles (Mapzen / AWS)" },
        omt: { type: "vector", url: "https://tiles.openfreemap.org/planet", attribution: "© OpenFreeMap · © OpenMapTiles · © colaboradores de OpenStreetMap" }
      },
      layers: [
        { id: "satelite", type: "raster", source: "satelite", paint: { "raster-saturation": 0.12, "raster-contrast": 0.06, "raster-fade-duration": 300 } },
        { id: "agua", type: "line", source: "omt", "source-layer": "waterway", minzoom: 12,
          paint: { "line-color": "#74CFFF", "line-width": ["interpolate", ["linear"], ["zoom"], 13, 1, 17, 3], "line-opacity": 0.75, "line-blur": 0.6 } },
        { id: "luces", type: "line", source: "omt", "source-layer": "transportation", minzoom: 11,
          filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service"]]],
          paint: { "line-color": "#FFB866", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.8, 16, 3.2], "line-blur": 1.4, "line-opacity": 0 } },
        { id: "caminos", type: "line", source: "omt", "source-layer": "transportation", minzoom: 12,
          filter: ["in", ["get", "class"], ["literal", ["path", "track"]]],
          paint: { "line-color": "#FFFFFF", "line-width": ["interpolate", ["linear"], ["zoom"], 13, 1, 17, 2.4], "line-dasharray": [2, 2], "line-opacity": 0.7 } },
        { id: "barrios", type: "symbol", source: "omt", "source-layer": "place", minzoom: 12,
          filter: ["in", ["get", "class"], ["literal", ["suburb", "neighbourhood", "village", "hamlet", "quarter"]]],
          layout: { "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-transform": "uppercase", "text-letter-spacing": 0.1 },
          paint: { "text-color": "#F4EFE6", "text-halo-color": "rgba(8,17,29,.85)", "text-halo-width": 1.6 } },
        { id: "picos", type: "symbol", source: "omt", "source-layer": "mountain_peak", minzoom: 12,
          layout: { "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]], "text-font": ["Noto Sans Italic"], "text-size": 12, "text-offset": [0, 0.8] },
          paint: { "text-color": "#FFE7C2", "text-halo-color": "rgba(8,17,29,.85)", "text-halo-width": 1.6 } }
      ],
      terrain: { source: "relieve", exaggeration: 1.2 },
      sky: CIELO_DIA
    };
  }

  async function capasPropias() {
    const [pisos, lindero, obras, rutas, datos] = await Promise.all(
      ["datos/pisos.json", "datos/lindero.geojson", "datos/obras.geojson", "datos/rutas.geojson", "datos/puntos.json"].map(u => fetch(u).then(r => r.json())));
    puntos = datos.puntos;
    mapa.addSource("pisos", { type: "image", url: "datos/pisos.png", coordinates: pisos.esquinas });
    mapa.addLayer({ id: "pisos", type: "raster", source: "pisos", paint: { "raster-opacity": opacidadPisos(false), "raster-fade-duration": 0 } }, "agua");
    mapa.addSource("lindero", { type: "geojson", data: lindero });
    mapa.addLayer({ id: "lindero-halo", type: "line", source: "lindero", filter: ["==", ["geometry-type"], "LineString"],
      paint: { "line-color": "#F58C1E", "line-width": 14, "line-blur": 10, "line-opacity": 0.55 } });
    mapa.addLayer({ id: "lindero", type: "line", source: "lindero", filter: ["==", ["geometry-type"], "LineString"],
      paint: { "line-color": "#FFC482", "line-width": 3 } });
    mapa.addSource("rutas", { type: "geojson", data: rutas });
    mapa.addLayer({ id: "senderos", type: "line", source: "rutas", filter: ["==", ["get", "tipo"], "sendero"],
      paint: { "line-color": "#74CFFF", "line-width": 3, "line-dasharray": [1, 1.6], "line-opacity": 0.95 } });
    mapa.addLayer({ id: "cable", type: "line", source: "rutas", filter: ["==", ["get", "tipo"], "cable"],
      paint: { "line-color": "#FFFFFF", "line-width": 3, "line-dasharray": [3, 2] } });
    /* la caminería que ya existe (Av. Rotaria – El Nevada), más marcada que los senderos propuestos */
    const esCamineria = ["==", ["get", "tipo"], "camineria"];
    mapa.addLayer({ id: "camineria-halo", type: "line", source: "rutas", filter: esCamineria,
      paint: { "line-color": "#FFD43C", "line-width": 11, "line-blur": 7, "line-opacity": 0.45 } });
    mapa.addLayer({ id: "camineria", type: "line", source: "rutas", filter: esCamineria,
      layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#FFD43C", "line-width": 3.4 } });
    mapa.addLayer({ id: "camineria-nombre", type: "symbol", source: "rutas", filter: esCamineria,
      layout: { "symbol-placement": "line", "text-field": ["get", "nombre"], "text-font": ["Noto Sans Regular"], "text-size": 12.5,
        "text-letter-spacing": 0.04, "symbol-spacing": 380, "text-offset": [0, -1.2] },
      paint: { "text-color": "#FFE7A3", "text-halo-color": "rgba(8,17,29,.92)", "text-halo-width": 1.8 } });
    mapa.addSource("obras", { type: "geojson", data: obras });
    mapa.addLayer({ id: "obras", type: "fill-extrusion", source: "obras", filter: filtroObras(),
      paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "alto"], "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-opacity": 0.96, "fill-extrusion-vertical-gradient": true } });
    leyenda(pisos.pisos);
    ponerPuntos();
  }

  /* los colores de los pisos se ven de lejos y se desvanecen al acercarse, para que se vea el bosque real */
  function opacidadPisos(deNoche) {
    return ["interpolate", ["linear"], ["zoom"], 14, deNoche ? 0.3 : 0.5, 16.5, deNoche ? 0.1 : 0.16];
  }
  function filtroObras() {
    return ["any", ["!=", ["get", "grupo"], "cima"], ["==", ["get", "variante"], variante]];
  }

  function leyenda(lista) {
    const el = $(".leyenda-pisos");
    if (!el) return;
    const linea = fondo => `<i style="background:${fondo};height:4px;vertical-align:3px"></i>`;
    el.innerHTML = '<b style="color:var(--neon-2)">Los cinco pisos</b>' + lista.map((p, i) =>
      `<span><i style="background:${p.color}"></i>${i + 1} · ${p.nombre}</span>`).join("") +
      '<b style="color:var(--neon-2);margin-top:6px">Caminos</b>' +
      `<span>${linea("#FFD43C")}Caminería que ya existe</span>` +
      `<span>${linea("repeating-linear-gradient(90deg,#74CFFF 0 4px,transparent 4px 7px)")}Senderos propuestos</span>` +
      `<span>${linea("repeating-linear-gradient(90deg,#fff 0 6px,transparent 6px 10px)")}Teleférico propuesto</span>`;
  }

  /* ---------------- puntos ---------------- */
  function ponerPuntos() {
    const ACCESOS = ["nevada", "viento", "panaga", "roca", "rotaria"];
    puntos.forEach(p => {
      const b = document.createElement("button");
      const acceso = ACCESOS.includes(p.id);
      b.type = "button";
      /* en la cima la etiqueta va al lado del punto, para no tapar la imagen de 34 m que se levanta ahí */
      const lado = p.id === "cima";
      b.className = "hs" + (acceso ? " acceso" : "") + (lado ? " lado" : "");
      b.setAttribute("aria-label", p.titulo);
      const corto = p.titulo.split(" · ")[0];
      const sobre = p.piso ? "Piso " + p.piso : (acceso ? "Alrededores" : "Conexión");
      b.innerHTML = `<span class="hs-etiqueta"><small>${sobre}</small>${corto}</span><span class="hs-punto"></span>`;
      b.addEventListener("click", ev => { ev.stopPropagation(); detenerRecorrido(); abrir(p.id, true); });
      marcadores[p.id] = { el: b, m: new maplibregl.Marker({ element: b, anchor: lado ? "left" : "bottom", offset: lado ? [-8, 0] : [0, 0] })
        .setLngLat([p.lon, p.lat]).addTo(mapa) };
    });
    ajustarEtiquetas();
    /* los vuelos mueven la cámara cuadro a cuadro: las etiquetas se reordenan cuando la cámara se queda quieta */
    let espera = 0;
    mapa.on("moveend", () => { clearTimeout(espera); espera = setTimeout(ajustarEtiquetas, 140); });
    requestAnimationFrame(() => requestAnimationFrame(ajustarEtiquetas));
  }
  /* etiquetas sin encimarse: se muestran por orden de importancia; las que chocan quedan como punto (se ven al pasar el cursor) */
  const PRIORIDAD = ["puerta", "cima", "glamping", "bosque", "bulevar", "villa", "teleferico", "nevada", "rotaria", "estacion", "capilla",
    "cabanas", "aventura", "restaurante", "universidad", "puente", "observatorio", "pinos", "portal", "viento", "panaga", "roca"];
  function ajustarEtiquetas() {
    seccion.classList.toggle("compacto", mapa.getZoom() < 14.6 && window.innerWidth < 900);
    const ids = Object.keys(marcadores).sort((a, b) => {
      const pa = marcadores[a].el.classList.contains("activo") ? -1 : PRIORIDAD.indexOf(a);
      const pb = marcadores[b].el.classList.contains("activo") ? -1 : PRIORIDAD.indexOf(b);
      return pa - pb;
    });
    ids.forEach(id => marcadores[id].el.classList.remove("sin-etiqueta"));
    const ocupado = [];
    ids.forEach(id => {
      const r = marcadores[id].el.querySelector(".hs-etiqueta").getBoundingClientRect();
      if (!r.width) return;
      const choca = ocupado.some(o => r.left - 6 < o.right && r.right + 6 > o.left && r.top - 4 < o.bottom && r.bottom + 4 > o.top);
      if (choca) marcadores[id].el.classList.add("sin-etiqueta"); else ocupado.push(r);
    });
  }

  /* ---------------- ficha del lugar ---------------- */
  let actual = null, imgs = [], idx = 0;
  const NOMBRE_TIPO = { "hoy": "Hoy · foto real", "día": "Propuesta · de día", "noche": "De noche", "detalle": "De cerca", "variación": "Variaciones" };

  function abrir(id, volar) {
    const p = puntos.find(x => x.id === id);
    if (!p) return;
    actual = p;
    explorar();
    Object.entries(marcadores).forEach(([k, v]) => v.el.classList.toggle("activo", k === id));
    $(".ficha-cuerpo h3", ficha).textContent = p.titulo;
    $(".ficha-piso", ficha).textContent = p.piso ? `Piso ${p.piso} · ${p.altura.toLocaleString("es-VE")} m` : `${p.altura.toLocaleString("es-VE")} m sobre el mar`;
    $(".ficha-cuerpo .pie", ficha).textContent = p.texto;
    const cr = $(".ficha-credito", ficha);
    cr.hidden = !p.credito;
    cr.textContent = p.credito || "";
    imgs = p.imagenes || [];
    const tipos = [...new Set(imgs.map(i => i.tipo))];
    $(".ficha-tabs", ficha).innerHTML = tipos.map(t => `<button type="button" data-t="${t}">${NOMBRE_TIPO[t] || t}</button>`).join("");
    $(".ficha-img", ficha).hidden = !imgs.length;
    mostrar(imgs.findIndex(i => i.tipo !== "hoy") >= 0 ? imgs.findIndex(i => i.tipo !== "hoy") : 0);
    ficha.hidden = false;
    if (volar) volarA(p);
  }
  function mostrar(i) {
    if (!imgs.length) { $(".ficha-mini", ficha).innerHTML = ""; return; }
    idx = (i + imgs.length) % imgs.length;
    const im = imgs[idx], img = $(".ficha-img img", ficha);
    img.style.opacity = 0;
    const nuevo = new Image();
    nuevo.onload = () => { img.src = nuevo.src; img.alt = im.texto; img.style.opacity = 1; };
    nuevo.src = im.src + "_1200.webp";
    const tag = $(".ficha-img .tag", ficha);
    /* las fotos FR_ son reales pero no del dron (las mandó Jackson) */
    tag.textContent = im.tipo === "hoy" ? (im.src.includes("/FR_") ? "Hoy · foto real" : "Hoy · foto real del dron")
      : "Imagen referencial · " + (NOMBRE_TIPO[im.tipo] || im.tipo);
    tag.classList.toggle("real", im.tipo === "hoy");
    $(".ficha-img figcaption", ficha).textContent = im.texto;
    $$(".ficha-tabs button", ficha).forEach(b => b.setAttribute("aria-pressed", b.dataset.t === im.tipo ? "true" : "false"));
    $(".ficha-mini", ficha).innerHTML = imgs.map((x, k) =>
      `<button type="button" data-k="${k}" aria-label="${x.texto}" ${k === idx ? 'aria-current="true"' : ""}><img src="${x.src}_1200.webp" alt="" loading="lazy"></button>`).join("");
  }
  function cerrar() {
    const estaba = !ficha.hidden;
    ficha.hidden = true;
    Object.values(marcadores).forEach(v => v.el.classList.remove("activo"));
    if (estaba && mapa && !recorrido) volar({ center: mapa.getCenter() }, 900, null, false);
  }
  /* hacia dónde mira la cámara en cada sitio: abajo, desde la ciudad hacia la montaña; arriba, desde la montaña hacia la ciudad */
  const RUMBO = { puerta: 140, universidad: 140, portal: 140, bulevar: 145, villa: 135, restaurante: 140, bosque: 140, puente: 140,
    /* glamping, cabañas y aventura están ladera abajo de la cima: mirando hacia la ciudad la cámara quedaba encima de la cumbre */
    observatorio: 140, teleferico: 120, glamping: 200, cabanas: 165, aventura: 150, estacion: 295, capilla: 300, cima: 300, pinos: 300,
    nevada: 220, rotaria: 150 };
  function volarA(p) {
    const lejos = !p.piso && p.id !== "teleferico";      /* el teleférico, de cerca: se ven las torres y las cabinas */
    const pad = window.innerWidth > 900 ? { top: 60, right: ficha.offsetWidth + 60 } : { bottom: ficha.offsetHeight };
    const rumbo = RUMBO[p.id] ?? mapa.getBearing() * 0.6 + 150 * 0.4;
    /* cerca, para ver los modelos 3D con detalle */
    volar({ center: [p.lon, p.lat], zoom: lejos ? 15.4 : 16.9, pitch: 64, bearing: rumbo, padding: pad }, 3400);
  }

  /* ---------------- cámara propia ----------------
     MapLibre 5.9 deja "congelada" la altura del centro después de flyTo/easeTo con relieve (no libera _elevationFreeze),
     y la cámara termina apuntando por debajo de los sitios altos (la capilla quedaba fuera de cuadro).
     Por eso los vuelos se hacen cuadro a cuadro con jumpTo, pasando la altura del terreno en el destino. */
  let vuelo = 0;
  const lerp = (a, b, k) => a + (b - a) * k;
  const suave = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  function alturaEn(c) {
    const e = mapa.queryTerrainElevation(c);
    return Number.isFinite(e) && e > 1 ? e : null;
  }
  function volar(dest, ms, alTerminar, conArco = true) {
    pararVuelo();
    const c0 = mapa.getCenter(), z0 = mapa.getZoom(), p0 = mapa.getPitch(), b0 = mapa.getBearing();
    const e0 = mapa.getCenterElevation(), pad0 = mapa.getPadding();
    const c1 = maplibregl.LngLat.convert(dest.center);
    const z1 = dest.zoom ?? z0, p1 = dest.pitch ?? p0;
    const giro = ((((dest.bearing ?? b0) - b0) % 360) + 540) % 360 - 180;
    const pad1 = Object.assign({ top: 0, bottom: 0, left: 0, right: 0 }, dest.padding || {});
    const arco = conArco ? Math.min(1.1, c0.distanceTo(c1) / 1000 * 0.45) : 0;   /* en saltos largos se aleja a mitad de camino */
    let eFin = alturaEn(c1) ?? e0;
    const cuadro = e => {
      const ahora = alturaEn(c1);
      if (ahora !== null) eFin = ahora;
      mapa.jumpTo({
        center: [lerp(c0.lng, c1.lng, e), lerp(c0.lat, c1.lat, e)],
        zoom: lerp(z0, z1, e) - arco * Math.sin(Math.PI * e),
        pitch: lerp(p0, p1, e), bearing: b0 + giro * e,
        /* MapLibre rechaza márgenes negativos, aunque sean de redondeo */
        padding: { top: Math.max(0, lerp(pad0.top, pad1.top, e)), bottom: Math.max(0, lerp(pad0.bottom, pad1.bottom, e)),
          left: Math.max(0, lerp(pad0.left, pad1.left, e)), right: Math.max(0, lerp(pad0.right, pad1.right, e)) },
        elevation: lerp(e0, eFin, e)
      });
    };
    if (reduce || !ms) { cuadro(1); if (alTerminar) alTerminar(); return; }
    const t0 = performance.now();
    const paso = t => {
      const k = Math.max(0, Math.min(1, (t - t0) / ms));   /* el primer cuadro puede traer una hora anterior a t0 */
      cuadro(suave(k));
      if (k < 1) vuelo = requestAnimationFrame(paso);
      else { vuelo = 0; if (alTerminar) alTerminar(); }
    };
    vuelo = requestAnimationFrame(paso);
  }
  function pararVuelo() { if (vuelo) cancelAnimationFrame(vuelo); vuelo = 0; }

  ficha.addEventListener("click", ev => {
    const t = ev.target.closest("[data-t]");
    if (t) { mostrar(imgs.findIndex(i => i.tipo === t.dataset.t)); return; }
    const k = ev.target.closest("[data-k]");
    if (k) { mostrar(+k.dataset.k); return; }
    if (ev.target.closest(".ficha-cerrar")) { cerrar(); return; }
    if (ev.target.closest(".ficha-img") && imgs.length && window.Visor) {
      window.Visor.abrir(imgs.map(i => ({ src: i.src + "_2400.webp", texto: (i.tipo === "hoy" ? "Foto real · " : "Imagen referencial · ") + i.texto })), idx);
      return;
    }
    const nav = ev.target.closest("[data-nav]");
    if (nav && actual) {
      const orden = puntos.map(p => p.id), j = orden.indexOf(actual.id);
      abrir(orden[(j + (nav.dataset.nav === "sig" ? 1 : -1) + orden.length) % orden.length], true);
    }
  });

  /* ---------------- día / noche ---------------- */
  function ponerNoche(v) {
    noche = v;
    $$("[data-modo]").forEach(b => b.setAttribute("aria-pressed", (b.dataset.modo === "noche") === v ? "true" : "false"));
    seccion.classList.toggle("de-noche", v);
    /* no usar isStyleLoaded(): da falso mientras cargan teselas (p. ej. durante un vuelo) y el cambio se perdía.
       Si el mapa aún no arrancó, el estado queda guardado y se aplica al terminar de cargar. */
    if (!mapa) return;
    try { if (!mapa.getLayer("satelite")) return; } catch (e) { return; }
    mapa.setPaintProperty("satelite", "raster-brightness-max", v ? 0.22 : 1);
    mapa.setPaintProperty("satelite", "raster-saturation", v ? -0.55 : 0.12);
    mapa.setPaintProperty("satelite", "raster-hue-rotate", v ? 200 : 0);
    mapa.setPaintProperty("luces", "line-opacity", v ? 0.85 : 0);
    mapa.setPaintProperty("caminos", "line-opacity", v ? 0.35 : 0.7);
    mapa.setPaintProperty("agua", "line-opacity", v ? 0.45 : 0.75);
    if (mapa.getLayer("obras")) mapa.setPaintProperty("obras", "fill-extrusion-color", ["get", v ? "noche" : "color"]);
    if (mapa.getLayer("pisos")) mapa.setPaintProperty("pisos", "raster-opacity", opacidadPisos(v));
    if (mapa.setSky) mapa.setSky(v ? CIELO_NOCHE : CIELO_DIA);
    if (modelos) modelos.ponerNoche(v);
  }

  /* ---------------- recorrido guiado ---------------- */
  /* sube por la montaña mirando hacia ella y, desde el glamping, gira para mirar la ciudad */
  const PARADAS = ["puerta", "universidad", "bulevar", "villa", "restaurante", "bosque", "puente", "teleferico", "glamping", "cabanas", "aventura",
    "estacion", "capilla", "cima", "pinos", "nevada", "viento"];
  function iniciarRecorrido() {
    detenerRecorrido();
    let i = 0;
    const btn = $("[data-accion=recorrido]");
    btn.setAttribute("aria-pressed", "true");
    const paso = () => {
      if (!recorrido) return;
      if (i >= PARADAS.length) { detenerRecorrido(); cerrar(); volar(VISTA, 4000); return; }
      abrir(PARADAS[i++], true);
      recorrido.t = setTimeout(paso, reduce ? 4000 : 9000);
    };
    recorrido = { t: null };
    paso();
  }
  function detenerRecorrido() {
    if (recorrido) clearTimeout(recorrido.t);
    recorrido = null;
    const btn = $("[data-accion=recorrido]");
    if (btn) btn.setAttribute("aria-pressed", "false");
  }

  /* ---------------- controles ---------------- */
  seccion.addEventListener("click", ev => {
    const b = ev.target.closest("[data-modo],[data-accion],[data-variante],[data-capa]");
    if (!b || !mapa) return;
    if (b.dataset.modo) ponerNoche(b.dataset.modo === "noche");
    if (b.dataset.accion === "recorrido") recorrido ? detenerRecorrido() : iniciarRecorrido();
    if (b.dataset.accion === "inicio") { detenerRecorrido(); cerrar(); volar(VISTA, 2500); }
    if (b.dataset.accion === "completa") {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else seccion.requestFullscreen && seccion.requestFullscreen().catch(() => {});
    }
    if (b.dataset.variante) {
      variante = b.dataset.variante;
      $$("[data-variante]").forEach(x => x.setAttribute("aria-pressed", x.dataset.variante === variante ? "true" : "false"));
      if (mapa.getLayer("obras")) mapa.setFilter("obras", filtroObras());
      if (modelos) modelos.ponerVariante(variante);
      abrir("cima", true);
      /* la ficha muestra la imagen de la variación elegida */
      const k = imgs.findIndex(i => i.src.includes({ virgen: "V1g", cristo: "V2g", rosario: "V3g" }[variante]));
      if (k >= 0) mostrar(k);
    }
    if (b.dataset.capa) {
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      const capas = { pisos: ["pisos"], obras: [modelos ? "modelos3d" : "obras"],
        rutas: ["senderos", "caminos", "camineria", "camineria-halo", "camineria-nombre"].concat(modelos ? [] : ["cable"]) }[b.dataset.capa] || [];
      capas.forEach(c => mapa.getLayer(c) && mapa.setLayoutProperty(c, "visibility", on ? "visible" : "none"));
      if (b.dataset.capa === "pisos") $(".leyenda-pisos").hidden = !on;
    }
  });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape" && !ficha.hidden) cerrar(); });

  /* ---------------- arranque perezoso: el mapa se crea al acercarse a la sección ---------------- */
  function crear() {
    if (mapa) return;
    mapa = new maplibregl.Map({
      container: "mapa", style: estilo(), ...VISTA, maxPitch: 80, minZoom: 11.5, maxZoom: 17.6,
      cooperativeGestures: true, attributionControl: { compact: true }, fadeDuration: 200,
      /* bordes limpios en los modelos 3D; en pantallas densas (teléfonos) no hace falta y se ahorra trabajo */
      canvasContextAttributes: { antialias: (window.devicePixelRatio || 1) < 2 && !/[?&]sinaa\b/.test(location.search) }
    });
    window.maqueta = mapa;
    mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), "top-right");
    mapa.on("load", async () => {
      try { await capasPropias(); } catch (e) { console.error("Capas de la maqueta:", e); }
      cargarModelos();
      ponerNoche(noche);
      cargando.classList.add("fuera");
      /* créditos del mapa plegados en su botón (i); también están en el pie de la página */
      const cred = $("#mapa .maplibregl-ctrl-attrib");
      if (cred) cred.classList.remove("maplibregl-compact-show");
      listo = true;
      intro();
    });
    mapa.on("click", () => { if (!ficha.hidden && window.innerWidth < 900) cerrar(); });
    /* al tocar el mapa: se detiene cualquier vuelo y el título se retira para dejar ver la montaña */
    ["mousedown", "touchstart"].forEach(t => mapa.on(t, () => { pararVuelo(); explorar(); }));
  }
  /* el acercamiento inicial corre una sola vez, cuando el mapa está listo y la sección está a la vista */
  let listo = false, aLaVista = false, introHecha = false;
  function intro() {
    if (!listo || !aLaVista || introHecha) return;
    introHecha = true;
    if (!reduce && !seccion.classList.contains("explorando")) volar(VISTA_INTRO, 11000, null, false);
    setTimeout(() => ayuda && ayuda.classList.add("fuera"), 5000);
    setTimeout(explorar, 12000);
  }
  function explorar() {
    seccion.classList.add("explorando");
    if (ayuda) ayuda.classList.add("fuera");
  }

  /* modelos 3D detallados (three.js, js/maqueta3d.js). Si no cargan, quedan los volúmenes simples. */
  let seVe = false;
  async function cargarModelos() {
    if (/[?&]sin3d\b/.test(location.search)) return;     /* para comparar: ?sin3d deja los volúmenes simples */
    try {
      const [mod, datos] = await Promise.all([
        import(new URL("js/maqueta3d.js?v=" + V3D, document.baseURI).href),
        fetch("datos/modelos.json").then(r => r.json())]);
      modelos = mod.crearModelos3D(mapa, maplibregl, datos);
      mapa.addLayer(modelos.capa);
      /* con los modelos ya no hacen falta los volúmenes simples ni la línea del teleférico pintada en el suelo */
      if (mapa.getLayer("obras")) mapa.setLayoutProperty("obras", "visibility", "none");
      if (mapa.getLayer("cable")) mapa.setLayoutProperty("cable", "visibility", "none");
      const chip = $("[data-capa=obras]");
      if (chip && chip.getAttribute("aria-pressed") !== "true") mapa.setLayoutProperty("modelos3d", "visibility", "none");
      modelos.ponerVariante(variante);
      modelos.ponerNoche(noche);
      animarModelos();
    } catch (e) {
      console.warn("Modelos 3D no disponibles; quedan los volúmenes simples.", e);
      modelos = null;
    }
  }
  /* las cabinas del teleférico solo se mueven con la maqueta a la vista (ahorra batería) */
  function animarModelos() { if (modelos) modelos.animar(seVe && !reduce && !document.hidden); }
  if ("IntersectionObserver" in window)
    new IntersectionObserver(e => { seVe = e.some(x => x.isIntersecting); animarModelos(); }, { threshold: 0.15 }).observe(seccion);
  document.addEventListener("visibilitychange", animarModelos);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { crear(); io.disconnect(); } }, { rootMargin: "600px 0px" });
    io.observe(seccion);
    const io2 = new IntersectionObserver(e => { if (e.some(x => x.intersectionRatio >= 0.5)) { aLaVista = true; intro(); io2.disconnect(); } }, { threshold: [0.5] });
    io2.observe(seccion);
  } else { aLaVista = true; crear(); }
  $$("[data-ir-maqueta]").forEach(a => a.addEventListener("click", () => setTimeout(crear, 50)));
})();
