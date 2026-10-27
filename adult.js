'use strict';
// Plume — espace adultes (parents, enseignants, orthophonistes) :
// bilan imprimable, programme adapté à l'enfant, notes d'observation, vue de groupe.

const ROLES = { parent: ['👨‍👩‍👧', 'Parent'], prof: ['🧑‍🏫', 'Enseignant(e)'], ortho: ['🩺', 'Orthophoniste'] };
const EX_LABEL = {
  ear: 'Entendre un son dans un mot', syl: 'Reconnaître une syllabe entendue', word: 'Lire un mot',
  build: 'Écrire un mot avec des syllabes', flash: 'Reconnaître un mot d\'un coup d\'œil', sentence: 'Comprendre une phrase',
  twin: 'Distinguer des sons proches', storyq: 'Comprendre une histoire', cform: 'Conjugaison : choisir la forme',
  cending: 'Conjugaison : la terminaison', ctense: 'Conjugaison : reconnaître le temps', math: 'Résoudre un problème',
};
const MODULES = [['path', '🗺️ Le chemin des sons'], ['stories', '📚 Les histoires'], ['twins', '👯 Les lettres jumelles'], ['games', '🎮 Les jeux'], ['conj', '✏️ Les verbes'], ['maths', '🔢 Les problèmes']];
const EX_TYPES = [['ear', "J'entends / je n'entends pas"], ['syl', 'Syllabes entendues'], ['word', 'Lire un mot'], ['build', 'Construire le mot'], ['flash', 'Mot flash'], ['sentence', 'Phrases']];
// Repères indicatifs de fin d'année (mots lus correctement par minute) : ordres de grandeur, pas des normes.
const FLUENCE_REF = { CP: 50, CE1: 75, CE2: 95, CM1: 110, CM2: 120 };
const GAME_NAMES = () => Object.fromEntries(GAMES.map(g => [g.id, `${g.e} ${g.name}`]));

// Confusion entre « lettres jumelles » : ba → da, pou → bou, lou → lon… (seul le son de la paire change).
function isTwinConf(t, c) {
  if (!t || !c) return false;
  return PAIRS.some(pr => [[pr.a, pr.b], [pr.b, pr.a]].some(([x, y]) => (pr.vowels
    ? t.startsWith(x) && c.startsWith(y) && t.slice(x.length) === c.slice(y.length)
    : t.endsWith(x) && c.endsWith(y) && t.slice(0, -x.length) === c.slice(0, -y.length))));
}
const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const fmtDay = d => `${d.slice(8)}/${d.slice(5, 7)}`;
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); };

// ---------- Choix du rôle ----------
function roleChoice(then) {
  screen(`${topBar('Espace adultes')}
    <div class="center-col">
      <p class="lead">Qui êtes-vous ? Cela adapte l'affichage, et vous pourrez changer plus tard.</p>
      <div class="list wide">${Object.entries(ROLES).map(([k, [e, l]]) => `<button class="row" data-r="${k}"><span class="r-e">${e}</span><span class="r-t">${l}<small>${{
        parent: 'Suivre et encourager mon enfant à la maison',
        prof: 'Suivre plusieurs élèves, préparer un PAP ou une réunion',
        ortho: 'Adapter le programme entre deux séances, suivre les progrès',
      }[k]}</small></span></button>`).join('')}</div>
    </div>`);
  $$('[data-r]').forEach(b => b.onclick = () => { DB.role = b.dataset.r; save(); then(); });
}

