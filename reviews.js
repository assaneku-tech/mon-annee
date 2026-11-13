// Mes bilans : hebdomadaire, mensuel, trimestriel, annuel + graphiques.
import { S, save, today, addDays, fmtDay, fmtShort, fmtMonth, monthKey, months, monthRange, addMonths, weekStart, quarters, quarterOf, DOMAINS, MAIN_DOMAINS, SPORT_TAGS, num, diffDays, avgWeight, rangeStats, avgField, sleepHours, published, livesDone, goalProgress, sportCount, LEVELS } from './core.js';
import { h, toast, card, bar, seg, empty, lineChart, barChart, legend, icon } from './ui.js';
import { refresh, go, goalForm, goalRow, dot } from './common.js';

export const reviewId = (type, d) => type === 'W' ? 'W:' + weekStart(d) : type === 'M' ? 'M:' + monthKey(d) : type === 'Q' ? (quarterOf(d) || quarters()[0]).id : 'A';
let gPeriod = '90', gDom = 'all', gHab = '';
const kv = (l, v, sub) => h('div', { class: 'kv' }, h('small', null, l), h('b', null, v), sub ? h('em', null, sub) : null);
const pct = v => v == null ? '—' : num(v, 0) + ' %';
const sum = (a, k) => { const v = a.filter(c => c[k] != null && c[k] !== ''); return v.length ? v.reduce((x, c) => x + +c[k], 0) : null; };
const sign = v => (v >= 0 ? '+' : '') + num(v, 2);

function reviewForm(id, fields, extra) {
  const cur = S.reviews.find(r => r.id === id) || { id, f: {} }; const f = { ...cur.f };
  return card('Mes notes', fields.map(([k, l, rows]) => h('div', { class: 'field' }, h('label', null, l), h('textarea', { class: 'in', rows: rows || 2, oninput: e => f[k] = e.target.value }, f[k] || ''))), extra,
    h('button', { class: 'btn big mt', onclick: async () => { const r = { id, f, savedAt: new Date().toISOString() }; const i = S.reviews.findIndex(x => x.id === id); i < 0 ? S.reviews.push(r) : S.reviews[i] = r; await save('reviews'); toast('Bilan enregistré.'); refresh(); } }, cur.savedAt ? 'Mettre à jour le bilan ✓' : 'Enregistrer le bilan'),
    cur.savedAt ? h('p', { class: 'hint center' }, 'Enregistré le ' + fmtDay(cur.savedAt.slice(0, 10))) : null);
}
const pager = (label, prev, next, sub) => h('div', { class: 'datenav' }, h('button', { class: 'icon-btn', 'aria-label': 'Précédent', disabled: !prev, onclick: () => prev && go(prev) }, icon('left')), h('div', { class: 'date-b' }, h('b', null, label), sub ? h('small', null, sub) : null), h('button', { class: 'icon-btn', 'aria-label': 'Suivant', disabled: !next, onclick: () => next && go(next) }, icon('right')));
const domRates = (from, to) => card('Réalisation par domaine', Object.keys(DOMAINS).map(d => { const s = rangeStats(from, to, i => i.d === d); return s.total ? h('div', { class: 'mini' }, h('span', null, dot(d), DOMAINS[d].n), h('em', null, pct(s.rate)), bar(s.rate, DOMAINS[d].c)) : null; }), h('p', { class: 'hint' }, 'Calculé sur les jours suivis uniquement (validé = 1, partiel = 0,5 ; reporté et non applicable exclus).'));

export function viewReviews(type = 'W', key) {
  const body = { W: weekly, M: monthly, Q: quarterly, A: annual, G: charts }[type] || weekly;
  return h('div', { class: 'view' }, h('header', { class: 'top' }, h('h1', null, 'Mes bilans')),
    seg({ W: 'Semaine', M: 'Mois', Q: 'Trimestre', A: 'Année', G: 'Graphiques' }, type, k => go('#/reviews/' + k)), body(key));
}

