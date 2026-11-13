// Mes objectifs + espaces par domaine (physique, barbe, PINOX, pro, agricole, discipline).
import { S, save, today, addDays, fmtDay, fmtShort, fmtMonth, monthKey, months, monthRange, DOMAINS, MAIN_DOMAINS, LEVELS, PRIO, DAYS, PINOX_STATUS, SPORT_TAGS, num, uid, diffDays, avgWeight, lastWeight, goalProgress, rangeStats, avgField, sleepHours, published, livesDone, quarterOf, weekStart, photo, shrinkImage, dayStats, planFor, parse, dur, addMonths } from './core.js';
import { h, sheet, form, toast, card, bar, seg, empty, lineChart, icon, confirmDlg, legend } from './ui.js';
import { refresh, go, goalRow, goalForm, routineForm, taskForm, editItem, addMenu, fab, dot, sessionForm } from './common.js';

let levelFilter = 'A', pinoxFilter = 'tous', calOffset = 0;
const back = (to = '#/goals') => h('button', { class: 'icon-btn', 'aria-label': 'Retour', onclick: () => go(to) }, icon('left'));
const freq = r => (r.days || []).length === 7 ? 'Chaque jour' : [1, 2, 3, 4, 5, 6, 0].filter(d => r.days.includes(d)).map(d => DAYS[d]).join(' · ');
const list = (title, coll, items, fields, row, defaults, addLabel = 'Ajouter') => card(title,
  items.length ? items.map(x => h('button', { class: 'lrow', onclick: () => editItem(coll, title.toLowerCase(), fields, x) }, row(x))) : empty('Rien pour l\'instant.'),
  h('button', { class: 'btn ghost mt', onclick: () => editItem(coll, title.toLowerCase(), fields, null, defaults) }, addLabel));
const kv = (l, v, sub) => h('div', { class: 'kv' }, h('small', null, l), h('b', null, v), sub ? h('em', null, sub) : null);
const desc = (a, b) => a.date < b.date ? 1 : -1;

/* ---------- Mes objectifs ---------- */
export function viewGoals(tab = 'obj') {
  const body = tab === 'hab' ? habits() : tab === 'tasks' ? tasks() : goals();
  return h('div', { class: 'view' }, h('header', { class: 'top' }, h('h1', null, 'Mes objectifs')),
    seg({ obj: 'Objectifs', hab: 'Habitudes', tasks: 'Tâches' }, tab, k => go('#/goals/' + k)), body, fab(() => addMenu()));
}
function goals() {
  const gs = S.goals.filter(g => levelFilter === 'all' || g.level === levelFilter);
  const order = { A: 0, Q: 1, M: 2 };
  return h('div', null,
    h('div', { class: 'grid2' }, MAIN_DOMAINS.map(d => {
      const D = DOMAINS[d]; const ps = S.goals.filter(g => g.domain === d && g.level === 'A' && g.status !== 'paused').map(goalProgress).filter(v => v != null);
      const v = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null; const veille = d === 'agri' && !S.settings.agriActive;
      return h('button', { class: 'dom', style: { '--c': D.c }, onclick: () => go('#/domain/' + d) }, h('span', { class: 'dom-i' }, icon(D.i, 20)), h('b', null, D.n), h('small', null, veille ? 'En veille' : v == null ? '—' : num(v, 0) + ' %'), bar(veille ? 0 : v, D.c));
    })),
    seg({ all: 'Tous', A: 'Annuels', Q: 'Trimestre', M: 'Mois' }, levelFilter, k => { levelFilter = k; refresh(); }),
    gs.length ? h('section', { class: 'card' }, gs.sort((a, b) => order[a.level] - order[b.level] || (a.period || '').localeCompare(b.period || '')).map(goalRow)) : card(null, empty('Aucun objectif à ce niveau. Ajoute-en un avec +.')));
}
function habits() {
  const by = {}; S.routines.forEach(r => (by[r.domain] = by[r.domain] || []).push(r));
  return h('div', null, h('p', { class: 'hint' }, 'Habitudes quotidiennes et activités hebdomadaires. Touche une ligne pour modifier la fréquence, suspendre ou désactiver.'),
    Object.keys(by).length ? Object.entries(by).map(([d, rs]) => card(h('span', null, dot(d), (DOMAINS[d] || {}).n), rs.map(r => h('button', { class: 'lrow' + (r.active === false ? ' off' : ''), onclick: () => routineForm(r) },
      h('b', null, r.title), h('small', null, [freq(r), r.time, r.dur ? dur(+r.dur) : null, PRIO[r.priority], r.active === false ? 'désactivée' : r.pausedUntil && r.pausedUntil >= today() ? 'suspendue jusqu\'au ' + fmtShort(r.pausedUntil) : null].filter(Boolean).join(' · ')))))) : card(null, empty('Aucune habitude.')));
}
function tasks() {
  const t = today(); const up = S.tasks.filter(x => x.date >= t).sort((a, b) => a.date < b.date ? -1 : 1), past = S.tasks.filter(x => x.date < t).sort(desc).slice(0, 30);
  const row = x => { const s = S.days[x.date] && S.days[x.date].items[x.id] && S.days[x.date].items[x.id].s; return h('button', { class: 'lrow', onclick: () => taskForm(x) }, h('b', null, dot(x.domain), x.title), h('small', null, [fmtDay(x.date), PRIO[x.priority], s ? { done: 'validée', partial: 'partielle', postponed: 'reportée', missed: 'non réalisée', na: 'non applicable' }[s] : x.date < t ? 'sans réponse' : null].filter(Boolean).join(' · '))); };
  return h('div', null, card('À venir', up.length ? up.map(row) : empty('Aucune tâche à venir.')), card('Passées (30 dernières)', past.length ? past.map(row) : empty('Aucune.')));
}

