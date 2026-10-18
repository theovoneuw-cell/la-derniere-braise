// Le son : ambiances en boucle (fondu enchaîné), musique, bruitages, et quelques instruments synthétisés
// (harpe en Karplus-Strong, chant lointain, tambours, coups sur la roche).
(function (G) {
  let ctx = null, maitre, busAmb, busMus, busSfx, reverb, reverbLong;
  const tampons = {}, enCours = {};
  let ambActuelle = null, musActuelle = null;
  const vol = { amb: 0.85, mus: 0.55, sfx: 0.9 };
  let coupe = false;

  function demarrer() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    maitre = ctx.createGain(); maitre.gain.value = 1;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    maitre.connect(comp).connect(ctx.destination);
    busAmb = ctx.createGain(); busAmb.gain.value = vol.amb; busAmb.connect(maitre);
    busMus = ctx.createGain(); busMus.gain.value = vol.mus; busMus.connect(maitre);
    busSfx = ctx.createGain(); busSfx.gain.value = vol.sfx; busSfx.connect(maitre);
    reverb = ctx.createConvolver(); reverb.buffer = reponse(2.2, 2.6); const rg = ctx.createGain(); rg.gain.value = 0.5; reverb.connect(rg).connect(maitre);
    reverbLong = ctx.createConvolver(); reverbLong.buffer = reponse(6, 1.8); const rl = ctx.createGain(); rl.gain.value = 0.7; reverbLong.connect(rl).connect(maitre);
  }
  function reponse(sec, decr) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decr); }
    return b;
  }
  async function charger(nom) {
    if (tampons[nom] !== undefined) return tampons[nom];
    if (enCours[nom]) return enCours[nom];
    enCours[nom] = fetch(`sons/${nom}.mp3`).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(a => new Promise((ok, ko) => ctx.decodeAudioData(a, ok, ko)))
      .then(b => (tampons[nom] = b)).catch(() => (tampons[nom] = null));
    return enCours[nom];
  }
  function precharger(noms) { if (ctx) noms.forEach(charger); }

  // ——— Boucles (ambiance et musique) avec fondu enchaîné
  async function boucle(nom, bus, actuelle, fondu, opts = {}) {
    if (actuelle && actuelle.nom === nom) return actuelle;
    if (actuelle) { const a = actuelle; a.g.gain.cancelScheduledValues(ctx.currentTime); a.g.gain.setTargetAtTime(0, ctx.currentTime, fondu / 3); setTimeout(() => { try { a.s.stop(); } catch (e) {} }, fondu * 1000 + 600); }
    if (!nom) return null;
    const b = await charger(nom);
    if (!b) return { nom, g: ctx.createGain(), s: { stop() {} } };
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = opts.loop !== false;
    const g = ctx.createGain(); g.gain.value = 0; s.connect(g).connect(bus);
    g.gain.setTargetAtTime(opts.gain || 1, ctx.currentTime, fondu / 3);
    s.start(0, opts.debut != null ? opts.debut : (s.loop ? Math.random() * b.duration * 0.5 : 0));
    return { nom, g, s };
  }
  async function ambiance(nom, fondu = 4) { if (!ctx) return; const n = await boucle(nom, busAmb, ambActuelle, fondu); ambActuelle = n; }
  async function musique(nom, fondu = 5, opts = {}) { if (!ctx) return; const n = await boucle(nom, busMus, musActuelle, fondu, opts); musActuelle = n; }

  // ——— Bruitages
  async function son(nom, opts = {}) {
    if (!ctx) return;
    if (SYNTH[nom]) return SYNTH[nom](opts);
    const b = await charger(nom); if (!b) return;
    const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = opts.vitesse || 1;
    const g = ctx.createGain(); g.gain.value = opts.gain || 1;
    s.connect(g).connect(busSfx); if (opts.reverb) g.connect(reverb);
    s.start(ctx.currentTime + (opts.delai || 0));
    return s;
  }

  // ——— Instruments synthétisés
  function bruit(sec) { const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }
  const cacheKS = {};
  function cordeKS(freq, sec = 3.2) {
    const cle = freq.toFixed(2); if (cacheKS[cle]) return cacheKS[cle];
    const sr = ctx.sampleRate, n = Math.floor(sr * sec), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    const p = Math.round(sr / freq), buf = new Float32Array(p);
    for (let i = 0; i < p; i++) buf[i] = (Math.random() * 2 - 1) * 0.5 + Math.sin(i / p * Math.PI * 2) * 0.5;
    let j = 0, prec = 0;
    for (let i = 0; i < n; i++) {
      const v = buf[j]; const suiv = buf[(j + 1) % p];
      buf[j] = 0.4985 * (v + suiv) + 0.0004 * prec; prec = v;
      d[i] = v * Math.min(1, i / 30); j = (j + 1) % p;
    }
    return (cacheKS[cle] = b);
  }
  const GAMME = [146.83, 164.81, 174.61, 196.0, 220.0, 246.94, 261.63]; // ré mineur dorien, de la plus grave à la plus aiguë
  function harpe(i, opts = {}) {
    const f = GAMME[i] * (opts.octave || 2);
    const s = ctx.createBufferSource(); s.buffer = cordeKS(f);
    const g = ctx.createGain(); g.gain.value = opts.gain || 0.55;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3800;
    s.connect(lp).connect(g); g.connect(opts.bus || busSfx); g.connect(opts.loin ? reverbLong : reverb);
    s.start(ctx.currentTime + (opts.delai || 0));
  }
  // Voix lointaine (flûte soufflée) pour le chant des elfes
  function voix(i, t0, duree, gain = 0.12) {
    const f = GAMME[i] * 2;
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = f * 2.001;
    const vib = ctx.createOscillator(); vib.frequency.value = 5.2; const vg = ctx.createGain(); vg.gain.value = f * 0.006; vib.connect(vg).connect(o.frequency); vg.connect(o2.frequency);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.25); g.gain.setValueAtTime(gain, t0 + duree - 0.3); g.gain.linearRampToValueAtTime(0, t0 + duree + 0.4);
    const g2 = ctx.createGain(); g2.gain.value = 0.18;
    const souffle = ctx.createBufferSource(); souffle.buffer = bruit(duree + 0.6); const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f * 2; bp.Q.value = 8; const sg = ctx.createGain(); sg.gain.value = 0.35;
    souffle.connect(bp).connect(sg).connect(g);
    o.connect(g); o2.connect(g2).connect(g);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1600;
    g.connect(lp); lp.connect(reverbLong); const sec = ctx.createGain(); sec.gain.value = 0.25; lp.connect(sec).connect(busAmb);
    [o, o2, vib, souffle].forEach(x => { x.start(t0); x.stop(t0 + duree + 0.6); });
  }
  function chant(motif, opts = {}) {
    if (!ctx) return;
    let t = ctx.currentTime + 0.2; const durees = [0.9, 0.9, 1.5, 0.9, 2.2];
    motif.forEach((n, k) => { voix(n - 1, t, durees[k % durees.length], opts.gain || 0.12); t += durees[k % durees.length] + 0.08; });
    return t - ctx.currentTime;
  }
  // Tambour de guerre lointain
  function tambour(t0, fort = 1) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(82, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.35);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.9 * fort, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9);
    const n = ctx.createBufferSource(); n.buffer = bruit(0.3); const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.5 * fort, t0); ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
    n.connect(lp).connect(ng).connect(busSfx); ng.connect(reverbLong);
    o.connect(g).connect(busSfx); g.connect(reverbLong);
    o.start(t0); o.stop(t0 + 1); n.start(t0);
  }
  let boucleTambours = null;
  function tambours(motif, actif, surCoup) {
    if (boucleTambours) { clearTimeout(boucleTambours); boucleTambours = null; }
    if (!actif || !ctx) return;
    const tour = (fort) => {
      let t = ctx.currentTime + 0.1, delais = [];
      motif.forEach((nb, gi) => { for (let k = 0; k < nb; k++) { tambour(t, fort); delais.push(t - ctx.currentTime); t += 0.42; } t += 0.75; });
      delais.forEach(d => setTimeout(() => surCoup && surCoup(), d * 1000));
      boucleTambours = setTimeout(() => tour(Math.min(1.3, fort + 0.04)), (t - ctx.currentTime + 2.6) * 1000);
    };
    tour(0.55);
  }
  // Coup sur la roche : plein (mat) ou creux (résonant)
  function roche(creux) {
    const t0 = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = bruit(0.15);
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = creux ? 420 : 1400; bp.Q.value = creux ? 2 : 0.9;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.8, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
    n.connect(bp).connect(g).connect(busSfx); n.start(t0);
    if (creux) {
      [180, 271, 395].forEach((f, i) => {
        const o = ctx.createOscillator(); o.frequency.value = f; const og = ctx.createGain();
        og.gain.setValueAtTime(0.28 / (i + 1), t0); og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9 - i * 0.15);
        o.connect(og).connect(busSfx); og.connect(reverb); o.start(t0); o.stop(t0 + 1);
      });
    }
  }
  function frappe(fort = 1) { // coup de poing sur une grande porte de pierre
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(60, t0 + 0.15);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.7 * fort, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    const n = ctx.createBufferSource(); n.buffer = bruit(0.08); const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.5, t0); ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);
    o.connect(g).connect(busSfx); g.connect(reverb); n.connect(lp).connect(ng).connect(busSfx);
    o.start(t0); o.stop(t0 + 0.35); n.start(t0);
  }
  function grave(duree = 2.5, f = 48, gain = 0.5) { // battement sourd : l'Ombre avance
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(f, t0); o.frequency.linearRampToValueAtTime(f * 0.8, t0 + duree);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t0 + duree);
    const d = ctx.createWaveShaper(); const c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(2.5 * x); } d.curve = c;
    o.connect(d).connect(g).connect(busSfx); g.connect(reverbLong); o.start(t0); o.stop(t0 + duree);
  }
  // Nappe de l'anneau : souffle grave et battements de cœur
  let nappeAnneau = null;
  function anneau(actif) {
    if (!ctx) return;
    if (actif && !nappeAnneau) {
      const n = ctx.createBufferSource(); n.buffer = bruit(4); n.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 300; bp.Q.value = 0.7;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = 220; lfo.connect(lg).connect(bp.frequency);
      const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.32, ctx.currentTime, 0.6);
      const o = ctx.createOscillator(); o.frequency.value = 55; const og = ctx.createGain(); og.gain.value = 0.18; o.connect(og).connect(g);
      n.connect(bp).connect(g).connect(busSfx); g.connect(reverbLong);
      n.start(); lfo.start(); o.start();
      busAmb.gain.setTargetAtTime(vol.amb * 0.25, ctx.currentTime, 0.4); busMus.gain.setTargetAtTime(vol.mus * 0.2, ctx.currentTime, 0.4);
      const coeur = setInterval(() => { grave(0.35, 52, 0.45); setTimeout(() => grave(0.3, 48, 0.3), 260); }, 1300);
      nappeAnneau = { g, stop() { g.gain.setTargetAtTime(0, ctx.currentTime, 0.3); clearInterval(coeur); setTimeout(() => { n.stop(); lfo.stop(); o.stop(); }, 1500); } };
      son("murmures", { gain: 0.8 });
    } else if (!actif && nappeAnneau) {
      nappeAnneau.stop(); nappeAnneau = null;
      busAmb.gain.setTargetAtTime(coupe ? 0 : vol.amb, ctx.currentTime, 0.8); busMus.gain.setTargetAtTime(coupe ? 0 : vol.mus, ctx.currentTime, 0.8);
    }
  }
  function cloche(f = 880, gain = 0.25) {
    const t0 = ctx.currentTime;
    [1, 2.76, 5.4].forEach((m, i) => { const o = ctx.createOscillator(); o.frequency.value = f * m; const g = ctx.createGain(); g.gain.setValueAtTime(gain / (i + 1), t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 2.5 / (i + 1)); o.connect(g).connect(busSfx); g.connect(reverbLong); o.start(t0); o.stop(t0 + 2.6); });
  }
  // Les sons qui n'ont pas besoin de fichier
  const SYNTH = {
    "ombre": () => grave(2.8, 44, 0.55),
    "erreur": () => grave(0.9, 70, 0.4),
    "cristal": () => { cloche(1318, 0.18); setTimeout(() => cloche(1760, 0.12), 140); },
    "merveille": () => [0, 2, 4, 6].forEach((n, k) => harpe(n, { delai: k * 0.11, gain: 0.35 })),
    "pioche": () => son("carte"),
  };

  // Voix du narrateur : une seule à la fois, la musique se fait plus discrète pendant qu'elle parle
  let voixEnCours = null;
  async function voix(nom) {
    if (!ctx) return;
    arreterVoix();
    const b = await charger("voix/" + nom); if (!b) return;
    const s = ctx.createBufferSource(); s.buffer = b; const g = ctx.createGain(); g.gain.value = 1.05;
    s.connect(g).connect(maitre); g.connect(reverb);
    if (!coupe) busMus.gain.setTargetAtTime(vol.mus * .45, ctx.currentTime, .4);
    s.onended = () => { if (voixEnCours === s) { voixEnCours = null; if (!coupe) busMus.gain.setTargetAtTime(vol.mus, ctx.currentTime, 1.2); } };
    s.start(ctx.currentTime + .15); voixEnCours = s;
  }
  function arreterVoix() { if (voixEnCours) { try { voixEnCours.stop(); } catch (e) {} voixEnCours = null; } }

  function couper(c) {
    coupe = c; if (!ctx) return;
    const t = ctx.currentTime;
    busAmb.gain.setTargetAtTime(c ? 0 : vol.amb, t, 0.2); busMus.gain.setTargetAtTime(c ? 0 : vol.mus, t, 0.2); busSfx.gain.setTargetAtTime(c ? 0 : vol.sfx, t, 0.2);
  }
  function volumeMusique(v) { vol.mus = v; if (ctx && !coupe) busMus.gain.setTargetAtTime(v, ctx.currentTime, 0.3); }

  G.Son = { voix, arreterVoix, demarrer, ambiance, musique, son, harpe, chant, tambours, roche, frappe, grave, anneau, cloche, couper, volumeMusique, precharger,
    get ctx() { return ctx; }, get coupe() { return coupe; } };
})(window);