function weekly(key) {
  const t = today(), ws = /^\d{4}-\d\d-\d\d$/.test(key || '') ? weekStart(key) : weekStart(t), we = addDays(ws, 6);
  const st = rangeStats(ws, we), a = avgWeight(ws, we), p = avgWeight(addDays(ws, -7), addDays(ws, -1)); const pubs = published(ws, we), lv = livesDone(ws, we);
  let study = 0, diffs = []; for (let i = 0; i < 7; i++) { const c = S.days[addDays(ws, i)] && S.days[addDays(ws, i)].cp; if (c) { if (c.a && (c.a.q5 === 'done' || c.a.q5 === 'partial')) study++; if (c.difficulty) diffs.push(fmtShort(addDays(ws, i)) + ' : ' + c.difficulty); } }
  return h('div', null, pager('Semaine du ' + fmtShort(ws), `#/reviews/W/${addDays(ws, -7)}`, ws < weekStart(t) ? `#/reviews/W/${addDays(ws, 7)}` : null, 'au ' + fmtShort(we)),
    card('Chiffres de la semaine', h('div', { class: 'kvs' }, kv('Jours suivis', `${st.tracked} / 7`), kv('Taux de réalisation', pct(st.rate)), kv('Renforcement', st.done.strength || 0, 'séances validées'), kv('Mobilité / récup.', (st.done.light || 0) + (st.done.recovery || 0), 'validées'),
      kv('Poids moyen', a == null ? '—' : num(a, 2) + ' kg', a == null ? 'non renseigné' : p == null ? 'pas de comparaison' : sign(a - p) + ' kg vs sem. préc.'), kv('Publications PINOX', pubs.length, 'publiées'), kv('Live', lv.length ? 'Réalisé' : 'Non renseigné', lv.length ? lv.map(l => l.title || l.game).filter(Boolean).join(', ') : ''), kv('Études / travail', `${study} j`, 'progression notée au checkpoint'))),
    diffs.length ? card('Difficultés notées dans la semaine', diffs.map(d => h('p', { class: 'p sm' }, d))) : null,
    reviewForm('W:' + ws, [['courses', 'Cours et formations suivis'], ['diff', 'Difficultés rencontrées'], ['p1', 'Priorité n° 1 de la semaine suivante', 1], ['p2', 'Priorité n° 2', 1], ['p3', 'Priorité n° 3', 1]]));
}

function monthly(key) {
  const t = today(), ms = months(); let mk = ms.includes(key) ? key : monthKey(t); if (!ms.includes(mk)) mk = mk < ms[0] ? ms[0] : ms[ms.length - 1];
  const r = monthRange(mk), st = rangeStats(r.from, r.to), pm = addMonths(mk, -1), pr = monthRange(pm), bd = S.settings.budget;
  const a = avgWeight(r.from, r.to), p = avgWeight(pr.from, pr.to); const pubs = published(r.from, r.to), lv = livesDone(r.from, r.to);
  const beard = S.beard.filter(b => monthKey(b.date) === mk).sort((x, y) => x.date < y.date ? 1 : -1)[0];
  const sp = avgField(r.from, r.to, x => x.spend); const over = sp ? (() => { let n = 0; for (let d = r.from; d <= r.to; d = addDays(d, 1)) { const x = S.days[d]; if (x && x.spend != null && bd.food && x.spend > bd.food && (!bd.foodFrom || d >= bd.foodFrom)) n++; } return n; })() : 0;
  const care = S.products.filter(x => x.date && monthKey(x.date) === mk).reduce((s, x) => s + (+x.price || 0), 0);
  const gs = S.goals.filter(g => g.level === 'M' && g.period === mk); const f0 = r.from < S.settings.start ? S.settings.start : r.from, t1 = r.to > S.settings.end ? S.settings.end : r.to; const elapsed = Math.max(0, Math.min(diffDays(f0, t) + 1, diffDays(f0, t1) + 1));
  const i = ms.indexOf(mk);
  return h('div', null, pager(fmtMonth(mk), i > 0 ? '#/reviews/M/' + ms[i - 1] : null, i < ms.length - 1 && ms[i + 1] <= monthKey(t) ? '#/reviews/M/' + ms[i + 1] : null),
    card('Vue d\'ensemble', h('div', { class: 'kvs' }, kv('Régularité', `${st.cps} / ${elapsed}`, 'checkpoints terminés'), kv('Réalisation', pct(st.rate), `${st.tracked} j suivis`), kv('Sport', sportCount(st), 'séances validées'),
      kv('Poids moyen', a == null ? '—' : num(a, 2) + ' kg', a == null ? 'non renseigné' : p == null ? 'pas de mois précédent' : sign(a - p) + ' kg vs mois préc.'),
      kv('Barbe', beard ? `D ${beard.density || '—'} · P ${beard.pigment || '—'} · C ${beard.link || '—'}` : '—', beard ? 'bilan du ' + fmtShort(beard.date) : 'pas de bilan ce mois'),
      kv('PINOX', `${pubs.length} publ.`, `${num(sum(pubs, 'views'), 0)} vues · ${lv.length} live(s)`),
      kv('Budget alimentaire', sp ? num(sp.sum, 0) + ' ' + bd.currency : '—', sp ? `${sp.n} j saisis · moy. ${num(sp.avg, 0)}` + (bd.food ? ` · ${over} j au-dessus de ${num(bd.food, 0)}` : '') : 'non renseigné'),
      kv('Budget soins', num(care, 0) + ' ' + bd.currency, bd.care ? 'sur ' + num(bd.care, 0) : 'journal des produits'))),
    card('Objectifs du mois', gs.length ? gs.map(goalRow) : empty('Aucun objectif défini pour ce mois.')), domRates(r.from, r.to),
    reviewForm('M:' + mk, [...MAIN_DOMAINS.map(d => ['d_' + d, 'Bilan — ' + DOMAINS[d].n]), ['wins', 'Principales réussites'], ['late', 'Retards et difficultés'], ['adjust', 'Ajustements pour le mois suivant', 3]],
      h('button', { class: 'btn ghost', onclick: () => goalForm(null, { level: 'M', period: ms[Math.min(i + 1, ms.length - 1)] }) }, 'Ajouter un objectif pour le mois suivant')));
}