/* ---------- Espace d'un domaine ---------- */
const SUBS = {
  phys: { poids: 'Poids', seances: 'Séances', nutrition: 'Nutrition', douleurs: 'Douleurs' }, barbe: { bilans: 'Bilans', produits: 'Produits', routine: 'Routine' },
  pinox: { contenus: 'Contenus', calendrier: 'Calendrier', lives: 'Lives', perf: 'Performance' }, pro: { formations: 'Formations', competences: 'Compétences', notes: 'Notes', echeances: 'Échéances' },
};
const PAGES = { phys: { poids, seances, nutrition, douleurs }, barbe: { bilans, produits, routine }, pinox: { contenus, calendrier, lives, perf }, pro: { formations, competences, notes: () => notesCard('pro'), echeances } };
export function viewDomain(d, sub) {
  const D = DOMAINS[d]; if (!D) return viewGoals();
  const subs = SUBS[d]; sub = subs ? (subs[sub] ? sub : Object.keys(subs)[0]) : null;
  const gs = S.goals.filter(g => g.domain === d);
  return h('div', { class: 'view' }, h('header', { class: 'top row' }, back(), h('h1', null, D.n)),
    subs ? seg(subs, sub, k => go(`#/domain/${d}/${k}`)) : null,
    subs ? PAGES[d][sub]() : d === 'agri' ? agri() : d === 'disc' ? disc() : null,
    card('Objectifs du domaine', gs.length ? gs.map(goalRow) : empty('Aucun objectif.'), h('button', { class: 'btn ghost mt', onclick: () => goalForm(null, { level: 'M', domain: d }) }, 'Ajouter un objectif')),
    fab(() => addMenu()));
}

