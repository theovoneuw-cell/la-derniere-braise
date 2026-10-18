// Le plateau : la carte du voyage, dessinée à la plume (en code), avec la route et le pion.
(function (G) {
  const L = 1600, H = 1000;
  let graine = 7;
  const alea = () => { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; };
  const r = (a, b) => a + alea() * (b - a);

  // Étapes du voyage (coordonnées sur la carte)
  const ETAPES = [
    { x: 215, y: 610, nom: "La Comté" },
    { x: 560, y: 455, nom: "La Vallée cachée" },
    { x: 712, y: 560, nom: "Sous les Monts" },
    { x: 1065, y: 470, nom: "La Forêt Noire" },
    { x: 1418, y: 352, nom: "La Montagne" }
  ];
  // Tracés de la route entre deux étapes (les tronçons s'ajoutent au fil du voyage)
  const TRONCONS = [
    "M215 610 C 290 600, 330 560, 390 548 S 470 520, 505 490 S 545 462, 560 455",
    "M560 455 C 600 470, 640 500, 660 530 S 700 556, 712 560",
    "M712 560 C 740 555, 770 540, 800 528 S 860 510, 905 500 S 960 488, 990 480 S 1040 472, 1065 470",
    "M1065 470 C 1110 465, 1150 450, 1200 430 S 1290 400, 1330 380 S 1390 360, 1418 352"
  ];

  function montagne(x, y, h, w) {
    const sx = x - w / 2, ex = x + w / 2, px = x + r(-w * .12, w * .12), py = y - h;
    let s = `<path class="m-trait" d="M${sx} ${y} Q ${sx + w * .25} ${y - h * .45}, ${px} ${py} Q ${x + w * .2} ${y - h * .5}, ${ex} ${y}"/>`;
    const n = Math.max(2, Math.round(w / 9));
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1), hx = px + (ex - px) * t, hy = py + (y - py) * t;
      s += `<path class="m-hachure" d="M${hx} ${hy} l${-w * .07} ${h * .22}"/>`;
    }
    return s;
  }
  function arbre(x, y, t) {
    const tr = r(.85, 1.15) * t, rc = tr * .42, cy = y - tr * .72;
    return `<path class="a-trait" d="M${x} ${y} l0 ${-tr * .4}"/><path class="a-trait a-fond" d="M${x - rc} ${cy + rc * .3} a ${rc * .55} ${rc * .55} 0 0 1 ${rc * .35} ${-rc * .95} a ${rc * .6} ${rc * .6} 0 0 1 ${rc * 1.1} ${-rc * .1} a ${rc * .55} ${rc * .55} 0 0 1 ${rc * .55} ${rc * 1.05} q ${-rc} ${rc * .35}, ${-rc * 2} 0 z"/>`;
  }
  function colline(x, y, w) { return `<path class="c-trait" d="M${x - w / 2} ${y} q ${w / 2} ${-w * .55}, ${w} 0"/><path class="c-hachure" d="M${x + w * .1} ${y - w * .18} l ${w * .12} ${w * .1}"/>`; }

  function dessiner() {
    graine = 7;
    let s = `<svg viewBox="0 0 ${L} ${H}" xmlns="http://www.w3.org/2000/svg" class="plateau-svg">
<defs>
  <filter id="pl-papier" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="2" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.3  0 0 0 0 0.16  0 0 0 0.22 0"/><feComposite in2="SourceGraphic" operator="in"/><feBlend in2="SourceGraphic" mode="multiply"/></filter>
  <filter id="pl-main"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="2.6"/></filter>
  <radialGradient id="pl-vignette" cx="50%" cy="50%" r="70%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#3b2410" stop-opacity=".55"/></radialGradient>
  <style>
    .m-trait,.a-trait,.c-trait,.riviere,.cadre,.cote{fill:none;stroke:#3b2716;stroke-linecap:round;stroke-linejoin:round}
    .m-trait{stroke-width:2.2;fill:#d9c49a}.m-hachure{stroke:#3b2716;stroke-width:1;opacity:.75}
    .a-trait{stroke-width:1.2}.a-fond{fill:#d3bd8f}.c-trait{stroke-width:1.6}.c-hachure{stroke:#3b2716;stroke-width:.9;opacity:.6}
    .riviere{stroke:#4b5a62;stroke-width:2.2;opacity:.8}.lac{fill:#b7b39a;stroke:#4b5a62;stroke-width:1.5;opacity:.85}
    .nom{font-family:'IM Fell English',Georgia,serif;fill:#3b2716;font-size:30px;font-style:italic}
    .nom-grand{font-family:'IM Fell English SC',Georgia,serif;fill:#3b2716;font-size:34px;letter-spacing:6px}
    .route{fill:none;stroke:#8a2f14;stroke-width:3.2;stroke-dasharray:2 9;stroke-linecap:round}
    .route-future{fill:none;stroke:#8a2f14;stroke-width:2;stroke-dasharray:1 12;stroke-linecap:round;opacity:.0}
    .etape{fill:#f1e4c4;stroke:#3b2716;stroke-width:2}.etape.faite{fill:#8a2f14}
    .ombre-case{fill:none;stroke:#3b2716;stroke-width:1.4}.ombre-case.pleine{fill:#15111c;stroke:#15111c}
  </style>
</defs>
<rect width="${L}" height="${H}" fill="#e6d3aa"/>
<rect width="${L}" height="${H}" fill="#e6d3aa" filter="url(#pl-papier)"/>
<g filter="url(#pl-main)">`;
    // Monts Brumeux : une longue chaîne du nord au sud
    for (let y = 110; y < 930; y += r(26, 36)) {
      const x = 760 + Math.sin(y / 140) * 26 + r(-14, 14);
      s += montagne(x, y + 30, r(46, 82), r(56, 84));
      if (alea() > .4) s += montagne(x + r(36, 60), y + 40, r(30, 52), r(40, 60));
    }
    // Montagnes grises du nord (au-dessus de la forêt)
    for (let x = 980; x < 1460; x += r(40, 56)) s += montagne(x, 140 + r(-10, 10), r(28, 44), r(40, 56));
    // La Montagne, seule
    s += `<path class="m-trait" style="stroke-width:3;fill:#d4bc8c" d="M1338 372 Q 1380 300, 1404 238 Q 1418 214, 1432 236 Q 1460 296, 1500 372"/>`;
    for (let i = 0; i < 9; i++) s += `<path class="m-hachure" d="M${1414 + i * 9} ${246 + i * 13} l -12 26"/>`;
    // Forêt Noire : une masse d'arbres
    const foret = [];
    for (let i = 0; i < 620; i++) {
      const x = r(950, 1250), y = r(220, 860);
      const dx = (x - 1100) / 150, dy = (y - 540) / 330;
      if (dx * dx + dy * dy > 1 + r(-.12, .08)) continue;
      if (Math.abs(y - (470 + (x - 1065) * -.15)) < 9) continue; // le sentier
      foret.push([x, y]);
    }
    foret.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => s += arbre(x, y, r(14, 19)));
    // La Comté : collines et petits bois
    for (let i = 0; i < 26; i++) s += colline(r(100, 360), r(520, 760), r(26, 42));
    for (let i = 0; i < 40; i++) s += arbre(r(120, 340), r(540, 760), r(9, 12));
    // La Vallée cachée
    s += `<path class="c-trait" d="M500 470 q 30 -30 60 -10 q 30 20 60 -6"/><path class="c-trait" d="M505 440 q 25 22 55 12"/>`;
    for (let i = 0; i < 14; i++) s += arbre(r(510, 610), r(420, 500), r(9, 12));
    // Rivières
    s += `<path class="riviere" d="M900 80 C 880 240, 920 360, 880 520 S 900 760, 870 960"/>`;
    s += `<path class="riviere" d="M600 300 C 580 360, 610 420, 570 470 S 470 560, 400 640 S 300 760, 260 900"/>`;
    s += `<path class="riviere" d="M1418 360 C 1440 430, 1420 500, 1460 560"/><ellipse class="lac" cx="1466" cy="610" rx="22" ry="58"/>`;
    s += `<ellipse class="lac" cx="690" cy="585" rx="26" ry="14"/>`;
    // Plaine brûlée autour de la Montagne
    for (let i = 0; i < 70; i++) { const x = r(1290, 1560), y = r(300, 480); s += `<path class="c-hachure" d="M${x} ${y} l ${r(4, 10)} ${r(-2, 2)}"/>`; }
    s += `</g>`;
    // Noms
    s += `<text class="nom" x="150" y="805">La Comté</text>
<text class="nom" x="470" y="400">La Vallée cachée</text>
<text class="nom-grand" x="610" y="80" transform="rotate(-4 700 80)">Monts Brumeux</text>
<text class="nom-grand" x="985" y="905">Forêt Noire</text>
<text class="nom" x="1335" y="200">La Montagne</text>`;
    // Rose des vents
    s += `<g transform="translate(1460 820)" class="rose"><circle r="54" fill="none" stroke="#3b2716" stroke-width="1.2"/><circle r="4" fill="#3b2716"/>
<path d="M0 -70 L8 0 L0 70 L-8 0 Z M-70 0 L0 -8 L70 0 L0 8 Z" fill="#cdb68a" stroke="#3b2716" stroke-width="1.4"/><path d="M0 -70 L8 0 L-8 0 Z" fill="#8a2f14"/>
<text class="nom" x="-9" y="-80" style="font-size:24px;font-style:normal">N</text></g>`;
    // Cartouche
    s += `<g transform="translate(60 70)"><path class="cadre" d="M0 0 h360 v88 h-360 z" stroke-width="1.6"/><path class="cadre" d="M6 6 h348 v76 h-348 z" stroke-width=".8"/>
<text class="nom" x="20" y="42" style="font-size:28px">Le chemin de l'Est</text><text class="nom" x="20" y="70" style="font-size:19px">relevé par M. Sous-Colline</text></g>`;
    // Routes
    TRONCONS.forEach((d, i) => s += `<path class="route" data-troncon="${i}" d="${d}" style="opacity:0"/>`);
    ETAPES.forEach((e, i) => s += `<circle class="etape" data-etape="${i}" cx="${e.x}" cy="${e.y}" r="9" style="opacity:0"/>`);
    // Piste de l'Ombre, le long du bord bas
    s += `<g class="piste-ombre">`;
    for (let i = 0; i < 24; i++) s += `<rect class="ombre-case" data-case="${i}" x="${430 + i * 30}" y="955" width="20" height="20" rx="3"/>`;
    s += `<text class="nom" x="300" y="973" style="font-size:22px">L'Ombre</text></g>`;
    // Pion
    s += `<g class="pion" id="pion"><ellipse cx="0" cy="6" rx="15" ry="5" fill="#000" opacity=".25"/><path d="M-11 4 C -11 -14, 11 -14, 11 4 Z" fill="#2e5a2a" stroke="#1b1208" stroke-width="2"/><circle cx="0" cy="-16" r="8" fill="#c99a5b" stroke="#1b1208" stroke-width="2"/></g>`;
    s += `<rect width="${L}" height="${H}" fill="url(#pl-vignette)" pointer-events="none"/>`;
    s += `<rect x="14" y="14" width="${L - 28}" height="${H - 28}" class="cadre" stroke-width="2.4"/><rect x="24" y="24" width="${L - 48}" height="${H - 48}" class="cadre" stroke-width=".9"/>`;
    s += `</svg>`;
    return s;
  }

  // Met la carte dans l'état du voyage : étapes faites, tronçons tracés, pion posé, Ombre.
  function etat(conteneur, { chap, ombre, anime }) {
    if (!conteneur.firstElementChild) conteneur.innerHTML = dessiner();
    const svg = conteneur.firstElementChild;
    svg.querySelectorAll(".route").forEach((p, i) => {
      const L = p.getTotalLength();
      if (i < chap - (anime ? 1 : 0)) { p.style.opacity = 1; p.style.strokeDasharray = ""; p.style.transition = "none"; }
      else if (anime && i === chap - 1) {
        p.style.opacity = 1; p.style.transition = "none";
        const masque = `${L}`; p.style.strokeDasharray = `2 9`; // la route se trace à mesure que le pion avance
      } else p.style.opacity = 0;
    });
    svg.querySelectorAll(".etape").forEach((c, i) => { c.style.opacity = i <= chap ? 1 : (i === chap + 1 ? .5 : 0); c.classList.toggle("faite", i < chap); });
    svg.querySelectorAll(".ombre-case").forEach((c, i) => c.classList.toggle("pleine", i < ombre));
    const pion = svg.getElementById("pion");
    if (anime && chap > 0) {
      const p = svg.querySelector(`.route[data-troncon="${chap - 1}"]`), L = p.getTotalLength(), t0 = performance.now(), duree = anime;
      return new Promise(fin => {
        const pas = (t) => {
          const k = Math.min(1, (t - t0) / duree), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const pt = p.getPointAtLength(L * e); pion.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
          p.style.clipPath = ""; p.setAttribute("stroke-dashoffset", 0);
          p.style.strokeDasharray = `2 9`; p.style.opacity = 1;
          p.style.webkitMaskImage = ""; // simple : la route est visible, le pion la parcourt
          if (k < 1) requestAnimationFrame(pas); else fin();
        };
        requestAnimationFrame(pas);
      });
    }
    const e = ETAPES[Math.min(chap, ETAPES.length - 1)];
    pion.setAttribute("transform", `translate(${e.x} ${e.y})`);
    return Promise.resolve();
  }

  // Petite version de la carte révélée (carte 34), sans l'Ombre ni le pion.
  function carteRevelee() {
    const d = document.createElement("div"); d.innerHTML = dessiner(); const svg = d.firstElementChild;
    svg.querySelectorAll(".route").forEach(p => p.style.opacity = 1);
    svg.querySelectorAll(".etape").forEach(c => c.style.opacity = 1);
    svg.querySelector(".piste-ombre").remove(); svg.getElementById("pion").remove();
    return svg.outerHTML;
  }

  G.Plateau = { dessiner, etat, carteRevelee, ETAPES };
})(window);