function nutri(from, to) { const pr = avgField(from, to, r => r.prot), kc = avgField(from, to, r => r.kcal), wa = avgField(from, to, r => r.water); return [kv('Protéines moy.', pr ? num(pr.avg, 0) + ' g' : '—', pr ? pr.n + ' j saisis' : 'non renseigné'), kv('Énergie moy.', kc ? num(kc.avg, 0) + ' kcal' : '—', kc ? kc.n + ' j saisis' : 'non renseigné'), kv('Hydratation moy.', wa ? num(wa.avg / 1000, 2) + ' L' : '—', wa ? wa.n + ' j saisis' : 'non renseigné')]; }
function quarterly(key) {
  const t = today(), qs = quarters(); const q = qs.find(x => x.id === key) || quarterOf(t) || (t < qs[0].from ? qs[0] : qs[3]); const i = qs.indexOf(q);
  const end = t < q.to ? t : q.to, b = S.settings.body; const st = rangeStats(q.from, q.to), wNow = avgWeight(addDays(end, -13), end); const pubs = published(q.from, q.to), lv = livesDone(q.from, q.to);
  const sl = avgField(q.from, q.to, r => sleepHours(r.sleep)); const days = Math.max(0, Math.min(diffDays(q.from, t) + 1, diffDays(q.from, q.to) + 1));
  const sk = S.skills.filter(x => x.date >= q.from && x.date <= q.to).length;
  return h('div', null, pager(q.n, i > 0 ? '#/reviews/Q/' + qs[i - 1].id : null, i < 3 && qs[i + 1].from <= t ? '#/reviews/Q/' + qs[i + 1].id : null, `${fmtShort(q.from)} → ${fmtShort(q.to)}`),
    card('Par rapport au point de départ', h('div', { class: 'kvs' }, kv('Poids de départ', b.startWeight ? num(b.startWeight, 1) + ' kg' : '—', 'référence'), kv('Moyenne 14 j', wNow == null ? '—' : num(wNow, 2) + ' kg', wNow != null && b.startWeight ? sign(wNow - b.startWeight) + ' kg depuis le départ' : 'non renseigné'), ...nutri(q.from, q.to),
      kv('Sport', sportCount(st), 'séances validées'), kv('PINOX', `${pubs.length} publ.`, `${num(sum(pubs, 'views'), 0)} vues · ${lv.length} lives`), kv('Compétences ajoutées', sk, `${S.trainings.filter(x => x.status === 'done').length} formation(s) terminée(s)`),
      kv('Régularité', `${st.cps} / ${days}`, 'checkpoints terminés'), kv('Réalisation', pct(st.rate), `${st.tracked} j suivis`), kv('Sommeil moyen', sl ? num(sl.avg, 1) + ' h' : '—', sl ? sl.n + ' nuits notées' : 'non renseigné'))),
    card('Objectifs annuels', S.goals.filter(g => g.level === 'A').map(goalRow), h('button', { class: 'btn ghost mt', onclick: () => go('#/goals') }, 'Réviser mes objectifs')),
    card('Jalons du trimestre', S.goals.filter(g => g.level === 'Q' && g.period === q.id).map(goalRow), S.goals.some(g => g.level === 'Q' && g.period === q.id) ? null : empty('Aucun jalon pour ce trimestre.')), domRates(q.from, q.to),
    reviewForm(q.id, [['phys', 'Évolution physique et nutritionnelle'], ['pinox', 'Évolution du média PINOX'], ['pro', 'Progression professionnelle et académique'], ['disc', 'Évaluation de la discipline'], ['rev', 'Révision des objectifs (ce que je garde, change, abandonne)', 3]]));
}