/* ---------- Physique & santé ---------- */
const W_FIELDS = [{ k: 'date', label: 'Date', type: 'date' }, { k: 'kg', label: 'Poids (kg)', type: 'number', step: '0.1' }, { type: 'title', label: 'Mensurations (facultatif, cm)' }, { k: 'waist', label: 'Tour de taille', type: 'number' }, { k: 'chest', label: 'Poitrine', type: 'number' }, { k: 'arm', label: 'Bras', type: 'number' }, { k: 'thigh', label: 'Cuisse', type: 'number' }, { k: 'note', label: 'Commentaire', type: 'textarea', rows: 2 }];
function poids() {
  const t = today(), b = S.settings.body, st = S.settings; const ws = [...S.weights].filter(w => w.kg > 0).sort(desc);
  const a = avgWeight(addDays(t, -13), t), p = avgWeight(addDays(t, -27), addDays(t, -14)); const diff = a != null && p != null ? a - p : null;
  const mk = monthKey(t), mA = avgWeight(mk + '-01', t), pmk = addMonths(mk, -1), mP = avgWeight(pmk + '-01', monthRange(pmk).to);
  const total = diffDays(st.start, st.end), rate = b.startWeight && b.targetWeight ? (b.targetWeight - b.startWeight) / total * 14 : null;
  let tip = null;
  if (diff != null && rate != null) tip = diff < rate * .45 ? `Progression plus lente que le rythme visé (≈ ${num(rate, 2)} kg / 2 semaines). Piste : ajouter 100 à 150 kcal par jour, si ta digestion le tolère.` : diff > rate * 2.3 ? 'Progression plus rapide que le rythme visé : tu peux maintenir tes apports, voire les réduire légèrement.' : 'Tu es dans le rythme visé : garde tes repères actuels.';
  const x = d => diffDays(st.start, d);
  const series = [];
  if (b.startWeight && b.targetWeight) series.push({ name: 'objectif', kind: 'goal', pts: [{ x: 0, y: b.startWeight }, { x: total, y: b.targetWeight }] });
  const asc = [...ws].reverse();
  series.push({ name: 'pesée saisie', kind: 'data', pts: asc.map(w => ({ x: x(w.date), y: +w.kg, label: fmtShort(w.date) })) });
  if (asc.length >= 4) series.push({ name: 'moyenne 14 j calculée', kind: 'calc', pts: asc.map(w => ({ x: x(w.date), y: avgWeight(addDays(w.date, -13), w.date), label: fmtShort(w.date) })) });
  const ticks = months().filter((_, i) => i % 2 === 0).map(m => ({ x: x(m + '-13'), label: fmtMonth(m).slice(0, 3) }));
  return h('div', null,
    card('Suivi du poids', h('div', { class: 'kvs' }, kv('Dernière pesée', ws[0] ? num(ws[0].kg, 1) + ' kg' : '—', ws[0] ? fmtShort(ws[0].date) : 'non renseigné'), kv('Moyenne 14 j', a == null ? '—' : num(a, 2) + ' kg', 'calculé'), kv('14 j précédents', p == null ? '—' : num(p, 2) + ' kg', diff == null ? '' : (diff >= 0 ? '+' : '') + num(diff, 2) + ' kg'), kv('Objectif indicatif', b.targetWeight ? num(b.targetWeight, 1) + ' kg' : '—', b.startWeight ? 'départ ' + num(b.startWeight, 1) : '')),
      h('p', { class: 'p' }, 'Mois en cours : ', h('b', null, mA == null ? '—' : num(mA, 2) + ' kg'), ' · mois précédent : ', h('b', null, mP == null ? '—' : num(mP, 2) + ' kg'), mA != null && mP != null ? ` · évolution ${(mA - mP >= 0 ? '+' : '') + num(mA - mP, 2)} kg` : ''),
      tip ? h('p', { class: 'box' }, tip, h('br'), h('small', { class: 'muted' }, 'Piste indicative calculée sur tes moyennes ; ce n\'est pas un avis médical. '), h('button', { class: 'link inl', onclick: () => go('#/profile/nutrition') }, 'Ajuster mes repères')) : h('p', { class: 'hint' }, 'La comparaison toutes les deux semaines apparaît dès que deux périodes de 14 jours contiennent des pesées.'),
      h('button', { class: 'btn mt', onclick: () => editItem('weights', 'pesée', W_FIELDS, null, { date: t }, d => { if (!(d.kg > 0)) { toast('Indique un poids.'); return false; } }) }, 'Ajouter une pesée')),
    card('Courbe sur douze mois', lineChart({ series, unit: 'kg', xTicks: ticks }), legend()),
    card('Historique', ws.length ? ws.slice(0, 40).map(w => h('button', { class: 'lrow', onclick: () => editItem('weights', 'pesée', W_FIELDS, w) }, h('b', null, num(w.kg, 1) + ' kg'), h('small', null, [fmtDay(w.date), 'moy. 14 j : ' + num(avgWeight(addDays(w.date, -13), w.date), 2), w.waist ? 'taille ' + w.waist + ' cm' : null, w.note].filter(Boolean).join(' · ')))) : empty('Aucune pesée enregistrée.')));
}
const EX_FIELDS = [{ k: 'name', label: 'Exercice' }, { k: 'base', label: 'Repère de départ', placeholder: 'ex. 3 × 8' }, { k: 'zones', label: 'Zones sollicitées (pour la suspension en cas de douleur)', type: 'multi', options: ['lombaires', 'fessiers', 'genoux', 'epaules', 'poignets'] }, { k: 'note', label: 'Consigne / variante', type: 'textarea', rows: 2 }, { k: 'suspended', label: 'Suspension', type: 'check', hint: 'Exercice suspendu (douleur)' }];
const PHASES = [['Fondations', 'Technique propre, amplitude sans douleur, séries faciles. Installer la régularité.'], ['Volume', 'Ajouter progressivement des répétitions ou une série. Un seul paramètre à la fois.'], ['Force', 'Variantes plus exigeantes si tout est indolore (moins d\'assistance, tempo plus lent).'], ['Consolidation', 'Stabiliser les acquis, préparer le bilan annuel.']];
function seances() {
  const t = today(), q = quarterOf(t), qi = q ? +q.id[1] - 1 : 0; const sp = S.routines.filter(r => SPORT_TAGS.includes(r.tag) || r.tag === 'rest');
  const ws = weekStart(t), wk = rangeStats(ws, addDays(ws, 6));
  return h('div', null,
    card('Semaine type', sp.length ? sp.map(r => h('button', { class: 'lrow' + (r.active === false ? ' off' : ''), onclick: () => routineForm(r) }, h('b', null, r.title), h('small', null, freq(r) + (r.dur ? ' · ' + dur(+r.dur) : '')))) : empty('Aucune activité physique configurée.'),
      h('p', { class: 'hint' }, `Cette semaine : ${wk.done.strength || 0} renforcement, ${(wk.done.light || 0) + (wk.done.recovery || 0)} mobilité / récupération validés. Jamais deux séances intenses de suite ; le repos fait partie du programme.`)),
    card('Phase actuelle — ' + PHASES[qi][0], h('p', { class: 'p' }, PHASES[qi][1]), h('p', { class: 'hint' }, 'Progression : ' + PHASES.map((p, i) => `T${i + 1} ${p[0]}`).join(' → ') + '. Repères généraux à adapter à ta forme du jour.')),
    card('Exercices', S.exercises.length ? S.exercises.map(e => h('button', { class: 'lrow' + (e.suspended ? ' off' : ''), onclick: () => editItem('exercises', 'exercice', EX_FIELDS, e) }, h('b', null, e.name, e.suspended ? ' — suspendu' : ''), h('small', null, [e.base, e.note].filter(Boolean).join(' · ')))) : empty('Aucun exercice.'),
      h('div', { class: 'row gap mt' }, h('button', { class: 'btn ghost grow', onclick: () => editItem('exercises', 'exercice', EX_FIELDS, null, { zones: [] }) }, 'Ajouter'), h('button', { class: 'btn grow', onclick: () => sessionForm(t) }, 'Noter ma séance du jour'))),
    card('Dernières séances', S.sessions.length ? [...S.sessions].sort(desc).slice(0, 8).map(x => h('button', { class: 'lrow', onclick: () => sessionForm(x.date) }, h('b', null, fmtDay(x.date), x.feel ? ` · ressenti ${x.feel}/5` : ''), h('small', null, Object.entries(x.entries || {}).filter(([, v]) => v).map(([id, v]) => `${(S.exercises.find(e => e.id === id) || {}).name || '?'} ${v}`).join(' · ') || x.note || '—'))) : empty('Aucune séance notée.')));
}
function nutrition() {
  const t = today(), f = addDays(t, -13), n = S.settings.nutri, bd = S.settings.budget;
  const pr = avgField(f, t, r => r.prot), kc = avgField(f, t, r => r.kcal), wa = avgField(f, t, r => r.water), dg = avgField(f, t, r => r.dig);
  const mk = monthKey(t), sp = avgField(mk + '-01', t, r => r.spend); const fast = rangeStats(f, t, i => i.tag === 'fast');
  return h('div', null, card('Moyennes sur 14 jours (jours renseignés uniquement)', h('div', { class: 'kvs' },
    kv('Protéines', pr ? num(pr.avg, 0) + ' g' : '—', pr ? `${pr.n} j saisis` + (n.protMin ? ` · repère ${n.protMin}–${n.protMax}` : '') : 'non renseigné'),
    kv('Énergie', kc ? num(kc.avg, 0) + ' kcal' : '—', kc ? `${kc.n} j saisis` + (n.kcalMin ? ` · repère ${n.kcalMin}–${n.kcalMax}` : '') : 'non renseigné'),
    kv('Hydratation', wa ? num(wa.avg / 1000, 2) + ' L' : '—', wa ? `${wa.n} j saisis` : 'non renseigné'),
    kv('Tolérance digestive', dg ? ['', 'Bonne', 'Moyenne', 'Difficile'][Math.round(dg.avg)] : '—', dg ? `${dg.n} j saisis` : 'non renseigné'),
    kv('Jeûnes validés', fast.done.fast || 0, '14 derniers jours'),
    kv('Dépenses alim. du mois', sp ? num(sp.sum, 0) + ' ' + bd.currency : '—', sp ? `moy. ${num(sp.avg, 0)}/jour saisi · budget ${num(bd.food, 0)}` : 'non renseigné')),
    h('p', { class: 'hint' }, 'La saisie se fait dans Mon quotidien › Suivi. Les repères sont indicatifs et modifiables ; ils ne constituent pas une prescription médicale. Adapte les aliments à ta tolérance personnelle.'),
    h('button', { class: 'btn ghost', onclick: () => go(`#/day/${t}/suivi`) }, 'Saisir aujourd\'hui')));
}
function douleurs() {
  const t = today(), rows = []; for (let i = 0; i < 90; i++) { const d = addDays(t, -i), r = S.days[d]; (r && r.pain || []).forEach(p => rows.push({ d, ...p })); }
  const susp = S.exercises.filter(e => e.suspended);
  return h('div', null,
    card('Exercices suspendus', susp.length ? susp.map(e => h('div', { class: 'pend' }, h('span', null, e.name, e.suspendedOn ? h('small', { class: 'muted' }, ' · depuis le ' + fmtShort(e.suspendedOn)) : null), h('button', { class: 'btn sm ghost', onclick: async () => { if (!await confirmDlg(`Réactiver « ${e.name} » ? Reprends progressivement et seulement sans douleur.`, 'Réactiver')) return; e.suspended = false; await save('exercises'); refresh(); } }, 'Réactiver'))) : empty('Aucun exercice suspendu.')),
    card('Douleurs signalées (90 jours)', rows.length ? rows.map(p => h('div', { class: 'lrow' }, h('b', null, `${p.zone} · ${p.level}/10`), h('small', null, fmtDay(p.d) + (p.note ? ' · ' + p.note : '')))) : empty('Aucune douleur signalée.'),
      h('button', { class: 'btn ghost mt', onclick: () => go(`#/day/${t}/suivi`) }, 'Signaler une douleur aujourd\'hui'),
      h('p', { class: 'hint' }, 'Aucun mouvement douloureux n\'est à réaliser. En cas de douleur persistante, consulte un professionnel de santé.')));
}

