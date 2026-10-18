// Le moteur de la Table : état de la partie, cartes, pioche, assemblages, Ombre, anneau, récit.
(function (G) {
  "use strict";
  // ——— Données (encodées dans le dépôt pour ne rien divulgâcher)
  function decode(s) {
    const b = Uint8Array.from(atob(s), c => c.charCodeAt(0)), k = new TextEncoder().encode("mirabelle-sous-colline-1389");
    for (let i = 0; i < b.length; i++) b[i] ^= k[i % k.length] ^ ((i * 7) & 255);
    return JSON.parse(new TextDecoder().decode(b));
  }
  const J = decode(G.__D);
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const CLE_SAUVE = "braise-partie-v1";
  const URL_CARNET = new URL("carnet/", location.href).href;

  // ——— État
  let S = null;
  function neuf(noms) {
    return { noms, chap: 0, main: [], defausse: [], flags: {}, ombreAutres: 0, temps: 0, anneauMs: 0, tambourMs: 0, tirages: 0,
      indices: {}, lieu: null, dedale: { salle: "R0", prec: null, vues: ["R0"] }, anneau: false, tambours: false, etape: "jeu", nouv: [] };
  }
  const sauver = () => { try { localStorage.setItem(CLE_SAUVE, JSON.stringify(S)); } catch (e) {} };
  const charger = () => { try { return JSON.parse(localStorage.getItem(CLE_SAUVE)); } catch (e) { return null; } };

  const ombre = () => Math.min(J.ombreMax, Math.floor(S.temps / (J.ombreParMinutes * 60000)) + S.ombreAutres);
  const chap = () => J.chapitres[S.chap];
  const carte = n => J.cartes[n];
  const enMain = n => S.main.includes(+n);
  const noms = t => (t || "").replace(/\{A\}/g, S.noms.a).replace(/\{B\}/g, S.noms.b)
    .replace(/\[\[runes:([^\]]+)\]\]/g, (_, p) => Glyphes.phrase(p));

  // ——— Écrans
  function ecran(id) {
    $$(".ecran").forEach(e => e.classList.toggle("actif", e.id === id));
    document.body.classList.toggle("sur-titre", id === "titre");
  }

  // ——— Toast
  let tToast;
  function toast(t, ms = 2600) { const el = $("#toast"); el.innerHTML = t; el.classList.add("visible"); clearTimeout(tToast); tToast = setTimeout(() => el.classList.remove("visible"), ms); }

  // ——— Billets de récit, en file
  const file = []; let billetOuvert = false, apresBillets = [];
  function billet(html) { file.push(html); if (!billetOuvert) suivantBillet(); }
  function suivantBillet() {
    const m = $("#m-billet");
    if (!file.length) { m.hidden = true; billetOuvert = false; const f = apresBillets; apresBillets = []; f.forEach(x => x()); return; }
    billetOuvert = true; $("#billet-texte").innerHTML = noms(file.shift()); m.hidden = false; $("#billet-ok").focus();
  }
  function quandBilletsFinis(f) { if (!billetOuvert && !file.length) f(); else apresBillets.push(f); }
  $("#billet-ok").onclick = () => { Son.son("page", { gain: .5 }); suivantBillet(); };

  // ——— Ombre
  let ombreAffichee = -1;
  function ajouterOmbre(n, raison) {
    if (!n) return;
    S.ombreAutres += n; majOmbre(); if (raison) toast(raison);
  }
  function majOmbre() {
    const o = ombre();
    const cases = $("#ombre-cases");
    if (!cases.children.length) for (let i = 0; i < J.ombreMax; i++) cases.appendChild(document.createElement("i"));
    [...cases.children].forEach((c, i) => { const p = i < o; if (p && !c.classList.contains("pleine") && ombreAffichee >= 0) { c.classList.add("nouvelle"); setTimeout(() => c.classList.remove("nouvelle"), 1700); } c.classList.toggle("pleine", p); });
    if (ombreAffichee >= 0 && o > ombreAffichee) { Son.son("ombre"); }
    ombreAffichee = o;
    document.documentElement.style.setProperty("--ombre-pct", (o / J.ombreMax).toFixed(3));
  }

  // ——— Horloge de jeu
  let dernier = performance.now(), enPause = false;
  setInterval(() => {
    const t = performance.now(), dt = Math.min(2000, t - dernier); dernier = t;
    if (!S || S.etape !== "jeu" || enPause || document.hidden || !$("#table").classList.contains("actif")) return;
    const avant = ombre();
    S.temps += dt;
    if (S.anneau) { S.anneauMs += dt; while (S.anneauMs >= J.anneauSecondes * 1000) { S.anneauMs -= J.anneauSecondes * 1000; S.ombreAutres++; } }
    if (S.tambours) { S.tambourMs += dt; while (S.tambourMs >= J.tambourSecondes * 1000) { S.tambourMs -= J.tambourSecondes * 1000; S.ombreAutres++; } }
    if (ombre() !== avant) majOmbre();
    if (Math.random() < .002 && ombre() > 12 && !S.anneau) Son.son("murmures", { gain: .25 });
    if (t % 10000 < 1000) sauver();
  }, 500);
  document.addEventListener("visibilitychange", () => { dernier = performance.now(); if (document.hidden) sauver(); });

  // ——— Effets
  function effets(liste, ctx = {}) {
    (liste || []).forEach(e => {
      if (e.son) Son.son(e.son, { gain: .9 });
      if (e.defausser) e.defausser.forEach(defausser);
      if (e.reveler) e.reveler.forEach(n => reveler(n));
      if (e.flag) { S.flags[e.flag] = true; }
      if (e.ombre) ajouterOmbre(e.ombre);
      if (e.ambiance) Son.ambiance(e.ambiance);
      if (e.texte) billet(e.texte);
      if (e.tambours === false) arreterTambours();
      if (e.sommeil) sommeil();
      if (e.regleAnneau) billet(`<p>L'anneau est à vous, désormais.</p><p>Un bouton est apparu en bas de l'écran : <b>Passer l'anneau</b>. Tant qu'il est à votre doigt, vous voyez ce qui se cache aux yeux des vivants, et certaines cartes changent.</p><p>Mais quelque chose, loin à l'Est, vous voit aussi. Tant que vous le portez, <b>l'Ombre avance très vite</b>. Ôtez-le dès que vous avez vu ce qu'il fallait voir.</p>`);
      if (e.finale) quandBilletsFinis(() => { fermerCarte(); finale(); });
    });
    rendu(); sauver();
    quandBilletsFinis(verifierFinChapitre);
  }
  function reveler(n) {
    n = +n; if (enMain(n)) return;
    S.defausse = S.defausse.filter(x => x !== n);
    S.main.push(n); S.nouv.push(n);
    if (carte(n).type === "lieu") S.lieu = n;
  }
  function defausser(n) {
    n = +n; if (!enMain(n)) return;
    S.main = S.main.filter(x => x !== n); S.defausse.push(n);
    if (S.lieu === n) S.lieu = S.main.filter(x => carte(x).type === "lieu").pop() || null;
    if (carteOuverte === n) fermerCarte();
  }
  function sommeil() {
    const v = document.createElement("div"); v.style.cssText = "position:fixed;inset:0;background:#000;z-index:30;opacity:0;transition:opacity 1.5s;pointer-events:none";
    document.body.appendChild(v); requestAnimationFrame(() => v.style.opacity = 1);
    setTimeout(() => { v.style.opacity = 0; setTimeout(() => v.remove(), 1600); }, 2200);
  }

  // ——— Fin de chapitre
  function verifierFinChapitre() {
    const c = chap(); if (!c || S.etape !== "jeu") return;
    const fini = c.fin.every(f => S.flags[f]);
    const zone = $("#bas-centre");
    if (fini && c.route) {
      zone.innerHTML = ""; const b = document.createElement("button"); b.className = "btn btn-principal"; b.textContent = "Prendre la route";
      b.onclick = () => chapitreSuivant(); zone.appendChild(b);
      if (!S.flags["annonce-" + c.id]) { S.flags["annonce-" + c.id] = true; Son.son("merveille"); }
    } else zone.textContent = "";
  }
  async function chapitreSuivant() {
    if (S.anneau) basculerAnneau(false);
    const c = chap();
    S.etape = "route"; sauver();
    await cinematique(c.route, { carte: S.chap + 1 });
    S.chap++;
    const n = chap();
    // On garde ce qui doit l'être, on laisse le reste derrière soi
    S.main.filter(x => !carte(x).garde).forEach(defausser);
    S.lieu = null; S.nouv = [];
    n.depart.forEach(x => reveler(x));
    S.etape = "jeu"; sauver();
    await titreChapitre();
    entrerTable();
  }
  function titreChapitre() {
    const c = chap();
    return cinematique(null, { pages: [`<span class="cine-chap">${["I", "II", "III", "IV", "V"][S.chap]}</span><br>${c.titre}`], musique: c.musique, court: true });
  }

  // ——— Cinématiques
  function cinematique(id, opts = {}) {
    const c = id && J.cines[id] ? J.cines[id] : { pages: opts.pages, musique: opts.musique };
    if (!opts.image && c.image) opts.image = c.image;
    return new Promise(fin => {
      ecran("cine");
      const fond = $(".cine-fond"), txt = $("#cine-texte"), suite = $("#cine-suite");
      fond.classList.remove("visible"); fond.innerHTML = ""; fond.style.backgroundImage = "";
      if (opts.carte != null) {
        fond.style.filter = "brightness(.38) saturate(.9)";
        Plateau.etat(fond, { chap: opts.carte - 1, ombre: ombre() });
        setTimeout(() => { fond.classList.add("visible"); Plateau.etat(fond, { chap: opts.carte, ombre: ombre(), anime: 14000 }); }, 400);
      } else if (opts.image) { fond.style.filter = ""; fond.style.backgroundImage = `url(img/${opts.image}.jpg)`; setTimeout(() => fond.classList.add("visible"), 300); }
      if (c.musique) Son.musique(c.musique, 4);
      if (c.ambiance) Son.ambiance(c.ambiance);
      let i = 0;
      const montrer = () => {
        txt.innerHTML = `<p>${noms(c.pages[i])}</p>`; suite.classList.remove("visible");
        if (id) Son.voix(`${id}-${i + 1}`);
        requestAnimationFrame(() => requestAnimationFrame(() => txt.firstChild.classList.add("visible")));
        setTimeout(() => suite.classList.add("visible"), opts.court ? 1400 : 1800);
        suite.textContent = i < c.pages.length - 1 ? "Continuer" : (opts.court ? "Commencer" : "Continuer");
      };
      const avancer = () => {
        if (!suite.classList.contains("visible")) return;
        i++; Son.arreterVoix(); if (i >= c.pages.length) { document.removeEventListener("keydown", clavier); suite.onclick = null; $("#cine").onclick = null; fin(); return; }
        txt.firstChild.classList.remove("visible"); setTimeout(montrer, 700);
      };
      const clavier = e => { if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); avancer(); } };
      document.addEventListener("keydown", clavier);
      $("#cine").onclick = avancer;
      montrer();
    });
  }

  // ——— Entrée à la Table
  function entrerTable() {
    ecran("table");
    const c = chap();
    $("#chap-nom").textContent = c.nom; $("#chap-titre").textContent = c.titre;
    Son.ambiance(S.flags.feu && S.chap === 0 ? "amb-comte-feu" : (S.chap === 2 && S.main.includes(36) ? "amb-mines" : (S.chap === 4 && enMain(67) ? "amb-couche" : (S.chap === 4 && enMain(63) ? "amb-or" : c.ambiance))), 3);
    Son.musique(null, 6);
    if (S.tambours) lancerTambours();
    majOmbre(); rendu(); verifierFinChapitre();
    chantLointain();
  }
  let tChant;
  function chantLointain() {
    clearTimeout(tChant);
    if (S.chap !== 1) return;
    tChant = setTimeout(() => { if (S.chap === 1 && !S.anneau && $("#table").classList.contains("actif")) Son.chant([3, 5, 7, 4, 1], { gain: .07 }); chantLointain(); }, 38000 + Math.random() * 15000);
  }

  // ——— Rendu de la Table
  function rendu() {
    if (!S) return;
    // Lieu
    if (!S.lieu || !enMain(S.lieu)) S.lieu = S.main.filter(x => carte(x).type === "lieu").pop() || null;
    renduScene();
    // Main
    const zone = $("#cartes"); zone.innerHTML = "";
    S.main.forEach((n, i) => zone.appendChild(elCarte(n, i)));
    S.nouv = [];
    $("#b-anneau").hidden = !enMain(0);
    $("#anneau-libelle").textContent = S.anneau ? "Ôter l'anneau" : "Passer l'anneau";
  }
  const ICONES = {
    lieu: `<svg viewBox="0 0 16 16"><path d="M2 13 L6 6 L9 10 L11 7 L14 13 Z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`,
    meca: `<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8 1.5v2.5M8 12v2.5M1.5 8h2.5M12 8h2.5M3.4 3.4l1.8 1.8M10.8 10.8l1.8 1.8M3.4 12.6l1.8-1.8M10.8 5.2l1.8-1.8" stroke="currentColor" stroke-width="1.2"/></svg>`,
    texte: `<svg viewBox="0 0 16 16"><path d="M3 2h10v12H3z M5 5h6M5 8h6M5 11h4" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>`,
    objet: ""
  };
  const DESSIN_VIDE = {
    texte: `<svg viewBox="0 0 40 40"><path d="M9 6h22v28H9z M13 12h14M13 17h14M13 22h14M13 27h9"/></svg>`,
    objet: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="11"/><path d="M20 9v-3M20 34v-3"/></svg>`,
    meca: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="7"/><circle cx="20" cy="20" r="13"/></svg>`,
    lieu: `<svg viewBox="0 0 40 40"><path d="M4 32 L15 14 L22 24 L27 17 L36 32 Z"/></svg>`
  };
  function imageCarte(n) {
    const c = carte(n);
    if (n === 34) return "data:image/svg+xml;utf8," + encodeURIComponent(Plateau.carteRevelee());
    if (n === 50) return "img/c-lanterne.jpg";
    return c.image ? `img/${c.image}.jpg` : null;
  }
  function elCarte(n, i) {
    const c = carte(n), el = document.createElement("div");
    el.className = `carte ${c.type}` + (n === 0 ? " anneau-carte" : "") + (S.nouv.includes(n) ? " nouvelle" : "") + (S.lieu === n ? " active" : "");
    el.dataset.n = n;
    el.style.setProperty("--rot", (((n * 37) % 7) - 3) * .5 + "deg");
    const img = imageCarte(n);
    el.innerHTML = `<span class="c-num">${n}</span><span class="c-type">${ICONES[c.type] || ""}</span>` +
      (img ? `<div class="c-img" style="background-image:url('${img}')"></div>` : `<div class="c-img vide">${DESSIN_VIDE[c.type]}</div>`) +
      `<div class="c-titre">${c.titre}</div>`;
    glisser(el, n);
    return el;
  }

  // ——— Scène (lieu actif)
  function renduScene() {
    const cadre = $("#scene-cadre"), scene = $("#scene");
    const n = S.lieu, c = n != null ? carte(n) : null;
    let boite = $(".scene-boite", cadre);
    if (!boite) { boite = document.createElement("div"); boite.className = "scene-boite"; cadre.innerHTML = ""; cadre.appendChild(boite); boite.innerHTML = `<img class="scene-img" id="scene-img" alt=""><div class="scene-calques" id="scene-calques"></div><div class="scene-noir" id="scene-noir"></div>`; lanterne(boite); }
    ["scene-img", "scene-calques", "scene-noir"].forEach(id => { const e = $("#" + id); e.style.inset = "0"; e.style.width = "100%"; e.style.height = "100%"; });
    scene.classList.toggle("sombre", !!(c && c.sombre));
    scene.classList.toggle("froide", enMain(50));
    const calques = $("#scene-calques"); calques.innerHTML = "";
    const actions = $("#scene-actions"); actions.innerHTML = "";
    if (!c) { $("#scene-img").removeAttribute("src"); $("#scene-titre").textContent = ""; $("#scene-texte").textContent = ""; return; }
    let image = c.image, titre = c.titre, texte = c.texte;
    if (c.lieu && c.lieu.dedale) {
      const salle = J.dedale.salles[S.dedale.salle];
      image = salle.image || c.image; titre = salle.nom; texte = noms(salle.texte);
      Mecas.dedale(calques, J, S, { aller: allerSalle, toast, enMain });
    }
    const img = $("#scene-img"); const src = `img/${image}.jpg`;
    // Les salles sous les Monts partagent une image : on la cadre autrement d'une salle à l'autre
    const CADRAGES = { R0: "", R1: "scale(1.3) translate(6%, -4%)", R2: "scaleX(-1) scale(1.15)", R3: "scale(1.45) translate(-8%, 3%)", R4: "scaleX(-1) scale(1.35) translate(5%, 4%)",
      R6: "scale(1.6) translate(0, -8%)", R7: "scaleX(-1) scale(1.5) translate(-6%, -3%)", R8: "scale(1.25) translate(-4%, 6%)", R9: "scale(1.7) translate(3%, 0)", D1: "scale(1.9) translate(10%, 5%)", D2: "scaleX(-1) scale(1.8)", D3: "scale(2) translate(-10%, -6%)" };
    img.style.transform = c.lieu && c.lieu.dedale ? (CADRAGES[S.dedale.salle] || "") : "";
    img.parentElement.style.overflow = "hidden";
    if (img.getAttribute("src") !== src) { img.src = src; img.onerror = () => { img.removeAttribute("src"); img.style.background = "#2a1f17"; }; }
    $("#scene-titre").textContent = titre; $("#scene-texte").innerHTML = noms(texte);
    // nombres cachés
    const nb = (J.nombres[n] || []).concat(n === 36 && S.dedale.salle === J.dedale.cle.salle ? (J.nombres.R5 || []) : []);
    nb.forEach(([num, x, y, style]) => {
      if (!x && !y) return;
      const s = document.createElement("span"); s.className = "nombre-cache" + (style === "c" ? " clair" : "") + (style === "a" ? " seul-anneau" : "");
      s.textContent = num; s.style.left = x + "%"; s.style.top = y + "%"; s.style.setProperty("--r", (((num * 13) % 9) - 4) + "deg");
      calques.appendChild(s);
    });
    // calques réservés à l'anneau
    (J.calquesAnneau && J.calquesAnneau[n] || []).forEach(([html, x, y, w]) => {
      const d = document.createElement("div"); d.className = "seul-anneau calque-anneau"; d.innerHTML = noms(html);
      d.style.cssText = `position:absolute;left:${x}%;top:${y}%;width:${w}%`; calques.appendChild(d);
    });
    if (n === 30 && S.flags.portevue) { const a = document.createElement("div"); a.className = "arche-argent"; a.innerHTML = `<svg viewBox="0 0 60 100"><path d="M6 100 V40 Q6 6 30 6 Q54 6 54 40 V100" fill="none" stroke="#e6eeff" stroke-width="2.4"/><path d="M14 100 V44 M46 100 V44" stroke="#e6eeff" stroke-width="1.4"/><path d="M14 28 h32" stroke="#e6eeff" stroke-width="1" stroke-dasharray="2 3"/></svg>`; calques.appendChild(a); }
    if (S.flags.feu && n === 10) { const f = document.createElement("div"); f.className = "lueur-feu"; f.style.setProperty("--fx", "49%"); f.style.setProperty("--fy", "76%"); calques.appendChild(f); }
    // actions propres au lieu
    if (c.lieu && c.lieu.chant) bouton(actions, "Écouter le chant au loin", () => { Son.chant([3, 5, 7, 4, 1], { gain: .16 }); toast("Au loin, sous les arbres, une voix chante cinq notes.", 9000); });
    if (c.lieu && c.lieu.couchant && !enMain(62) && !S.flags.porteOuest && !Mecas.couchantActif) bouton(actions, "Attendre le soir", (ev) => (ev.target.hidden = true, Mecas.couchant(calques, J, S, { reussite: () => { S.flags.porteOuest = true; effets([{ son: "porte-apparait" }, { reveler: [62] }, { texte: "Le dernier rayon tombe sur la paroi, rouge comme une braise. Et dans cette lumière, à hauteur d'épaule de nain, un trou de serrure apparaît là où il n'y avait que de la pierre. Il ne s'efface pas quand le soleil disparaît." }]); }, echec: () => { effets([{ ombre: 2 }, { texte: "Le soleil a disparu. La paroi n'est plus qu'une paroi. Vous passez la nuit blottis contre la pierre grise, sans feu, à écouter les corbeaux se disputer dans le noir. Il faudra attendre le soir suivant." }]); }, toast })));
    if (c.lieu && c.lieu.invisible && S.anneau && !S.flags.passe) bouton(actions, "Traverser, invisible", () => effets([{ son: "araignees" }, { ombre: 3 }, { flag: "passe" }, { texte: "Invisible, vous passez sous les toiles, entre les pattes, si près que vous sentez l'odeur des bêtes. Elles tournent la tête vers le bruit de vos pas, sans comprendre. Mais à l'Est, quelque chose a compris. Vous le sentez, comme un doigt froid posé sur votre nuque.<br><br>À la lisière, sur un hêtre, un M penché et un mot gravé au couteau : <b>FUMEROLLE</b>." }]));
  }
  function bouton(zone, t, f) { const b = document.createElement("button"); b.className = "btn btn-petit"; b.textContent = t; b.onclick = f; zone.appendChild(b); }
  function lanterne(boite) {
    const bouge = (x, y) => { const r = boite.getBoundingClientRect(); const noir = $("#scene-noir"); noir.style.setProperty("--lx", ((x - r.left) / r.width * 100) + "%"); noir.style.setProperty("--ly", ((y - r.top) / r.height * 100) + "%"); noir.style.setProperty("--rayon", Math.round(r.width * (enMain(50) ? .16 : .125)) + "px"); };
    boite.addEventListener("pointermove", e => bouge(e.clientX, e.clientY));
    boite.addEventListener("pointerdown", e => bouge(e.clientX, e.clientY));
  }
  // Ajuste la boîte de la scène au ratio 16/9
  function ajusterScene() {
    const cadre = $("#scene-cadre"), b = $(".scene-boite"); if (!b) return;
    const W = cadre.clientWidth, H = cadre.clientHeight; let w = W, h = W * 9 / 16; if (h > H) { h = H; w = H * 16 / 9; }
    b.style.width = w + "px"; b.style.height = h + "px";
  }
  new ResizeObserver(ajusterScene).observe($("#scene-cadre"));
  const obsScene = new MutationObserver(ajusterScene); obsScene.observe($("#scene-cadre"), { childList: true });

  // ——— Dédale
  function allerSalle(id, arche) {
    const d = J.dedale, salle = d.salles[id];
    Son.son("pas", { gain: .6 });
    if (d.grille && S.dedale.salle === d.grille.de && arche === d.grille.rune && !S.flags.grille) {
      if (!enMain(d.grille.carte)) { Son.son("grille-fermee"); toast("Une grille de fer noir ferme cette arche. Au centre, une serrure en forme d'enclume.", 4200); return; }
      S.flags.grille = true; Son.son("serrure-lourde"); billet("La clé noire entre dans la serrure de la grille. Elle tourne avec un grincement qui doit s'entendre jusqu'au fond de la montagne. La grille s'ouvre.");
    }
    S.dedale.prec = S.dedale.salle; S.dedale.salle = id;
    if (!S.dedale.vues.includes(id)) S.dedale.vues.push(id);
    if (id === d.tambours && !S.flags.tambours) { S.flags.tambours = true; S.tambours = true; lancerTambours(); billet("Doum.<br><br>Vous vous figez tous les deux. Ça vient d'en bas, de très loin, ou de partout.<br><br>Doum. Doum."); }
    if (salle.danger) { ajouterOmbre(salle.danger); Son.son(salle.danger > 1 ? "orques" : "eboulis"); }
    if (salle.carte && !enMain(salle.carte) && !S.defausse.includes(salle.carte)) { reveler(salle.carte); }
    rendu(); sauver();
    if (salle.danger > 1) setTimeout(() => { billet(salle.texte); quandBilletsFinis(() => { S.dedale.salle = S.dedale.prec; S.dedale.prec = null; rendu(); }); }, 300);
    if (salle.carte) setTimeout(() => ouvrirCarte(salle.carte), 500);
  }
  function lancerTambours() {
    Son.tambours([3, 1, 4], true, () => { $("#table").classList.add("tremble"); setTimeout(() => $("#table").classList.remove("tremble"), 250); poussiere(); });
  }
  function arreterTambours() { S.tambours = false; Son.tambours(null, false); }
  function poussiere() {
    const p = $("#poussiere");
    for (let i = 0; i < 6; i++) { const g = document.createElement("i"); g.style.left = Math.random() * 100 + "%"; g.style.setProperty("--dx", (Math.random() * 30 - 15) + "px"); g.style.animationDelay = Math.random() * .4 + "s"; p.appendChild(g); setTimeout(() => g.remove(), 2400); }
  }

  // ——— Glisser-déposer (souris et doigt)
  let glisse = null;
  function glisser(el, n) {
    el.addEventListener("pointerdown", e => {
      if (e.button) return;
      const x0 = e.clientX, y0 = e.clientY; let fantome = null, cible = null;
      el.setPointerCapture(e.pointerId);
      const bouge = ev => {
        const dx = ev.clientX - x0, dy = ev.clientY - y0;
        if (!fantome && Math.hypot(dx, dy) > 8) {
          fantome = el.cloneNode(true); fantome.classList.add("fantome"); fantome.classList.remove("nouvelle", "active"); document.body.appendChild(fantome); el.classList.add("retient");
          glisse = n; Son.son("carte", { gain: .4 });
        }
        if (fantome) {
          fantome.style.left = ev.clientX - 52 + "px"; fantome.style.top = ev.clientY - 70 + "px";
          fantome.style.display = "none"; const sous = document.elementFromPoint(ev.clientX, ev.clientY); fantome.style.display = "";
          const c = sous && sous.closest(".carte:not(.fantome)"), sc = sous && sous.closest(".scene-boite");
          const nouvelle = c && +c.dataset.n !== n ? c : (sc ? sc : null);
          if (nouvelle !== cible) { if (cible) cible.classList.remove("cible"); $("#scene").classList.remove("cible-glisser"); cible = nouvelle; if (cible) { if (cible.classList.contains("scene-boite")) $("#scene").classList.add("cible-glisser"); else cible.classList.add("cible"); } }
        }
      };
      const fin = ev => {
        el.removeEventListener("pointermove", bouge); el.removeEventListener("pointerup", fin); el.removeEventListener("pointercancel", fin);
        el.classList.remove("retient"); $("#scene").classList.remove("cible-glisser");
        if (fantome) {
          fantome.remove(); if (cible) cible.classList.remove("cible"); glisse = null;
          if (cible) { const b = cible.classList.contains("scene-boite") ? S.lieu : +cible.dataset.n; if (b != null && b !== n) assembler(n, b); }
        } else if (ev.type === "pointerup") {
          if (carte(n).type === "lieu" && S.lieu !== n) { S.lieu = n; rendu(); Son.son("carte", { gain: .4 }); }
          else ouvrirCarte(n);
        }
      };
      el.addEventListener("pointermove", bouge); el.addEventListener("pointerup", fin); el.addEventListener("pointercancel", fin);
    });
  }

  // ——— Assembler deux cartes
  function assembler(a, b) {
    const c = J.combos.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (c) {
      if (c.unique && S.flags[c.unique]) { if (c.a === 0 || c.b === 0) ouvrirCarte(99); else toast("C'est déjà fait."); return; }
      effets(c.effets);
      if (c.unique === "inscription") setTimeout(() => ouvrirCarte(99), 200);
      return;
    }
    Son.son("erreur");
    const msg = (a === 0 || b === 0) ? "L'anneau ne veut rien avoir à faire avec ça." : "Rien ne se passe. Vous perdez du temps.";
    ajouterOmbre(1, msg);
    $$(`.carte[data-n="${a}"], .carte[data-n="${b}"]`).forEach(e => { e.classList.add("secoue"); setTimeout(() => e.classList.remove("secoue"), 500); });
  }

  // ——— Piocher
  $("#pioche").addEventListener("submit", e => {
    e.preventDefault();
    const champ = $("#pioche-n"), n = parseInt(champ.value, 10); champ.value = "";
    if (isNaN(n)) return;
    if (enMain(n)) { toast("Cette carte est déjà sur la table."); const el = $(`.carte[data-n="${n}"]`); if (el) { el.classList.add("cible"); setTimeout(() => el.classList.remove("cible"), 900); } return; }
    if (S.defausse.includes(n)) { toast("Cette carte a déjà servi."); return; }
    if (piochable(n)) { reveler(n); Son.son("carte"); rendu(); sauver(); setTimeout(() => ouvrirCarte(n), 250); return; }
    S.tirages++; Son.son("erreur");
    if (S.tirages % 3 === 0) ajouterOmbre(1, "Vous fouillez au hasard. Le temps passe."); else toast("Rien, ici, ne porte ce numéro.");
    sauver();
  });
  function piochable(n) {
    for (const l of S.main) { const nb = J.nombres[l]; if (nb && nb.some(x => x[0] === n)) return true; }
    if (enMain(36) && S.dedale.vues.includes(J.dedale.cle.salle) && n === J.dedale.cle.carte) return true;
    return false;
  }

  // ——— Carte ouverte
  let carteOuverte = null;
  function ouvrirCarte(n) {
    const c = carte(n), m = $("#m-carte"), el = $("#carte-grande");
    carteOuverte = n;
    const img = imageCarte(n);
    const avecVisuel = !!img;
    el.className = "carte-grande" + (avecVisuel ? "" : " sans-visuel") + (n === 34 ? " plan" : "");
    const alt = !!c.texteAnneau;
    el.innerHTML = (avecVisuel ? `<div class="cg-visuel"><span class="cg-num">${n}</span><div class="cg-img" style="background-image:url('${img}')"></div></div>` : "") +
      `<div class="cg-corps">${avecVisuel ? "" : `<span class="cg-num">${n}</span>`}<h2>${c.titre}</h2>
      <div class="cg-texte cg-sans-anneau ${alt ? "a-alt" : ""}">${noms(c.texte)}</div>
      ${alt ? `<div class="cg-texte cg-anneau">${noms(c.texteAnneau)}</div>` : ""}
      ${c.inscription ? `<div class="inscription">${Glyphes.phrase(c.inscription)}</div>` : ""}
      <div class="cg-meca"></div></div>
      <button class="icone cg-fermer" data-fermer aria-label="Fermer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
    if (c.type === "lieu" && S.lieu !== n) { S.lieu = n; rendu(); }
    if (c.meca && enMain(n)) Mecas.monter(c.meca, $(".cg-meca", el), { J, S, n, effets: (l) => effets(l), echec: (msg) => { Son.son("erreur"); ajouterOmbre(1, msg); }, toast, noms, enMain, Son, ouvrirCarte, fermerCarte });
    m.hidden = false; Son.son("page", { gain: .5 });
    verifierSurAnneau();
  }
  function fermerCarte() { const el = $("#carte-grande"); if (el._arret) el._arret(); $("#m-carte").hidden = true; carteOuverte = null; }
  function verifierSurAnneau() {
    if (carteOuverte == null || !S.anneau) return;
    const c = carte(carteOuverte);
    if (c.surAnneau && !S.flags["vu-" + carteOuverte]) { S.flags["vu-" + carteOuverte] = true; c.surAnneau.forEach(e => { if (e.flag) S.flags[e.flag] = true; }); sauver(); verifierFinChapitre(); }
  }
  document.addEventListener("click", e => { const f = e.target.closest("[data-fermer]"); if (!f) return; const m = f.closest(".modale"); if (!m) return; if (m.id === "m-carte") fermerCarte(); else { m.hidden = true; if (m.id === "m-menu") reprendre(); } });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { if (!$("#m-carte").hidden) fermerCarte(); ["m-conseil", "m-menu"].forEach(id => { if (!$("#" + id).hidden) { $("#" + id).hidden = true; if (id === "m-menu") reprendre(); } }); } });

  // ——— L'anneau
  function basculerAnneau(v) {
    const nv = v != null ? v : !S.anneau;
    if (nv === S.anneau) return;
    S.anneau = nv; document.body.classList.toggle("anneau", nv); Son.anneau(nv);
    if (nv) {
      Son.son("anneau-on");
      if (chap().anneauInterdit && !S.flags.avertiVallee) { S.flags.avertiVallee = true; ajouterOmbre(2); billet("À l'instant où l'anneau glisse à votre doigt, le chant s'arrête net. Toute la vallée se tait, jusqu'à la cascade, semble-t-il. Une voix, tout près, très calme : « Ôtez cela. Ici, on le voit comme une tache d'encre sur la neige. Et d'autres que nous regardent la neige. »"); }
      verifierSurAnneau();
    } else Son.son("anneau-off");
    rendu(); sauver();
  }
  $("#b-anneau").onclick = () => basculerAnneau();

  // ——— Conseil
  function enigmesOuvertes() { return J.enigmes.filter(e => (enMain(e.si) || (e.si === 36 && enMain(36))) && !(e.resolu && S.flags[e.resolu])); }
  function ouvrirConseil() {
    const l = $("#conseil-liste"); l.innerHTML = "";
    const liste = enigmesOuvertes();
    if (!liste.length) l.innerHTML = `<p class="panneau-sous">Rien ne vous résiste pour l'instant. Cherchez des nombres dans l'image du lieu.</p>`;
    liste.forEach(e => {
      const k = S.indices[e.id] || 0, d = document.createElement("div"); d.className = "enigme";
      d.innerHTML = `<h3>${e.titre}</h3>` + (k ? `<ol>${e.indices.slice(0, k).map(t => `<li>${noms(t)}</li>`).join("")}</ol>` : "");
      if (k < e.indices.length) { const b = document.createElement("button"); b.className = "btn btn-petit"; b.textContent = k === e.indices.length - 1 ? "Voir la solution" : (k ? "Un autre indice" : "Un indice"); b.onclick = () => { S.indices[e.id] = k + 1; ajouterOmbre(1); sauver(); ouvrirConseil(); }; d.appendChild(b); }
      l.appendChild(d);
    });
    $("#m-conseil").hidden = false;
  }
  $("#b-conseil").onclick = ouvrirConseil;

  // ——— Plateau
  $("#b-plateau").onclick = () => { const p = $("#plateau"); p.hidden = false; Plateau.etat($("#plateau-carte"), { chap: S.chap, ombre: ombre() }); $("#plateau-legende").textContent = `${chap().nom} — l'Ombre : ${ombre()} sur ${J.ombreMax}`; Son.son("parchemin", { gain: .6 }); };
  $("#plateau-fermer").onclick = () => $("#plateau").hidden = true;

  // ——— Menu, son
  function pause() { enPause = true; }
  function reprendre() { enPause = false; dernier = performance.now(); }
  $("#b-menu").onclick = () => { pause(); const m = Math.floor(S.temps / 60000); $("#menu-temps").textContent = `Temps de voyage : ${Math.floor(m / 60) ? Math.floor(m / 60) + " h " : ""}${m % 60} min. L'Ombre : ${ombre()} sur ${J.ombreMax}.`; $("#menu-url").textContent = URL_CARNET; $("#m-menu").hidden = false; };
  $("#b-son").onclick = () => { const c = !Son.coupe; Son.couper(c); document.body.classList.toggle("muet", c); };
  $("#vol-mus").oninput = e => Son.volumeMusique(+e.target.value);
  $("#b-recommencer").onclick = () => { if (!confirm("Effacer la partie en cours et recommencer ?")) return; localStorage.removeItem(CLE_SAUVE); location.reload(); };

  // ——— La finale
  function finale() {
    S.etape = "finale"; sauver();
    if (S.anneau) basculerAnneau(false);
    arreterTambours();
    Mecas.finale(J, S, { noms, Son, reussite: () => fin(false), garder: () => fin(true), ombre: (n) => ajouterOmbre(n) });
  }
  async function fin(garde) {
    S.etape = "fin"; S.garde = garde; sauver();
    await cinematique(garde ? "garder" : "reussite", { pages: garde ? J.finale.garder : J.finale.reussite, musique: garde ? "mus-ombre" : "mus-fin", image: garde ? "s-couche" : "fin" });
    ecranFin();
  }
  function ecranFin() {
    const o = ombre();
    ecran("fin"); $("#fin").classList.toggle("garde", !!S.garde);
    let titre, texte;
    if (S.garde) { titre = "L'anneau a choisi"; texte = J.finale.garder[J.finale.garder.length - 1]; }
    else { const f = J.finale.fins.find(x => o <= x.max); titre = f.titre; texte = f.texte; setTimeout(() => Son.voix(`fin-${J.finale.fins.indexOf(f) + 1}`), 1500); }
    $("#fin-sur").textContent = S.garde ? "Fin" : "Épilogue";
    $("#fin-titre").textContent = titre;
    $("#fin-texte").innerHTML = `<p>${noms(texte)}</p>`;
    const m = Math.round(S.temps / 60000), nbInd = Object.values(S.indices).reduce((a, b) => a + b, 0);
    $("#fin-bilan").innerHTML = `<div><dt>Temps de voyage</dt><dd>${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}</dd></div><div><dt>L'Ombre</dt><dd>${o} / ${J.ombreMax}</dd></div><div><dt>Conseils demandés</dt><dd>${nbInd}</dd></div>`;
    $("#fin-carnet").innerHTML = S.garde ? "" : `${noms("{B}")}, il reste une page cousue au bout du carnet. Elle s'ouvre au mot <b>${J.finale.motFin}</b>. Lisez-la à voix haute.`;
    Son.ambiance(S.garde ? null : "amb-comte-feu", 6);
  }
  $("#b-rejouer").onclick = () => { ecran("titre"); $("#b-reprendre").hidden = true; };

  // ——— Démarrage
  const sauve = charger();
  if (sauve && sauve.etape !== "fin") $("#b-reprendre").hidden = false;
  $("#b-nouvelle").onclick = () => {
    Son.demarrer(); Son.son("page");
    if (sauve && sauve.etape !== "fin" && !confirm("Une partie est en cours. La remplacer par une nouvelle ?")) return;
    ecran("prepa"); Son.ambiance("amb-pluie", 3); Son.musique("mus-titre", 4); $("#nom-a").focus();
  };
  $("#b-reprendre").onclick = async () => {
    Son.demarrer(); S = sauve; document.body.classList.toggle("anneau", !!S.anneau); if (S.anneau) Son.anneau(true);
    if (S.etape === "finale") { entrerTable(); finale(); return; }
    if (S.etape === "route" || S.etape === "prologue") { S.etape = "jeu"; }
    if (!S.main.length) chap().depart.forEach(x => reveler(x));
    entrerTable();
  };
  $("#b-noms").onclick = () => {
    const a = $("#nom-a").value.trim(), b = $("#nom-b").value.trim();
    if (!a || !b) { toast("Il faut deux voyageurs."); return; }
    S = neuf({ a, b });
    etape(2);
    $("#url-carnet").textContent = URL_CARNET.replace(/^https?:\/\//, "");
    $("#qr").innerHTML = `<img src="img/qr-carnet.svg" alt="Code QR vers le carnet">`;
  };
  $("#b-carnet").onclick = () => etape(3);
  $("#b-partir").onclick = async () => {
    Son.son("porte-ronde");
    S.etape = "prologue"; sauver();
    await cinematique("prologue", { image: "titre" });
    S.etape = "jeu"; chap().depart.forEach(x => reveler(x)); sauver();
    await titreChapitre();
    entrerTable();
    setTimeout(() => ouvrirCarte(1), 600);
  };
  function etape(k) { $$(".prepa-etape").forEach(e => e.hidden = +e.dataset.etape !== k); }
  ["nom-a", "nom-b"].forEach(id => $("#" + id).addEventListener("keydown", e => { if (e.key === "Enter") $("#b-noms").click(); }));

  // Précharge des images de scène
  window.addEventListener("load", () => { ["s-salon", "c-coffre", "c-pendule", "papier"].forEach(n => { const i = new Image(); i.src = `img/${n}.jpg`; }); });

  // Pour les tests
  G.__jeu = { get S() { return S; }, set S(v) { S = v; }, J, effets, reveler, rendu, assembler, ouvrirCarte, entrerTable, basculerAnneau, allerSalle, ombre, chapitreSuivant, finale };
})(window);