function annual() {
  const st0 = S.settings, t = today(), end = t < st0.end ? t : st0.end, b = st0.body; const st = rangeStats(st0.start, st0.end), wNow = avgWeight(addDays(end, -13), end);
  const pubs = published(st0.start, st0.end), lv = livesDone(st0.start, st0.end); const days = Math.max(0, Math.min(diffDays(st0.start, t) + 1, diffDays(st0.start, st0.end) + 1));
  const gs = S.goals.filter(g => g.level === 'A'); const cls = g => { if (g.status === 'paused') return 'En veille'; const p = goalProgress(g); return p == null ? 'Non renseigné' : p >= 100 ? 'Atteint' : p >= 40 ? 'Partiellement atteint' : 'Non atteint'; };
  const groups = {}; gs.forEach(g => (groups[cls(g)] = groups[cls(g)] || []).push(g));
  const qb = quarters().map(q => ({ label: q.id.replace('Q', 'T'), full: q.n, value: q.from > t ? null : rangeStats(q.from, q.to).rate }));
  return h('div', null, t < st0.end ? card(null, h('p', { class: 'box' }, `Bilan provisoire : le programme se termine le ${fmtDay(st0.end)}. Les chiffres ci-dessous portent sur les données saisies à ce jour.`)) : null,
    card('Départ → aujourd\'hui', h('div', { class: 'tbl' }, h('table', null, h('tr', null, ['', 'Départ', 'Actuel'].map(x => h('th', null, x))),
      h('tr', null, h('td', null, 'Poids (moy. 14 j)'), h('td', null, b.startWeight ? num(b.startWeight, 1) + ' kg' : '—'), h('td', null, wNow == null ? 'non renseigné' : num(wNow, 2) + ' kg')),
      h('tr', null, h('td', null, 'Masse grasse'), h('td', null, b.fat ? num(b.fat, 1) + ' %' : '—'), h('td', null, b.fatEnd ? num(b.fatEnd, 1) + ' %' : 'à saisir dans Profil')),
      h('tr', null, h('td', null, 'Publications PINOX'), h('td', null, '0'), h('td', null, pubs.length)), h('tr', null, h('td', null, 'Lives réalisés'), h('td', null, '0'), h('td', null, lv.length)),
      h('tr', null, h('td', null, 'Bilans barbe'), h('td', null, '0'), h('td', null, S.beard.length)), h('tr', null, h('td', null, 'Checkpoints terminés'), h('td', null, '0'), h('td', null, `${st.cps} / ${days} j`)), h('tr', null, h('td', null, 'Réalisation globale'), h('td', null, '—'), h('td', null, pct(st.rate)))))),
    card('Évolution des habitudes par trimestre', barChart({ bars: qb, unit: '%', max: 100 }), legend()),
    ['Atteint', 'Partiellement atteint', 'Non atteint', 'Non renseigné', 'En veille'].map(k => groups[k] ? card(`${k} (${groups[k].length})`, groups[k].map(goalRow)) : null),
    !gs.length ? card(null, empty('Aucun objectif annuel défini.')) : null,
    reviewForm('A', [['general', 'Bilan général', 3], ['wins', 'Meilleures réussites'], ['hard', 'Principales difficultés'], ['lessons', 'Leçons apprises'], ['next', 'Recommandations pour l\'année suivante', 3]]));
}