/* ---------- Barbe & soins ---------- */
const B_FIELDS = [{ k: 'date', label: 'Date', type: 'date' }, { k: 'density', label: 'Densité', type: 'scale' }, { k: 'pigment', label: 'Pigmentation', type: 'scale' }, { k: 'link', label: 'Connexion moustache-menton', type: 'scale' }, { k: 'skin', label: 'État de la peau', type: 'scale' }, { k: 'note', label: 'Commentaire', type: 'textarea', rows: 2 }];
function beardSheet(entry) {
  const isNew = !entry; const val = entry || { id: uid(), date: today() }; let img = null;
  sheet(isNew ? 'Nouveau bilan barbe' : 'Bilan du ' + fmtShort(val.date), close => {
    const prev = h('img', { class: 'photo', alt: 'Photo du bilan', hidden: true });
    if (val.hasPhoto) photo.get(val.id).then(d => { if (d) { prev.src = d; prev.hidden = false; } });
    const file = h('input', { type: 'file', accept: 'image/*', class: 'in', onchange: async e => { const f = e.target.files[0]; if (!f) return; try { img = await shrinkImage(f); prev.src = img; prev.hidden = false; } catch (er) { toast('Photo illisible.'); } } });
    return h('div', null, h('div', { class: 'field' }, h('label', null, 'Photo (même lumière, même angle si possible)'), file, prev, h('small', { class: 'hint' }, 'La photo est réduite puis conservée uniquement sur cet appareil.')),
      form(B_FIELDS, val, {
        onSave: async d => { if (img) { await photo.set(d.id, img); d.hasPhoto = true; } const i = S.beard.findIndex(x => x.id === d.id); i < 0 ? S.beard.push(d) : S.beard[i] = d; await save('beard'); close(); refresh(); toast('Bilan enregistré.'); },
        onDelete: isNew ? null : async () => { if (!await confirmDlg('Supprimer ce bilan et sa photo ?', 'Supprimer', true)) return; await photo.del(val.id); S.beard = S.beard.filter(x => x.id !== val.id); await save('beard'); close(); refresh(); },
      }));
  });
}
function bilans() {
  const es = [...S.beard].sort(desc); const withP = es.filter(e => e.hasPhoto);
  const thumb = e => { const im = h('img', { class: 'thumb', alt: 'Photo du ' + fmtShort(e.date) }); photo.get(e.id).then(d => d && (im.src = d)); return h('figure', null, im, h('figcaption', null, fmtShort(e.date))); };
  return h('div', null,
    card('Suivi mensuel', h('p', { class: 'hint' }, 'Notes de 1 à 5 selon ta propre observation. Aucune croissance n\'est garantie : l\'objectif est de suivre l\'évolution naturelle et de prendre soin de la peau.'),
      withP.length >= 2 ? h('div', { class: 'cmp' }, thumb(withP[withP.length - 1]), thumb(withP[0])) : null,
      es.length ? h('div', { class: 'tbl' }, h('table', null, h('tr', null, ['Date', 'Densité', 'Pigm.', 'Connex.', 'Peau'].map(x => h('th', null, x))), es.map(e => h('tr', { onclick: () => beardSheet(e) }, h('td', null, fmtShort(e.date) + (e.hasPhoto ? ' 📷' : '')), ['density', 'pigment', 'link', 'skin'].map(k => h('td', null, e[k] || '—')))))) : empty('Aucun bilan enregistré.'),
      h('button', { class: 'btn mt', onclick: () => beardSheet(null) }, 'Nouveau bilan (photo + notes)')));
}
const P_FIELDS = [{ k: 'date', label: 'Date', type: 'date' }, { k: 'name', label: 'Produit' }, { k: 'kind', label: 'Type', type: 'select', options: { nettoyant: 'Nettoyant doux', hydratant: 'Hydratant', solaire: 'Protection solaire', huile: 'Huile / baume (cosmétique)', autre: 'Autre' } }, { k: 'price', label: 'Prix', type: 'number' }, { k: 'tol', label: 'Tolérance de la peau', type: 'select', options: { '': '—', bonne: 'Bonne', moyenne: 'Moyenne', mauvaise: 'Mauvaise (à arrêter)' } }, { k: 'note', label: 'Observations', type: 'textarea', rows: 2 }];
function produits() {
  const mk = monthKey(today()), bd = S.settings.budget; const spent = S.products.filter(p => p.date && monthKey(p.date) === mk).reduce((a, p) => a + (+p.price || 0), 0);
  return h('div', null, bd.care ? card('Budget soins du mois', h('div', { class: 'row between' }, h('b', null, `${num(spent, 0)} / ${num(bd.care, 0)} ${bd.currency}`), h('small', { class: 'muted' }, 'calculé sur le journal')), bar(spent / bd.care * 100, 'var(--gold)')) : null,
    list('Journal des produits', 'products', [...S.products].sort(desc), P_FIELDS, p => [h('b', null, p.name || 'Produit'), h('small', null, [p.date ? fmtShort(p.date) : null, p.price ? num(p.price, 0) + ' ' + bd.currency : null, p.tol ? 'tolérance ' + p.tol : null].filter(Boolean).join(' · '))], { date: today(), kind: 'hydratant' }));
}
function routine() {
  return card('Routine simple', h('ol', { class: 'ol' }, h('li', null, h('b', null, 'Nettoyage doux'), ' matin et soir, sans frotter.'), h('li', null, h('b', null, 'Hydratation'), ' avec un produit bien toléré par ta peau.'), h('li', null, h('b', null, 'Protection solaire'), ' le matin.'), h('li', null, h('b', null, 'Entretien'), ' : laisser pousser, égaliser légèrement les contours si besoin.')),
    h('p', { class: 'box' }, 'Les huiles et baumes sont des cosmétiques : ils améliorent l\'aspect et le confort du poil et de la peau, mais leur efficacité sur la pousse de la barbe n\'est pas prouvée. La densité dépend surtout de la génétique et de l\'âge. Aucune croissance n\'est promise ici.'),
    h('p', { class: 'hint' }, 'Tout nouveau produit : essai sur une petite zone, puis note ta tolérance dans le journal.'));
}