// ---------- Écran principal ----------
function adult(tab) {
  if (!DB.role) return roleChoice(() => adult(tab));
  const p = P();
  tab = tab || (DB.role !== 'parent' && DB.profiles.length > 1 ? 'groupe' : 'bilan');
  const tabs = [['bilan', '📊 Bilan'], ['programme', '🎯 Programme'], ['notes', '📝 Notes'], ['reglages', '🔤 Lecture'],
    ['groupe', DB.role === 'parent' ? '👨‍👩‍👧 Enfants' : '👥 Groupe'], ['conseils', '💡 Conseils']];
  const [re, rl] = ROLES[DB.role];
  screen(`${topBar('Espace adultes')}
    <div class="who-bar no-print">
      <span>${re} ${rl} <button class="linkb" data-role>changer</button></span>
      ${DB.profiles.length > 1 ? `<label>Enfant : <select data-kid>${DB.profiles.map(k => `<option value="${k.id}" ${k.id === p.id ? 'selected' : ''}>${k.avatar} ${esc(k.name)}</option>`).join('')}</select></label>` : `<span>${p.avatar} ${esc(p.name)}</span>`}
    </div>
    <div class="tabs scroll no-print">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
    <div class="panel">${({ bilan: bilanHTML, programme: programmeHTML, notes: notesHTML, reglages: reglagesHTML, groupe: groupeHTML, conseils: conseilsHTML })[tab](p)}</div>`, 'adult');
  $$('[data-t]').forEach(b => b.onclick = () => adult(b.dataset.t));
  $('[data-role]').onclick = () => { DB.role = null; save(); adult(tab); };
  const kid = $('[data-kid]'); if (kid) kid.onchange = () => { DB.current = kid.value; save(); applySettings(); adult(tab); };
  ({ bilan: bindBilan, programme: bindProgramme, notes: bindNotes, reglages: bindReglages, groupe: bindGroupe, conseils: () => {} })[tab](p);
}