/* ---------- Graphiques ---------- */
function charts() {
  const st0 = S.settings, t = today(); const end = t > st0.end ? st0.end : t;
  let from = gPeriod === 'all' ? st0.start : addDays(end, -(+gPeriod - 1)); if (from < st0.start && end >= st0.start) from = st0.start;
  const f = gDom === 'all' ? null : i => i.d === gDom; const show = d => gDom === 'all' || gDom === d; const x = d => diffDays(st0.start, d);
  const weeks = []; for (let w = weekStart(from); w <= end; w = addDays(w, 7)) weeks.push(w);
  const wl = w => fmtShort(w).replace('.', '');
  const b = st0.body, total = diffDays(st0.start, st0.end); const wts = S.weights.filter(w => w.kg > 0 && w.date >= from && w.date <= end).sort((a, c) => a.date < c.date ? -1 : 1);
  const wSeries = [{ name: 'pesée saisie', kind: 'data', pts: wts.map(w => ({ x: x(w.date), y: +w.kg, label: fmtShort(w.date) })) }];
  if (b.startWeight && b.targetWeight) { const gEnd = addDays(from, 30) > end ? (addDays(from, 30) > st0.end ? st0.end : addDays(from, 30)) : end; const gy = d => b.startWeight + (b.targetWeight - b.startWeight) * x(d) / total; wSeries.unshift({ name: 'objectif', kind: 'goal', pts: [{ x: x(from), y: gy(from) }, { x: x(gEnd), y: gy(gEnd) }] }); }
  const sportGoal = S.routines.filter(r => r.active !== false && SPORT_TAGS.includes(r.tag)).reduce((a, r) => a + r.days.length, 0) || null;
  const ms = months().filter(m => m <= monthKey(end) && monthRange(m).to >= from);
  const mb = (fn, unitDetail) => ms.map(m => { const r = monthRange(m); const v = fn(r, m); return { label: fmtMonth(m).slice(0, 3), full: fmtMonth(m), value: v, detail: unitDetail }; });
  const habs = S.routines.filter(r => r.active !== false && (gDom === 'all' || r.domain === gDom)); if (!habs.some(r => r.id === gHab)) gHab = habs[0] ? habs[0].id : '';
  return h('div', null,
    card(null, h('div', { class: 'two' }, h('div', { class: 'field' }, h('label', null, 'Période'), h('select', { class: 'in', onchange: e => { gPeriod = e.target.value; refresh(); } }, Object.entries({ 30: '1 mois', 90: '3 mois', 180: '6 mois', all: 'Tout le programme' }).map(([k, l]) => h('option', { value: k, selected: gPeriod === k }, l)))),
      h('div', { class: 'field' }, h('label', null, 'Domaine'), h('select', { class: 'in', onchange: e => { gDom = e.target.value; refresh(); } }, h('option', { value: 'all', selected: gDom === 'all' }, 'Tous'), Object.entries(DOMAINS).map(([k, d]) => h('option', { value: k, selected: gDom === k }, d.n))))), legend(),
      h('p', { class: 'hint' }, 'Une barre absente ou un « — » signifie « non renseigné », jamais zéro.')),
    card('Taux de réalisation des checkpoints (par semaine)', barChart({ bars: weeks.map(w => { const s = rangeStats(w, addDays(w, 6), f); return { label: wl(w), full: 'Semaine du ' + fmtShort(w), value: s.rate, detail: `${s.tracked} j suivis` }; }), unit: '%', max: 100 })),
    show('phys') ? card('Courbe de poids', lineChart({ series: wSeries, unit: 'kg', xTicks: ms.map(m => ({ x: x(m + '-15'), label: fmtMonth(m).slice(0, 3) })) })) : null,
    show('phys') ? card('Régularité sportive (séances validées / semaine)', barChart({ bars: weeks.map(w => { const s = rangeStats(w, addDays(w, 6)); return { label: wl(w), full: 'Semaine du ' + fmtShort(w), value: s.tracked ? sportCount(s) : null }; }), unit: 'séances', goal: sportGoal })) : null,
    show('pinox') ? card('Publications PINOX par mois', barChart({ bars: mb((r) => r.from > end ? null : published(r.from, r.to).length), unit: 'publications', kind: 'data' })) : null,
    show('pinox') ? card('Performances des contenus (vues saisies par mois)', barChart({ bars: mb((r) => sum(published(r.from, r.to), 'views')), unit: 'vues', kind: 'data' })) : null,
    card('Évolution d\'une habitude', habs.length ? h('div', null, h('select', { class: 'in', 'aria-label': 'Habitude', onchange: e => { gHab = e.target.value; refresh(); } }, habs.map(r => h('option', { value: r.id, selected: r.id === gHab }, r.title))),
      barChart({ bars: weeks.map(w => { const s = rangeStats(w, addDays(w, 6), i => i.id === gHab); return { label: wl(w), full: 'Semaine du ' + fmtShort(w), value: s.total ? s.rate : null }; }), unit: '%', max: 100 })) : empty('Aucune habitude dans ce domaine.')),
    card('Comparaison entre mois', barChart({ bars: months().filter(m => m <= monthKey(t)).map(m => { const r = monthRange(m), s = rangeStats(r.from, r.to, f); return { label: fmtMonth(m).slice(0, 3), full: fmtMonth(m), value: s.rate, detail: `${s.tracked} j suivis` }; }), unit: '%', max: 100 })),
    card('Comparaison entre trimestres', barChart({ bars: quarters().map(q => { const s = rangeStats(q.from, q.to, f); return { label: q.id.replace('Q', 'T'), full: q.n, value: q.from > t ? null : s.rate, detail: `${s.tracked} j suivis` }; }), unit: '%', max: 100 })),
    card('Progression des objectifs annuels', S.goals.filter(g => g.level === 'A' && (gDom === 'all' || g.domain === gDom)).map(goalRow)));
}