/* ---------- PINOX ---------- */
const C_FIELDS = () => [{ k: 'title', label: 'Titre / idée' }, { k: 'status', label: 'Statut', type: 'select', options: Object.fromEntries(PINOX_STATUS.map(s => [s, s[0].toUpperCase() + s.slice(1)])) },
{ k: 'theme', label: 'Ligne éditoriale', type: 'select', options: { gaming: 'Gaming', decryptage: 'Décryptage de l\'actualité' } }, { k: 'topic', label: 'Thématique', placeholder: 'jeu, économie, société, histoire…' },
{ k: 'type', label: 'Type de contenu', type: 'select', options: { video: 'Vidéo courte', carrousel: 'Carrousel', extrait: 'Extrait de live', story: 'Story', autre: 'Autre' } }, { k: 'platforms', label: 'Plateformes', type: 'multi', options: ['TikTok', 'Instagram', 'YouTube Shorts'] },
{ k: 'planned', label: 'Date prévue de publication', type: 'date' }, { k: 'published', label: 'Date de publication réelle', type: 'date' }, { k: 'link', label: 'Lien du contenu publié', type: 'url' },
{ type: 'title', label: 'Statistiques (à saisir)' }, { k: 'views', label: 'Vues', type: 'number' }, { k: 'comments', label: 'Commentaires', type: 'number' }, { k: 'shares', label: 'Partages', type: 'number' }, { k: 'subs', label: 'Abonnés gagnés', type: 'number' }, { k: 'note', label: 'Notes', type: 'textarea', rows: 2 }];
const cAfter = d => { if (!d.title || !d.title.trim()) { toast('Donne un titre.'); return false; } if (d.status === 'publié' && !d.published) d.published = d.planned && d.planned <= today() ? d.planned : today(); };
const cEdit = (c, def) => editItem('contents', 'contenu PINOX', C_FIELDS(), c, { status: 'idée', theme: 'gaming', type: 'video', platforms: ['TikTok', 'Instagram', 'YouTube Shorts'], ...def }, cAfter);
function contenus() {
  const all = S.contents, cs = all.filter(c => pinoxFilter === 'tous' || c.status === pinoxFilter).sort((a, b) => (a.planned || '9') < (b.planned || '9') ? -1 : 1);
  const act = all.filter(c => c.status !== 'idée'); const g = act.filter(c => c.theme === 'gaming').length; const tg = S.settings.pinox.gaming;
  const next = async c => { const i = PINOX_STATUS.indexOf(c.status); if (i < PINOX_STATUS.length - 1) { c.status = PINOX_STATUS[i + 1]; cAfter(c); await save('contents'); refresh(); } };
  return h('div', null,
    card('Ligne éditoriale', h('div', { class: 'row between' }, h('span', null, 'Gaming (hors banque d\'idées)'), h('b', null, act.length ? num(g / act.length * 100, 0) + ' %' : '—')), bar(act.length ? g / act.length * 100 : 0, DOMAINS.pinox.c), h('p', { class: 'hint' }, `Cible : ${tg} % gaming · ${100 - tg} % décryptage de l'actualité (modifiable dans Profil). « Comprendre les faits pour mieux interpréter la réalité. »`)),
    h('div', { class: 'chips scroll' }, ['tous', ...PINOX_STATUS].map(s => h('button', { class: 'chip' + (pinoxFilter === s ? ' on' : ''), onclick: () => { pinoxFilter = s; refresh(); } }, `${s === 'idée' ? 'banque d\'idées' : s} ${s === 'tous' ? all.length : all.filter(c => c.status === s).length}`))),
    card(null, cs.length ? cs.map(c => h('div', { class: 'crow' }, h('button', { class: 'lrow grow', onclick: () => cEdit(c) }, h('b', null, c.title), h('small', null, [c.status, c.theme === 'gaming' ? 'gaming' : 'décryptage', c.planned ? 'prévu ' + fmtShort(c.planned) : null, c.views != null ? num(c.views, 0) + ' vues' : null].filter(Boolean).join(' · '))),
      c.status !== 'publié' ? h('button', { class: 'btn sm ghost', 'aria-label': 'Étape suivante', onclick: () => next(c) }, '→ ' + PINOX_STATUS[PINOX_STATUS.indexOf(c.status) + 1]) : c.link ? h('a', { class: 'btn sm ghost', href: c.link, target: '_blank', rel: 'noopener' }, 'Voir') : null)) : empty('Aucun contenu ici.'),
      h('div', { class: 'row gap mt' }, h('button', { class: 'btn ghost grow', onclick: () => cEdit(null, { status: 'idée' }) }, 'Nouvelle idée'), h('button', { class: 'btn grow', onclick: () => cEdit(null, { status: 'recherche', planned: today() }) }, 'Nouveau contenu'))));
}
function calendrier() {
  const ws = addDays(weekStart(today()), calOffset * 7);
  return card(h('div', { class: 'row between' }, h('button', { class: 'icon-btn', 'aria-label': 'Semaine précédente', onclick: () => { calOffset--; refresh(); } }, icon('left')), h('span', null, 'Semaine du ' + fmtShort(ws)), h('button', { class: 'icon-btn', 'aria-label': 'Semaine suivante', onclick: () => { calOffset++; refresh(); } }, icon('right'))),
    [0, 1, 2, 3, 4, 5, 6].map(i => { const d = addDays(ws, i); const rt = planFor(d).filter(x => x.d === 'pinox' && x.k === 'r'); const cs = S.contents.filter(c => (c.published || c.planned) === d); const ls = S.lives.filter(l => l.date === d);
      return h('div', { class: 'cal' + (d === today() ? ' now' : '') }, h('div', { class: 'row between' }, h('b', null, fmtDay(d)), h('button', { class: 'link', onclick: () => cEdit(null, { status: 'script', planned: d }) }, '+ contenu')),
        rt.map(x => h('small', { class: 'muted' }, '↻ ' + x.t)), cs.map(c => h('button', { class: 'pill', onclick: () => cEdit(c) }, `${c.status === 'publié' ? '✓' : '•'} ${c.title} (${c.status})`)), ls.map(l => h('span', { class: 'pill live' }, '🎮 Live : ' + (l.title || l.game || 'à définir'))),
        !cs.length && !ls.length ? h('small', { class: 'warn-t' }, d >= today() ? 'Aucune publication prévue' : '') : null); }),
    h('p', { class: 'hint' }, 'Publier chaque jour ne veut pas dire produire chaque jour : prépare en lot, programme à l\'avance.'));
}
const L_FIELDS = [{ k: 'date', label: 'Date', type: 'date' }, { k: 'title', label: 'Titre du live' }, { k: 'game', label: 'Jeu' }, { k: 'guests', label: 'Invités / participants', placeholder: 'noms séparés par des virgules' }, { k: 'done', label: 'Réalisation', type: 'check', hint: 'Live réalisé' }, { k: 'viewers', label: 'Spectateurs (pic ou moyenne)', type: 'number' }, { k: 'subs', label: 'Abonnés gagnés', type: 'number' }, { k: 'note', label: 'Bilan / notes', type: 'textarea', rows: 2 }];
function lives() {
  const nextSat = addDays(today(), (6 - new Date().getDay() + 7) % 7);
  return h('div', null, list('Lives gaming', 'lives', [...S.lives].sort(desc), L_FIELDS, l => [h('b', null, (l.done ? '✓ ' : '') + (l.title || l.game || 'Live')), h('small', null, [fmtDay(l.date), l.guests ? 'avec ' + l.guests : null, l.viewers != null ? l.viewers + ' spectateurs' : null, l.done ? null : l.date < today() ? 'non confirmé' : 'prévu'].filter(Boolean).join(' · '))], { date: nextSat }, 'Planifier un live'),
    list('Invités', 'guests', S.guests, [{ k: 'name', label: 'Nom / pseudo' }, { k: 'contact', label: 'Contact' }, { k: 'note', label: 'Notes', type: 'textarea', rows: 2 }], g => [h('b', null, g.name || '—'), h('small', null, [g.contact, g.note].filter(Boolean).join(' · '))], {}));
}
function perf() {
  const sum = (a, k) => { const v = a.filter(c => c[k] != null); return v.length ? v.reduce((x, c) => x + +c[k], 0) : null; };
  const rows = months().filter(m => m <= monthKey(today())).reverse().map(m => { const r = monthRange(m), p = published(r.from, r.to), l = livesDone(r.from, r.to); return h('tr', null, h('td', null, fmtMonth(m).replace(/ (\d\d)(\d\d)$/, ' $2')), h('td', null, p.length), h('td', null, num(sum(p, 'views'), 0)), h('td', null, num(sum(p, 'comments'), 0)), h('td', null, num(sum(p, 'shares'), 0)), h('td', null, num((sum(p, 'subs') || 0) + (sum(l, 'subs') || 0) || null, 0)), h('td', null, l.length)); });
  const top = S.contents.filter(c => c.views != null).sort((a, b) => b.views - a.views).slice(0, 5);
  return h('div', null, card('Tableau de performance mensuel', h('div', { class: 'tbl' }, h('table', null, h('tr', null, ['Mois', 'Publ.', 'Vues', 'Com.', 'Part.', 'Abo.', 'Lives'].map(x => h('th', null, x))), rows)), h('p', { class: 'hint' }, 'Totaux calculés à partir des statistiques que tu saisis sur chaque contenu. « — » = non renseigné.')),
    card('Meilleurs contenus (vues saisies)', top.length ? top.map(c => h('button', { class: 'lrow', onclick: () => cEdit(c) }, h('b', null, c.title), h('small', null, `${num(c.views, 0)} vues · ${c.theme}`))) : empty('Aucune statistique saisie.')));
}

