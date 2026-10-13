/* La Chucurí · modelos 3D de la maqueta (three.js dentro de MapLibre, como capa "custom").
   Reemplaza los volúmenes simples por obras con forma y materiales: piedra, madera, vidrio y techos verdes.
   El teleférico tiene torres y cabinas que suben y bajan por el cable, y de noche se encienden las luces.
   Cada obra se apoya en el relieve del mapa (exagerado 1,2) en su propio punto. */
import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.min.js";

const EXAG = 1.2;                 // la misma exageración del relieve del mapa
const VEL_CABINA = 22;            // m/s, más rápido que la realidad para que se note el movimiento
const rad = THREE.MathUtils.degToRad;

export function crearModelos3D(mapa, maplibregl, datos) {
  const origen = maplibregl.LngLat.convert(datos.origen);
  const merc0 = maplibregl.MercatorCoordinate.fromLngLat(origen);
  const s = merc0.meterInMercatorCoordinateUnits();
  const anclados = [];              // obras apoyadas en el terreno: { obj, lngLat, alt }
  let e0 = datos.alt0 * EXAG, noche = false, animar = false, cuadros = 0, ultimo = 0, espera = 0;

  /* ---------------- materiales ---------------- */
  const std = (color, rugosidad = 0.8, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rugosidad, metalness: metal });
  const M = {
    piedra: std(0xcabca6, 0.92), piedraClara: std(0xe3d9c6, 0.9), madera: std(0x8a5a37, 0.72), maderaClara: std(0xc4976a, 0.68),
    blanco: std(0xf1ece3, 0.6), techoVerde: std(0x5d7c3a, 1), techoMetal: std(0x3d4a40, 0.5, 0.35),
    acero: std(0xa9b2bc, 0.38, 0.75), estatua: std(0xfbfaf6, 0.35), lona: std(0xf6f1e6, 0.85), cabina: std(0xd9452c, 0.45, 0.15),
    ventana: std(0x24384a, 0.12, 0.55),
    vidrio: new THREE.MeshStandardMaterial({ color: 0xa8d6f5, roughness: 0.06, metalness: 0.25, transparent: true, opacity: 0.5 }),
    costillas: new THREE.MeshBasicMaterial({ color: 0xe8edf2, wireframe: true, transparent: true, opacity: 0.45 }),
    cable: new THREE.LineBasicMaterial({ color: 0x2b3138 })
  };
  /* de noche: lo que brilla y con qué color */
  const LUZ = [[M.ventana, 0xffc77a, 1.6], [M.vidrio, 0xffd79c, 0.9], [M.lona, 0xffcf8a, 0.75], [M.estatua, 0xfff6e2, 0.55],
    [M.cabina, 0xff9a6a, 0.35]];

  /* ---------------- piezas ---------------- */
  function caja(w, h, d, mat, x = 0, y = 0, z = 0) {              // apoyada: y es la base
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    return m;
  }
  function cilindro(rArriba, rAbajo, h, mat, x = 0, y = 0, z = 0, seg = 24) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rArriba, rAbajo, h, seg), mat);
    m.position.set(x, y + h / 2, z);
    return m;
  }
  function prisma(w, h, largo, mat, x = 0, y = 0, z = 0) {          // techo a dos aguas: cumbrera a lo largo de z
    const f = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
    const g = new THREE.ExtrudeGeometry(f, { depth: largo, bevelEnabled: false });
    g.translate(0, 0, -largo / 2);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    return m;
  }
  function barra(a, b, r, mat) {                                    // cilindro de a a b
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), dir = vb.clone().sub(va);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 8), mat);
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return m;
  }
  function cupula(r, mat, seg = 36) {
    return new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg / 2), 0, Math.PI * 2, 0, Math.PI / 2), mat);
  }
  function grupo(...hijos) { const g = new THREE.Group(); hijos.forEach(h => g.add(h)); return g; }
  /* une todas las piezas de una obra en una malla por material: muchas menos llamadas de dibujo (importante en teléfonos) */
  function fusionar(g) {
    g.updateMatrixWorld(true);
    const inv = g.matrixWorld.clone().invert(), porMat = new Map();
    g.traverse(o => {
      if (!o.isMesh) return;
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      if (!porMat.has(o.material)) porMat.set(o.material, []);
      porMat.get(o.material).push(geo);
    });
    const unido = new THREE.Group();
    for (const [mat, geos] of porMat) {
      const n = geos.reduce((t, x) => t + x.attributes.position.count, 0);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
      let k = 0;
      for (const x of geos) {
        pos.set(x.attributes.position.array, k * 3);
        nor.set(x.attributes.normal.array, k * 3);
        k += x.attributes.position.count;
        x.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      unido.add(new THREE.Mesh(geo, mat));
    }
    return unido;
  }

  /* ---------------- obras ---------------- */
  const OBRAS = {
    /* edificio mariposa: salón de vidrio, dos alas de madera, techo en V como alas abiertas, dos domos de mariposas y la plaza */
    mariposario() {
      const g = grupo(caja(40, 7.5, 22, M.piedra, 0, -6, 0), caja(28, 7, 14, M.vidrio, 0, 1.5, 0), caja(28.6, 0.6, 14.6, M.blanco, 0, 8.5, 0));
      for (const sx of [-1, 1]) {
        g.add(caja(26, 5.5, 15, M.madera, sx * 27, 1.5, -2));
        g.add(caja(24, 3, 15.2, M.ventana, sx * 27, 2.4, -2));
        const ala = caja(34, 0.7, 24, M.maderaClara, sx * 17, 0, 0), eje = grupo(ala);
        eje.position.set(sx * 9, 9.2, -2);
        eje.rotation.z = sx * rad(14);
        g.add(eje);
        const domo = cupula(12.5, M.vidrio), red = cupula(12.6, M.costillas, 14);
        domo.position.set(sx * 50, 1.5, -6);
        red.position.copy(domo.position);
        g.add(domo, red, cilindro(13.3, 13.8, 7, M.piedra, sx * 50, -5.5, -6, 40));
      }
      g.add(cilindro(22, 22, 1.4, M.piedraClara, 0, -0.8, -42, 56));
      return g;
    },
    /* portal de piedra y madera con taquillas */
    portal() {
      const g = grupo(caja(4.5, 12, 4.5, M.piedra, -16, -3, 0), caja(4.5, 12, 4.5, M.piedra, 16, -3, 0),
        caja(40, 1.3, 9, M.madera, 0, 8.6, 0), caja(41, 0.6, 10, M.techoVerde, 0, 9.9, 0));
      for (let i = -1; i <= 1; i++) g.add(caja(3.4, 3, 3, M.maderaClara, i * 6, 0, 0), caja(3.5, 1.2, 3.1, M.ventana, i * 6, 1.4, 0));
      return g;
    },
    estacion_base() {
      return grupo(caja(22, 10, 12, M.piedra, 0, -4, 0), caja(20, 3.6, 12.2, M.vidrio, 0, 6, 0), caja(24, 0.8, 14, M.maderaClara, 0, 9.6, 0));
    },
    estacion_alta() {
      return grupo(caja(16, 12, 10, M.piedra, 0, -6, 0), caja(14, 3.4, 10.2, M.vidrio, 0, 6, 0), caja(18, 0.8, 12, M.maderaClara, 0, 9.4, 0));
    },
    /* Estación Mirador: pabellón largo de vidrio con techo verde, volado sobre la ladera, y su terraza hacia la ciudad */
    estacion_mirador() {
      const g = grupo(caja(46, 10, 14, M.piedra, 0, -8, 0), caja(44, 4.2, 12, M.vidrio, 0, 2, 0),
        caja(48.4, 0.35, 16.4, M.madera, 0, 6.1, 0), caja(48, 0.9, 16, M.techoVerde, 0, 6.4, 0),
        caja(46, 0.45, 10, M.madera, 0, 1.6, 12), caja(46, 1.1, 0.14, M.vidrio, 0, 2.05, 16.9));
      for (let i = 0; i < 6; i++) {   // sombrillas de la terraza
        const x = -18 + i * 7.2;
        g.add(cilindro(0.08, 0.08, 2.4, M.madera, x, 2, 12));
        const c = new THREE.Mesh(new THREE.ConeGeometry(2.1, 0.9, 16, 1, true), M.lona);
        c.position.set(x, 4.6, 12);
        g.add(c);
      }
      return g;
    },
    /* Capilla de los Pinos: nave de piedra, techo a dos aguas, fachada de vidrio hacia la ciudad y campanario con cruz */
    capilla() {
      const g = grupo(caja(13, 12, 25, M.piedra, 0, -4, 0), prisma(14.6, 6, 26.6, M.techoMetal, 0, 8, 0),
        caja(9, 7, 0.5, M.vidrio, 0, 0.6, 12.6), caja(4.6, 24, 4.6, M.piedra, 4.5, -4, -10.5));
      const techo = new THREE.Mesh(new THREE.ConeGeometry(3.6, 4.5, 4), M.techoMetal);
      techo.position.set(4.5, 22.25, -10.5);
      techo.rotation.y = Math.PI / 4;
      g.add(techo, caja(0.45, 3.4, 0.45, M.blanco, 4.5, 24.4, -10.5), caja(2, 0.45, 0.45, M.blanco, 4.5, 26.4, -10.5));
      return g;
    },
    plaza_cima() { return grupo(cilindro(28, 28, 1.6, M.piedraClara, 0, -1.2, 0, 72), cilindro(9, 9, 1.8, M.piedra, 0, -1.2, 0, 40)); },
    /* Virgen Inmaculada de unos 34 m con el pedestal */
    virgen() {
      const perfil = [[0, 0], [3.5, 0], [3.3, 3], [3.0, 8], [2.6, 13], [2.3, 17], [2.55, 20], [2.25, 22.5], [1.45, 24.2], [1.1, 25], [0, 25.2]];
      const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), 40), M.estatua);
      const cabeza = new THREE.Mesh(new THREE.SphereGeometry(1.45, 24, 16), M.estatua);
      const velo = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.6, 32, 1, true), M.estatua);
      cuerpo.position.y = 6;
      cabeza.position.y = 32.4;
      velo.position.y = 31.2;
      return grupo(cilindro(5.6, 6.4, 9, M.piedra, 0, -3, 0, 40), cuerpo, cabeza, velo);
    },
    cristo() {
      const perfil = [[0, 0], [3.0, 0], [2.8, 4], [2.4, 12], [2.1, 18], [2.4, 22], [1.2, 23.6], [0, 23.8]];
      const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), 40), M.estatua);
      const cabeza = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 16), M.estatua);
      cuerpo.position.y = 6;
      cabeza.position.y = 31;
      return grupo(cilindro(5.6, 6.4, 9, M.piedra, 0, -3, 0, 40), cuerpo, cabeza, caja(24, 1.8, 2.2, M.estatua, 0, 27.4, 0));
    },
    /* el gran Rosario: la cruz en el centro; las cuentas se apoyan una por una en la cumbre (ver rosario() abajo) */
    rosario() { return grupo(cilindro(2.6, 3.2, 3, M.piedra, 0, -1.5, 0), caja(2.2, 21, 2.2, M.estatua, 0, 0, 0), caja(11, 2.2, 2.2, M.estatua, 0, 14, 0)); },
    observatorio() {
      const g = grupo(caja(9.4, 0.6, 9.4, M.madera, 0, 20, 0), caja(5, 2.6, 5, M.vidrio, 0, 20.6, 0));
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(barra([sx * 2.8, -3, sz * 2.8], [sx * 1.8, 20, sz * 1.8], 0.32, M.madera));
      for (const sz of [-4.6, 4.6]) g.add(caja(9.4, 1, 0.12, M.madera, 0, 20.6, sz));
      const techo = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3.2, 8), M.techoMetal);
      techo.position.y = 24.8;
      g.add(techo);
      return g;
    },
    restaurante() {
      const g = grupo(caja(18, 2.4, 9, M.piedra, 0, -2, 0), caja(16.5, 3.4, 8, M.vidrio, 0, 0.4, 0), caja(20, 0.7, 11, M.techoVerde, 0, 3.9, 0),
        caja(18, 0.35, 8, M.piedraClara, 0, 0.1, -9));
      for (const x of [-9.2, -3, 3, 9.2]) for (const z of [-4.6, 4.6]) g.add(cilindro(0.18, 0.18, 3.6, M.madera, x, 0.4, z, 8));
      return g;
    },
    salon_glamping() {
      const techo = prisma(7, 2.2, 11, M.techoMetal, 0, 3.4, 0);
      techo.rotation.y = Math.PI / 2;
      return grupo(caja(10, 4.4, 6, M.madera, 0, -1, 0), caja(9, 1.6, 6.15, M.ventana, 0, 1, 0), techo);
    },
    /* domo de glamping sobre su plataforma de madera */
    domo() {
      const d = cupula(3.6, M.lona, 24), red = cupula(3.62, M.costillas, 8);
      d.position.y = red.position.y = 0.3;
      return grupo(cilindro(5, 5, 1.6, M.madera, 0, -1.3, 0, 24), d, red);
    },
    /* edificio bajo de la villa: base de piedra, pisos con franja de ventanas y balcones de madera, techo verde */
    edificio(o) {
      const pisos = o.pisos || 3, g = grupo(caja(18.6, 9, 10.6, M.piedra, 0, -8, 0));
      for (let p = 0; p < pisos; p++) {
        const y = 1 + p * 3.4;
        g.add(caja(18, 3.4, 10, M.blanco, 0, y, 0), caja(16.4, 2, 10.2, M.ventana, 0, y + 0.8, 0), caja(18.8, 0.22, 12.4, M.madera, 0, y + 3.25, 1));
      }
      g.add(caja(18.4, 0.6, 10.4, M.techoVerde, 0, 1 + pisos * 3.4, 0));
      return g;
    },
    /* cabaña de madera sobre pilotes */
    cabana() {
      const g = grupo(caja(6, 0.3, 5, M.madera, 0, 1.5, 0), caja(5.6, 2.6, 4.4, M.madera, 0, 1.8, -0.2),
        caja(5.7, 1.5, 0.12, M.ventana, 0, 2.3, 2.05), caja(6, 0.15, 1.8, M.maderaClara, 0, 1.5, 3.3));
      const techo = prisma(5.6, 2, 6.6, M.techoMetal, 0, 4.4, -0.2);
      techo.rotation.y = Math.PI / 2;
      g.add(techo);
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(cilindro(0.18, 0.18, 6.5, M.madera, sx * 2.6, -5, sz * 2.1, 8));
      return g;
    }
  };

  /* ---------------- ubicar en el terreno ---------------- */
  const escena = new THREE.Scene();
  escena.rotateX(Math.PI / 2);                                       // three usa "y" hacia arriba
  escena.scale.multiply(new THREE.Vector3(1, 1, -1));                // ahora: x = este, y = arriba, z = norte
  const raiz = new THREE.Group();
  escena.add(raiz);

  const local = lngLat => {
    const m = maplibregl.MercatorCoordinate.fromLngLat(lngLat);
    return { x: (m.x - merc0.x) / s, z: (merc0.y - m.y) / s };
  };
  const aLngLat = (base, este, norte) => {
    const m = maplibregl.MercatorCoordinate.fromLngLat(base);
    return new maplibregl.MercatorCoordinate(m.x + este * s, m.y - norte * s, 0).toLngLat();
  };
  function elev(lngLat, alt) {
    const e = mapa.queryTerrainElevation(lngLat);
    return Number.isFinite(e) && e > 1 ? e : alt * EXAG;
  }
  function anclar(obj, lngLat, alt) {
    const p = local(lngLat);
    obj.position.set(p.x, 0, p.z);
    raiz.add(obj);
    anclados.push({ obj, lngLat, alt });
    return obj;
  }

  const variantes = { virgen: [], cristo: [], rosario: [] }, alActualizar = [];
  /* el gran Rosario: 59 cuentas en anillo, cada una apoyada en la cumbre (dos mallas instanciadas en vez de 118 piezas) */
  function cuentasRosario(centro, o) {
    const n = o.cuentas || 59, cuentas = [];
    const postes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.22, 2, 8), M.piedra, n);
    const esferas = new THREE.InstancedMesh(new THREE.SphereGeometry(1.35, 16, 12), M.estatua, n);
    for (let k = 0; k < n; k++) {
      const a = 2 * Math.PI * k / n, ll = aLngLat(centro, o.radio * Math.cos(a), o.radio * Math.sin(a));
      cuentas.push({ ll, p: local(ll), grande: k % 10 === 0 });      // una cuenta grande cada diez
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), uno = new THREE.Vector3(1, 1, 1), grande = new THREE.Vector3(1.55, 1.55, 1.55);
    alActualizar.push(() => {
      cuentas.forEach((c, k) => {
        const y = elev(c.ll, o.alt) - e0;
        postes.setMatrixAt(k, m4.compose(new THREE.Vector3(c.p.x, y + 0.4, c.p.z), q, uno));
        esferas.setMatrixAt(k, m4.compose(new THREE.Vector3(c.p.x, y + (c.grande ? 2.6 : 2.1), c.p.z), q, c.grande ? grande : uno));
      });
      postes.instanceMatrix.needsUpdate = esferas.instanceMatrix.needsUpdate = true;
    });
    raiz.add(postes, esferas);
    variantes.rosario.push(postes, esferas);
  }
  for (const o of datos.modelos) {
    const hacer = OBRAS[o.tipo];
    if (!hacer) continue;
    const lngLat = new maplibregl.LngLat(o.lon, o.lat), obj = fusionar(hacer(o));
    obj.rotation.y = -rad(o.rot || 0);
    anclar(obj, lngLat, o.alt);
    if (o.variante) variantes[o.variante].push(obj);
    if (o.tipo === "rosario") cuentasRosario(lngLat, o);
  }

  /* ---------------- teleférico: torres, dos cables con su catenaria y cabinas ---------------- */
  const c = datos.cable, apoyos = [c.desde, ...c.torres, c.hasta].map(p => ({ ...p, lngLat: new maplibregl.LngLat(p.lon, p.lat) }));
  const p0 = local(apoyos[0].lngLat), pN = local(apoyos[apoyos.length - 1].lngLat);
  const ang = Math.atan2(pN.z - p0.z, pN.x - p0.x);                     // rumbo del cable (desde el este, antihorario)
  apoyos.slice(1, -1).forEach(t => {
    const torre = new THREE.Group(), h = t.alto;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) torre.add(barra([sx * 2.4, -3, sz * 2.4], [sx * 0.8, h, sz * 0.8], 0.22, M.acero));
    for (let y = 5; y < h - 2; y += 6) {
      const w = 2.4 + (0.8 - 2.4) * (y / h);
      torre.add(caja(2 * w, 0.22, 0.22, M.acero, 0, y, w), caja(2 * w, 0.22, 0.22, M.acero, 0, y, -w),
        caja(0.22, 0.22, 2 * w, M.acero, w, y, 0), caja(0.22, 0.22, 2 * w, M.acero, -w, y, 0));
    }
    torre.add(caja(0.7, 0.6, 7, M.acero, 0, h, 0));
    const unida = fusionar(torre);
    unida.rotation.y = -ang;
    anclar(unida, t.lngLat, t.alt);
  });
  const lado = { x: -Math.sin(ang) * 2.8, z: Math.cos(ang) * 2.8 };     // separación entre los dos cables
  const cables = [1, -1].map(signo => {
    const geo = new THREE.BufferGeometry(), linea = new THREE.Line(geo, M.cable);
    linea.frustumCulled = false;
    raiz.add(linea);
    return { signo, geo, puntos: [], largo: 0 };
  });
  function trazarCables() {
    const sop = apoyos.map(a => { const p = local(a.lngLat); return { x: p.x, z: p.z, y: elev(a.lngLat, a.alt) - e0 + a.alto }; });
    for (const cb of cables) {
      const pts = [];
      for (let i = 0; i < sop.length - 1; i++) {
        const a = sop[i], b = sop[i + 1], tramo = Math.hypot(b.x - a.x, b.z - a.z), flecha = tramo * 0.035;
        for (let k = 0; k <= 16; k++) {
          if (i > 0 && k === 0) continue;
          const t = k / 16;
          pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t + cb.signo * lado.x, a.y + (b.y - a.y) * t - 4 * flecha * t * (1 - t), a.z + (b.z - a.z) * t + cb.signo * lado.z));
        }
      }
      cb.puntos = pts;
      cb.acum = [0];
      for (let i = 1; i < pts.length; i++) cb.acum.push(cb.acum[i - 1] + pts[i].distanceTo(pts[i - 1]));
      cb.largo = cb.acum[cb.acum.length - 1];
      const pos = cb.geo.getAttribute("position");
      if (pos && pos.count === pts.length) {          // reusar el mismo búfer (se re-apoya seguido)
        pts.forEach((p, i) => pos.setXYZ(i, p.x, p.y, p.z));
        pos.needsUpdate = true;
      } else cb.geo.setFromPoints(pts);
    }
  }
  function enCable(cb, d) {
    let i = 1;
    while (i < cb.acum.length - 1 && cb.acum[i] < d) i++;
    const t = (d - cb.acum[i - 1]) / Math.max(1e-6, cb.acum[i] - cb.acum[i - 1]);
    return cb.puntos[i - 1].clone().lerp(cb.puntos[i], Math.min(1, Math.max(0, t)));
  }
  const cabinas = [];
  for (const cb of cables) for (let k = 0; k < 4; k++) {
    const cab = fusionar(grupo(caja(2.5, 2.4, 2.3, M.cabina, 0, -3.4, 0), caja(2.55, 1, 2.35, M.ventana, 0, -2.4, 0), caja(0.16, 2.2, 0.16, M.acero, 0, -1.1, 0)));
    cab.rotation.y = -ang;
    raiz.add(cab);
    cabinas.push({ cab, cb, fase: k / 4 });
  }
  function moverCabinas(t) {
    for (const c of cabinas) {
      if (!c.cb.largo) continue;
      let f = (c.fase + t * VEL_CABINA / c.cb.largo) % 1;
      if (c.cb.signo < 0) f = 1 - f;                                   // un cable sube y el otro baja
      c.cab.position.copy(enCable(c.cb, f * c.cb.largo));
    }
  }

  function actualizarAlturas() {
    e0 = elev(origen, datos.alt0);
    for (const a of anclados) a.obj.position.y = elev(a.lngLat, a.alt) - e0;
    alActualizar.forEach(f => f());
    trazarCables();
  }
  raiz.traverse(o => { o.frustumCulled = false; });

  /* ---------------- luz de día y de noche ---------------- */
  const cielo = new THREE.HemisphereLight(0xdfe9f3, 0x56663f, 1.5);
  const sol = new THREE.DirectionalLight(0xffe4bf, 2.1);
  sol.position.set(-0.7, 1, -0.45);                                    // sol de la tarde, desde el oeste
  escena.add(cielo, sol);
  function ponerNoche(v) {
    noche = v;
    cielo.intensity = v ? 0.28 : 1.5;
    cielo.color.set(v ? 0x2a3b5c : 0xdfe9f3);
    sol.intensity = v ? 0.18 : 2.1;
    sol.color.set(v ? 0x9fb3e0 : 0xffe4bf);
    for (const [mat, color, fuerza] of LUZ) { mat.emissive.set(v ? color : 0x000000); mat.emissiveIntensity = v ? fuerza : 0; }
    M.cable.color.set(v ? 0x8c96a3 : 0x2b3138);
    mapa.triggerRepaint();
  }
  function ponerVariante(v) {
    for (const [k, lista] of Object.entries(variantes)) lista.forEach(o => { o.visible = k === v; });
    mapa.triggerRepaint();
  }

  /* ---------------- la capa para MapLibre ---------------- */
  const camara = new THREE.Camera();
  let render3d = null, t0 = performance.now();
  const capa = {
    id: "modelos3d", type: "custom", renderingMode: "3d",
    onAdd(map, gl) {
      render3d = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      render3d.autoClear = false;
      actualizarAlturas();
    },
    render(gl, args) {
      if (++cuadros % 60 === 1) actualizarAlturas();                   // el relieve se afina al acercarse: re-apoyar las obras
      const ahora = performance.now();
      moverCabinas(((animar ? ahora : ultimo) - t0) / 1000);
      if (animar) ultimo = ahora;
      const o = maplibregl.MercatorCoordinate.fromLngLat(origen, e0);
      const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
      const l = new THREE.Matrix4().makeTranslation(o.x, o.y, o.z).scale(new THREE.Vector3(s, -s, s));
      camara.projectionMatrix = m.multiply(l);
      render3d.resetState();
      render3d.render(escena, camara);
      if (animar) { clearTimeout(espera); espera = setTimeout(() => mapa.triggerRepaint(), 50); }   // ~20 cuadros por segundo bastan
    }
  };

  return {
    capa, ponerNoche, ponerVariante,
    animar(v) { if (v && !animar) { t0 += performance.now() - ultimo; } animar = v; if (v) mapa.triggerRepaint(); }
  };
}
