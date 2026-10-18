// Glyphes dessinés à la main (en code) : runes naines, chiffres nains, visages de la lune, signes des mois.
// Partagé entre la Table et le Carnet.
(function (G) {
  // Une rune = une hampe verticale + des branches. Boîte 10 × 20.
  const T = {
    hd: "M5 2 L9 6", hg: "M5 2 L1 6",            // en haut, branche qui descend vers la droite / la gauche
    bd: "M5 18 L9 14", bg: "M5 18 L1 14",        // en bas, branche qui remonte vers la droite / la gauche
    md: "M5 10 L9 6", mg: "M5 10 L1 6",          // au milieu, branche qui monte
    mdb: "M5 10 L9 14", mgb: "M5 10 L1 14",      // au milieu, branche qui descend
    hmd: "M5 6 L9 2", hmg: "M5 6 L1 2",          // haut de la hampe, branche qui monte
    barre: "M2 10 L8 10"
  };
  const RUNES = {
    E: ["hd"], A: ["hg"], S: ["bd"], I: [], N: ["bg"],
    T: ["hmd", "hmg"], R: ["hd", "bd"], U: ["hg", "bg"], L: ["md"], O: ["hd", "hg"],
    D: ["bd", "bg"], C: ["mg"], M: ["md", "mg"], P: ["hd", "mdb"], H: ["barre"],
    Q: ["barre", "hd"], G: ["mdb"], B: ["hd", "bg"], V: ["mgb"], F: ["hmd"],
    J: ["hmg"], X: ["hg", "bd"], Y: ["barre", "hg"], Z: ["barre", "bd"], K: ["barre", "bg"], W: ["mdb", "mgb"]
  };
  function rune(lettre, opts = {}) {
    const l = (lettre || "").toUpperCase();
    const traits = RUNES[l];
    const ep = opts.epaisseur || 1.6;
    if (!traits) return "";
    const d = ["M5 1 L5 19"].concat(traits.map(t => T[t])).join(" ");
    return `<svg class="rune" viewBox="0 0 10 20" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="${ep}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function sansAccent(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  // Une phrase en runes : les mots séparés par un point, les lignes par « / ».
  function phrase(texte, opts = {}) {
    const lignes = sansAccent(texte.toUpperCase()).split("/");
    return `<div class="runes-phrase">` + lignes.map(li => `<div class="runes-ligne">` +
      li.trim().split(/\s+/).map(m => `<span class="runes-mot">${[...m].filter(c => RUNES[c]).map(c => rune(c, opts)).join("")}</span>`).join(`<span class="runes-sep">·</span>`) +
      `</div>`).join("") + `</div>`;
  }

  // Chiffres nains, base douze : un rond pour zéro, des bâtons (1) et des toits (4).
  function chiffreNain(n) {
    let s = "";
    if (n === 0) s = `<circle cx="10" cy="12" r="5" fill="none"/>`;
    else {
      const toits = Math.floor(n / 4), batons = n % 4;
      for (let i = 0; i < toits; i++) { const y = 4 + i * 6; s += `<path d="M3 ${y + 5} L10 ${y} L17 ${y + 5}" fill="none"/>`; }
      const y0 = toits ? 6 + toits * 6 : 4, y1 = 22;
      const xs = batons === 1 ? [10] : batons === 2 ? [7, 13] : batons === 3 ? [5, 10, 15] : [];
      xs.forEach(x => s += `<path d="M${x} ${y0} L${x} ${y1}"/>`);
    }
    return `<svg class="chiffre-nain" viewBox="0 0 20 24" aria-hidden="true"><g stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${s}</g></svg>`;
  }

  // Visages de la lune (hémisphère nord) : 0 nouvelle, 2 premier quartier, 4 pleine, 6 dernier quartier.
  function lune(i, taille) {
    const r = 20, c = 22;
    const fond = `<circle cx="${c}" cy="${c}" r="${r}" fill="var(--lune-ombre, #1d1a24)" stroke="currentColor" stroke-width="1"/>`;
    if (i === 0) return svgL(fond);
    if (i === 4) return svgL(`<circle cx="${c}" cy="${c}" r="${r}" fill="var(--lune-clair, #eee6cf)" stroke="currentColor" stroke-width="1"/>`);
    // partie éclairée : à droite pour 1-3 (croissante), à gauche pour 5-7
    const droite = i < 4;
    const k = [0, 0.55, 0, -0.55, 0, -0.55, 0, 0.55][i]; // forme du terminateur
    const rx = Math.abs(k) * r;
    const cote = droite ? 1 : 0;
    // demi-cercle éclairé + ellipse du terminateur
    let d = `M${c} ${c - r} A${r} ${r} 0 0 ${cote} ${c} ${c + r}`;
    if (i === 2 || i === 6) d += ` Z`;
    else {
      const bombe = (i === 1 || i === 7) ? (droite ? 0 : 1) : (droite ? 1 : 0); // croissant mince ou gibbeuse
      d += ` A${rx} ${r} 0 0 ${bombe} ${c} ${c - r} Z`;
    }
    return svgL(fond + `<path d="${d}" fill="var(--lune-clair, #eee6cf)"/>`);
    function svgL(inner) { return `<svg class="lune" viewBox="0 0 44 44" ${taille ? `width="${taille}" height="${taille}"` : ""} aria-hidden="true">${inner}</svg>`; }
  }

  // Signes des douze mois, gravés par les elfes sur le Lunaire.
  const MOIS = [
    ["Afteryule", `<path d="M12 3v18M4 7.5l16 9M4 16.5l16-9M10 5l2 2 2-2M10 19l2-2 2 2"/>`],                       // flocon
    ["Solmath", `<path d="M12 21v-9M12 12c-3 0-4-3-4-6 3 0 4 2 4 6zM12 12c3 0 4-3 4-6-3 0-4 2-4 6"/><path d="M8 21h8"/>`], // perce-neige
    ["Rethe", `<path d="M12 21V8M12 8c0-3 2-5 4-5 0 3-2 5-4 5zM12 13c-2 0-4-2-4-4 2 0 4 1 4 4z"/>`],                  // bourgeon
    ["Astron", `<circle cx="12" cy="10" r="2"/><path d="M12 4v2M12 14v2M6 10h2M16 10h2M8 6l1.4 1.4M14.6 12.6L16 14M8 14l1.4-1.4M14.6 7.4L16 6M12 16v5"/>`], // primevère
    ["Thrimidge", `<path d="M6 21c2-6 4-10 6-17 2 7 4 11 6 17"/><circle cx="9" cy="11" r="1.3"/><circle cx="15" cy="13" r="1.3"/><circle cx="12" cy="7" r="1.3"/>`], // aubépine
    ["Forelithe", `<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>`], // grand soleil
    ["Afterlithe", `<path d="M12 21V5M12 7l-3-2M12 10l3-2M12 13l-3-2M12 16l3-2"/>`],                                     // épi vert
    ["Wedmath", `<path d="M8 21l4-12 4 12M12 9V3M10 5l2-2 2 2M7 8l5 1 5-1"/>`],                                           // gerbe
    ["Halimath", `<circle cx="12" cy="14" r="6"/><path d="M12 8c0-2 1-4 3-5M12 8c-2-1-4-1-5 0"/>`],                       // pomme
    ["Winterfilth", `<path d="M5 19c4-1 10-6 12-14-6 2-11 7-12 14zM5 19l7-8"/>`],                                         // feuille qui tombe
    ["Blotmath", `<path d="M12 21V9M12 13l-4-4M12 11l4-5M8 9l-2-3M16 6l1-3"/>`],                                         // branche nue
    ["Foreyule", `<path d="M12 3l2.2 5.6 6 .4-4.6 3.8 1.5 5.9L12 15.5 6.9 18.7l1.5-5.9L3.8 9l6-.4z"/>`]                   // étoile
  ];
  function signeMois(i, taille) {
    return `<svg class="signe-mois" viewBox="0 0 24 24" ${taille ? `width="${taille}" height="${taille}"` : ""} aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${MOIS[i][1]}</g></svg>`;
  }


  // Petits dessins des repas (plaques du coffre, page des repas du carnet)
  const REPAS = {
    coq: `<path d="M7 20h10M9 20l1-4M15 20l-1-4M6 12c0-3 2-5 5-5 1-2 3-3 4-2-1 1-1 2 0 3 2 1 3 3 3 5 0 2-2 4-5 4H9c-2 0-3-2-3-5zM15 8l3-1-2 3M7 9l-3-1 2 3"/>`,
    oeuf: `<path d="M12 4c-4 0-6 6-6 10a6 6 0 0 0 12 0c0-4-2-10-6-10z"/><path d="M8 19h8"/>`,
    cloche: `<path d="M7 17c1-2 1-4 1-7a4 4 0 0 1 8 0c0 3 0 5 1 7zM5 17h14M11 20a1.5 1.5 0 0 0 2 0M12 4V3"/>`,
    soleil: `<circle cx="12" cy="13" r="3.5"/><path d="M12 6V4M12 22v-2M5 13H3M21 13h-2M7 8L5.5 6.5M17 8l1.5-1.5M7 18l-1.5 1.5M17 18l1.5 1.5M3 22h18"/>`,
    theiere: `<path d="M6 11h10v4a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4zM16 12c3 0 3 4 0 4M6 12l-3-2v3M9 11c0-2 1-3 2-3s2 1 2 3M11 6v2"/>`,
    lanterne: `<path d="M9 7h6l1 2v8l-1 2H9l-1-2V9zM10 7V5h4v2M12 3v2M12 11c-1 1-1 3 0 4 1-1 1-3 0-4"/>`,
    lune: `<path d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z"/>`
  };
  function repas(nom, taille) {
    return `<svg class="repas" viewBox="0 0 24 24" ${taille ? `width="${taille}" height="${taille}"` : ""} aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${REPAS[nom] || ""}</g></svg>`;
  }

  G.Glyphes = { repas, rune, phrase, RUNES, chiffreNain, lune, signeMois, MOIS, sansAccent };
})(window);