/* ---------- Travail & études ---------- */
function formations() { return list('Formations', 'trainings', S.trainings, [{ k: 'title', label: 'Formation / cours' }, { k: 'org', label: 'Organisme' }, { k: 'status', label: 'État', type: 'select', options: { todo: 'À venir', doing: 'En cours', done: 'Terminée' } }, { k: 'progress', label: 'Avancement', type: 'range' }, { k: 'start', label: 'Début', type: 'date' }, { k: 'end', label: 'Fin / échéance', type: 'date' }, { k: 'note', label: 'Notes', type: 'textarea', rows: 2 }],
  x => [h('b', null, x.title || '—'), h('small', null, [{ todo: 'à venir', doing: 'en cours', done: 'terminée' }[x.status], (x.progress || 0) + ' %', x.end ? 'échéance ' + fmtShort(x.end) : null].filter(Boolean).join(' · ')), bar(x.progress || 0, DOMAINS.pro.c)], { status: 'doing', progress: 0 }); }
function competences() { return list('Compétences acquises', 'skills', [...S.skills].sort(desc), [{ k: 'name', label: 'Compétence' }, { k: 'level', label: 'Niveau (1 à 5)', type: 'scale' }, { k: 'date', label: 'Date', type: 'date' }, { k: 'note', label: 'Preuve / contexte', type: 'textarea', rows: 2 }], x => [h('b', null, x.name || '—'), h('small', null, [x.level ? 'niveau ' + x.level + '/5' : null, x.date ? fmtShort(x.date) : null, x.note].filter(Boolean).join(' · '))], { date: today() }); }
function notesCard(dom, title = 'Notes et observations') { return list(title, 'notes', S.notes.filter(n => n.domain === dom).sort(desc), [{ k: 'date', label: 'Date', type: 'date' }, { k: 'text', label: 'Note', type: 'textarea', rows: 4 }], x => [h('b', null, fmtShort(x.date)), h('small', null, x.text || '')], { date: today(), domain: dom }); }
function echeances() {
  const t = today(); const ts = S.tasks.filter(x => x.domain === 'pro' && x.date >= t).sort((a, b) => a.date < b.date ? -1 : 1);
  return card('Jalons et échéances', h('p', { class: 'hint' }, 'Aucune date d\'examen ou de certification n\'est préremplie : ajoute les tiennes.'), ts.length ? ts.map(x => h('button', { class: 'lrow', onclick: () => taskForm(x) }, h('b', null, x.title), h('small', null, `${fmtDay(x.date)} · dans ${diffDays(t, x.date)} j`))) : empty('Aucune échéance à venir.'),
    h('button', { class: 'btn ghost mt', onclick: () => taskForm(null, { domain: 'pro', priority: 'E' }) }, 'Ajouter une échéance'));
}

