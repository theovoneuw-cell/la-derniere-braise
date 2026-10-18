// Le carnet de tante Mirabelle : cahiers cousus, pages, figures.
(function () {
  "use strict";
  function decode(s) {
    const b = Uint8Array.from(atob(s), c => c.charCodeAt(0)), k = new TextEncoder().encode("mirabelle-sous-colline-1389");
    for (let i = 0; i < b.length; i++) b[i] ^= k[i % k.length] ^ ((i * 7) & 255);
    return JSON.parse(new TextDecoder().decode(b));
  }
  const C = decode(window.__C);
  const $ = s => document.querySelector(s);
  const CLE = "braise-carnet-v1";
  let etat = { ouverts: [0], pagesOuvertes: [], cahier: 0, page: 0 };
  try { etat = Object.assign(etat, JSON.parse(localStorage.getItem(CLE)) || {}); } catch (e) {}
  const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {} };
  const norm = s => Glyphes.sansAccent(s).toUpperCase().replace(/[^A-Z]/g, "");

  // ——— Figures
  const FIG = {
    repas: () => `<table class="repas-table fig">${C.repas.map((r, i) => `<tr><td>${i + 1}.</td><td>${Glyphes.repas(r[1])}</td><td>${r[0]}</td><td>${r[2]}</td></tr>`).join("")}</table>`,
    mois: () => `<div class="grille-mois fig">${Glyphes.MOIS.map((m, i) => `<div>${Glyphes.signeMois(i)}<span>${m[0]}</span><small>${C.mois[i]}</small></div>`).join("")}</div>`,
    lunes: () => `<div class="cycle-lunes fig">${C.lunes.map((n, i) => `<div>${Glyphes.lune(i)}<span>${n}</span></div>`).join("")}<p class="cycle-fleche">et ainsi de suite, de la nouvelle lune à la nouvelle lune, dans cet ordre (de gauche à droite, ligne après ligne)</p></div>`,
    runes: () => `<div class="table-runes fig">${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => `<div>${Glyphes.rune(l)}<span>${l}</span></div>`).join("")}</div>`,
    chiffres: () => `<div class="table-chiffres fig">${[0, 1, 2, 3, 4, 5, 6, 7].map(n => `<div>${Glyphes.chiffreNain(n)}<span>${n}</span></div>`).join("")}</div><p class="legende">… et ainsi de suite jusqu'à onze, qui fait deux toits et trois bâtons.</p>`,
    herbier: () => `<dl class="herbier fig">${C.champignons.map(c => `<dt>${c[0]}</dt><dd>${c[1]}</dd>`).join("")}</dl>`,
    melodie: () => {
      const m = C.melodie, W = 360, H = 170, base = 150;
      let d = `M 10 ${base}`, x = 10; const pas = (W - 20) / (m.length * 2);
      m.forEach((n, i) => { const hy = base - 14 - n * 17 + (i % 2 ? 3 : -2); x += pas; d += ` Q ${x - pas * .4} ${hy + 18}, ${x} ${hy}`; x += pas; d += ` Q ${x - pas * .6} ${hy + 20}, ${x} ${base - 6 - (i % 2) * 6}`; });
      let hach = ""; x = 10;
      m.forEach((n, i) => { const sx = 10 + pas * (2 * i + 1), hy = base - 14 - n * 17; for (let k = 1; k < 4; k++) hach += `<path d="M${sx + k * 5} ${hy + k * 9} l -6 10" stroke="#3a2614" stroke-width=".9" opacity=".7"/>`; });
      return `<svg class="figure fig" viewBox="0 0 ${W} ${H}"><path d="${d}" fill="none" stroke="#2d1e12" stroke-width="2" stroke-linejoin="round"/>${hach}<path d="M6 ${base + 2} H ${W - 6}" stroke="#2d1e12" stroke-width=".8" stroke-dasharray="2 4"/></svg><p class="legende">l'air des voyageurs, d'après M.</p>`;
    },
    dedale: () => {
      const D = C.dedale, P = D.positions;
      let s = `<div class="defile"><svg class="figure plan-salles" viewBox="0 0 740 410" width="760" height="421">`;
      D.couloirs.forEach(([a, b, r]) => {
        const [x1, y1] = P[a], [x2, y2] = P[b], mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        s += `<path d="M${x1} ${y1} L ${x2} ${y2}" stroke="#2d1e12" stroke-width="1.6"/>`;
        s += `<g transform="translate(${mx - 9} ${my - 15})"><rect x="-3" y="-3" width="24" height="36" rx="3" fill="#eadcbc" stroke="#2d1e12" stroke-width=".8"/><g transform="translate(2 1) scale(1.4)" color="#2d1e12">${runeBrute(r)}</g></g>`;
      });
      for (let i = 0; i < D.chemin.length - 1; i++) { const [x1, y1] = P[D.chemin[i]], [x2, y2] = P[D.chemin[i + 1]]; s += `<path d="M${x1} ${y1 + 8} L ${x2} ${y2 + 8}" stroke="#8a2f14" stroke-width="2.2" stroke-dasharray="3 6" stroke-linecap="round" fill="none"/>`; }
      Object.keys(P).forEach(k => {
        const [x, y] = P[k], imp = k[0] === "D";
        s += `<circle cx="${x}" cy="${y}" r="${imp ? 13 : 17}" fill="${imp ? "#d8c7a2" : "#efe3c6"}" stroke="#2d1e12" stroke-width="1.6" ${imp ? 'stroke-dasharray="3 3"' : ""}/>`;
        s += `<text x="${x}" y="${y + (y > 330 ? -24 : 34)}" text-anchor="middle" font-family="IM Fell English" font-style="italic" font-size="17" fill="#2d1e12">${D.noms[k]}</text>`;
      });
      s += `<text x="${P.R0[0] - 40}" y="${P.R0[1] - 30}" font-family="IM Fell English" font-size="15" fill="#8a2f14">entrée</text>`;
      return s + `</svg></div><p class="zoom-astuce">Faites glisser le plan pour le parcourir.</p>`;
    },
    ciel: () => {
      const cx = 200, cy = 120, k = 1.6;
      const fa = [[-6, 38], [-7.2, 35.6], [-11, 34], [-10, 40], [-13.5, 42.4], [-16, 44.4], [-19, 43.6]];
      const pos = ([a, e]) => [cx + a * 10 * .55 * k / 1.6 * 1.6, cy + (50 - e) * 5 * .55 * k / 1.6 * 1.6];
      let s = `<svg class="figure fig" viewBox="0 0 340 300"><rect width="340" height="300" rx="4" fill="#1d2232"/>`;
      let g = 9; const al = () => { g = (g * 16807) % 2147483647; return (g - 1) / 2147483646; };
      for (let i = 0; i < 90; i++) s += `<circle cx="${al() * 340}" cy="${al() * 300}" r="${al() * .9 + .3}" fill="#e8e6dc" opacity=".55"/>`;
      const p = fa.map(pos);
      s += `<path d="M${p[1][0]} ${p[1][1]} L ${p[0][0]} ${p[0][1]} L ${p[3][0]} ${p[3][1]} L ${p[2][0]} ${p[2][1]} Z M${p[3][0]} ${p[3][1]} L ${p[4][0]} ${p[4][1]} L ${p[5][0]} ${p[5][1]} L ${p[6][0]} ${p[6][1]}" stroke="#d9c49a" stroke-width="1" fill="none" opacity=".8"/>`;
      s += `<path d="M${p[1][0]} ${p[1][1]} L ${cx} ${cy}" stroke="#d9c49a" stroke-width="1" stroke-dasharray="2 5" opacity=".9"/>`;
      p.forEach(([x, y]) => s += `<circle cx="${x}" cy="${y}" r="3.2" fill="#fff"/>`);
      s += `<circle cx="${cx}" cy="${cy}" r="4.2" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="#d9c49a" stroke-width=".8"/>`;
      s += `<text x="${cx + 14}" y="${cy - 8}" font-family="IM Fell English" font-size="17" fill="#eadcbc">le Clou</text>`;
      s += `<text x="${p[5][0] - 40}" y="${p[5][1] + 40}" font-family="IM Fell English" font-style="italic" font-size="16" fill="#eadcbc">la Faucille</text>`;
      s += `<text x="${p[1][0] - 18}" y="${p[1][1] + 26}" font-family="IM Fell English" font-style="italic" font-size="12" fill="#b9ab8c">la lame</text>`;
      s += `<text x="170" y="282" text-anchor="middle" font-family="IM Fell English" font-style="italic" font-size="13" fill="#b9ab8c">vers le nord, comme on le voit en levant la tête</text>`;
      s += `</svg>`;
      s += `<p class="main" style="font-size:1.02rem">Ailleurs dans le ciel d'automne : la <b>Couronne</b>, sept étoiles en demi-cercle, à l'est ; les <b>Trois Sœurs</b>, trois étoiles en ligne, au sud ; l'<b>Étoile Rouge</b>, seule, à l'ouest. Ne pas les confondre avec la Faucille.</p>`;
      return s;
    }
  };
  function runeBrute(l) { return Glyphes.rune(l).replace('class="rune"', 'width="10" height="20"'); }
  function rendreHTML(html) {
    return html.replace(/\[\[(\w+)(?::([^\]]+))?\]\]/g, (_, nom, arg) => {
      if (nom === "nain") return `<span class="nain-ligne">${arg.split(",").map(n => Glyphes.chiffreNain(+n)).join("")}</span>`;
      return FIG[nom] ? FIG[nom]() : "";
    });
  }

  // ——— Navigation
  function onglets() {
    const nav = $("#onglets"); nav.innerHTML = "";
    C.cahiers.forEach((c, i) => {
      const b = document.createElement("button"); const ouvert = etat.ouverts.includes(i);
      b.className = "onglet" + (i === etat.cahier ? " actif" : "") + (ouvert ? "" : " cousu");
      b.innerHTML = c.titre.split(".")[0] + (ouvert ? "" : `<span class="fil"></span>`);
      b.onclick = () => { etat.cahier = i; etat.page = 0; sauver(); afficher(); };
      nav.appendChild(b);
    });
  }
  function afficher(dir) {
    onglets();
    const c = C.cahiers[etat.cahier], page = $("#page"), zone = $("#page-zone");
    page.style.setProperty("--dir", dir === -1 ? "-12px" : "12px");
    page.style.animation = "none"; void page.offsetWidth; page.style.animation = "";
    zone.scrollTop = 0;
    if (!etat.ouverts.includes(etat.cahier)) {
      page.innerHTML = sceau(`<p>Ce cahier est cousu d'un fil rouge, serré, noué trois fois.</p><p>Le fil se défait au mot que la tante a laissé sur la route.</p>`);
      brancherSceau(mot => { if (norm(mot) === norm(c.mot)) { etat.ouverts.push(etat.cahier); etat.page = 0; sauver(); afficher(); return true; } });
      $("#folio").textContent = c.titre; $("#prec").disabled = true; $("#suiv").disabled = true; return;
    }
    const p = c.pages[etat.page], cle = etat.cahier + "-" + etat.page;
    if (p.mot && !etat.pagesOuvertes.includes(cle)) {
      page.innerHTML = `<h1>${p.titre}</h1>` + sceau(`<p>Cette dernière page est pliée et cousue sur elle-même. Au fil, une étiquette : « À lire à la fin. »</p>`);
      brancherSceau(mot => { if (norm(mot) === norm(p.mot)) { etat.pagesOuvertes.push(cle); sauver(); afficher(); return true; } });
    } else page.innerHTML = (p.titre ? `<h1>${p.titre}</h1>` : "") + rendreHTML(p.html);
    if (etat.cahier === 0 && etat.page === c.pages.length - 1) {
      const b = document.createElement("button"); b.className = "recoudre"; b.textContent = "Nouvelle partie : recoudre les cahiers";
      b.onclick = () => { if (confirm("Recoudre tous les cahiers pour une nouvelle partie ?")) { localStorage.removeItem(CLE); location.reload(); } };
      page.appendChild(b);
    }
    $("#folio").textContent = `${c.titre} · ${etat.page + 1} / ${c.pages.length}`;
    $("#prec").disabled = etat.page === 0; $("#suiv").disabled = etat.page >= c.pages.length - 1;
  }
  function sceau(texte) {
    return `<div class="sceau"><div class="sceau-fil"><svg viewBox="0 0 120 120"><path d="M10 60 C 30 40, 50 80, 60 60 S 90 40, 110 60" stroke="#a83a1c" stroke-width="3" fill="none"/><path d="M60 60 m -12 -6 c 6 -14, 24 -14, 24 0 c 0 12, -24 12, -24 0" stroke="#a83a1c" stroke-width="3" fill="none"/><path d="M58 66 l -10 30 M62 66 l 12 28" stroke="#a83a1c" stroke-width="3" fill="none"/></svg></div>${texte}<form autocomplete="off"><input aria-label="Le mot" autocapitalize="characters" spellcheck="false"><button>Défaire</button></form><p class="refus"></p></div>`;
  }
  function brancherSceau(essai) {
    const f = $(".sceau form"), refus = $(".sceau .refus");
    f.onsubmit = e => {
      e.preventDefault(); const v = f.querySelector("input").value;
      if (!v.trim()) return;
      if (!essai(v)) { refus.textContent = "Le fil ne cède pas."; const s = $(".sceau"); s.classList.remove("secoue"); void s.offsetWidth; s.classList.add("secoue"); }
    };
  }
  $("#prec").onclick = () => { if (etat.page > 0) { etat.page--; sauver(); afficher(-1); } };
  $("#suiv").onclick = () => { const c = C.cahiers[etat.cahier]; if (etat.page < c.pages.length - 1) { etat.page++; sauver(); afficher(1); } };
  // glisser pour tourner les pages
  let x0 = null, y0 = null;
  $("#page-zone").addEventListener("touchstart", e => { if (e.touches.length !== 1) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  $("#page-zone").addEventListener("touchend", e => {
    if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && !e.target.closest("input, .defile")) (dx < 0 ? $("#suiv") : $("#prec")).click();
  });
  document.addEventListener("keydown", e => { if (e.target.tagName === "INPUT") return; if (e.key === "ArrowRight") $("#suiv").click(); if (e.key === "ArrowLeft") $("#prec").click(); });

  $("#ouvrir").onclick = () => { $("#couverture").hidden = true; $("#livre").hidden = false; afficher(); };
  if (etat.dejaOuvert) { $("#couverture").hidden = true; $("#livre").hidden = false; afficher(); }
  etat.dejaOuvert = true; sauver();
  // Permet de recommencer une partie : ?neuf remet le carnet cousu
  if (/[?&]neuf\b/.test(location.search)) { localStorage.removeItem(CLE); location.replace(location.pathname); }
})();
