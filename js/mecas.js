// Les mécanismes : chaque carte qui se manipule a son petit appareil.
(function (G) {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const h = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };
  const btn = (t, cls = "btn") => { const b = document.createElement("button"); b.className = cls; b.textContent = t; return b; };

  function monter(m, zone, ctx) {
    zone.className = "cg-meca meca";
    const f = KINDS[m.kind]; if (f) f(m, zone, ctx);
  }

  // ——— Molettes (coffre, grille naine)
  function roues(m, zone, ctx) {
    const nb = m.reponse.length, val = Array(nb).fill(m.de);
    const ligne = h(`<div class="meca-ligne"></div>`); zone.appendChild(ligne);
    const aff = v => m.jeu === "nains" ? Glyphes.chiffreNain(v) : String(v);
    for (let i = 0; i < nb; i++) {
      const r = h(`<div class="roue">${m.plaques ? `<div class="roue-plaque">${Glyphes.repas(m.plaques[i])}</div>` : ""}<button aria-label="Plus">▲</button><div class="roue-val">${aff(val[i])}</div><button aria-label="Moins">▼</button></div>`);
      const [haut, bas] = r.querySelectorAll("button"), v = r.querySelector(".roue-val");
      const tourne = d => { val[i] = val[i] + d > m.a ? m.de : val[i] + d < m.de ? m.a : val[i] + d; v.innerHTML = aff(val[i]); ctx.Son.son("cran", { gain: .6, vitesse: .9 + Math.random() * .2 }); };
      haut.onclick = () => tourne(1); bas.onclick = () => tourne(-1);
      v.addEventListener("wheel", e => { e.preventDefault(); tourne(e.deltaY < 0 ? 1 : -1); }, { passive: false });
      ligne.appendChild(r);
    }
    const b = btn(m.bouton || "Essayer", "btn btn-principal"); zone.appendChild(b);
    b.onclick = () => { if (val.every((v, i) => v === m.reponse[i])) ctx.effets(m.effets); else ctx.echec(m.echec || "Rien ne bouge."); };
  }

  // ——— Pendule
  function horloge(m, zone, ctx) {
    let T = (m.depart[0] % 12) * 60 + m.depart[1]; // minutes depuis midi
    const svg = h(`<svg class="horloge" viewBox="-110 -110 220 220">
      <circle r="104" fill="#ead9b4" stroke="#3a2414" stroke-width="3"/><circle r="96" fill="none" stroke="#3a2414" stroke-width=".8"/>
      ${["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"].map((r, i) => { const a = i * Math.PI / 6; return `<text x="${Math.sin(a) * 78}" y="${-Math.cos(a) * 78 + 6}" text-anchor="middle" font-family="IM Fell English" font-size="17" fill="#3a2414">${r}</text>`; }).join("")}
      ${Array.from({ length: 60 }, (_, i) => { const a = i * Math.PI / 30, r1 = i % 5 ? 92 : 88; return `<line x1="${Math.sin(a) * r1}" y1="${-Math.cos(a) * r1}" x2="${Math.sin(a) * 96}" y2="${-Math.cos(a) * 96}" stroke="#3a2414" stroke-width="${i % 5 ? .6 : 1.4}"/>`; }).join("")}
      <g class="aig-h"><path d="M-4 10 L0 -52 L4 10 Z" fill="#2b1d12"/><circle r="14" fill="transparent"/></g>
      <g class="aig-m"><path d="M-2.5 14 L0 -82 L2.5 14 Z" fill="#2b1d12"/></g>
      <circle r="5" fill="#8a5a28"/></svg>`);
    zone.appendChild(svg);
    const ah = svg.querySelector(".aig-h"), am = svg.querySelector(".aig-m");
    const maj = () => { ah.setAttribute("transform", `rotate(${(T / 720) * 360})`); am.setAttribute("transform", `rotate(${(T % 60) * 6})`); };
    maj();
    let saisie = null;
    const angle = e => { const r = svg.getBoundingClientRect(); const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2; return (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360; };
    svg.addEventListener("pointerdown", e => {
      const r = svg.getBoundingClientRect(); const d = Math.hypot(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2) / (r.width / 2) * 110;
      saisie = d < 58 ? "h" : "m"; svg.setPointerCapture(e.pointerId); bouge(e);
    });
    const bouge = e => {
      if (!saisie) return; const a = angle(e);
      if (saisie === "m") { const m2 = Math.round(a / 6) % 60, m1 = T % 60; let d = m2 - m1; if (d > 30) d -= 60; if (d < -30) d += 60; if (d) { T = (T + d + 720) % 720; ctx.Son.son("cran", { gain: .25, vitesse: 1.6 }); } }
      else { T = Math.round((a / 360) * 720 / 5) * 5 % 720; }
      maj();
    };
    svg.addEventListener("pointermove", bouge); svg.addEventListener("pointerup", () => saisie = null);
    const b = btn(m.bouton, "btn btn-principal"); zone.appendChild(b);
    b.onclick = () => { const cible = (m.reponse[0] % 12) * 60 + m.reponse[1]; const d = Math.abs(((T - cible + 360) % 720) - 360); if (d <= 3) { ctx.effets(m.effets); } else ctx.echec(m.echec); };
  }

  // ——— Harpe
  function harpe(m, zone, ctx) {
    const svg = h(`<svg class="harpe" viewBox="0 0 400 260">
      <path d="M40 240 C 30 160, 36 80, 52 30" fill="none" stroke="#5c3d1e" stroke-width="12" stroke-linecap="round"/>
      <path d="M48 32 C 120 10, 200 70, 360 46" fill="none" stroke="#5c3d1e" stroke-width="10" stroke-linecap="round"/>
      <path d="M40 240 L 360 140" fill="none" stroke="#7a5228" stroke-width="16" stroke-linecap="round"/>
      <g class="cordes"></g></svg>`);
    const g = svg.querySelector(".cordes");
    const n = 7, cordes = [];
    for (let i = 0; i < n; i++) {
      const x = 80 + i * 40, yHaut = 30 + Math.pow((x - 48) / 312, 1.4) * 30 + Math.sin((x - 48) / 312 * Math.PI) * 18, yBas = 240 - (x - 40) / 320 * 100;
      const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("x1", x); l.setAttribute("x2", x); l.setAttribute("y1", yHaut + 6); l.setAttribute("y2", yBas - 6); l.setAttribute("class", "corde");
      const zone2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      zone2.setAttribute("x", x - 18); zone2.setAttribute("width", 36); zone2.setAttribute("y", yHaut); zone2.setAttribute("height", yBas - yHaut); zone2.setAttribute("fill", "transparent"); zone2.dataset.i = i;
      g.appendChild(l); g.appendChild(zone2); cordes.push(l);
    }
    zone.appendChild(svg);
    const trace = h(`<div class="notes-jouees"></div>`); zone.appendChild(trace);
    zone.appendChild(h(`<p class="ciel-aide">Effleurez les cordes, ou glissez le doigt dessus. La première, à gauche, est la plus grave.</p>`));
    let jouees = [], appui = false, derniere = -1, fini = false;
    const pince = i => {
      ctx.Son.harpe(i); const c = cordes[i]; c.classList.remove("vibre"); void c.getBBox(); c.classList.add("vibre");
      jouees.push(i + 1); if (jouees.length > 5) jouees.shift();
      trace.textContent = jouees.map(() => "·").join(" ");
      if (!fini && jouees.join() === m.reponse.join()) { fini = true; setTimeout(() => ctx.effets(m.effets), 900); }
    };
    svg.addEventListener("pointerdown", e => { appui = true; svg.setPointerCapture(e.pointerId); derniere = -1; touche(e); });
    svg.addEventListener("pointerup", () => { appui = false; derniere = -1; });
    svg.addEventListener("pointermove", e => { if (appui) touche(e); });
    function touche(e) {
      const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 400;
      const i = Math.round((x - 80) / 40); if (i < 0 || i >= n || Math.abs(x - (80 + i * 40)) > 16) return;
      if (i !== derniere) { derniere = i; pince(i); }
    }
  }

  // ——— Lunaire
  function lunaire(m, zone, ctx) {
    let mois = 0, phase = 0;
    const svg = h(`<svg class="lunaire" viewBox="-150 -150 300 300"></svg>`);
    const dessine = () => {
      let s = `<circle r="146" fill="#b68a4c" stroke="#3a2414" stroke-width="2"/><circle r="142" fill="none" stroke="#e6c48a" stroke-width="1"/><circle r="100" fill="#8e6532" stroke="#3a2414" stroke-width="2"/><circle r="56" fill="#cfd6df" stroke="#3a2414" stroke-width="2" opacity=".9"/>`;
      for (let i = 0; i < 12; i++) { const a = ((i - mois) * 30) * Math.PI / 180; s += `<g transform="translate(${Math.sin(a) * 122 - 13} ${-Math.cos(a) * 122 - 13})" style="color:#2b1d12">${Glyphes.signeMois(i, 26)}</g>`; }
      for (let i = 0; i < 8; i++) { const a = ((i - phase) * 45) * Math.PI / 180; s += `<g transform="translate(${Math.sin(a) * 78 - 13} ${-Math.cos(a) * 78 - 13})" style="color:#2b1d12;--lune-ombre:#2a2219;--lune-clair:#f4ecd2">${Glyphes.lune(i, 26)}</g>`; }
      s += `<path d="M0 -150 L -9 -164 L 9 -164 Z" fill="#2b1d12"/><path d="M0 -144 L0 -48" stroke="#2b1d12" stroke-width="1" stroke-dasharray="3 4" opacity=".6"/>`;
      svg.innerHTML = s;
    };
    dessine(); zone.appendChild(svg);
    const cmd = h(`<div class="lunaire-commandes"><div><button class="btn btn-petit" data-r="m-">◀</button><span>Grand anneau</span><button class="btn btn-petit" data-r="m+">▶</button></div><div><button class="btn btn-petit" data-r="p-">◀</button><span>Petit anneau</span><button class="btn btn-petit" data-r="p+">▶</button></div></div>`);
    cmd.addEventListener("click", e => { const r = e.target.dataset.r; if (!r) return; if (r[0] === "m") mois = (mois + (r[1] === "+" ? 1 : 11)) % 12; else phase = (phase + (r[1] === "+" ? 1 : 7)) % 8; ctx.Son.son("cran", { gain: .5, vitesse: .7 }); dessine(); });
    zone.appendChild(cmd);
    zone.appendChild(h(`<p class="ciel-aide">Ce qui est sous la marque, en haut, est ce que la lentille rappellera.</p>`));
    const b = btn(m.bouton, "btn btn-principal"); zone.appendChild(b);
    b.onclick = () => { if (mois === m.mois && phase === m.phase) ctx.effets(m.effets); else ctx.echec(m.echec); };
  }

  // ——— Clavier de runes
  function runes(m, zone, ctx) {
    const lettres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    let g = 11; const ordre = lettres.slice().sort(() => { g = (g * 9301 + 49297) % 233280; return g / 233280 - .5; });
    let saisie = [];
    const aff = h(`<div class="saisie-runes"></div>`); zone.appendChild(aff);
    const clav = h(`<div class="clavier-runes"></div>`);
    ordre.forEach(l => { const b = document.createElement("button"); b.innerHTML = Glyphes.rune(l); b.onclick = () => { if (saisie.length >= 12) return; saisie.push(l); ctx.Son.son("rune", { gain: .7, vitesse: .9 + Math.random() * .2 }); b.classList.add("enfonce"); majAff(); }; clav.appendChild(b); });
    zone.appendChild(clav);
    const majAff = () => aff.innerHTML = saisie.map(l => Glyphes.rune(l)).join("") || `<span class="ciel-aide" style="margin:0">Enfoncez les runes, dans l'ordre.</span>`;
    majAff();
    const ligne = h(`<div class="meca-ligne"></div>`);
    const eff = btn("Relâcher les runes"); eff.onclick = () => { saisie = []; clav.querySelectorAll(".enfonce").forEach(x => x.classList.remove("enfonce")); ctx.Son.son("runes-remontent", { gain: .6 }); majAff(); };
    const ok = btn(m.bouton, "btn btn-principal"); ok.onclick = () => { if (saisie.join("") === m.reponse) ctx.effets(m.effets); else { ctx.echec(m.echec); eff.onclick(); } };
    ligne.append(eff, ok); zone.appendChild(ligne);
  }

  // ——— Porte à frapper
  function frappe(m, zone, ctx) {
    const porte = h(`<div class="porte-frappe" role="button" aria-label="Frapper sur la porte"><div class="inscription">${Glyphes.phrase(ctx.J.cartes[ctx.n].inscription)}</div></div>`);
    const coups = h(`<div class="coups"></div>`);
    zone.append(porte, coups, h(`<p class="ciel-aide">Frappez sur la porte. Marquez une pause entre deux séries.</p>`));
    let groupes = [], dernier = 0, t;
    porte.addEventListener("pointerdown", () => {
      const now = performance.now(); ctx.Son.frappe(); porte.classList.remove("coup"); void porte.offsetWidth; porte.classList.add("coup");
      if (!groupes.length || now - dernier > 650) groupes.push(1); else groupes[groupes.length - 1]++;
      dernier = now; coups.textContent = groupes.map(n => "●".repeat(n).split("").join(" ")).join("   ");
      clearTimeout(t); t = setTimeout(() => {
        if (groupes.join() === m.motif.join()) ctx.effets(m.effets);
        else { ctx.toast("La porte reste muette."); coups.textContent = ""; }
        groupes = [];
      }, 1700);
    });
  }

  // ——— Falaise (frapper la roche avec la pierre d'écoute)
  function falaise(m, zone, ctx) {
    const cadre = h(`<div style="position:relative;aspect-ratio:16/9;background:#222 url(img/s-falaise.jpg) center/cover;border-radius:3px;overflow:hidden"></div>`);
    const grille = h(`<div class="falaise-grille"></div>`); cadre.appendChild(grille);
    let derniere = null;
    for (let i = 1; i <= m.zones; i++) {
      const b = document.createElement("button"); b.textContent = i;
      b.onclick = () => { ctx.Son.roche(i === m.creuse); b.classList.remove("frappe"); void b.offsetWidth; b.classList.add("frappe"); derniere = i; marque.disabled = false; marque.textContent = `Marquer la pierre ${i} à la craie`; };
      grille.appendChild(b);
    }
    zone.appendChild(cadre);
    const marque = btn("Marquer une pierre à la craie", "btn btn-principal"); marque.disabled = true; marque.style.marginTop = "12px";
    marque.onclick = () => { if (derniere === m.creuse) ctx.effets(m.effets); else ctx.echec(m.echec); };
    zone.appendChild(marque);
  }

  // ——— Choix simples
  function choix(m, zone, ctx) {
    const l = h(`<div class="choix-liste"></div>`);
    m.options.forEach(o => { const b = btn(ctx.noms(o.label)); b.onclick = () => ctx.effets(o.effets); l.appendChild(b); });
    zone.appendChild(l);
  }

  // ——— Champignons
  const CHAMPIS = { // chapeau, lamelles, anneau, forme
    1: ["#f2efe6", "#f2efe6", true], 2: ["#b9bcc2", "#5d86b8", false], 3: ["#b58a45", "#5d86b8", false],
    4: ["#b9bcc2", "#5d86b8", true], 5: ["#2a2622", "#efe9dc", false], 6: ["#d9d2c2", null, false, "boule"]
  };
  function dessinChampi(n) {
    const [cap, lam, anneau, forme] = CHAMPIS[n];
    const halo = `<ellipse cx="50" cy="60" rx="40" ry="44" fill="url(#halo${n})"/>`;
    const defs = `<defs><radialGradient id="halo${n}"><stop offset="0" stop-color="#cfe6ff" stop-opacity=".22"/><stop offset="1" stop-color="#cfe6ff" stop-opacity="0"/></radialGradient></defs>`;
    if (forme === "boule") return `<svg viewBox="0 0 100 120">${defs}${halo}<circle cx="50" cy="78" r="22" fill="${cap}" stroke="#1b140e" stroke-width="1.5"/><path d="M38 70 q 6 -6 14 -4" stroke="#fff" stroke-opacity=".5" fill="none"/><path d="M30 104 h40" stroke="#4a3a2a" stroke-width="2"/></svg>`;
    let s = `<svg viewBox="0 0 100 120">${defs}${halo}<path d="M44 58 C 42 80, 40 96, 38 104 L 62 104 C 60 96, 58 80, 56 58 Z" fill="#e9e2d0" stroke="#1b140e" stroke-width="1.4"/>`;
    s += `<path d="M14 58 C 14 30, 86 30, 86 58 Z" fill="${cap}" stroke="#1b140e" stroke-width="1.5"/>`;
    s += `<path d="M16 58 Q 50 70, 84 58 Q 50 62, 16 58 Z" fill="${lam}" stroke="#1b140e" stroke-width="1"/>`;
    for (let x = 22; x < 80; x += 6) s += `<path d="M${x} 59 L ${50 + (x - 50) * .5} 64" stroke="${lam === "#efe9dc" ? "#8d8574" : "#2f4f78"}" stroke-width=".8"/>`;
    if (anneau) s += `<path d="M42 72 Q 50 80, 58 72 L 60 76 Q 50 86, 40 76 Z" fill="#f3eee2" stroke="#1b140e" stroke-width="1.2"/>`;
    s += `<path d="M30 104 h40" stroke="#4a3a2a" stroke-width="2"/></svg>`;
    return s;
  }
  function champignons(m, zone, ctx) {
    const g = h(`<div class="champis"></div>`);
    m.options.forEach(o => { const b = document.createElement("button"); b.className = "champi"; b.innerHTML = dessinChampi(o.n) + `<span>${o.n}</span>`; b.onclick = () => ctx.effets(o.effets); g.appendChild(b); });
    zone.append(h(`<p class="ciel-aide" style="margin-top:0">Lequel cueillir ?</p>`), g);
  }

  // ——— Le ciel au-dessus des arbres
  function ciel(m, zone, ctx) {
    const PX = 10, HT = 340, W = 3600; // 10 px par degré d'azimut
    const el = (e) => (68 - e) * 5;
    let g = 3; const al = () => { g = (g * 16807) % 2147483647; return (g - 1) / 2147483646; };
    let etoiles = "";
    for (let i = 0; i < 700; i++) { const x = al() * W, y = Math.pow(al(), 1.3) * (HT - 60); const r = al() < .93 ? al() * .9 + .3 : al() * 1.2 + 1; etoiles += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${(.35 + al() * .6).toFixed(2)}"/>`; }
    // la Voie, voile laiteux
    const voie = `<path d="M0 ${el(40)} C 900 ${el(60)}, 1800 ${el(10)}, 2700 ${el(30)} S 3600 ${el(40)}, 3600 ${el(40)}" stroke="#cbd6ff" stroke-opacity=".07" stroke-width="70" fill="none"/>`;
    // constellations (coordonnées : azimut, élévation)
    const brillantes = [];
    const P = [0, 50]; brillantes.push(P);
    // la Faucille : lame (4) et manche (3). Les deux étoiles du bout de la lame pointent vers le Clou.
    const fa = [[-6, 38], [-7.2, 35.6], [-11, 34], [-10, 40], [-13.5, 42.4], [-16, 44.4], [-19, 43.6]];
    fa.forEach(s => brillantes.push(s));
    const couronne = Array.from({ length: 7 }, (_, i) => { const a = Math.PI * (0.15 + i * 0.12); return [120 + Math.cos(a) * 6, 40 + Math.sin(a) * 5]; });
    couronne.forEach(s => brillantes.push(s));
    const soeurs = [[196, 22], [199, 23], [202, 24]]; soeurs.forEach(s => brillantes.push(s));
    const rouge = [255, 30];
    const pt = ([a, e]) => [((a % 360) + 360) % 360 * PX, el(e)];
    let br = brillantes.map(s => { const [x, y] = pt(s); return `<circle cx="${x}" cy="${y}" r="2.4" fill="#fff"/><circle cx="${x}" cy="${y}" r="6" fill="#fff" opacity=".12"/>`; }).join("");
    const [rx, ry] = pt(rouge); br += `<circle cx="${rx}" cy="${ry}" r="2.6" fill="#ffb59a"/><circle cx="${rx}" cy="${ry}" r="7" fill="#ff9a7a" opacity=".15"/>`;
    // horizon : la cime des arbres, et les quatre géants
    let cimes = `<path d="M0 ${HT}`; for (let x = 0; x <= W; x += 14) cimes += ` L ${x} ${HT - 34 - Math.sin(x / 37) * 6 - Math.sin(x / 11) * 4 - al() * 8}`; cimes += ` L ${W} ${HT} Z" fill="#020304"/>`;
    const amers = ctx.J.ciel.amers.map(([k, az]) => { const x = az * PX, b = HT - 40; return ({
      pin: `<g fill="none" stroke="#020304" stroke-width="5" stroke-linecap="round"><path d="M${x} ${b} L ${x} ${b - 150}"/><path d="M${x} ${b - 60} l -34 -26 M${x} ${b - 82} l 30 -30 M${x} ${b - 108} l -24 -18 M${x} ${b - 124} l 18 -16 M${x - 20} ${b - 76} l -10 -16"/></g>`,
      chene: `<g fill="#020304"><path d="M${x - 10} ${b} L ${x - 6} ${b - 70} L ${x - 50} ${b - 120} L ${x - 36} ${b - 124} L ${x} ${b - 80} L ${x + 36} ${b - 130} L ${x + 50} ${b - 124} L ${x + 8} ${b - 70} L ${x + 12} ${b} Z"/><circle cx="${x - 46}" cy="${b - 130}" r="22"/><circle cx="${x + 46}" cy="${b - 136}" r="24"/></g>`,
      bouleaux: `<g fill="#020304"><path d="M${x - 16} ${b} L ${x - 14} ${b - 120} L ${x - 10} ${b} Z M${x + 10} ${b} L ${x + 14} ${b - 128} L ${x + 16} ${b} Z"/><ellipse cx="${x - 14}" cy="${b - 118}" rx="12" ry="26"/><ellipse cx="${x + 14}" cy="${b - 126}" rx="12" ry="26"/></g>`,
      sapin: `<g fill="#020304"><path d="M${x} ${b - 170} L ${x + 34} ${b} L ${x - 34} ${b} Z"/></g>`
    })[k]; }).join("");
    const contenu = `<rect width="${W}" height="${HT}" fill="url(#cielgrad)"/>${voie}${etoiles}${br}${amers}${cimes}`;
    const svg = h(`<svg viewBox="0 0 ${W * 2} ${HT}" width="${W * 2}" height="${HT}"><defs><linearGradient id="cielgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03050b"/><stop offset=".8" stop-color="#0b1424"/><stop offset="1" stop-color="#1a2234"/></linearGradient></defs><g>${contenu}</g><g transform="translate(${W} 0)">${contenu}</g></svg>`);
    const vue = h(`<div class="ciel-vue"></div>`); vue.appendChild(svg);
    zone.append(vue, h(`<p class="ciel-aide">Faites glisser le ciel pour tourner sur vous-même.</p>`));
    let decal = -(200 * PX) + 300, x0 = null, d0 = 0;
    const place = () => { decal = ((decal % W) - W) % W; svg.style.transform = `translateX(${decal}px)`; };
    place();
    vue.addEventListener("pointerdown", e => { x0 = e.clientX; d0 = decal; vue.setPointerCapture(e.pointerId); vue.style.cursor = "grabbing"; });
    vue.addEventListener("pointermove", e => { if (x0 == null) return; decal = d0 + (e.clientX - x0); place(); });
    vue.addEventListener("pointerup", () => { x0 = null; vue.style.cursor = ""; });
    ctx.Son.son("vent-cimes", { gain: .7 });
  }

  // ——— Les salles sous les Monts
  function dedale(calques, J, S, ctx) {
    const d = J.dedale, ici = S.dedale.salle;
    const sorties = d.couloirs.filter(c => c[0] === ici || c[1] === ici).map(c => ({ vers: c[0] === ici ? c[1] : c[0], rune: c[2] })).sort((a, b) => a.rune.localeCompare(b.rune));
    const i = d.chemin.indexOf(ici); const bonne = i >= 0 && i < d.chemin.length - 1 ? d.chemin[i + 1] : null;
    const wrap = h(`<div class="dedale"></div>`);
    sorties.forEach((s, k) => {
      const x = (k + 1) / (sorties.length + 1) * 100;
      const grille = d.grille && ici === d.grille.de && s.rune === d.grille.rune && !S.flags.grille;
      const b = h(`<button class="dedale-arche${s.vers === bonne ? " bonne" : ""}" style="left:${x}%" aria-label="Arche">
        <svg class="forme" viewBox="0 0 100 160" preserveAspectRatio="none"><path d="M8 160 L8 60 Q 8 8, 50 8 Q 92 8, 92 60 L92 160" fill="rgba(0,0,0,.35)" stroke="rgba(220,200,160,.35)" stroke-width="2"/>${grille ? `<g stroke="rgba(30,30,30,.95)" stroke-width="4">${[22, 38, 54, 70, 86].map(gx => `<path d="M${gx} 30 L${gx} 160"/>`).join("")}<path d="M10 80 H90 M10 120 H90"/></g>` : ""}</svg>
        <span class="arche-rune">${Glyphes.rune(s.rune)}</span>
        <svg class="pas-fantome" viewBox="0 0 60 30"><g fill="#d6dbe6" opacity=".7"><ellipse cx="18" cy="22" rx="5" ry="7"/><ellipse cx="40" cy="10" rx="5" ry="7"/></g></svg></button>`);
      b.onclick = () => ctx.aller(s.vers, s.rune);
      wrap.appendChild(b);
    });
    calques.appendChild(wrap);
  }

  // ——— Le couchant
  let couchantEnCours = false;
  function couchant(calques, J, S, ctx) {
    if (couchantEnCours) return; couchantEnCours = true;
    const boite = calques.parentElement, C = J.couchant;
    const teinte = h(`<div class="couchant-teinte" style="inset:0"></div>`), st = h(`<div class="sous-titre"></div>`);
    boite.append(teinte, st);
    const eclat = h(`<button class="eclat" style="left:${C.eclat.x}%;top:${C.eclat.y}%;display:none" aria-label="Le dernier rayon"></button>`); boite.appendChild(eclat);
    const t0 = performance.now(); let cris = 0, fini = false;
    ctx.Son = G.Son; G.Son.musique("mus-couchant", 3);
    const sous = t => { st.textContent = t; st.style.opacity = 1; setTimeout(() => st.style.opacity = 0, 3200); };
    sous("Le soleil descend derrière les monts lointains.");
    const arreter = () => { fini = true; couchantEnCours = false; [teinte, st, eclat].forEach(x => x.remove()); G.Son.musique(null, 4); };
    eclat.onclick = () => { if (fini) return; arreter(); ctx.reussite(); };
    const pas = () => {
      if (fini) return;
      const t = (performance.now() - t0) / 1000, k = Math.min(1, t / C.duree);
      const c = k < .5 ? `rgba(255,${Math.round(190 - k * 160)},${Math.round(120 - k * 160)},${(k * .9).toFixed(2)})` : `rgba(${Math.round(255 - (k - .5) * 380)},${Math.round(110 - (k - .5) * 150)},${Math.round(40 + (k - .5) * 160)},${(.45 + (k - .5) * .9).toFixed(2)})`;
      teinte.style.background = `linear-gradient(200deg, ${c}, rgba(20,10,30,${(k * .7).toFixed(2)}))`;
      if (cris < C.cris.length && t >= C.cris[cris]) { cris++; G.Son.son("corbeau", { gain: .9 }); sous(["Le corbeau crie.", "Le corbeau crie une deuxième fois.", "Le corbeau crie une troisième fois."][cris - 1]); }
      eclat.style.display = t >= C.eclat.debut && t <= C.eclat.fin ? "" : "none";
      if (t >= C.duree) { arreter(); ctx.echec(); return; }
      requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }

  // ——— La finale : jeter l'anneau
  function finale(J, S, ctx) {
    const v = h(`<div class="finale" style="position:fixed;inset:0;z-index:25;background:#0a0503 url(img/s-couche.jpg) center/cover;cursor:default;touch-action:none;overflow:hidden">
      <div class="finale-voile" style="position:absolute;inset:0;background:radial-gradient(ellipse at 48% 61%, rgba(255,120,30,.35), rgba(0,0,0,.25) 40%, rgba(0,0,0,.85) 100%)"></div>
      <div class="finale-feu" style="position:absolute;left:48%;top:61%;width:20%;aspect-ratio:1.6/1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(ellipse, #fff4c8 0, #ffb347 25%, #e2541a 50%, rgba(160,30,0,0) 72%);filter:blur(4px);animation:pouls 1.1s infinite"></div>
      <p class="finale-texte" style="position:absolute;top:7%;left:50%;transform:translateX(-50%);width:min(760px,90%);text-align:center;font-family:var(--titre);font-size:1.35rem;line-height:1.6;color:#f3e2c2;text-shadow:0 2px 12px #000">${ctx.noms(J.finale.texteAvant)}<br><span style="font-style:italic;color:#c9b38e;font-size:1.05rem">Faites glisser l'anneau jusqu'au feu, et ne le lâchez pas.</span></p>
      <div class="finale-anneau" style="position:absolute;width:64px;height:64px;left:14%;top:78%;transform:translate(-50%,-50%);border-radius:50%;border:9px solid #d8b154;box-shadow:0 0 18px rgba(255,200,90,.6), inset 0 0 6px rgba(0,0,0,.5);cursor:grab"></div>
      <div class="finale-murmure" style="position:absolute;font-family:var(--titre);font-style:italic;color:#c9cbd6;font-size:1.4rem;text-shadow:0 0 12px #000;pointer-events:none;opacity:0;transition:opacity 1s"></div>
      <button class="btn finale-garder" hidden style="position:absolute;right:24px;bottom:24px;opacity:.55">Le garder</button></div>`);
    document.body.appendChild(v);
    ctx.Son.musique("mus-finale", 3); ctx.Son.ambiance("amb-couche", 3);
    const anneau = v.querySelector(".finale-anneau"), feu = v.querySelector(".finale-feu"), murm = v.querySelector(".finale-murmure"), garder = v.querySelector(".finale-garder");
    const depart = () => { const r = v.getBoundingClientRect(); return { x: r.width * .14, y: r.height * .78 }; };
    let p = depart(), cible = null, tenu = false, echecs = 0, fini = false, tMurmure = 0, kMurmure = 0, tSecousse = 0;
    const place = () => { anneau.style.left = p.x + "px"; anneau.style.top = p.y + "px"; };
    anneau.addEventListener("pointerdown", e => { tenu = true; anneau.setPointerCapture(e.pointerId); cible = { x: e.clientX, y: e.clientY }; anneau.style.cursor = "grabbing"; ctx.Son.anneau(true); });
    anneau.addEventListener("pointermove", e => { if (tenu) cible = { x: e.clientX, y: e.clientY }; });
    const lacher = () => {
      if (!tenu || fini) return; tenu = false; anneau.style.cursor = "grab"; ctx.Son.anneau(false);
      echecs++; if (echecs <= 3) ctx.ombre(1);
      murmure(echecs === 1 ? "Tu vois ? Tu ne veux pas." : "Garde-moi.");
      if (echecs >= 1) garder.hidden = false;
    };
    anneau.addEventListener("pointerup", lacher); anneau.addEventListener("pointercancel", lacher);
    garder.onclick = () => { if (!confirm("Garder l'anneau ?")) return; fini = true; ctx.Son.anneau(false); v.remove(); ctx.garder(); };
    function murmure(t) {
      const r = v.getBoundingClientRect();
      murm.textContent = ctx.noms(t); murm.style.left = (10 + Math.random() * 60) + "%"; murm.style.top = (30 + Math.random() * 30) + "%"; murm.style.opacity = 1;
      setTimeout(() => murm.style.opacity = 0, 1800); ctx.Son.son("murmures", { gain: .5, vitesse: .9 + Math.random() * .2 });
    }
    const boucle = (t) => {
      if (fini) return;
      const f = feu.getBoundingClientRect(), fc = { x: f.left + f.width / 2, y: f.top + f.height / 2 }, d0 = depart();
      const dist = Math.hypot(p.x - fc.x, p.y - fc.y), total = Math.hypot(d0.x - fc.x, d0.y - fc.y), proche = Math.max(0, 1 - dist / total);
      if (tenu && cible) {
        // plus on approche, plus il résiste : il avance lentement, tremble, et donne des secousses en arrière
        const k = .06 * (1 - proche * .78);
        p.x += (cible.x - p.x) * k + (Math.random() - .5) * proche * 7; p.y += (cible.y - p.y) * k + (Math.random() - .5) * proche * 7;
        if (proche > .35 && t - tSecousse > 1300 + Math.random() * 900) { tSecousse = t; const f = .05 + proche * .07; p.x += (d0.x - p.x) * f; p.y += (d0.y - p.y) * f; ctx.Son.grave && ctx.Son.grave(.5, 60, .35); }
        if (t - tMurmure > 1600 - proche * 900) { tMurmure = t; murmure(J.finale.murmures[kMurmure++ % J.finale.murmures.length]); }
        v.style.transform = `translate(${(Math.random() - .5) * proche * 6}px, ${(Math.random() - .5) * proche * 6}px)`;
        if (dist < f.width * .28) { fini = true; ctx.Son.anneau(false); ctx.Son.son("anneau-feu", { gain: 1 }); anneau.style.transition = "all 1.2s ease-in"; anneau.style.transform = "translate(-50%,-50%) scale(.2)"; anneau.style.opacity = 0; v.style.transform = ""; setTimeout(() => { v.style.transition = "opacity 2.5s"; v.style.opacity = 0; setTimeout(() => { v.remove(); ctx.reussite(); }, 2500); }, 1400); return; }
      } else {
        p.x += (d0.x - p.x) * .08; p.y += (d0.y - p.y) * .08; v.style.transform = "";
      }
      place(); requestAnimationFrame(boucle);
    };
    place(); requestAnimationFrame(boucle);
  }

  const KINDS = { roues, horloge, harpe, lunaire, runes, frappe, falaise, choix, champignons, ciel };
  G.Mecas = { monter, dedale, couchant, finale, dessinChampi, get couchantActif() { return couchantEnCours; } };
})(window);