/* ---------- Projet agricole (en veille) ---------- */
const AG = { recherche: 'Recherches', formation: 'Formations', etude: 'Études de faisabilité', budget: 'Budget', invest: 'Investissements', etape: 'Étapes du projet', doc: 'Documents', decision: 'Décisions', date: 'Dates importantes' };
function agri() {
  const on = S.settings.agriActive; const f = [{ k: 'cat', label: 'Rubrique', type: 'select', options: AG }, { k: 'title', label: 'Intitulé' }, { k: 'date', label: 'Date', type: 'date' }, { k: 'amount', label: 'Montant (facultatif)', type: 'number' }, { k: 'note', label: 'Détails / lien / référence', type: 'textarea', rows: 3 }];
  return h('div', null, card(null, h('p', { class: 'box' }, on ? 'Projet marqué comme actif. Aucune tâche n\'est créée automatiquement : c\'est toi qui ajoutes tes actions.' : 'Projet en veille. Aucun créneau ni aucune tâche n\'est programmé. Cet espace sert à conserver tes idées et documents en attendant ta décision.'),
    h('button', { class: 'btn ghost', onclick: async () => { S.settings.agriActive = !on; await save('settings'); refresh(); } }, on ? 'Remettre le projet en veille' : 'Je décide de réactiver le projet')),
    Object.entries(AG).map(([k, n]) => { const it = S.agri.filter(x => x.cat === k).sort(desc); return it.length ? card(n, it.map(x => h('button', { class: 'lrow', onclick: () => editItem('agri', 'élément du projet', f, x) }, h('b', null, x.title || '—'), h('small', null, [x.date ? fmtShort(x.date) : null, x.amount ? num(x.amount, 0) + ' ' + S.settings.budget.currency : null, x.note].filter(Boolean).join(' · '))))) : null; }),
    card(null, S.agri.length ? null : empty('Espace vide pour l\'instant.'), h('button', { class: 'btn ghost', onclick: () => editItem('agri', 'élément du projet', f, null, { cat: 'recherche', date: today() }) }, 'Ajouter un élément')));
}