// ---------- Calculs pour le bilan ----------
function analyse(p) {
  const log = p.log || [], since30 = daysAgo(29);
  const days30 = Object.entries(p.days || {}).filter(([d, s]) => d >= since30 && s >= 60);
  const min30 = Math.round(days30.reduce((a, [, s]) => a + s, 0) / 60);
  const sess = log.filter(e => e.d >= since30 && e.k !== 'jeu');
  const avgMin = sess.length ? Math.round(sess.reduce((a, e) => a + e.sec, 0) / sess.length / 6) / 10 : 0;
  const early = sess.filter(e => e.early).length;
  const ex = Object.entries(p.ex || {}).map(([k, v]) => ({ k, label: EX_LABEL[k] || k, n: v.ok + v.ko, rate: pct(v.ok, v.ok + v.ko), help: v.help || 0 })).filter(x => x.n > 0);
  const stepState = STEPS.map(s => ({ s, stars: p.steps[s.id] || 0, errs: s.W.reduce((a, w) => a + ((p.words[w.p] || {}).ko || 0), 0) }));
  const mastered = stepState.filter(x => x.stars === 3), working = stepState.filter(x => x.stars && x.stars < 3);
  const fragile = stepState.filter(x => x.stars && (x.stars === 1 || x.errs >= 4)).sort((a, b) => b.errs - a.errs);
  const conf = Object.entries(p.conf || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const hard = Object.entries(p.words || {}).filter(([, s]) => s.ko > s.ok || s.ko >= 2).sort((a, b) => (b[1].ko - b[1].ok) - (a[1].ko - a[1].ok)).slice(0, 12);
  const fl = (p.fluence || []).slice();
  const ref = FLUENCE_REF[p.level] || null;
  const storyq = (p.ex || {}).storyq;
  const me = p.mathErr || { op: 0, calc: 0 };
  return { log, days30, min30, sess, avgMin, early, ex, mastered, working, fragile, conf, hard, fl, ref, storyq, me };
}

// Observations rédigées automatiquement à partir des données (pas un diagnostic).
function observations(p, A) {
  const fort = [], travail = [], piste = [];
  const exr = k => A.ex.find(x => x.k === k);
  A.ex.filter(x => x.n >= 8 && x.rate >= 85).forEach(x => fort.push(`${x.label} : ${x.rate} % de réussite du premier coup.`));
  A.ex.filter(x => x.n >= 6 && x.rate < 60).forEach(x => travail.push(`${x.label} : ${x.rate} % de réussite du premier coup.`));
  if (A.mastered.length) fort.push(`Sons bien maîtrisés : ${A.mastered.map(x => x.s.title).join(', ')}.`);
  if (A.fragile.length) travail.push(`Sons encore fragiles : ${A.fragile.slice(0, 6).map(x => x.s.title).join(', ')}.`);
  if (A.days30.length >= 15) fort.push(`Belle régularité : ${A.days30.length} jours d'activité sur les 30 derniers.`);
  else if (A.days30.length < 8) piste.push(`Activité sur ${A.days30.length} jour(s) ces 30 derniers jours : viser un peu chaque jour (10 minutes) plutôt que de longues séances.`);
  const e = exr('ear'); if (e && e.n >= 6 && e.rate < 70) piste.push("L'écoute des sons est difficile : jouer à l'oral à « j'entends / je n'entends pas », sans écrit, avant de lire.");
  const f = exr('flash'); if (f && f.n >= 6 && f.rate < 60) piste.push('La reconnaissance rapide des mots est fragile : relire chaque jour quelques mêmes mots courts (lecture répétée), puis le mot flash.');
  const pairs = A.conf.filter(([k]) => isTwinConf(...k.split(' → ')));
  if (pairs.length) piste.push(`Confusions entre sons proches (${pairs.slice(0, 3).map(([k]) => k).join(' ; ')}) : travailler « Les lettres jumelles », avec un geste ou une image repère pour chaque lettre.`);
  if (A.fl.length) {
    const last = A.fl[A.fl.length - 1];
    if (A.fl.length >= 2) { const d = last.wpm - A.fl[0].wpm; (d > 0 ? fort : travail).push(`Lecture à voix haute : ${A.fl[0].wpm} → ${last.wpm} mots par minute (${d > 0 ? '+' : ''}${d}) entre le ${fmtDay(A.fl[0].d)} et le ${fmtDay(last.d)}.`); }
    if (A.ref && last.wpm < A.ref * 0.6) travail.push(`Vitesse de lecture (${last.wpm} mots/min) nettement en dessous du repère indicatif de fin de ${p.level} (≈ ${A.ref}).`);
  } else piste.push("Pas encore de mesure de lecture à voix haute : utiliser « Chrono (adulte) » dans Les histoires, environ une fois par semaine.");
  if (A.storyq && A.storyq.ok + A.storyq.ko >= 4 && pct(A.storyq.ok, A.storyq.ok + A.storyq.ko) < 60) piste.push("Compréhension des histoires fragile : lire d'abord l'histoire à voix haute à l'enfant, puis la lui faire relire.");
  if (A.me.op >= 3 && A.me.op > A.me.calc) piste.push("En problèmes, le choix de l'opération est plus difficile que le calcul : faire raconter ou dessiner l'énoncé avant de calculer.");
  else if (A.me.calc >= 3 && A.me.calc > A.me.op) piste.push('En problèmes, les erreurs viennent surtout du calcul : entraîner le calcul mental avec « La fusée du calcul ».');
  if (A.sess.length >= 4 && (A.avgMin < 4 || A.early / A.sess.length >= 0.3)) piste.push(`Séances souvent courtes ou interrompues (${A.avgMin} min en moyenne, ${A.early} arrêtée(s) avant la fin) : choisir « Séances courtes » dans Programme et la pause à 5 minutes.`);
  return { fort, travail, piste };
}

function lineChart(points, ref) {
  if (!points.length) return '';
  const W = 320, H = 130, pad = 26, max = Math.max(ref || 0, ...points.map(p => p.wpm)) * 1.15 || 10;
  const x = i => pad + (points.length === 1 ? (W - 2 * pad) / 2 : i * (W - 2 * pad) / (points.length - 1));
  const y = v => H - pad - v / max * (H - 2 * pad);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution de la vitesse de lecture">
    ${ref ? `<line x1="${pad}" x2="${W - pad}" y1="${y(ref)}" y2="${y(ref)}" class="ref"/><text x="${W - pad}" y="${y(ref) - 4}" text-anchor="end" class="lbl">repère ${ref}</text>` : ''}
    <polyline points="${points.map((p, i) => `${x(i)},${y(p.wpm)}`).join(' ')}" class="ln"/>
    ${points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.wpm)}" r="4" class="pt"/><text x="${x(i)}" y="${y(p.wpm) - 8}" text-anchor="middle" class="val">${p.wpm}</text><text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="lbl">${fmtDay(p.d)}</text>`).join('')}
  </svg>`;
}
function dayBars(p) {
  const W = 320, H = 70, n = 30, bw = W / n;
  const vals = Array.from({ length: n }, (_, i) => Math.round(((p.days || {})[daysAgo(n - 1 - i)] || 0) / 60));
  const max = Math.max(10, ...vals);
  return `<svg class="chart" viewBox="0 0 ${W} ${H + 14}" role="img" aria-label="Minutes par jour sur 30 jours">
    ${vals.map((v, i) => `<rect x="${i * bw + 1}" y="${H - v / max * H}" width="${bw - 2}" height="${Math.max(v ? 2 : 0, v / max * H)}" rx="2" class="bar"><title>${fmtDay(daysAgo(n - 1 - i))} : ${v} min</title></rect>`).join('')}
    <text x="0" y="${H + 12}" class="lbl">il y a 30 j</text><text x="${W}" y="${H + 12}" text-anchor="end" class="lbl">aujourd'hui</text>
  </svg>`;
}

// ---------- Onglet Bilan ----------
function bilanHTML(p) {
  const A = analyse(p), O = observations(p, A);
  const first = Object.keys(p.days || {}).sort()[0];
  const gn = GAME_NAMES();
  const games = GAMES.map(g => [g, p.games[g.id + '_n'] || 0]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
  return `
    <div class="bilan">
      <div class="b-head">
        <div><h2>Bilan de ${esc(p.name)} ${p.avatar}</h2>
        <p class="note">Classe : <b>${esc(p.level || '—')}</b> · Suivi depuis le ${first ? fmtDay(first) + '/' + first.slice(0, 4) : '—'} · Bilan du ${fmtDay(dayKey())}/${dayKey().slice(0, 4)}</p></div>
        <div class="no-print b-actions"><button class="btn small" data-print>🖨️ Imprimer / PDF</button><button class="btn small ghost" data-copy>📋 Copier le résumé</button></div>
      </div>

      <div class="kpis">
        <div><b>${A.min30}</b><span>min sur 30 jours</span></div>
        <div><b>${A.days30.length}</b><span>jours actifs / 30</span></div>
        <div><b>${A.avgMin || '—'}</b><span>min par séance</span></div>
        <div><b>${A.mastered.length}/${STEPS.length}</b><span>sons maîtrisés</span></div>
      </div>
      ${dayBars(p)}

      <h3>Synthèse</h3>
      <div class="obs">
        <div class="ob fort"><h4>👍 Points forts</h4>${O.fort.length ? `<ul>${O.fort.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="note">Pas encore assez de données.</p>'}</div>
        <div class="ob trav"><h4>🔧 À travailler</h4>${O.travail.length ? `<ul>${O.travail.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="note">Rien de particulier pour le moment.</p>'}</div>
        <div class="ob piste"><h4>💡 Pistes</h4>${O.piste.length ? `<ul>${O.piste.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="note">—</p>'}</div>
      </div>

      <h3>Lecture</h3>
      <h4>Les sons</h4>
      <div class="sgrid">${STEPS.map(s => `<div class="sg ${p.steps[s.id] === 3 ? 'done' : p.steps[s.id] ? 'mid' : ''}"><span class="rd">${esc(s.title)}</span>${p.steps[s.id] ? stars(p.steps[s.id]) : '—'}</div>`).join('')}</div>
      <h4>Réussite par type d'exercice <small>(du premier coup)</small></h4>
      ${A.ex.length ? `<table class="tbl"><tr><th>Exercice</th><th>Réussite</th><th>Essais</th></tr>${A.ex.sort((a, b) => a.rate - b.rate).map(x => `<tr><td>${esc(x.label)}</td><td><span class="meter"><i style="width:${x.rate}%" class="${x.rate >= 80 ? 'g' : x.rate >= 60 ? 'm' : 'r'}"></i></span> ${x.rate} %</td><td>${x.n}</td></tr>`).join('')}</table>` : '<p class="note">Pas encore d\'exercices faits.</p>'}
      <h4>Confusions observées</h4>
      ${A.conf.length ? `<div class="chips rd">${A.conf.map(([k, n]) => `<span class="chip">${esc(k)} <small>×${n}</small></span>`).join('')}</div><p class="note">« ba → da » : on a fait entendre « ba », l'enfant a choisi « da ».</p>` : '<p class="note">Aucune confusion relevée.</p>'}
      <h4>Mots à retravailler</h4>
      ${A.hard.length ? `<div class="chips rd">${A.hard.map(([w, s]) => `<span class="chip">${esc(w)} <small>${s.ko}✗ ${s.ok}✓</small></span>`).join('')}</div>` : '<p class="note">Rien à signaler.</p>'}
      <h4>Lecture à voix haute (mots lus correctement par minute)</h4>
      ${A.fl.length ? lineChart(A.fl.slice(-10), A.ref) + `<p class="note">Repère indicatif de fin de ${esc(p.level || '?')} : ≈ ${A.ref || '?'} mots/min. C'est surtout la progression de l'enfant par rapport à lui-même qui compte.</p>`
        : '<p class="note">Aucune mesure. Dans « Les histoires », appuyez sur « Chrono (adulte) » pendant que l\'enfant lit à voix haute.</p>'}
      ${A.storyq ? `<p>Compréhension des histoires : <b>${pct(A.storyq.ok, A.storyq.ok + A.storyq.ko)} %</b> de bonnes réponses du premier coup (${A.storyq.ok + A.storyq.ko} questions).</p>` : ''}

      <h3>Conjugaison</h3>
      ${CONJ.some(l => (p.conj || {})[l.id]) ? `<div class="sgrid wide">${CONJ.filter(l => (p.conj || {})[l.id]).map(l => `<div class="sg ${p.conj[l.id] === 3 ? 'done' : 'mid'}"><span>${l.level} · ${esc(l.title)}</span>${stars(p.conj[l.id])}</div>`).join('')}</div>` : '<p class="note">Pas encore de leçon de verbes.</p>'}

      <h3>Mathématiques</h3>
      ${LEVELS.some(l => (p.math || {})[l]) ? `<div class="sgrid">${LEVELS.filter(l => (p.math || {})[l]).map(l => `<div class="sg ${p.math[l] === 3 ? 'done' : 'mid'}"><span>Problèmes ${l}</span>${stars(p.math[l])}</div>`).join('')}</div>` : '<p class="note">Pas encore de problèmes faits.</p>'}
      ${A.me.op + A.me.calc ? `<p>Erreurs en problèmes : <b>${A.me.op}</b> sur le choix de l'opération, <b>${A.me.calc}</b> sur le calcul.</p>` : ''}
      ${p.games.fusee ? `<p>Calcul mental (la fusée) : meilleur score ${stars(p.games.fusee)}</p>` : ''}

      <h3>Attention et jeux</h3>
      <p>Pauses proposées et prises : <b>${p.pauses || 0}</b> · Séances arrêtées avant la fin (30 j) : <b>${A.early}</b>${p.games.hunt ? ` · Chasse aux lettres (meilleur score) : <b>${p.games.hunt}</b>/24` : ''}${p.games.simon ? ` · Suite de Plume retenue : <b>${p.games.simon}</b>` : ''}</p>
      ${games.length ? `<div class="chips">${games.map(([g, n]) => `<span class="chip">${esc(gn[g.id])} <small>×${n}</small></span>`).join('')}</div>` : '<p class="note">Aucun jeu joué.</p>'}

      ${(p.notes || []).length ? `<h3>Notes d'observation</h3><ul class="notes-list">${p.notes.slice(-6).reverse().map(n => `<li><b>${fmtDay(n.d)}</b> · ${esc(ROLES[n.role] ? ROLES[n.role][1] : '')} — ${esc(n.text)}</li>`).join('')}</ul>` : ''}

      <p class="note disclaimer">Ce bilan est un relevé de l'activité dans Plume. Ce n'est pas un diagnostic : il sert de support d'échange avec l'enseignant(e), l'orthophoniste ou le médecin.</p>
    </div>`;
}
function bilanText(p) {
  const A = analyse(p), O = observations(p, A);
  return [`Bilan Plume — ${p.name} (${p.level || '?'}) — ${fmtDay(dayKey())}/${dayKey().slice(0, 4)}`,
    `Activité : ${A.min30} min sur 30 jours, ${A.days30.length} jours actifs, ${A.avgMin} min par séance en moyenne.`,
    `Sons maîtrisés : ${A.mastered.length}/${STEPS.length}.`,
    '', 'Points forts :', ...O.fort.map(t => '- ' + t), '', 'À travailler :', ...O.travail.map(t => '- ' + t), '', 'Pistes :', ...O.piste.map(t => '- ' + t),
    '', '(Relevé d\'activité dans l\'appli Plume, pas un diagnostic.)'].join('\n');
}
function bindBilan(p) {
  $('[data-print]').onclick = () => window.print();
  $('[data-copy]').onclick = () => {
    const t = bilanText(p);
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('📋 Résumé copié : vous pouvez le coller dans un e-mail.'))
      .catch(() => { prompt('Copiez le résumé :', t); });
  };
}

// ---------- Onglet Programme (adapter le travail) ----------
function programmeHTML(p) {
  const pr = PROG();
  return `
    <p class="note">Les changements s'appliquent dès la prochaine séance de <b>${esc(p.name)}</b>.</p>
    <h3>🎯 Sons à travailler en priorité</h3>
    <p class="note">La « séance du jour » proposera d'abord ces sons, dans l'ordre choisi, jusqu'à 3 étoiles. Sans choix, l'enfant suit le chemin des sons dans l'ordre.</p>
    <table class="tbl prog-tbl">${WORLDS.map(w => `<tr><th colspan="3">${w.e} ${esc(w.name)}</th></tr>${STEPS.filter(s => s.world === w.id).map(s => {
      const i = pr.focus.indexOf(s.id);
      return `<tr><td><span class="rd big-t">${esc(s.title)}</span> ${p.steps[s.id] ? stars(p.steps[s.id]) : ''}</td>
        <td><button class="mini ${i >= 0 ? 'on' : ''}" data-focus="${s.id}">${i >= 0 ? `⭐ Priorité ${i + 1}` : '☆ Prioritaire'}</button></td>
        <td><button class="mini" data-acq="${s.id}" title="Marquer comme acquis">✓ Acquis</button> <button class="mini" data-redo="${s.id}" title="Remettre à zéro">↺ À revoir</button></td></tr>`;
    }).join('')}`).join('')}</table>

    <h3>⏱️ Longueur des séances de sons</h3>
    <div class="seg" data-len>${[['court', 'Courtes (≈ 3 min)'], ['normal', 'Normales (≈ 6 min)'], ['long', 'Longues (≈ 10 min)']].map(([k, l]) => `<button class="${pr.length === k ? 'on' : ''}" data-v="${k}">${l}</button>`).join('')}</div>

    <h3>🧩 Exercices proposés dans les séances</h3>
    <div class="toggles">${EX_TYPES.map(([k, l]) => `<label class="tg"><input type="checkbox" data-ex="${k}" ${pr.ex[k] !== false ? 'checked' : ''}> ${l}</label>`).join('')}</div>

    <h3>🏠 Ce que l'enfant voit à l'accueil</h3>
    <p class="note">Par exemple, ne garder que la lecture pendant une période ciblée.</p>
    <div class="toggles">${MODULES.map(([k, l]) => `<label class="tg"><input type="checkbox" data-mod="${k}" ${pr.hide.includes(k) ? '' : 'checked'}> ${l}</label>`).join('')}</div>

    <h3>🎒 Classe (niveau des verbes, des problèmes et du calcul)</h3>
    <div class="seg" data-lvl>${LEVELS.map(l => `<button class="${p.level === l ? 'on' : ''}" data-v="${l}">${l}</button>`).join('')}</div>`;
}
function bindProgramme(p) {
  const pr = () => { p.prog = p.prog || JSON.parse(JSON.stringify(PROG_DEFAULT)); p.prog.ex = p.prog.ex || { ...PROG_DEFAULT.ex }; p.prog.hide = p.prog.hide || []; p.prog.focus = p.prog.focus || []; return p.prog; };
  const keep = () => { const y = window.scrollY; save(); adult('programme'); window.scrollTo(0, y); };
  $$('[data-focus]').forEach(b => b.onclick = () => { const f = pr().focus, id = b.dataset.focus, i = f.indexOf(id); i >= 0 ? f.splice(i, 1) : f.push(id); keep(); });
  $$('[data-acq]').forEach(b => b.onclick = () => { p.steps[b.dataset.acq] = 3; keep(); });
  $$('[data-redo]').forEach(b => b.onclick = () => { delete p.steps[b.dataset.redo]; keep(); });
  $$('[data-len] button').forEach(b => b.onclick = () => { pr().length = b.dataset.v; keep(); });
  $$('[data-lvl] button').forEach(b => b.onclick = () => { p.level = b.dataset.v; keep(); });
  $$('[data-ex]').forEach(c => c.onchange = () => {
    pr().ex[c.dataset.ex] = c.checked;
    if (!Object.values(pr().ex).some(Boolean)) { pr().ex[c.dataset.ex] = true; c.checked = true; toast('Gardez au moins un exercice.'); }
    save();
  });
  $$('[data-mod]').forEach(c => c.onchange = () => { const h = pr().hide, k = c.dataset.mod; c.checked ? h.splice(h.indexOf(k), 1) : h.includes(k) || h.push(k); save(); });
}

// ---------- Onglet Notes ----------
function notesHTML(p) {
  const notes = (p.notes || []).map((n, i) => ({ ...n, i })).reverse();
  return `
    <p class="note">Notez vos observations : ce qui marche, ce qui bloque, ce qui a été vu en séance ou en classe. Les dernières notes apparaissent dans le bilan.</p>
    <textarea class="note-in" data-txt rows="4" placeholder="Ex. : confond encore b et d en lecture de mots, mais plus en syllabes. Bonne concentration aujourd'hui."></textarea>
    <button class="btn small" data-add>Ajouter la note</button>
    <ul class="notes-list">${notes.map(n => `<li><b>${fmtDay(n.d)}/${n.d.slice(0, 4)}</b> · ${esc(ROLES[n.role] ? ROLES[n.role][0] + ' ' + ROLES[n.role][1] : '')}<br>${esc(n.text)} <button class="mini danger" data-del="${n.i}">Supprimer</button></li>`).join('') || '<li class="note">Aucune note pour le moment.</li>'}</ul>`;
}
function bindNotes(p) {
  $('[data-add]').onclick = () => {
    const t = $('[data-txt]').value.trim(); if (!t) return;
    (p.notes = p.notes || []).push({ d: dayKey(), role: DB.role, text: t.slice(0, 1000) }); save(); adult('notes');
  };
  $$('[data-del]').forEach(b => b.onclick = () => { if (confirm('Supprimer cette note ?')) { p.notes.splice(+b.dataset.del, 1); save(); adult('notes'); } });
}

// ---------- Onglet Groupe (plusieurs enfants / élèves) ----------
function kidRow(k) {
  const A = analyse(k), O = observations(k, A);
  const lastFl = (k.fluence || []).slice(-1)[0];
  const lastDay = Object.keys(k.days || {}).sort().pop();
  return { k, A, O, lastFl, lastDay, min7: Math.round(Object.entries(k.days || {}).filter(([d]) => d >= daysAgo(6)).reduce((a, [, s]) => a + s, 0) / 60) };
}
function groupeHTML() {
  const rows = DB.profiles.map(kidRow);
  return `
    <p class="note">${DB.profiles.length} enfant(s) sur cet appareil. Touchez une ligne pour ouvrir son bilan.</p>
    <div class="tbl-wrap"><table class="tbl grp">
      <tr><th>Enfant</th><th>Classe</th><th>Dernière activité</th><th>Min (7 j)</th><th>Sons ✓</th><th>Lecture (mots/min)</th><th>À travailler</th></tr>
      ${rows.map(r => `<tr data-open="${r.k.id}"><td>${r.k.avatar} <b>${esc(r.k.name)}</b></td><td>${esc(r.k.level || '—')}</td><td>${r.lastDay ? fmtDay(r.lastDay) : '—'}</td><td>${r.min7}</td><td>${r.A.mastered.length}/${STEPS.length}</td><td>${r.lastFl ? r.lastFl.wpm : '—'}</td><td>${r.O.travail.length ? `<span class="warn">${r.O.travail.length}</span>` : '—'}</td></tr>`).join('')}
    </table></div>
    <button class="btn small ghost" data-csv>⬇️ Exporter en tableur (CSV)</button>
    <h3>Gérer les profils</h3>
    ${profilsHTML()}`;
}
function bindGroupe() {
  $$('[data-open]').forEach(r => r.onclick = () => { DB.current = r.dataset.open; save(); applySettings(); adult('bilan'); });
  $('[data-csv]').onclick = () => {
    const head = ['Enfant', 'Classe', 'Dernière activité', 'Minutes 7 jours', 'Minutes 30 jours', 'Jours actifs 30 j', 'Sons maîtrisés', 'Sons fragiles', 'Dernière lecture (mots/min)', 'Confusions', 'Mots difficiles'];
    const rows = DB.profiles.map(kidRow).map(r => [r.k.name, r.k.level || '', r.lastDay || '', r.min7, r.A.min30, r.A.days30.length, r.A.mastered.map(x => x.s.title).join(' / '),
      r.A.fragile.map(x => x.s.title).join(' / '), r.lastFl ? r.lastFl.wpm : '', r.A.conf.map(([k]) => k).join(' / '), r.A.hard.map(([w]) => w).join(' / ')]);
    const csv = '﻿' + [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `plume-suivi-${dayKey()}.csv`; a.click();
  };
  bindProfils();
}
