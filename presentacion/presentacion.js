/* La Chucurí · modo presentación (reuniones con inversionistas).
   La montaña en 3D a pantalla completa: en cada parada, la foto fija de la maqueta con los nombres encima, unas cifras
   y una tira de imágenes. Al pasar, vuela a la siguiente parada (video) y corta a su foto fija (la misma cámara).
   Medios: media/presentacion/ (Blender) y, archivo por archivo, media/presentacion_respaldo/ (maqueta MapLibre).
   index.html?presentador abre la vista del presentador (notas, reloj, lo que sigue), sincronizada por BroadcastChannel. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const ES_PRESENTADOR = /[?&]presentador\b/.test(location.search);
  const CANAL = "chucuri-presentacion";
  const RAIZ = "../";

  // ============================================================ medios del sitio
  const ruta = n => n.startsWith("al:") ? RAIZ + "img/al/" + n.slice(3) : n.startsWith("real_") ? RAIZ + "img/real/" + n : RAIZ + "img/v2/" + n;
  const TAGS = { ref: "Imagen referencial", real: "Foto real · dron", foto: "Foto real", hist: "Recreación histórica", vreal: "Video real · dron", vref: "Imagen referencial" };
  const esReal = g => g === "real" || g === "foto" || g === "vreal";
  const F = (n, x, g = "ref") => ({ t: "img", n, x, g });                         // imagen
  const V = (n, x, g = "vref") => ({ t: "vid", n, x, g });                        // video: media/<n>_1080.mp4 (+ <n>.webp)
  const W = (a, b, ea, eb, x, ga = "real", gb = "ref") => ({ t: "wipe", a, b, ea, eb, x, ga, gb });   // antes y después (pares alineados)
  const A = (ops, x) => ({ t: "alt", ops, x });                                   // opciones en la misma toma: [etiqueta, imagen, tag]

  // ============================================================ contenido de cada parada
  // nombres: [id del punto en paradas/<id>.json, nombre, línea pequeña]; rutas: {id de la ruta: clase}
  // pasos: lo que hace "siguiente" antes de volar a la otra parada: [n.º de la imagen de la tira, opción] o ["final"]
  const C = {
    portada: {
      ov: "San Cristóbal · Táchira · Venezuela", titulo: "La <em>Chucurí</em>", sub: "Centro Internacional Biotemático",
      datos: [["103,8", "hectáreas"], ["730–1.270", "metros sobre el mar"], ["8 min", "de la Plaza Bolívar"], ["93 %", "sigue siendo bosque"]],
      nombres: [["puerta", "La Puerta", "730 m"], ["glamping", "La meseta", "1.000 m"], ["cima", "La cima", "1.270 m"]], lindero: true,
      media: [W("al:real_0443", "al:LJ1_parque_dia__real_0443", "Hoy", "Con el parque", "La Chucurí y la ciudad: hoy y con el parque"),
        V("clips/C1", "La montaña completa, con el parque"), V("v/hero", "La montaña desde el aire", "vreal"),
        F("real_0426", "La montaña completa, del barrio al pinar", "real")],
      notas: ["En San Cristóbal, a ocho minutos de la Plaza Bolívar, hay una montaña entera esperando.",
        "103,8 hectáreas de bosque que suben de la ciudad, a 730 metros, hasta un pinar a 1.270.",
        "Imagine todo lo que puede nacer aquí: La Chucurí, Centro Internacional Biotemático.",
        "Es un prototipo conceptual: no es un proyecto aprobado y las imágenes son referenciales."]
    },
    ciudad: {
      ov: "La ubicación", titulo: "A 8 minutos de la <em>Plaza Bolívar</em>", sub: "Una montaña entera dentro de San Cristóbal",
      datos: [["8 min", "en carro, hasta la entrada baja"], ["4 km", "en línea recta, de la cima al centro"], ["5 min", "del terminal de pasajeros"], ["13 min", "de la Basílica de Táriba"]],
      nombres: [["plaza", "Plaza Bolívar", "El centro"], ["puerta", "La Chucurí", "La entrada baja"], ["chucuri", "La Chucurí", "103,8 ha"]],
      lindero: true, rutas: { carro_entrada: "carro" },
      media: [V("v/ciudad_cima", "La ciudad desde la cima", "vreal"), F("real_0467", "Desde lo alto de la montaña, la ciudad entera abajo", "real"),
        F("real_0511", "Desde la parte alta, San Cristóbal de frente", "real"), F("real_0488", "Donde el bosque toca la ciudad", "real"),
        V("v/puerta", "Desde la entrada: el barrio y el bosque", "vreal")],
      notas: ["La cumbre mira de frente a la Plaza Bolívar: cuatro kilómetros en línea recta.",
        "Por la vía son ocho minutos hasta la entrada baja; cinco desde el terminal de pasajeros.",
        "A las puertas del Parque Nacional Chorro El Indio: una montaña que la ciudad ya visita cada fin de semana.",
        "Es una montaña que la ciudad todavía no ha rodeado."]
    },
    terreno: {
      ov: "El terreno", titulo: "103,8 <em>hectáreas</em>", sub: "Una hoja alargada de unos 2,3 km, de la vía al pinar",
      datos: [["540 m", "de desnivel, de 730 a 1.270 m"], ["73 ha", "de bosque premontano"], ["20 ha", "de pinar"], ["93 %", "sigue siendo bosque"]],
      nombres: [["puerta", "Entrada baja", "730 m"], ["glamping", "La meseta", "1.000 m"], ["cima", "Los pinos", "1.270 m"]], lindero: true,
      media: [W("al:real_0426", "al:LJ1_parque_dia__real_0426", "Hoy", "Con el parque", "La montaña completa: hoy y con el parque"),
        A([["De día", "al:LJ1_parque_dia", "ref"], ["De noche", "al:LJ2_parque_noche__LJ1_parque_dia", "ref"]], "El parque completo sobre la montaña real"),
        F("real_0498", "El bosque y la entrada baja, junto a la vía", "real"), V("v/cono", "El cono del pinar, desde el norte", "vreal")],
      notas: ["103,8 hectáreas según el levantamiento topográfico de 2004, con 39 vértices.",
        "Al norte, la Quebrada La Chucurí y la ciudad; al sur, las quebradas Pánaga y La Tana.",
        "73 hectáreas de bosque premontano y 20 de pinar, sembrado hace más de 40 años sobre los viejos cafetales.",
        "Un proyecto en cinco pisos, de la Puerta a la cima, donde el 93 % sigue siendo bosque."]
    },
    historia: {
      ov: "La historia · desde 1547", titulo: "El Camino de <em>los Españoles</em>", sub: "La entrada a San Cristóbal desde el Alto Apure, el sur del Táchira y los llanos",
      datos: [["1547", "el camino ya era conocido"], ["1880", "la antigua hacienda (recreación)"], ["1887 · 1890", "nacen los hermanos Rangel Lamus"]],
      nombres: [["historia", "La antigua hacienda", "La terraza baja"], ["puerta", "Aquí estará la Puerta", "Mañana"]],
      media: [A([["Ayer · 1880", "al:HI1_hacienda_1880_aereo", "hist"], ["Hoy", "al:real_0425__HI1_hacienda_1880_aereo", "real"], ["Mañana", "al:PU1_puerta_dia__HI1_hacienda_1880_aereo", "ref"]],
        "Ayer, hoy y mañana en la misma toma"),
        F("HI2_mercado_patio", "El mercado del patio, según los propietarios: arrieros, mulas con café y ganado de los llanos", "hist"),
        V("v/puerta", "Hoy: desde la entrada, el barrio y el bosque", "vreal")],
      pasos: [[0, 0], [0, 1], [0, 2]],
      notas: ["Esta montaña también es historia: por aquí pasa el Camino de los Españoles, conocido desde 1547.",
        "Era la entrada a San Cristóbal desde el Alto Apure, el sur del Táchira y los llanos. Según la tradición, por aquí entró el Libertador Simón Bolívar.",
        "Según los propietarios, aquí, donde estará la Puerta, se hacía un gran mercado. Y aquí nacieron los hermanos Rangel Lamus.",
        "Fuente: Luis Hernández Contreras, Cronista Oficial de San Cristóbal."]
    },
    puerta: {
      ov: "Piso 1 · 730 m", titulo: "La <em>Puerta</em>", sub: "El mariposario y el centro de ciencias, junto a la ciudad",
      datos: [["730 m", "la terraza baja, junto a la vía"], ["Cientos", "de mariposas vivas en domos de cristal"], ["8 min", "de la Plaza Bolívar"]],
      nombres: [["puerta", "Mariposario y centro de ciencias", "Piso 1"], ["portal", "El portal", "Taquillas y entrada"], ["fauna", "Centro de fauna", ""]],
      media: [V("clips/C2", "La Puerta desde el aire: el mariposario, la plaza y la gente"),
        W("al:real_0425__HI1_hacienda_1880_aereo", "al:PU1_puerta_dia__HI1_hacienda_1880_aereo", "Hoy", "La Puerta", "La terraza baja, junto a la quebrada"),
        V("clips/C3", "Dentro del mariposario: la Morpho azul se posa en la mano de una niña"),
        A([["De día", "PU1_puerta_dia", "ref"], ["De noche", "PU2_puerta_noche_alt", "ref"]], "La Puerta desde el aire, de día y de noche"),
        F("P07_museo_ciencias_v2", "El museo de ciencias, con el oso frontino en bronce"), F("P05_lobby_v2", "El lobby, abierto al bosque")],
      notas: ["Piso uno: La Puerta. Una fachada imponente, con taquillas y entrada peatonal, un lobby abierto al bosque y caminerías entre jardines.",
        "El corazón es el mariposario: domos de cristal donde vuelan cientos de mariposas vivas.",
        "Alrededor, el centro de ciencias: museo, laboratorios, serpentario y centro antiofídico, aulas, viveros y orquideario.",
        "Locales para negocios y servicios, y un área de ambulatorio."]
    },
    agua: {
      ov: "Piso 1 · Junto a la ciudad", titulo: "Parque de agua y <em>centro de fauna</em>", sub: "Para toda la familia, y para cuidar la fauna de estas montañas",
      datos: [["Toboganes", "piscinas y un río lento entre jardines"], ["Fauna", "rescatarla, cuidarla y estudiarla, con las universidades"], ["Oso frontino", "el único oso de Suramérica"]],
      nombres: [["agua", "Parque de agua", ""], ["fauna", "Centro de fauna", ""], ["puerta", "La Puerta", ""]],
      media: [V("clips/C4", "El parque de agua: toboganes, piscinas y un río lento"),
        W("al:PU1_puerta_dia", "al:WP1_parque_agua_aereo__PU1_puerta_dia", "Sin el parque", "Con el parque de agua", "La terraza baja con el parque de agua", "ref", "ref"),
        F("WP2_parque_agua", "Toboganes y piscinas, con la montaña detrás"), F("FS1_centro_fauna", "El centro de protección de fauna silvestre"),
        F("AN1_oso_frontino", "Oso frontino: el único oso de Suramérica"), F("AN2_cunaguaro", "Cunaguaro: el felino manchado de nuestros bosques")],
      notas: ["Y junto a la ciudad, un parque de agua para toda la familia: toboganes, piscinas y un río lento entre jardines.",
        "Al lado, un centro para rescatar, cuidar y estudiar la fauna silvestre de estas montañas, con las universidades.",
        "Con la Universidad de Los Andes y la Universidad Valle del Momboy, La Chucurí es un laboratorio vivo."]
    },
    quebradas: {
      ov: "Piso 2 · 750–850 m", titulo: "Las <em>quebradas</em>", sub: "La quebrada que toca la ciudad, limpia otra vez",
      datos: [["Colector", "capta las descargas de los barrios"], ["Planta", "de tratamiento que limpia el agua"], ["Bosque", "que protege sus orillas"]],
      nombres: [["planta", "Planta de tratamiento", ""], ["bulevar", "Bulevar de la quebrada", ""], ["restaurante", "Restaurante junto a la cascada", ""]],
      media: [W("al:real_0420", "al:AG3_planta_tratamiento__real_0420", "Hoy", "Con la planta de tratamiento", "La quebrada entre el barrio y el bosque"),
        F("AG4_planta_tecnicos", "Técnicos y estudiantes miden el agua en la planta"),
        W("al:real_0420", "al:QB1_bulevar_dia__real_0420", "Hoy", "El bulevar", "El bulevar de la quebrada"),
        F("BJ1_bulevar_ejercicio", "Pista para trotar, bicicleta y gimnasio al aire libre"), F("RE1_restaurante_quebrada", "La terraza del restaurante, junto a la cascada"),
        F("FR_rio_quebrada_v2", "Así corre hoy el agua de una de las quebradas de la montaña", "foto")],
      notas: ["Piso dos: las quebradas. La quebrada que toca la ciudad hoy recibe aguas servidas.",
        "El proyecto la recupera: un colector que capta las descargas de los barrios, una planta de tratamiento que limpia el agua y un bosque que protege sus orillas.",
        "A su lado, un bulevar con áreas de ejercicio… y un restaurante junto a la cascada."]
    },
    villa: {
      ov: "En la ladera", titulo: "La villa y <em>las cabañas</em>", sub: "Edificios bajos entre los árboles y cabañas de madera en el bosque alto",
      datos: [["Edificios bajos", "entre los árboles, junto al barrio"], ["Sobre pilotes", "cabañas sin cimientos, mirando a la ciudad"], ["A su medida", "dónde y cuántos lo deciden los propietarios"]],
      nombres: [["villa", "La villa", "En la ladera"], ["cabanas", "Cabañas", "Bosque alto"], ["restaurante", "Restaurante", "Junto a la cascada"]],
      media: [W("al:real_0415", "al:VI1_villa_dia__real_0415", "Hoy", "La villa", "La ladera junto al barrio"),
        A([["De día", "VI1_villa_dia", "ref"], ["De noche", "VI2_villa_noche", "ref"]], "La villa entre los árboles"),
        F("VI3_villa_cerca", "Entre los edificios, la caminería sube hacia el bosque"), F("P17_cabanas_meseta", "Las cabañas desde el aire"),
        A([["De día", "CA1_cabanas_dia", "ref"], ["De noche", "CA2_cabanas_noche", "ref"]], "Las cabañas en el bosque alto")],
      notas: ["En la ladera, una villa de edificios bajos entre los árboles, junto al barrio.",
        "Más arriba, cabañas de madera sobre pilotes, sin cimientos, con su terraza mirando a la ciudad.",
        "Dónde y cuántos, lo deciden los propietarios: es una de las variantes del proyecto."]
    },
    bosque: {
      ov: "Piso 3 · 800–1.150 m", titulo: "El <em>bosque</em>", sub: "Setenta y tres hectáreas de bosque premontano",
      datos: [["73 ha", "de bosque premontano"], ["23–25 m", "árboles de varios estratos"], ["Libro Rojo", "nogal, cedro, caoba, pardillo y más"]],
      nombres: [["bosque", "Senderos y aulas abiertas", "Piso 3"], ["puente", "Puentes entre las copas", ""], ["observatorio", "Observatorio de aves", ""]],
      media: [V("v/bosque", "Sobre el bosque, con la ciudad", "vreal"), F("BO3_puente_persona", "Caminando entre las copas"),
        F("BO4_observatorio", "El observatorio de aves al amanecer"), F("BO6_cascada", "Cascada y mirador de agua"),
        V("clips/C5", "El chucurí en el bosque, entre la niebla"), F("AN1_oso_frontino", "El oso frontino")],
      notas: ["Piso tres: el bosque. 73 hectáreas de bosque premontano, recorridas por caminerías y pasarelas de madera.",
        "Senderos, aulas abiertas, puentes entre las copas, un observatorio de aves y cascadas.",
        "Aquí vive la fauna de estas montañas: el oso frontino, el cunaguaro, la nutria, el cachicamo, el curí…",
        "…y el chucurí, la comadreja que, según la tradición, le dio nombre a esta montaña."]
    },
    meseta: {
      ov: "Piso 4 · 1.000 m", titulo: "La <em>meseta</em>", sub: "Glamping y cabañas con la ciudad a sus pies",
      datos: [["2,7 ha", "de meseta natural, a 1.000 m"], ["Sin cimientos", "domos sobre plataformas de madera"], ["Bicicleta", "caminos empinados y senderos para subir"]],
      nombres: [["glamping", "Glamping", "Piso 4"], ["cabanas", "Cabañas", ""], ["aventura", "Bicicleta y senderos", ""]],
      media: [A([["De día", "G1_glamping_dia", "ref"], ["De noche", "G2_glamping_noche", "ref"]], "Los domos entre los árboles"),
        F("G3_glamping_interior", "Despertar frente a la ciudad"), F("GL5_glamping_deck", "La terraza con jacuzzi al atardecer"),
        F("P15_bicicleta_montana_v2", "Caminos empinados para bicicleta de montaña"), F("SE1_senderismo", "Senderismo por el camino real, con la ciudad abajo")],
      notas: ["Piso cuatro: la meseta. Glamping y cabañas con la ciudad a sus pies.",
        "Una meseta natural a mil metros admite domos sobre plataformas de madera, sin cimientos ni vías dentro del bosque.",
        "Caminos empinados para bicicleta y senderos para subir a pie."]
    },
    teleferico: {
      ov: "Para subir", titulo: "A la cima en <em>menos de 10 minutos</em>", sub: "Un teleférico sobre el bosque… o un funicular pegado a la montaña",
      datos: [["1,9 km", "de cable sobre el bosque"], ["540 m", "de desnivel"], ["&lt; 10 min", "de la Puerta a la cima"]],
      nombres: [["puerta", "Estación base", "La Puerta · 730 m"], ["estacion", "Estación Mirador", "La cima · 1.270 m"], ["teleferico", "Teleférico", "1,9 km"]],
      rutas: { cable: "cable" },
      media: [V("clips/C6", "Las cabinas suben sobre las copas"),
        W("al:TE1_teleferico", "al:FU1_funicular__TE1_teleferico", "Teleférico", "Funicular", "La misma ladera: teleférico o funicular", "ref", "ref"),
        F("TE3_teleferico_noche", "Las cabinas encendidas de noche"), F("TE2_cabina_interior_v2", "Dentro de la cabina, rumbo a la cima"),
        F("FU2_funicular_vista", "Desde el funicular, la ciudad abajo")],
      pasos: [[1, 0], [1, 1]],
      notas: ["Y en menos de diez minutos, el teleférico lleva de la ciudad a la cima: 1,9 km sobre el bosque, sin talar bajo la línea.",
        "De 730 a 1.270 metros.",
        "O un funicular pegado a la montaña: la elección depende de los estudios técnicos."]
    },
    cima: {
      ov: "Piso 5 · 1.270 m", titulo: "La cima: <em>usted elige</em>", sub: "La Virgen, el Cristo o el gran Rosario, de cara a toda la ciudad",
      datos: [["1.270 m", "el punto más alto"], ["4 km", "en línea recta a la Plaza Bolívar"], ["30 m", "una imagen así se vería desde toda la ciudad"]],
      nombres: [["cima", "La imagen", "De cara a la ciudad"], ["capilla", "Capilla de los Pinos", ""], ["estacion", "Estación Mirador", ""], ["astro", "Observatorio", ""]],
      media: [A([["La Virgen", "al:V1g_virgen__RS1_rosario_bulevar_dia", "ref"], ["El Cristo", "al:V2g_cristo__RS1_rosario_bulevar_dia", "ref"], ["El gran Rosario", "al:RS1_rosario_bulevar_dia", "ref"]],
        "La cima en la misma toma: usted elige"),
        F("N2_cima_noche", "De noche, la imagen iluminada sobre el pinar"), V("clips/C8", "Órbita alrededor de la Virgen y el rosario"),
        F("real_0503", "La cima hoy: el pinar visto desde la ciudad", "real"), F("V5_virgen_rosario_cerca", "La Virgen con las cuentas del rosario a su alrededor")],
      pasos: [[0, 0], [0, 1], [0, 2]],
      notas: ["Piso cinco: la cima. Arriba, la imagen de la Virgen Inmaculada, con las cuentas del rosario a su alrededor, mirando a toda la ciudad.",
        "Una imagen de 30 metros tendría línea de vista desde la Plaza Bolívar, la Catedral, la ULA, la UNET y hasta la Basílica de Táriba.",
        "Usted elige: la Virgen… el Cristo… o el gran Rosario."]
    },
    rosario: {
      ov: "Piso 5 · Fe", titulo: "El gran <em>Rosario</em>", sub: "Un rosario que se camina: cada cuenta es una lámpara",
      datos: [["59", "lámparas, una por cada cuenta"], ["Una oración", "en cada lámpara"], ["Al centro", "el Cristo de mármol, acostado entre flores"]],
      nombres: [["rosario", "El gran Rosario", "Alrededor de la cumbre"], ["capilla", "Capilla de los Pinos", ""]],
      media: [V("clips/magico", "Del video real del dron al gran Rosario, en la misma toma"),
        A([["De día", "al:RS1_rosario_bulevar_dia", "ref"], ["De noche", "al:RS2_rosario_bulevar_noche__RS1_rosario_bulevar_dia", "ref"]], "El bulevar de lámparas"),
        F("RS3_rosario_caminata", "Una señora toca la lámpara y reza, con la ciudad abajo"), F("CR1_cristo_rosario", "El Cristo de mármol, acostado entre flores"),
        V("clips/C11", "La cámara entra al rosario de lámparas"), F("RG2_gran_rosario_cristo_0504", "El gran Rosario sobre la montaña real")],
      pasos: [[0, 0]],
      notas: ["Un rosario que se camina: cada cuenta es una lámpara… y en cada lámpara, una oración.",
        "Alrededor de la cumbre, un bulevar de lámparas de vidrio: la gente camina, toca cada una y reza un Avemaría o un Padrenuestro.",
        "Al centro, el Cristo de mármol acostado entre flores."]
    },
    estacion: {
      ov: "Piso 5 · La cima", titulo: "Estación Mirador, <em>capilla y observatorio</em>", sub: "Para comer con la mejor vista de San Cristóbal",
      datos: [["Restaurante", "y estación alta del teleférico"], ["Observatorio", "de día la ciudad, de noche las estrellas"], ["Parapente", "despegue a 1.270 m sobre el valle"]],
      nombres: [["estacion", "Estación Mirador", ""], ["capilla", "Capilla de los Pinos", ""], ["astro", "Observatorio", ""], ["pinos", "Jardín de la memoria", "Entre los pinos"]],
      media: [W("real_0461", "ES1_estacion_aerea", "Hoy", "La Estación Mirador", "El borde del pinar frente a la ciudad"),
        F("ES2_estacion_terraza", "La terraza de la Estación Mirador"),
        A([["De día", "T1_templo_dia", "ref"], ["De noche", "T3_templo_noche", "ref"]], "La Capilla de los Pinos"),
        A([["De día", "OB1_observatorio_dia", "ref"], ["De noche", "OB2_observatorio_noche", "ref"]], "El observatorio en la cresta del pinar"),
        V("clips/C9", "Se abre la cúpula y giran las estrellas"), V("clips/C7", "Los parapentes planean sobre el valle")],
      notas: ["La Capilla de los Pinos, el jardín de la memoria, los miradores y el despegue de parapente.",
        "Y la Estación Mirador, para comer con la mejor vista de San Cristóbal.",
        "Y un observatorio: de día, la ciudad de cerca… de noche, las estrellas."]
    },
    accesos: {
      ov: "Cómo se llega", titulo: "La Chucurí une a la ciudad <em>con su montaña</em>", sub: "Cuatro caminos, de la ciudad a los pinos",
      datos: [["8 min", "en carro, hasta la entrada baja"], ["2 km", "caminería Av. Rotaria – El Nevada, ya existe"], ["22 min", "por la vía al Chorro El Indio"], ["3,5–4 km", "a pie, por los caminos reales a Pánaga"]],
      nombres: [["puerta", "Entrada baja", "730 m"], ["nevada", "La Cruz · El Nevada", "1.232 m"], ["viento", "Loma del Viento", "Vía al Chorro El Indio"],
        ["panaga", "Aldea Pánaga", "Caminos reales"], ["rotaria", "Caminería Av. Rotaria", "Ya existe"]],
      lindero: true, rutas: { camineria: "camineria", sendero_nevada: "sendero", sendero_panaga: "sendero", sendero_entrada: "sendero" },
      media: [V("clips/accesos", "Los accesos, dibujados sobre la maqueta"), V("v/nevada", "El Nevada, con la ciudad detrás", "vreal"),
        V("v/via_chorro", "La vía al Chorro El Indio", "vreal"), V("v/mirador", "El mirador de la vía al Chorro, lleno un domingo", "vreal"),
        F("FR_cruz_nevada_v2", "La Cruz: la entrada por El Nevada", "foto"), F("real_0528", "El mirador de la vía al Chorro, lleno de carros y familias un domingo", "real")],
      pasos: [[0, 0]],
      notas: ["La Chucurí une a la ciudad con su montaña.",
        "Se llega por la entrada baja, a ocho minutos de la Plaza Bolívar…",
        "…por la caminería de la Avenida Rotaria hasta El Nevada, que ya existe…",
        "…por la vía al Chorro El Indio, y por los caminos reales hacia la Aldea Pánaga."]
    },
    ha35: {
      ov: "Variantes", titulo: "Se adapta a <em>su idea</em>", sub: "Hoteles y residencias en las 35 hectáreas bajas; arriba, el parque igual",
      datos: [["35 ha", "en la parte baja, de 730 a 840 m"], ["Variantes", "en la cima, para subir, en la terraza baja y en las laderas"], ["Sujeto a", "zonificación y permisos"]],
      nombres: [["ha35", "Las 35 hectáreas bajas", "730–840 m"], ["glamping", "Arriba, el parque igual", ""]],
      media: [W("al:LJ1_parque_dia", "al:UR1_urbanismo_35ha__LJ1_parque_dia", "El parque", "Hoteles y residencias", "Las 35 hectáreas bajas: parque, u hoteles y residencias", "ref", "ref"),
        F("UR2_hotel", "Variante de las 35 ha: el hotel"), F("UR3_residencias", "Variante de las 35 ha: las residencias"),
        A([["Mariposario y ciencias", "al:PU1_puerta_dia", "ref"], ["Campus A", "al:UN1_campus_A__PU1_puerta_dia", "ref"], ["Campus B", "al:UN2_campus_B__PU1_puerta_dia", "ref"]],
          "La terraza baja: tres opciones en la misma toma")],
      pasos: [[0, 0], [0, 1]],
      notas: ["Y aquí se puede construir según su idea: La Chucurí admite variantes.",
        "En la terraza baja, el mariposario y el centro de ciencias… o un campus universitario. En las laderas, una villa, cabañas o glamping.",
        "Y en sus 35 hectáreas más bajas, junto a la ciudad, hoteles y residencias. Arriba, el parque igual.",
        "Las variantes de urbanismo están sujetas a zonificación y permisos."]
    },
    cierre: {
      ov: "La Chucurí · Centro Internacional Biotemático", titulo: "Se adapta a su idea… <em>y a su inversión</em>", sub: "Parque, ciencia, fe… o ciudad",
      datos: [], nombres: [], lindero: true,
      media: [V("clips/C10", "La montaña encendida, de noche"), F("al:LJ2_parque_noche__LJ1_parque_dia", "El parque completo, de noche"),
        F("N2_cima_noche", "La imagen iluminada sobre el pinar"), F("PU2_puerta_noche_alt", "La Puerta encendida junto al barrio"),
        F("TE3_teleferico_noche", "Las cabinas encendidas de noche")],
      pasos: [["final"]],
      notas: ["Parque, ciencia, fe… o ciudad. Se adapta a su idea… y a su inversión.",
        "La Chucurí. Centro Internacional Biotemático.",
        "Solicite el expediente técnico… y agende su visita."]
    }
  };
  const ORDEN = ["portada", "ciudad", "terreno", "historia", "puerta", "agua", "quebradas", "villa", "bosque", "meseta", "teleferico", "cima", "rosario",
    "estacion", "accesos", "ha35", "cierre"];

  // ============================================================ estado
  let PARADAS = ORDEN.map(id => ({ id, titulo: id, modo: id === "cierre" ? "noche" : "dia" }));
  const estado = { i: -1, paso: 0, fase: "apertura", negro: false, notas: false, vistas: new Set() };
  const cont = i => (PARADAS[i] && C[PARADAS[i].id]) || { ov: "", titulo: (PARADAS[i] || {}).titulo || "", sub: "", datos: [], nombres: [], media: [], notas: [] };
  const bc = "BroadcastChannel" in window ? new BroadcastChannel(CANAL) : null;

  // ============================================================ fuentes de los medios (Blender primero; respaldo archivo por archivo)
  // ?respaldo usa sólo la maqueta MapLibre (por si hace falta comparar, o si algo de Blender sale mal)
  const FUENTES = [{ id: "blender", dir: RAIZ + "media/presentacion/" }, { id: "respaldo", dir: RAIZ + "media/presentacion_respaldo/" }]
    .filter(f => !/[?&]respaldo\b/.test(location.search) || f.id === "respaldo");
  function juntar(v, s) {
    if (typeof v === "string") {
      const r = v.replace(/\\/g, "/").replace(/[?#].*$/, "");
      let m = r.match(/(?:^|\/)((?:paradas|vuelos)\/[^/]+\.(?:webp|png|jpe?g|json|mp4|webm))$/i);
      if (m) { s.add(m[1]); return; }
      m = r.match(/^([^/]+)\.(webp|png|jpe?g|json|mp4|webm)$/i);
      if (m && !/^manifest/i.test(m[1])) s.add((/mp4|webm/i.test(m[2]) ? "vuelos/" : "paradas/") + r);
    } else if (Array.isArray(v)) v.forEach(x => juntar(x, s));
    else if (v && typeof v === "object") {
      if (v.existe === false || v.exists === false) return;      // anunciado en el manifest pero todavía sin renderizar
      Object.values(v).forEach(x => juntar(x, s));
    }
  }
  async function leerManifiestos() {
    await Promise.all(FUENTES.map(async f => {
      f.lista = new Set(); f.hay = false; f.sondear = false;
      try {
        const r = await fetch(f.dir + "manifest.json", { cache: "no-cache" });
        if (!r.ok) return;
        juntar(await r.json(), f.lista);
        f.hay = true;
        f.sondear = f.lista.size === 0;     // un manifest con otro formato: se prueban los nombres esperados
      } catch (e) { /* sin manifest: esa fuente no se usa */ }
    }));
  }
  const fotos = new Map(), proys = new Map();
  function cargarImagen(url) {
    return new Promise(res => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => (im.decode ? im.decode().catch(() => { }) : Promise.resolve()).then(() => res(im));
      im.onerror = () => res(null);
      im.src = url;
    });
  }
  // la foto fija de una parada: {url, fuente, proy}; si no hay ninguna, la primera imagen de su tira
  function cargarFoto(i) {
    const id = PARADAS[i] && PARADAS[i].id;
    if (!id) return Promise.resolve(null);
    if (fotos.has(id)) return fotos.get(id);
    const p = (async () => {
      for (const f of FUENTES) {
        if (!f.hay) continue;
        // una parada de noche (el cierre) usa su foto de noche: el vuelo que llega termina de noche
        const noche = PARADAS[i].modo === "noche" ? [`paradas/${id}_noche.webp`] : [];
        const listada = noche.concat(["webp", "png", "jpg"].map(e => `paradas/${id}.${e}`)).find(r => f.lista.has(r));
        const rel = listada || (f.sondear ? `paradas/${id}.webp` : null);
        if (!rel) continue;
        const im = await cargarImagen(f.dir + rel);
        if (!im) continue;
        const pj = `paradas/${id}.json`;
        return { url: f.dir + rel, fuente: f, proy: f.lista.has(pj) || f.sondear ? f.dir + pj : null };
      }
      const m = cont(i).media.find(x => x.t === "img") || cont(i).media.find(x => x.t === "alt");
      if (m) {
        const n = m.t === "img" ? m.n : m.ops[0][1], g = m.t === "img" ? m.g : m.ops[0][2];
        const url = ruta(n) + "_2400.webp";
        if (await cargarImagen(url)) return { url, fuente: null, proy: null, tag: TAGS[g] };
      }
      return null;
    })();
    fotos.set(id, p);
    return p;
  }
  function cargarProy(url) {
    if (!url) return Promise.resolve(null);
    if (proys.has(url)) return proys.get(url);
    const p = fetch(url, { cache: "no-cache" }).then(r => r.ok ? r.json() : null).then(j => j && normalizar(j)).catch(() => null);
    proys.set(url, p);
    return p;
  }
  // acepta [x, y, visible] o {x, y, visible}; puntos como objeto {id: ...} o lista [{id, ...}]; lindero en uno o varios tramos
  function normalizar(j) {
    const ancho = j.ancho || j.width || j.w || 1920, alto = j.alto || j.height || j.h || 1080, kx = 1920 / ancho, ky = 1080 / alto;
    const pt = v => {
      if (!v) return null;
      if (Array.isArray(v)) return { x: v[0] * kx, y: v[1] * ky, v: v.length > 2 ? !!v[2] : true };
      if (typeof v === "object") {
        const x = v.x ?? v.px, y = v.y ?? v.py;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { x: x * kx, y: y * ky, v: !!(v.visible ?? v.vis ?? v.v ?? true) };
      }
      return null;
    };
    const puntos = {};
    const P = j.puntos || j.hotspots || j.points || {};
    if (Array.isArray(P)) P.forEach(p => { if (p && p.id) puntos[p.id] = pt(p.xy || p.pos || p); });
    else for (const [k, v] of Object.entries(P)) puntos[k] = pt(v);
    const tramos = lin => {
      if (!Array.isArray(lin) || !lin.length) return [];
      const anidado = Array.isArray(lin[0]) && Array.isArray(lin[0][0]);
      return (anidado ? lin : [lin]).map(t => t.map(pt).filter(Boolean)).filter(t => t.length > 1);
    };
    const rutas = {};
    for (const [k, v] of Object.entries(j.rutas || j.routes || {})) rutas[k] = tramos(v);
    return { puntos, lindero: tramos(j.lindero || j.boundary || []), rutas };
  }
  function vueloDe(desde, hasta, fuente) {
    if (!fuente) return null;
    const a = PARADAS[desde].id, b = PARADAS[hasta].id;
    const re = new RegExp(`^vuelos/\\d+_${a}_${b}\\.(mp4|webm)$`, "i");
    const hit = [...fuente.lista].find(r => re.test(r));
    if (hit) return fuente.dir + hit;
    return fuente.sondear ? fuente.dir + `vuelos/${String(hasta).padStart(2, "0")}_${a}_${b}.mp4` : null;
  }
  function aperturaDe(fuente) {
    if (!fuente) return null;
    const hit = [...fuente.lista].find(r => /^vuelos\/\d*_?apertura\.(mp4|webm)$/i.test(r));
    if (hit) return fuente.dir + hit;
    return fuente.sondear ? fuente.dir + "vuelos/00_apertura.mp4" : null;
  }
  const miniatura = m => m.t === "vid" ? RAIZ + "media/" + m.n + ".webp" : ruta(m.t === "img" ? m.n : m.t === "wipe" ? m.b : m.ops[0][1]) + "_640.webp";

  // ============================================================ texto animado
  function palabras(html, d0, paso = 0.07) {
    let d = d0, out = "";
    const partes = html.split(/(<em>.*?<\/em>)/);
    for (const parte of partes) {
      if (!parte) continue;
      const em = parte.startsWith("<em>");
      const txt = em ? parte.slice(4, -5) : parte;
      txt.split(/(\s+)/).forEach(w => {
        if (!w) return;
        if (/^\s+$/.test(w)) { out += " "; return; }
        out += `<span class="w"><span style="--d:${d.toFixed(2)}s">${em ? `<em>${w}</em>` : w}</span></span>`;
        d += paso;
      });
    }
    return out;
  }
  const luego = f => { let hecho = false; const una = () => { if (!hecho) { hecho = true; f(); } }; requestAnimationFrame(() => requestAnimationFrame(una)); setTimeout(una, 120); };
  const fmt = (v, dec, miles) => { let [a, b] = v.toFixed(dec).split("."); if (miles) a = a.replace(/\B(?=(\d{3})+(?!\d))/g, "."); return b ? a + "," + b : a; };
  function contar(el, retraso) {
    const m = (el.dataset.n || "").match(/^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(\s?(?:%|ha|m|min|km))?$/);
    if (!m) return;
    const dec = (m[2] || "").length, miles = m[1].includes("."), suf = m[3] || "";
    const valor = parseFloat(m[1].replace(/\./g, "") + "." + (m[2] || "0"));
    el.textContent = fmt(0, dec, miles) + suf;
    setTimeout(() => {
      if (document.hidden) { el.textContent = el.dataset.n; return; }
      const t0 = performance.now(), dur = 1200;
      const f = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(valor * e, dec, miles) + suf; if (k < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }, retraso * 1000);
  }

  const pasosDe = i => cont(i).pasos || [];
  const etiquetaPaso = (i, def) => {
    if (!def) return "";
    if (def[0] === "final") return "Lámina final: expediente técnico y aliados";
    const m = cont(i).media[def[0]];
    if (!m) return "";
    if (m.t === "alt") return m.ops[def[1] || 0][0];
    if (m.t === "wipe") return (def[1] ? m.eb : m.ea);
    return (m.t === "vid" ? "Video: " : "") + m.x;
  };

  if (ES_PRESENTADOR) { presentador(); return; }

  // ============================================================ la sala
  const sala = $("#sala"), lienzo = $("#lienzo"), bloque = $("#bloque"), tira = $("#tira"), sello = $("#sello");
  const trazos = $("#trazos"), nombres = $("#nombres"), visorEl = $("#visor"), caja = $("#visorCaja");
  const apertura = $("#apertura"), aperturaVideo = $("#aperturaVideo"), finalEl = $("#final"), negroEl = $("#negro");
  const fotoEls = [$("#fotoA"), $("#fotoB")], vidEls = [$("#vueloA"), $("#vueloB")];
  let fotoActual = 0, escala = 1, vista = { x0: 0, x1: 1920, y0: 0, y1: 1080 };
  const SELLO = "Maqueta 3D · obras referenciales · imagen satelital: Esri, Maxar, Earthstar Geographics";

  function escalar() {
    const W = innerWidth, H = innerHeight;
    escala = Math.max(W / 1920, H / 1080);
    lienzo.style.setProperty("--s", escala);
    vista = { x0: (1920 - W / escala) / 2, x1: (1920 + W / escala) / 2, y0: (1080 - H / escala) / 2, y1: (1080 + H / escala) / 2 };
  }
  const aLienzo = r => {
    const ox = (innerWidth - 1920 * escala) / 2, oy = (innerHeight - 1080 * escala) / 2;
    return { x0: (r.left - ox) / escala, y0: (r.top - oy) / escala, x1: (r.right - ox) / escala, y1: (r.bottom - oy) / escala };
  };

  // ---------------- fotos fijas y vuelos
  function ponerFoto(url, suave) {
    const otra = 1 - fotoActual, a = fotoEls[fotoActual], b = fotoEls[otra];
    if (a.classList.contains("on") && a.dataset.url === url) return;
    b.classList.toggle("ya", !suave); a.classList.toggle("ya", !suave);
    b.src = url; b.dataset.url = url;
    b.classList.remove("llega");
    if (suave) { void b.offsetWidth; b.classList.add("llega"); }
    b.classList.add("on");
    a.classList.remove("on");
    fotoActual = otra;
    if (!suave) luego(() => { a.classList.remove("ya"); b.classList.remove("ya"); });
  }
  function esperarVideo(v, ms) {
    return new Promise(res => {
      if (v.readyState >= 3) return res(true);
      let hecho = false;
      const fin = ok => { if (hecho) return; hecho = true; clearTimeout(t); v.removeEventListener("canplay", si); v.removeEventListener("error", no); res(ok); };
      const si = () => fin(true), no = () => fin(false);
      const t = setTimeout(() => fin(v.readyState >= 3), ms);
      v.addEventListener("canplay", si); v.addEventListener("error", no);
    });
  }
  function videoPara(url) {
    let v = vidEls.find(x => x.dataset.url === url);
    if (!v) {
      v = vidEls.find(x => !x.classList.contains("on")) || vidEls[0];
      v.dataset.url = url; v.src = url; v.load();
    }
    return v;
  }
  let vueloActual = null;
  function esconderVideo(v) {
    v.classList.add("ya"); v.classList.remove("on", "encima");
    v.pause();
    luego(() => v.classList.remove("ya"));
  }
  async function volar(url, destino, t, alEmpezar, fundido = 0.3) {
    const v = videoPara(url);
    v.style.transitionDuration = fundido + "s";
    if (!(await esperarVideo(v, 2500)) || t !== token || estado.saltar) return false;
    try { v.currentTime = 0; } catch (e) { }
    v.classList.add("encima");
    try { await v.play(); } catch (e) { v.classList.remove("encima"); return false; }
    if (t !== token) { esconderVideo(v); return false; }
    v.classList.add("on");
    if (alEmpezar) alEmpezar(v);
    // la foto de destino queda lista debajo del video: al terminar, el corte no se nota
    setTimeout(() => { if (t === token && destino && vueloActual) ponerFoto(destino.url, false); }, fundido * 1000 + 80);
    await new Promise(res => {
      const fin = () => { v.removeEventListener("ended", fin); v.removeEventListener("error", fin); if (vueloActual && vueloActual.v === v) vueloActual = null; res(); };
      vueloActual = { v, fin };
      v.addEventListener("ended", fin); v.addEventListener("error", fin);
    });
    if (t !== token) { esconderVideo(v); return false; }
    if (destino) ponerFoto(destino.url, false);
    esconderVideo(v);
    return true;
  }
  function saltarVuelo() {
    estado.saltar = true;
    if (vueloActual) { vueloActual.v.pause(); vueloActual.fin(); }
  }

  // ---------------- ir a una parada
  let token = 0;
  async function ir(dest, modo = "corte") {
    if (dest < 0 || dest >= PARADAS.length) return;
    const t = ++token, origen = estado.i;
    if (vueloActual) { const v = vueloActual.v; vueloActual.fin(); esconderVideo(v); }
    cerrarVisor(); ocultarFinal(); ocultarAyuda();
    estado.i = dest; estado.paso = 0; estado.fase = "vuelo"; estado.saltar = false;
    quitarCapas();
    marcarHud();
    emitir();
    const foto = await cargarFoto(dest);
    if (t !== token) return;
    const proyP = cargarProy(foto && foto.proy);
    let url = null;
    if (modo === "vuelo" && foto && foto.fuente) url = origen === -1 ? aperturaDe(foto.fuente) : origen === dest - 1 ? vueloDe(origen, dest, foto.fuente) : null;
    const desdeApertura = !apertura.classList.contains("fuera");
    let voló = false;
    if (url && !estado.saltar) {
      const cambiaLuz = origen >= 0 && PARADAS[origen].modo !== PARADAS[dest].modo;     // de día a noche: fundido largo
      // desde la portada: el título se queda encima del vuelo de apertura un rato y luego se va
      const sobreVuelo = v => { apertura.classList.add("sobre-vuelo"); setTimeout(salirApertura, Math.min(7000, Math.max(900, (v.duration || 4) * 450))); };
      voló = await volar(url, foto, t, desdeApertura ? sobreVuelo : null, cambiaLuz ? 1.4 : 0.3);
      if (t !== token) return;
    }
    if (!voló && foto) ponerFoto(foto.url, true);
    if (desdeApertura) salirApertura();
    const proy = await proyP;
    if (t !== token) return;
    if (!voló) await esperar(desdeApertura ? 1100 : 950);
    if (t !== token) return;
    estado.fase = "parada";
    sello.textContent = foto && foto.fuente ? SELLO : foto && foto.tag ? foto.tag : "";
    pintarParada(dest, proy);
    estado.vistas.add(dest);
    marcarHud();
    try { history.replaceState(null, "", "#" + PARADAS[dest].id); } catch (e) { }
    emitir();
    precargar(dest);
  }
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  async function precargar(i) {
    if (i + 1 >= PARADAS.length) return;
    const foto = await cargarFoto(i + 1);
    if (estado.i !== i) return;
    const url = foto && foto.fuente ? vueloDe(i, i + 1, foto.fuente) : null;
    if (url) videoPara(url);
    if (foto) cargarProy(foto.proy);
    if (i > 0) cargarFoto(i - 1);
  }
  function salirApertura() {
    if (apertura.classList.contains("fuera")) return;
    apertura.classList.add("fuera");
    sala.classList.remove("fase-apertura");
    setTimeout(() => { if (apertura.classList.contains("fuera")) aperturaVideo.pause(); }, 1200);
  }
  function volverApertura() {
    token++;
    cerrarVisor(); ocultarFinal(); quitarCapas();
    estado.i = -1; estado.paso = 0; estado.fase = "apertura";
    apertura.classList.remove("fuera", "sobre-vuelo");
    sala.classList.add("fase-apertura");
    aperturaVideo.play().catch(() => { });
    marcarHud(); emitir();
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { }
  }

  // ---------------- capas de cada parada
  function quitarCapas() {
    sala.classList.remove("con-capas");
    for (const el of [bloque, tira, nombres, trazos]) { el.classList.remove("entra"); el.classList.add("sale"); }
  }
  function pintarParada(i, proy) {
    const c = cont(i);
    // título, cifras
    const datos = (c.datos || []).map(([b, s], k) => `<li data-a style="--d:${(0.62 + k * 0.1).toFixed(2)}s"><b data-n="${b}"${/^[\d&]/.test(b) ? "" : ' class="txt"'}>${b}</b><span>${s}</span></li>`).join("");
    bloque.innerHTML = `<p class="ov" data-a style="--d:0s">${c.ov}</p><h1 class="titulo">${palabras(c.titulo, 0.08)}</h1>` +
      (c.sub ? `<p class="sub" data-a style="--d:.42s">${c.sub}</p>` : "") + (datos ? `<ul class="datos">${datos}</ul>` : "");
    // tira de imágenes
    const media = c.media || [];
    tira.innerHTML = media.length ? `<p class="tira-cab" data-a style="--d:.45s">Imágenes · ${media.length > 1 ? "1–" + media.length : "1"}</p>` + media.map((m, k) => {
      const chip = m.t === "vid" ? `<span class="mini-tipo${esReal(m.g) ? " real" : ""}"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>${esReal(m.g) ? "Real" : "Referencial"}</span>`
        : m.t === "wipe" ? `<span class="mini-tipo">Comparar</span>` : m.t === "alt" ? `<span class="mini-tipo">${m.ops.length} opciones</span>`
          : esReal(m.g) ? `<span class="mini-tipo real">Real</span>` : m.g === "hist" ? `<span class="mini-tipo">Recreación</span>` : `<span class="mini-tipo">Referencial</span>`;
      return `<button type="button" class="mini" data-k="${k}" data-a style="--d:${(0.52 + k * 0.07).toFixed(2)}s" aria-label="${k + 1}: ${m.x}">` +
        `<img src="${miniatura(m)}" alt="" decoding="async"><span class="mini-n">${k + 1}</span>${chip}<span class="mini-t">${m.x}</span></button>`;
    }).join("") : "";
    tira.hidden = !media.length;
    pintarTrazos(c, proy, false);
    sala.classList.add("con-capas");
    for (const el of [bloque, tira, nombres, trazos]) el.classList.remove("sale", "ya");
    void bloque.offsetWidth;
    luego(() => {
      for (const el of [bloque, tira, nombres, trazos]) el.classList.add("entra");
      $$(".datos b", bloque).forEach((b, k) => contar(b, 0.62 + k * 0.1));
    });
    if (estado.notas) pintarNotas();
  }
  let proyActual = null;
  function pintarTrazos(c, proy, ya) {
    proyActual = proy;
    $$("g", trazos).forEach(g => g.remove());
    nombres.innerHTML = "";
    if (!proy) return;
    const ns = "http://www.w3.org/2000/svg";
    const grupo = document.createElementNS(ns, "g");
    const dentro = p => p && p.v && p.x > -40 && p.x < 1960 && p.y > -40 && p.y < 1120;
    // tramos visibles (el lindero es un anillo: se gira para empezar en un punto tapado y no unir los extremos por encima del relieve)
    const corridas = (tramo, anillo) => {
      let pts = tramo.slice();
      if (anillo) { const k = pts.findIndex(p => !dentro(p)); if (k > 0) pts = pts.slice(k).concat(pts.slice(0, k)); else if (k === -1) pts.push(pts[0]); }
      const out = []; let cur = [];
      for (const p of pts) { if (dentro(p)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } }
      if (cur.length > 1) out.push(cur);
      return out;
    };
    const linea = (pts, clases, d, t) => {
      const el = document.createElementNS(ns, "polyline");
      el.setAttribute("points", pts.map(p => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" "));
      el.setAttribute("pathLength", "1");
      el.setAttribute("class", "tr " + clases);
      el.style.setProperty("--d", d + "s"); el.style.setProperty("--t", t + "s");
      grupo.appendChild(el);
    };
    if (c.lindero) for (const tr of proy.lindero) for (const run of corridas(tr, true)) { linea(run, "tr-halo", 0.2, 1.9); linea(run, "tr-linea", 0.2, 1.9); }
    let d = 0.45;
    for (const [rid, clase] of Object.entries(c.rutas || {})) {
      for (const tr of proy.rutas[rid] || []) for (const run of corridas(tr, false)) { linea(run, "tr-halo " + clase, d, 1.6); linea(run, "tr-ruta " + clase, d, 1.6); }
      d += 0.25;
    }
    trazos.appendChild(grupo);
    ponerNombres(c, proy);
    if (ya) { trazos.classList.add("ya", "entra"); nombres.classList.add("ya", "entra"); }
  }
  // nombres con su línea guía: cada etiqueta prueba arriba, a los lados y abajo, y se queda donde no tapa otra etiqueta,
  // otro punto, otra línea, el título ni la tira de imágenes
  function ponerNombres(c, proy) {
    const prohibidas = [];
    for (const el of [bloque, tira, $(".marca")]) {
      if (!el || el.hidden || !el.innerHTML.trim()) continue;
      const r = aLienzo(el.getBoundingClientRect());
      prohibidas.push({ x0: r.x0 - 24, y0: r.y0 - 24, x1: r.x1 + 24, y1: r.y1 + 24 });
    }
    const V = { x0: vista.x0 + 24, x1: vista.x1 - 24, y0: vista.y0 + 20, y1: vista.y1 - 20 };
    const dentroDe = (p, r) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
    const cruce = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    // primero, los puntos que sí se ven (sin repetir el mismo sitio)
    const lista = [];
    for (const [id, nombre, sub] of c.nombres || []) {
      const p = proy.puntos[id];
      if (!p || !p.v || !dentroDe(p, V) || prohibidas.some(r => dentroDe(p, r))) continue;
      if (lista.some(o => Math.hypot(o.p.x - p.x, o.p.y - p.y) < 22)) continue;
      lista.push({ id, nombre, sub, p });
    }
    const puntos = lista.map(o => ({ x0: o.p.x - 17, y0: o.p.y - 17, x1: o.p.x + 17, y1: o.p.y + 17, id: o.id }));
    const etis = [], lineas = [];
    lista.forEach((o, n) => {
      const p = o.p;
      const el = document.createElement("div");
      el.className = "nb";
      el.style.setProperty("--d", (0.55 + n * 0.14).toFixed(2) + "s");
      el.innerHTML = `<span class="nb-linea"></span><span class="nb-punto"></span><span class="nb-eti">${o.sub ? `<small>${o.sub}</small>` : ""}<b>${o.nombre}</b></span>`;
      nombres.appendChild(el);
      const eti = $(".nb-eti", el), w = eti.offsetWidth, h = eti.offsetHeight, area = w * h;
      const opciones = [];
      for (const L of [70, 105, 145, 190, 240, 295]) for (const dx of [0, -0.3, 0.3, -0.42, 0.42]) {
        opciones.push({ dir: "arriba", L, dx, base: 0 }, { dir: "abajo", L, dx, base: 1.6 });
      }
      for (const L of [42, 70, 105, 150, 200]) for (const dy of [0, -0.3, 0.3]) opciones.push({ dir: "izq", L, dy, base: 1.1 }, { dir: "der", L, dy, base: 1.1 });
      let mejor = null;
      for (const op of opciones) {
        let r, ln;
        if (op.dir === "arriba" || op.dir === "abajo") {
          const x0 = p.x - w / 2 + op.dx * w, y0 = op.dir === "arriba" ? p.y - op.L - h : p.y + op.L;
          r = { x0, y0, x1: x0 + w, y1: y0 + h };
          ln = op.dir === "arriba" ? { x0: p.x - 3, y0: p.y - op.L, x1: p.x + 3, y1: p.y - 9 } : { x0: p.x - 3, y0: p.y + 9, x1: p.x + 3, y1: p.y + op.L };
        } else {
          const y0 = p.y - h / 2 + op.dy * h, x0 = op.dir === "izq" ? p.x - op.L - w : p.x + op.L;
          r = { x0, y0, x1: x0 + w, y1: y0 + h };
          ln = op.dir === "izq" ? { x0: p.x - op.L, y0: p.y - 3, x1: p.x - 9, y1: p.y + 3 } : { x0: p.x + 9, y0: p.y - 3, x1: p.x + op.L, y1: p.y + 3 };
        }
        const lnArea = Math.max(1, (ln.x1 - ln.x0) * (ln.y1 - ln.y0));
        let costo = op.base + op.L * 0.011 + Math.abs(op.dx || 0) * 2 + Math.abs(op.dy || 0) * 1.5;
        for (const z of prohibidas) costo += 14 * cruce(r, z) / area + 6 * cruce(ln, z) / lnArea;
        for (const e of etis) costo += 16 * cruce(r, e) / area + 8 * cruce(ln, e) / lnArea;
        for (const l of lineas) costo += 6 * cruce(r, l) / Math.max(1, (l.x1 - l.x0) * (l.y1 - l.y0));
        for (const q of puntos) if (q.id !== o.id) costo += 9 * cruce(r, q) / (34 * 34) + 4 * cruce(ln, q) / (34 * 34);
        const fuera = (Math.max(0, V.x0 - r.x0) + Math.max(0, r.x1 - V.x1)) / w + (Math.max(0, V.y0 - r.y0) + Math.max(0, r.y1 - V.y1)) / h;
        costo += fuera * 22;
        if (!mejor || costo < mejor.costo) mejor = { ...op, costo, r, ln };
      }
      el.classList.add(mejor.dir);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      eti.style.left = (mejor.r.x0 - p.x).toFixed(1) + "px";
      eti.style.top = (mejor.r.y0 - p.y).toFixed(1) + "px";
      const s = $(".nb-linea", el).style;
      s.left = (mejor.ln.x0 - p.x + (mejor.dir === "arriba" || mejor.dir === "abajo" ? 1.75 : 0)).toFixed(1) + "px";
      s.top = (mejor.ln.y0 - p.y + (mejor.dir === "izq" || mejor.dir === "der" ? 1.75 : 0)).toFixed(1) + "px";
      if (mejor.dir === "arriba" || mejor.dir === "abajo") { s.height = (mejor.ln.y1 - mejor.ln.y0).toFixed(1) + "px"; }
      else { s.width = (mejor.ln.x1 - mejor.ln.x0).toFixed(1) + "px"; }
      etis.push(mejor.r);
      lineas.push(mejor.ln);
    });
  }

  // ---------------- pasos (lo que hace "siguiente" dentro de una parada)
  function aplicarPaso() {
    const p = estado.paso, lista = pasosDe(estado.i);
    if (p === 0) { cerrarVisor(); ocultarFinal(); emitir(); return; }
    const def = lista[p - 1];
    if (def[0] === "final") { cerrarVisor(); mostrarFinal(); emitir(); return; }
    ocultarFinal();
    abrirVisor(def[0], def[1] || 0, "paso");
  }
  function mostrarFinal() { finalEl.classList.add("on"); sala.classList.add("con-final"); }
  function ocultarFinal() { finalEl.classList.remove("on"); sala.classList.remove("con-final"); }

  // ============================================================ visor grande
  let visor = null, cierre = 0;
  function abrirVisor(k, v = 0, modo = "manual") {
    if (estado.fase !== "parada") return;
    const c = cont(estado.i), m = (c.media || [])[k];
    if (!m) return;
    if (visor && visor.k === k) { visor.modo = modo; variante(v, false); pie(); marcarMini(); emitir(); return; }
    clearTimeout(cierre);
    caja.querySelectorAll("video").forEach(x => x.pause());
    caja.innerHTML = "";
    let html = "";
    if (m.t === "img") html = `<div class="vi-escena"><img src="${ruta(m.n)}_2400.webp" srcset="${ruta(m.n)}_1200.webp 1200w, ${ruta(m.n)}_2400.webp 2400w" sizes="100vw" alt="${m.x}"></div>`;
    else if (m.t === "vid") html = `<div class="vi-escena"><video muted loop playsinline autoplay preload="auto" poster="${RAIZ}media/${m.n}.webp" src="${RAIZ}media/${m.n}_1080.mp4"></video></div>`;
    else if (m.t === "wipe") html = `<div class="vi-escena vi-wipe" style="--pos:0%"><img class="vi-a" src="${ruta(m.a)}_2400.webp" alt="${m.ea}">` +
      `<img class="vi-capa vi-b" src="${ruta(m.b)}_2400.webp" alt="${m.eb}"><div class="vi-linea"><span class="vi-perilla"><svg viewBox="0 0 24 24"><path d="M9 6l-5 6 5 6M15 6l5 6-5 6"/></svg></span></div>` +
      `<span class="vi-eti izq"><small>${TAGS[m.gb]}</small>${m.eb}</span><span class="vi-eti der"><small>${TAGS[m.ga]}</small>${m.ea}</span></div>`;
    else if (m.t === "alt") html = `<div class="vi-escena vi-alt">` + m.ops.map((o, j) => `<img class="vi-capa" data-j="${j}" src="${ruta(o[1])}_2400.webp" alt="${o[0]}">`).join("") +
      `<p class="vi-grande"></p><div class="vi-bots" role="group">${m.ops.map((o, j) => `<button type="button" data-j="${j}" aria-pressed="false">${o[0]}</button>`).join("")}</div></div>`;
    caja.innerHTML = html;
    visor = { k, v: -1, modo, m, pos: 0 };
    visorEl.hidden = false;
    ajustarEscena();
    const im = $(".vi-escena img", caja);
    if (im && !im.complete) im.addEventListener("load", ajustarEscena, { once: true });
    luego(() => visorEl.classList.add("on"));
    const vid = $("video", caja);
    if (vid) vid.play().catch(() => { });
    if (m.t === "wipe") prepararWipe($(".vi-wipe", caja));
    if (m.t === "alt") $$(".vi-bots button", caja).forEach(b => b.addEventListener("click", ev => { ev.stopPropagation(); variante(+b.dataset.j, true); }));
    variante(v, false, true);
    pie(); marcarMini(); emitir();
  }
  function cerrarVisor() {
    if (!visor) return;
    visor = null;
    visorEl.classList.remove("on");
    caja.querySelectorAll("video").forEach(x => x.pause());
    cierre = setTimeout(() => { if (!visor) { visorEl.hidden = true; caja.innerHTML = ""; } }, 380);
    marcarMini(); emitir();
  }
  function ajustarEscena() {
    const esc = $(".vi-escena", caja);
    if (!esc) return;
    const r = caja.getBoundingClientRect();
    const im = $("img", esc), vid = $("video", esc);
    let a = 16 / 9;
    if (visor && visor.m.t === "img" && im && im.naturalWidth) a = im.naturalWidth / im.naturalHeight;
    const w = Math.min(r.width, r.height * a), h = w / a;
    esc.style.width = w + "px"; esc.style.height = h + "px";
    if (vid) vid.style.objectFit = "cover";
  }
  // la opción que se ve: en "alt" cruza las imágenes; en "wipe" lleva la línea de un lado al otro
  function variante(v, manual, inicio) {
    if (!visor) return;
    const m = visor.m;
    if (m.t === "alt") {
      v = ((v % m.ops.length) + m.ops.length) % m.ops.length;
      $$(".vi-capa", caja).forEach(im => im.classList.toggle("on", +im.dataset.j === v));
      $$(".vi-bots button", caja).forEach(b => b.setAttribute("aria-pressed", +b.dataset.j === v ? "true" : "false"));
      const g = $(".vi-grande", caja), o = m.ops[v];
      g.innerHTML = `<small>${TAGS[o[2]]}</small>${o[0]}`;
      g.classList.remove("cambia"); void g.offsetWidth; g.classList.add("cambia");
      visor.v = v;
    } else if (m.t === "wipe") {
      const esc = $(".vi-wipe", caja);
      if (inicio && visor.modo === "manual") { visor.v = 0; moverWipe(esc, 0, 0); setTimeout(() => visor && visor.m === m && moverWipe(esc, 50, 1100), 350); }
      else { visor.v = v ? 1 : 0; moverWipe(esc, v ? 100 : 0, inicio ? 0 : 1300); }
    }
    pie();
    if (manual) emitir();
  }
  let animWipe = 0;
  function moverWipe(esc, hasta, ms) {
    cancelAnimationFrame(animWipe);
    if (!esc || !visor) return;
    const desde = visor.pos, t0 = performance.now();
    const pon = p => { visor.pos = p; esc.style.setProperty("--pos", p.toFixed(2) + "%"); esc.dataset.extremo = p <= 0.5 ? "0" : p >= 99.5 ? "1" : ""; };
    if (!ms || document.hidden) { pon(hasta); return; }
    const f = t => { const k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; pon(desde + (hasta - desde) * e); if (k < 1) animWipe = requestAnimationFrame(f); };
    animWipe = requestAnimationFrame(f);
  }
  function prepararWipe(esc) {
    let arrastrando = false;
    const desde = ev => { const r = esc.getBoundingClientRect(); return Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100)); };
    esc.addEventListener("pointerdown", ev => { ev.preventDefault(); arrastrando = true; try { esc.setPointerCapture(ev.pointerId); } catch (e) { } cancelAnimationFrame(animWipe); moverWipe(esc, desde(ev), 0); ev.stopPropagation(); });
    esc.addEventListener("pointercancel", () => { arrastrando = false; });
    esc.addEventListener("dragstart", ev => ev.preventDefault());
    esc.addEventListener("pointermove", ev => { if (arrastrando) moverWipe(esc, desde(ev), 0); });
    esc.addEventListener("pointerup", ev => { arrastrando = false; if (visor) visor.v = visor.pos > 50 ? 1 : 0; });
    esc.addEventListener("click", ev => ev.stopPropagation());
  }
  function pie() {
    if (!visor) return;
    const m = visor.m, n = cont(estado.i).media.length;
    let g = m.g;
    if (m.t === "alt") g = m.ops[Math.max(0, visor.v)][2];
    if (m.t === "wipe") g = m.gb;
    const tag = $("#visorTag");
    tag.textContent = TAGS[g] || "";
    tag.className = "visor-tag" + (esReal(g) ? " real" : "");
    $("#visorTxt").textContent = m.x;
    const lista = pasosDe(estado.i);
    $("#visorNum").textContent = visor.modo === "paso" ? `Paso ${estado.paso} de ${lista.length}` :
      `${visor.k + 1} / ${n}` + (m.t === "alt" || m.t === "wipe" ? " · V cambia la opción" : "") + " · Esc cierra";
  }
  function marcarMini() { $$(".mini", tira).forEach(b => b.classList.toggle("activa", !!visor && +b.dataset.k === visor.k)); }
  function cambiarVariante() {
    if (estado.fase !== "parada") return;
    if (!visor) {
      const k = cont(estado.i).media.findIndex(m => m.t === "alt" || m.t === "wipe");
      if (k >= 0) abrirVisor(k, 0, "manual");
      return;
    }
    if (visor.m.t === "alt") variante(visor.v + 1, true);
    else if (visor.m.t === "wipe") variante(visor.pos < 50 ? 1 : 0, true);
  }

  // ============================================================ controles
  function sig() {
    if (estado.negro) return ponerNegro(false);
    if (!$("#ayuda").hidden) return ocultarAyuda();
    if (estado.fase === "vuelo") return saltarVuelo();
    if (estado.i === -1) return ir(0, "vuelo");
    if (visor && visor.modo === "manual") {
      const n = cont(estado.i).media.length;
      return visor.k + 1 < n ? abrirVisor(visor.k + 1, 0, "manual") : cerrarVisor();
    }
    const lista = pasosDe(estado.i);
    if (estado.paso < lista.length) { estado.paso++; aplicarPaso(); return; }
    if (estado.i < PARADAS.length - 1) ir(estado.i + 1, "vuelo");
  }
  function ant() {
    if (estado.negro) return ponerNegro(false);
    if (!$("#ayuda").hidden) return ocultarAyuda();
    if (estado.fase === "vuelo") {
      if (estado.i > 0) { const i = estado.i - 1; saltarVuelo(); ir(i, "corte"); }
      return;
    }
    if (visor && visor.modo === "manual") return visor.k > 0 ? abrirVisor(visor.k - 1, 0, "manual") : cerrarVisor();
    if (estado.paso > 0) { estado.paso--; aplicarPaso(); return; }
    if (estado.i > 0) ir(estado.i - 1, "corte");
    else if (estado.i === 0) volverApertura();
  }
  function escape() {
    if (!$("#ayuda").hidden) return ocultarAyuda();
    if (visor) { if (visor.modo === "paso") estado.paso = pasosDe(estado.i).length; cerrarVisor(); return; }
    if (finalEl.classList.contains("on")) { ocultarFinal(); emitir(); return; }
    if (estado.negro) ponerNegro(false);
  }
  function ponerNegro(v) { estado.negro = v; negroEl.classList.toggle("on", v); emitir(); }
  function pintarNotas() {
    const el = $("#notas"), c = cont(estado.i);
    if (estado.i < 0) { el.innerHTML = `<h4>Notas · portada</h4><ul><li>Presione → o el control para empezar el recorrido.</li></ul>`; return; }
    el.innerHTML = `<h4>Notas · ${String(estado.i + 1).padStart(2, "0")}/${PARADAS.length} · ${(PARADAS[estado.i].titulo || "")}</h4><ul>${(c.notas || []).map(x => `<li>${x}</li>`).join("")}</ul>`;
  }
  function alternarNotas(v) {
    estado.notas = v === undefined ? !estado.notas : v;
    $("#notas").hidden = !estado.notas;
    $("[data-accion=notas]").setAttribute("aria-pressed", estado.notas ? "true" : "false");
    if (estado.notas) pintarNotas();
    emitir();
  }
  function ocultarAyuda() { $("#ayuda").hidden = true; }
  function pantallaCompleta() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    else (document.documentElement.requestFullscreen ? document.documentElement.requestFullscreen() : Promise.reject()).catch(() => { });
  }
  function abrirPresentador() {
    const w = window.open(location.pathname + "?presentador", "chucuri-presentador", "popup=yes,width=1280,height=820");
    if (w) w.focus();
  }
  function marcarHud() {
    $$("#hudPuntos button").forEach((b, k) => { b.classList.toggle("on", k === estado.i); b.classList.toggle("visto", estado.vistas.has(k)); });
    $("#hudNum").textContent = estado.i < 0 ? "Portada" : `${String(estado.i + 1).padStart(2, "0")} / ${PARADAS.length}`;
  }

  addEventListener("keydown", ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    let hecho = true;
    if (["ArrowRight", "PageDown", " ", "Spacebar", "Enter", "ArrowDown", "MediaTrackNext"].includes(k)) sig();
    else if (["ArrowLeft", "PageUp", "Backspace", "ArrowUp", "MediaTrackPrevious"].includes(k)) ant();
    else if (k === "Home") ir(0, "corte");
    else if (k === "End") ir(PARADAS.length - 1, "corte");
    else if (/^[1-9]$/.test(k)) { if (estado.fase === "parada") abrirVisor(+k - 1, 0, "manual"); }
    else if (k === "0") cerrarVisor();
    else if (k === "v" || k === "V") cambiarVariante();
    else if (k === "f" || k === "F" || k === "F5") pantallaCompleta();
    else if (k === "b" || k === "B" || k === "." || k === "w" || k === "W") ponerNegro(!estado.negro);
    else if (k === "n" || k === "N") alternarNotas();
    else if (k === "p" || k === "P") abrirPresentador();
    else if (k === "h" || k === "H" || k === "?") $("#ayuda").hidden = !$("#ayuda").hidden;
    else if (k === "Escape") escape();
    else hecho = false;
    if (hecho) ev.preventDefault();
  });
  sala.addEventListener("click", ev => {
    if (ev.target.closest(".hud, .ayuda, .notas, .vi-wipe, .vi-bots")) return;
    const mini = ev.target.closest(".mini");
    if (mini) { ev.stopPropagation(); mini.blur(); abrirVisor(+mini.dataset.k, 0, "manual"); return; }
    if (visor && visor.modo === "manual" && ev.target.closest(".visor")) { if (!ev.target.closest(".vi-escena")) cerrarVisor(); return; }
    sig();
  });
  $("#hud").addEventListener("click", ev => {
    const b = ev.target.closest("[data-accion]");
    if (!b) return;
    ev.stopPropagation();
    b.blur();
    const a = b.dataset.accion;
    if (a === "sig") sig(); else if (a === "ant") ant(); else if (a === "notas") alternarNotas(); else if (a === "presentador") abrirPresentador();
    else if (a === "completa") pantallaCompleta(); else if (a === "ayuda") $("#ayuda").hidden = !$("#ayuda").hidden;
  });
  // deslizar con el dedo (tableta)
  let toque = null;
  sala.addEventListener("touchstart", ev => { const t = ev.touches[0]; toque = { x: t.clientX, y: t.clientY }; }, { passive: true });
  sala.addEventListener("touchend", ev => {
    if (!toque || ev.target.closest(".vi-wipe")) return;
    const t = ev.changedTouches[0], dx = t.clientX - toque.x;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(t.clientY - toque.y)) { ev.preventDefault(); dx < 0 ? sig() : ant(); }
    toque = null;
  });
  // el HUD aparece al acercar el ratón abajo; el cursor se esconde solo
  let quieto = 0;
  addEventListener("mousemove", ev => {
    sala.classList.remove("sin-cursor");
    sala.classList.toggle("hud-on", ev.clientY > innerHeight - Math.max(110, innerHeight * 0.13) || !!ev.target.closest(".hud"));
    clearTimeout(quieto);
    quieto = setTimeout(() => { if (!$(".hud:hover")) { sala.classList.add("sin-cursor"); sala.classList.remove("hud-on"); } }, 2600);
  });
  addEventListener("hashchange", () => {
    const k = PARADAS.findIndex(p => "#" + p.id === location.hash);
    if (k >= 0 && k !== estado.i) ir(k, "corte");
  });
  addEventListener("resize", () => {
    escalar(); ajustarEscena();
    if (estado.fase === "parada") pintarTrazos(cont(estado.i), proyActual, true);
  });

  // ============================================================ sincronía con la vista del presentador
  function emitir() {
    if (!bc) return;
    const lista = estado.i >= 0 ? pasosDe(estado.i) : [];
    bc.postMessage({
      tipo: "estado", i: estado.i, paso: estado.paso, pasos: lista.length, fase: estado.fase, negro: estado.negro, notas: estado.notas,
      visor: visor ? { k: visor.k, v: visor.v, modo: visor.modo } : null, final: finalEl.classList.contains("on"), total: PARADAS.length
    });
  }
  if (bc) bc.onmessage = ev => {
    const m = ev.data || {};
    if (m.tipo === "hola") emitir();
    if (m.tipo !== "cmd") return;
    if (m.cmd === "sig") sig(); else if (m.cmd === "ant") ant();
    else if (m.cmd === "ir" && Number.isInteger(m.i)) { if (m.i < 0) volverApertura(); else ir(m.i, m.i === estado.i + 1 && estado.fase === "parada" && !visor ? "vuelo" : "corte"); }
    else if (m.cmd === "negro") ponerNegro(!estado.negro);
    else if (m.cmd === "notas") alternarNotas();
    else if (m.cmd === "visor" && Number.isInteger(m.k)) abrirVisor(m.k, 0, "manual");
    else if (m.cmd === "cerrar") cerrarVisor();
  };
  setInterval(emitir, 3000);

  // ============================================================ arranque
  async function arrancar() {
    escalar();
    sala.classList.add("fase-apertura");
    aperturaVideo.src = RAIZ + "media/v/hero_1080.mp4";
    aperturaVideo.play().catch(() => { });
    try {
      const r = await fetch("paradas.json", { cache: "no-cache" });
      const j = await r.json();
      if (Array.isArray(j.paradas) && j.paradas.length) PARADAS = j.paradas.map(p => ({ id: p.id, titulo: p.titulo || p.id, modo: p.modo || "dia" }));
    } catch (e) { /* sin paradas.json: el orden de este archivo */ }
    for (const p of PARADAS) if (!C[p.id]) C[p.id] = { ov: "", titulo: p.titulo, sub: "", datos: [], nombres: [], media: [], notas: [] };
    $("#hudPuntos").innerHTML = PARADAS.map((p, k) => `<button type="button" title="${String(k + 1).padStart(2, "0")} · ${p.titulo}" aria-label="${p.titulo}" data-i="${k}"></button>`).join("");
    $$("#hudPuntos button").forEach(b => b.addEventListener("click", ev => { ev.stopPropagation(); ir(+b.dataset.i, "corte"); }));
    marcarHud();
    await leerManifiestos();
    const desde = PARADAS.findIndex(p => "#" + p.id === location.hash);
    if (desde >= 0) { apertura.classList.add("fuera"); sala.classList.remove("fase-apertura"); aperturaVideo.pause(); ir(desde, "corte"); }
    else {
      cargarFoto(0).then(f => { const u = f && f.fuente ? aperturaDe(f.fuente) : null; if (u && estado.i === -1) videoPara(u); });
      emitir();
    }
  }
  window.presentacion = {
    estado, sig, ant, ir, abrirVisor, cerrarVisor, cambiarVariante, volverApertura, alternarNotas, ponerNegro,
    info: () => ({
      i: estado.i, id: PARADAS[estado.i] ? PARADAS[estado.i].id : null, paso: estado.paso, fase: estado.fase, visor: visor ? { k: visor.k, v: visor.v, modo: visor.modo, pos: visor.pos } : null,
      foto: fotoEls[fotoActual].dataset.url || null, nombres: $$(".nb", nombres).map(n => n.textContent), trazos: $$(".tr", trazos).length,
      fuentes: FUENTES.map(f => ({ id: f.id, hay: f.hay, archivos: f.lista ? f.lista.size : 0 })), escala
    })
  };
  arrancar();

  // ============================================================ vista del presentador
  function presentador() {
    document.documentElement.classList.add("presentador");
    document.title = "La Chucurí · Vista del presentador";
    const pres = $("#pres");
    pres.hidden = false;
    let st = null, ultimo = 0, t0 = null, acumulado = 0, pausado = false;
    const enviar = (cmd, extra = {}) => bc && bc.postMessage({ tipo: "cmd", cmd, ...extra });
    const cuadro = async (el, i, paso, chico) => {
      const marca = `${i}|${paso}`;
      el.dataset.marca = marca;
      let img = "", sobre = "", titulo = "", pasoTxt = "";
      if (i < 0) { img = RAIZ + "media/v/hero.webp"; sobre = "Portada"; titulo = "La Chucurí · Centro Internacional Biotemático"; }
      else if (i >= PARADAS.length) { el.innerHTML = `<div class="pc-txt"><small>Fin</small><b>Fin de la presentación</b></div>`; return; }
      else {
        const c = cont(i), lista = pasosDe(i);
        sobre = `${String(i + 1).padStart(2, "0")} / ${PARADAS.length} · ${c.ov || ""}`;
        titulo = PARADAS[i].titulo;
        if (paso > 0 && lista[paso - 1]) {
          const def = lista[paso - 1];
          pasoTxt = `Paso ${paso} de ${lista.length}: ${etiquetaPaso(i, def)}`;
          const m = def[0] === "final" ? null : c.media[def[0]];
          if (m) img = m.t === "alt" ? ruta(m.ops[def[1] || 0][1]) + "_1200.webp" : m.t === "wipe" ? ruta(def[1] ? m.b : m.a) + "_1200.webp" : miniatura(m);
        }
        if (!img) { const f = await cargarFoto(i); img = f ? f.url : ""; }
      }
      if (el.dataset.marca !== marca) return;
      el.innerHTML = (img ? `<img src="${img}" alt="">` : "") + `<div class="pc-txt"><small>${sobre}</small><b>${titulo}</b>${pasoTxt ? `<span class="pc-paso">${pasoTxt}</span>` : ""}</div>`;
    };
    function pintar() {
      if (!st) return;
      const i = st.i;
      $("#presNum").textContent = i < 0 ? "portada" : `${String(i + 1).padStart(2, "0")} de ${PARADAS.length}`;
      const visorPaso = st.visor && st.visor.modo === "paso" ? st.paso : (st.final ? st.paso : 0);
      cuadro($("#presAhora"), i, visorPaso, false);
      // lo que sigue: el próximo paso de esta parada o la próxima parada
      const lista = i >= 0 ? pasosDe(i) : [];
      if (i >= 0 && st.paso < lista.length) cuadro($("#presSigue"), i, st.paso + 1, true);
      else cuadro($("#presSigue"), i + 1, 0, true);
      const c = i >= 0 ? cont(i) : null;
      $("#presNotas").innerHTML = c ? `<ul>${(c.notas || []).map(x => `<li>${x}</li>`).join("")}</ul>` +
        (lista.length ? `<p class="pn-pasos">Con el control: ${lista.map(d => etiquetaPaso(i, d)).join(" → ")} → siguiente parada.</p>` : "")
        : `<ul><li>La portada está en pantalla. Presione “Siguiente” o el control para empezar.</li><li>En San Cristóbal, a ocho minutos de la Plaza Bolívar, hay una montaña entera esperando.</li></ul>`;
      $$("#presLista button").forEach((b, k) => b.classList.toggle("on", k === i));
      $$("[data-pres=negro]").forEach(b => b.classList.toggle("primario", !!st.negro));
      $$("[data-pres=notas]").forEach(b => b.classList.toggle("primario", !!st.notas));
    }
    async function iniciarP() {
      try {
        const r = await fetch("paradas.json", { cache: "no-cache" });
        const j = await r.json();
        if (Array.isArray(j.paradas) && j.paradas.length) PARADAS = j.paradas.map(p => ({ id: p.id, titulo: p.titulo || p.id, modo: p.modo || "dia" }));
      } catch (e) { }
      for (const p of PARADAS) if (!C[p.id]) C[p.id] = { ov: "", titulo: p.titulo, sub: "", datos: [], nombres: [], media: [], notas: [] };
      await leerManifiestos();
      $("#presLista").innerHTML = PARADAS.map((p, k) => `<li><button type="button" data-i="${k}"><span>${String(k + 1).padStart(2, "0")}</span>${p.titulo}</button></li>`).join("");
      $$("#presLista button").forEach(b => b.addEventListener("click", () => enviar("ir", { i: +b.dataset.i })));
      if (bc) {
        bc.onmessage = ev => {
          const m = ev.data || {};
          if (m.tipo !== "estado") return;
          st = m; ultimo = Date.now();
          if (st.i >= 0 && t0 === null && !pausado) t0 = Date.now();
          pintar();
        };
        bc.postMessage({ tipo: "hola" });
      }
      cuadro($("#presAhora"), -1, 0); cuadro($("#presSigue"), 0, 0, true);
    }
    $$("[data-pres]").forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.pres;
      if (a === "abrir") { const w = window.open(location.pathname, "chucuri-presentacion"); if (w) w.focus(); setTimeout(() => bc && bc.postMessage({ tipo: "hola" }), 1500); }
      else enviar(a);
    }));
    $("#presPausa").addEventListener("click", () => {
      if (pausado) { pausado = false; t0 = Date.now(); $("#presPausa").textContent = "Pausar"; }
      else { if (t0 !== null) acumulado += Date.now() - t0; t0 = null; pausado = true; $("#presPausa").textContent = "Seguir"; }
    });
    $("#presReinicio").addEventListener("click", () => { acumulado = 0; t0 = pausado ? null : Date.now(); });
    setInterval(() => {
      const ms = acumulado + (t0 !== null ? Date.now() - t0 : 0), s = Math.floor(ms / 1000);
      $("#presCrono").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      const d = new Date();
      $("#presHora").textContent = d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
      const vivo = Date.now() - ultimo < 7000;
      const con = $("#presCon");
      con.classList.toggle("ok", vivo);
      con.textContent = vivo ? "Conectado con la presentación" : "Sin la presentación: ábrala en esta computadora";
      if (!vivo && bc) bc.postMessage({ tipo: "hola" });
    }, 1000);
    addEventListener("keydown", ev => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const k = ev.key;
      let hecho = true;
      if (["ArrowRight", "PageDown", " ", "Enter", "ArrowDown"].includes(k)) enviar("sig");
      else if (["ArrowLeft", "PageUp", "ArrowUp"].includes(k)) enviar("ant");
      else if (k === "Home") enviar("ir", { i: 0 });
      else if (k === "End") enviar("ir", { i: PARADAS.length - 1 });
      else if (k === "b" || k === "B" || k === ".") enviar("negro");
      else if (k === "n" || k === "N") enviar("notas");
      else if (/^[1-9]$/.test(k)) enviar("visor", { k: +k - 1 });
      else if (k === "Escape") enviar("cerrar");
      else if (k === "F5") { }
      else hecho = false;
      if (hecho) ev.preventDefault();
    });
    window.presentacion = { presentador: true, estado: () => st };
    iniciarP();
  }
})();