/* ---------- Discipline ---------- */
function disc() {
  const t = today(), f = addDays(t, -29), st = rangeStats(f, t); const span = Math.min(30, Math.max(1, diffDays(S.settings.start, t) + 1));
  const sl = avgField(f, t, r => sleepHours(r.sleep)), sq = avgField(f, t, r => r.sleep && r.sleep.q), mo = avgField(f, t, r => r.cp && r.cp.motiv), en = avgField(f, t, r => r.cp && r.cp.energy);
  const hab = S.routines.filter(r => r.active !== false).map(r => ({ r, s: rangeStats(f, t, i => i.id === r.id) })).filter(x => x.s.total > 0).sort((a, b) => b.s.rate - a.s.rate);
  const jr = []; for (let i = 0; i < 60 && jr.length < 12; i++) { const d = addDays(t, -i), c = S.days[d] && S.days[d].cp; if (c) [['success', 'Réussite'], ['difficulty', 'Difficulté'], ['improve', 'À améliorer']].forEach(([k, l]) => c[k] && jr.push({ d, l, v: c[k] })); }
  return h('div', null,
    card('30 derniers jours', h('div', { class: 'kvs' }, kv('Régularité', `${st.cps} / ${span}`, 'checkpoints terminés'), kv('Réalisation', st.rate == null ? '—' : num(st.rate, 0) + ' %', `${st.tracked} j suivis`), kv('Sommeil moyen', sl ? num(sl.avg, 1) + ' h' : '—', sl ? `${sl.n} nuits notées` : 'non renseigné'), kv('Qualité du sommeil', sq ? num(sq.avg, 1) + ' / 5' : '—', ''), kv('Motivation', mo ? num(mo.avg, 1) + ' / 5' : '—', ''), kv('Énergie', en ? num(en.avg, 1) + ' / 5' : '—', ''))),
    card('Habitudes (jours suivis)', hab.length ? hab.map(x => h('div', { class: 'mini' }, h('span', null, dot(x.r.domain), x.r.title), h('em', null, num(x.s.rate, 0) + ' %'), bar(x.s.rate, (DOMAINS[x.r.domain] || {}).c))) : empty('Pas encore de données saisies.')),
    card('Réussites, difficultés, pistes', jr.length ? jr.map(x => h('div', { class: 'lrow' }, h('b', null, x.l + ' · ' + fmtShort(x.d)), h('small', null, x.v))) : empty('Renseignées dans le checkpoint du jour.')),
    notesCard('disc', 'Leçons apprises'));
}
