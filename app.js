// Démarrage, navigation, Accueil et Mon quotidien.
import * as C from './core.js';
import { S, today, addDays, fmtLong, fmtDay, fmtShort, program, planFor, dayStats, dayLoad, dayRec, touchDay, saveDay, fromMin, toMin, dur, DOMAINS, MAIN_DOMAINS, ST, PRAYERS, num, monthKey, fmtMonth, goalProgress, rangeStats, weekStart, sleepHours, pendingTasks, postpone, setStatus, save, uid, monthEnd, quarterOf, lastWeight, diffDays, sleepAlert, bedMin, dow } from './core.js';
import { h, $, icon, sheet, toast, card, bar, ring, seg, empty, form, confirmDlg } from './ui.js';
import { setRenderer, refresh, go, itemRow, goalRow, addMenu, fab, taskForm, dot } from './common.js';
import { viewGoals, viewDomain } from './domains.js';
import { viewReviews, reviewId } from './reviews.js';
import { viewProfile, importFlow, applyTheme } from './profile.js';

const PHRASES = ['Un pas régulier vaut mieux qu\'un grand saut.', 'Aujourd\'hui, fais simplement ce qui est possible.', 'La constance se construit, elle ne s\'impose pas.', 'Chaque journée suivie est une information utile, pas un jugement.', 'Avancer doucement, c\'est encore avancer.', 'Le repos fait partie du programme.', 'Ce qui compte, c\'est la direction.', 'Une journée plus calme prépare la suivante.', 'Petit effort, grande régularité.', 'Tu construis sur douze mois, pas sur un jour.', 'Reporter n\'est pas renoncer.', 'Prends soin de ton sommeil : tout le reste en dépend.'];

/* ---------- Rappels intégrés (fonctionnent sans notification système) ---------- */
export function reminders() {
  const t = today(), st = S.settings, out = [], now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  const rec = S.days[t] || {}; const has = id => S.reviews.some(r => r.id === id);
  if (C.db.mode() === 'ls') out.push({ t: 'Stockage de secours actif (IndexedDB indisponible) : la capacité est réduite, exporte souvent tes données.', go: '#/profile' });
  const sa = sleepAlert(); if (sa) out.push({ t: `Sommeil : ${sa.short} nuits de moins de 7 h sur les ${sa.n} dernières notées (moyenne ${num(sa.avg, 1)} h). Allège ton planning si possible.`, go: `#/day/${t}/semaine` });
  if (!(rec.cp && rec.cp.done) && nowMin >= toMin(st.remind.cp)) out.push({ t: 'Ton checkpoint du jour t\'attend.', go: `#/day/${t}/bilan` });
  if (dow(t) === 0 && !has(reviewId('W', t))) out.push({ t: 'C\'est dimanche : bilan hebdomadaire à faire.', go: '#/reviews/W' });
  const d = +t.slice(8), mk = monthKey(t), lastD = +monthEnd(mk).slice(8);
  if (d >= lastD - 1 && !has('M:' + mk)) out.push({ t: `Fin de mois : bilan de ${fmtMonth(mk)} à préparer.`, go: '#/reviews/M' });
  const pm = C.addMonths(mk, -1); if (d <= 5 && pm >= monthKey(st.start) && !has('M:' + pm)) out.push({ t: `Bilan de ${fmtMonth(pm)} pas encore enregistré.`, go: '#/reviews/M' });
  const q = quarterOf(t); if (q && diffDays(t, q.to) <= 3 && !has(q.id)) out.push({ t: `${q.n} : bilan trimestriel à préparer.`, go: '#/reviews/Q' });
  if (t >= addDays(st.end, -3) && !has('A')) out.push({ t: 'Fin du programme : bilan annuel disponible.', go: '#/reviews/A' });
  if (st.body.startWeight) { const lw = lastWeight(); if (!lw || diffDays(lw.date, t) >= st.remind.weighEvery) out.push({ t: lw ? `Dernière pesée il y a ${diffDays(lw.date, t)} jours.` : 'Pense à noter une première pesée.', go: '#/domain/phys' }); }
  if (S.goals.some(g => g.auto === 'beard') && d >= 13 && !S.beard.some(b => monthKey(b.date) === mk)) out.push({ t: 'Bilan barbe du mois (photo + notes) à faire.', go: '#/domain/barbe' });
  if (st.prayers.on && (!st.prayers.updated || diffDays(st.prayers.updated, t) >= 21)) out.push({ t: 'Heures de prière : pense à les vérifier et les mettre à jour.', go: '#/profile/prieres' });
  st.obligations.filter(o => o.until && o.until < t && diffDays(o.until, t) <= 21).forEach(o => out.push({ t: `« ${o.label} » est arrivé à échéance le ${fmtShort(o.until)} : à reconfigurer ?`, go: '#/profile/horaires' }));
  const lb = S.meta.lastBackup; const tracked = Object.keys(S.days).length;
  if (tracked >= 3 && (!lb || diffDays(lb.slice(0, 10), t) >= st.remind.backupEvery)) out.push({ t: lb ? `Dernière sauvegarde il y a ${diffDays(lb.slice(0, 10), t)} jours : exporte tes données.` : 'Aucune sauvegarde pour l\'instant : exporte tes données.', go: '#/profile/sauvegarde' });
  return out;
}

let remAll = false;
/* ---------- Accueil ---------- */
function viewHome() {
  const t = today(), p = program(t), rec = S.days[t] || {}, plan = planFor(t), st = dayStats(t), ld = dayLoad(t), mk = monthKey(t);
  const rem = reminders(); const wr = S.reviews.find(r => r.id === 'W:' + addDays(weekStart(t), -7)); const cap = wr ? [wr.f.p1, wr.f.p2, wr.f.p3].filter(Boolean) : [];
  const prio = rec.prio || [{}, {}, {}];
  const savePrio = async () => { dayRec(t).prio = prio; await touchDay(t); };
  const suggest = async () => { const done = new Set(prio.map(x => x.t)); const c = plan.filter(i => i.tag !== 'prayer' && !done.has(i.t)).sort((a, b) => 'EIS'.indexOf(a.p) - 'EIS'.indexOf(b.p)); prio.forEach(x => { if (!x.t && c.length) x.t = c.shift().t; }); await savePrio(); refresh(); };
  const todo = plan.filter(i => !(rec.items && rec.items[i.id] && rec.items[i.id].s));
  const mGoals = S.goals.filter(g => g.level === 'M' && g.period === mk && g.status !== 'done');
  const annual = S.goals.filter(g => g.level === 'A' && g.status !== 'paused');
  const domProg = MAIN_DOMAINS.map(d => { const gs = annual.filter(g => g.domain === d).map(goalProgress).filter(v => v != null); return { d, v: gs.length ? gs.reduce((a, b) => a + b, 0) / gs.length : null }; });
  const w7 = rangeStats(addDays(t, -6), t);
  const pr = S.settings.prayers;
  return h('div', { class: 'view' },
    h('header', { class: 'top' }, h('div', null, h('small', { class: 'brand' }, 'MON ANNÉE — 2026/2027'), h('h1', null, fmtLong(t).replace(/^./, c => c.toUpperCase())))),
    h('section', { class: 'card hero' }, ring(p.pct, p.before ? 'J-' + diffDays(t, p.start) : 'J' + p.dayNo, 'sur ' + p.total),
      h('div', { class: 'hero-s' }, h('div', null, h('b', null, p.elapsed), h('small', null, 'jours écoulés')), h('div', null, h('b', null, p.remaining), h('small', null, 'jours restants')), h('div', null, h('b', null, num(p.pct, 1) + ' %'), h('small', null, 'de l\'année')))),
    rem.length ? h('section', { class: 'rems' }, rem.slice(0, remAll ? 99 : 2).map(r => h('button', { class: 'rem', onclick: () => go(r.go) }, icon('bell', 18), h('span', null, r.t))), rem.length > 2 && !remAll ? h('button', { class: 'link', onclick: () => { remAll = true; refresh(); } }, `Voir les ${rem.length - 2} autres rappels`) : null) : null,
    card('Mes 3 priorités du jour',
      prio.map((x, i) => h('div', { class: 'prio' + (x.s === 'done' ? ' ok' : '') },
        h('button', { class: 'stbtn', 'aria-label': 'Valider la priorité ' + (i + 1), onclick: async () => { x.s = x.s === 'done' ? null : 'done'; await savePrio(); refresh(); } }, x.s === 'done' ? '✓' : ''),
        h('input', { class: 'in bare', value: x.t || '', placeholder: 'Priorité ' + (i + 1), 'aria-label': 'Priorité ' + (i + 1), onchange: async e => { x.t = e.target.value.trim(); await savePrio(); } }))),
      cap.length ? h('p', { class: 'hint' }, 'Cap de la semaine : ' + cap.join(' · ')) : null,
      prio.some(x => !x.t) && plan.length ? h('button', { class: 'link', onclick: suggest }, 'Proposer à partir de mes actions du jour') : null),
    card('Obligations fixes',
      ld.blocks.filter(b => b.type === 'ob').length ? h('div', { class: 'obs' }, ld.blocks.map(b => h('div', { class: 'ob ' + b.type }, h('span', null, fromMin(b.s) + ' – ' + fromMin(b.e)), h('b', null, b.label)))) : empty('Aucune obligation fixe aujourd\'hui.'),
      pr.on ? h('div', { class: 'chips ro' }, Object.entries(PRAYERS).map(([k, n]) => h('span', { class: 'chip' }, n + ' ' + (pr.times[k] || '—')))) : null,
      h('p', { class: 'hint' }, `Réveil ${S.settings.wake} · coucher conseillé ${fromMin(bedMin())} pour ${S.settings.sleepGoal} h de sommeil.`)),
    card('Mes checkpoints',
      h('div', { class: 'row between' }, h('b', null, `${st.answered} / ${st.count} traités`), h('small', { class: 'muted' }, st.rate == null ? 'réalisation : —' : 'réalisation : ' + num(st.rate, 0) + ' %')),
      bar(st.count ? st.answered / st.count * 100 : 0),
      ld.warn.length ? h('p', { class: 'warn' }, ld.warn[0]) : null,
      todo.slice(0, 5).map(i => itemRow(t, i)),
      !plan.length ? empty('Rien de planifié. Ajoute une habitude ou une tâche avec le bouton +.') : !todo.length ? h('p', { class: 'ok-t' }, 'Tout est traité pour aujourd\'hui.') : todo.length > 5 ? h('p', { class: 'hint' }, `+ ${todo.length - 5} autres dans Mon quotidien`) : null,
      h('div', { class: 'row gap mt' }, h('button', { class: 'btn ghost grow', onclick: () => go(`#/day/${t}/check`) }, 'Toute ma journée'),
        h('button', { class: 'btn grow', onclick: () => go(`#/day/${t}/bilan`) }, rec.cp && rec.cp.done ? 'Checkpoint fait ✓' : 'Checkpoint du jour'))),
    card('Objectifs de ' + fmtMonth(mk).toLowerCase(), mGoals.length ? mGoals.map(goalRow) : empty('Aucun objectif pour ce mois.'), h('button', { class: 'link', onclick: () => go('#/goals') }, 'Tous mes objectifs')),
    card('Progression globale',
      h('div', { class: 'row between' }, h('span', null, 'Réalisation sur 7 jours'), h('b', null, w7.rate == null ? '—' : num(w7.rate, 0) + ' %')), bar(w7.rate),
      domProg.map(x => h('div', { class: 'mini' }, h('span', null, dot(x.d), DOMAINS[x.d].n), h('em', null, x.v == null ? '—' : num(x.v, 0) + ' %'), bar(x.v, DOMAINS[x.d].c))),
      h('p', { class: 'hint' }, 'Moyenne des objectifs annuels actifs par domaine. « — » = aucune donnée saisie.')),
    h('p', { class: 'phrase' }, PHRASES[(p.dayNo + new Date().getDate()) % PHRASES.length]),
    fab(() => addMenu(t)));
}

/* ---------- Mon quotidien ---------- */
const FOODS = [['Œuf (1)', 6, 75], ['Poisson 100 g', 20, 120], ['Poulet 100 g', 25, 165], ['Riz cuit 200 g', 5, 260], ['Pomme de terre 200 g', 4, 170], ['Patate douce 200 g', 3, 180], ['Banane', 1, 95], ['Arachides 30 g', 8, 170], ['Légumes cuits 150 g', 3, 60], ['Pain 60 g', 5, 160], ['Lait caillé 125 g', 4, 80]];
const PAIN_ZONES = { lombaires: 'Lombaires', fessiers: 'Fessiers', genoux: 'Genoux', epaules: 'Épaules', poignets: 'Poignets', autre: 'Autre' };

function viewDay(date, tab) {
  date = /^\d{4}-\d\d-\d\d$/.test(date || '') ? date : today(); tab = tab || 'check';
  const t = today(), rec = S.days[date] || {}, plan = planFor(date), ld = dayLoad(date), st = dayStats(date);
  const nav = h('div', { class: 'datenav' },
    h('button', { class: 'icon-btn', 'aria-label': 'Jour précédent', onclick: () => go(`#/day/${addDays(date, -1)}/${tab}`) }, icon('left')),
    h('button', { class: 'date-b', onclick: () => go(`#/day/${t}/${tab}`) }, h('b', null, fmtDay(date)), h('small', null, date === t ? 'Aujourd\'hui' : 'Revenir à aujourd\'hui')),
    h('button', { class: 'icon-btn', 'aria-label': 'Jour suivant', onclick: () => go(`#/day/${addDays(date, 1)}/${tab}`) }, icon('right')));
  const body = { check: dayCheck, plan: dayPlan, suivi: daySuivi, bilan: dayBilan, semaine: dayWeek }[tab] || dayCheck;
  return h('div', { class: 'view' }, h('header', { class: 'top' }, h('h1', null, 'Mon quotidien')), nav,
    seg({ check: 'Actions', plan: 'Planning', suivi: 'Suivi', bilan: 'Bilan', semaine: 'Semaine' }, tab, k => go(`#/day/${date}/${k}`)),
    body(date, { rec, plan, ld, st }), fab(() => addMenu(date)));
}
function dayCheck(date, { plan, ld, st }) {
  const groups = {}; plan.forEach(i => (groups[i.d] = groups[i.d] || []).push(i));
  const pend = date === today() ? pendingTasks() : [];
  return h('div', null,
    card(null, h('div', { class: 'row between' }, h('b', null, `${st.answered} / ${st.count} traités`), h('small', { class: 'muted' }, st.rate == null ? '—' : num(st.rate, 0) + ' % réalisés')), bar(st.count ? st.answered / st.count * 100 : 0),
      h('p', { class: 'hint' }, `Actions : ${dur(ld.load)} prévues · environ ${dur(ld.avail)} disponibles.`), ld.warn.map(w => h('p', { class: 'warn' }, w))),
    pend.length ? card('À replanifier', h('p', { class: 'hint' }, 'Tâches des jours passés restées sans réponse. Aucun reproche : choisis simplement quoi en faire.'),
      pend.map(x => h('div', { class: 'pend' }, h('span', null, x.title, h('small', { class: 'muted' }, ' · prévu ' + fmtShort(x.date))),
        h('div', { class: 'row gap' }, h('button', { class: 'btn sm', onclick: async () => { await postpone(x.date, { id: x.id, t: x.title, d: x.domain, p: x.priority, dur: x.dur }, today()); refresh(); } }, 'Aujourd\'hui'),
          h('button', { class: 'btn sm ghost', onclick: async () => { await setStatus(x.date, x.id, 'na'); refresh(); } }, 'Abandonner'))))) : null,
    Object.keys(groups).length ? Object.entries(groups).map(([d, items]) => card(h('span', null, dot(d), (DOMAINS[d] || {}).n || 'Autre'), items.map(i => itemRow(date, i, true)))) : card(null, empty('Rien de planifié ce jour-là. Utilise + pour ajouter une tâche ou une habitude.')),
    h('p', { class: 'hint center' }, 'Touchez le rond pour valider, la ligne pour : partiel, reporté, non réalisé, non applicable, note.'));
}
function dayPlan(date, { plan, ld }) {
  const rows = [{ m: ld.wake, l: 'Réveil', c: 'mark' }, { m: ld.bed, l: 'Coucher conseillé', c: 'mark' }];
  ld.blocks.forEach(b => rows.push({ m: b.s, e: b.e, l: b.label, c: b.type + (b.conflict ? ' bad' : '') }));
  plan.filter(i => i.time).forEach(i => rows.push({ m: toMin(i.time), e: i.dur ? toMin(i.time) + i.dur : null, l: i.t, c: i.tag === 'prayer' ? 'prayer' : 'act', over: ld.blocks.find(b => b.type === 'ob' && toMin(i.time) >= b.s && toMin(i.time) < b.e) }));
  rows.sort((a, b) => a.m - b.m);
  const untimed = plan.filter(i => !i.time);
  return h('div', null,
    ld.warn.length ? card(null, ld.warn.map(w => h('p', { class: 'warn' }, w))) : null,
    card('Déroulé de la journée', h('div', { class: 'tl' }, rows.map(r => h('div', { class: 'tl-r ' + r.c }, h('span', { class: 'tl-h' }, fromMin(r.m) + (r.e ? '–' + fromMin(r.e) : '')), h('span', { class: 'tl-l' }, r.l, r.over ? h('small', { class: 'muted' }, ` · pendant « ${r.over.label} » : à organiser selon tes possibilités`) : null))))),
    card('Créneaux libres', ld.free.length ? h('div', { class: 'chips ro' }, ld.free.map(f => h('span', { class: 'chip' }, `${fromMin(f.s)}–${fromMin(f.e)} · ${dur(f.e - f.s)}`))) : empty('Aucun créneau libre significatif.'),
      h('p', { class: 'hint' }, `Environ ${dur(ld.avail)} réellement disponibles (prières, ${dur(+S.settings.buffer || 0)} de repas/préparation et pause déjeuner pris en compte). Réglable dans Profil.`)),
    card('À placer dans tes créneaux libres', untimed.length ? untimed.map(i => itemRow(date, i)) : empty('Toutes les actions ont une heure.')));
}
function daySuivi(date, { rec, plan }) {
  const st = S.settings, n = st.nutri, r = dayRec(date);
  const sv = async (fn) => { fn(r); await touchDay(date); refresh(); };
  const quiet = async (fn) => { fn(r); await touchDay(date); };
  const fasting = plan.some(i => i.tag === 'fast');
  const sh = sleepHours(r.sleep);
  const pain = r.pain || [];
  const addPain = () => sheet('Signaler une douleur', close => form([
    { k: 'zone', label: 'Zone', type: 'select', options: PAIN_ZONES }, { k: 'level', label: 'Intensité (0 à 10)', type: 'number', min: 0, max: 10 }, { k: 'note', label: 'Précision', type: 'textarea', rows: 2 },
    { type: 'note', label: 'Si la douleur persiste ou s\'aggrave, consulte un professionnel de santé. L\'application ne remplace pas un avis médical.' }],
    { zone: 'lombaires', level: 3 }, {
      onSave: async d => {
        await sv(x => (x.pain = x.pain || []).push(d)); close();
        const linked = S.exercises.filter(e => !e.suspended && (e.zones || []).includes(d.zone));
        if (linked.length) sheet('Suspendre des exercices ?', c2 => {
          const sel = new Set(linked.map(e => e.id));
          return h('div', null, h('p', { class: 'p' }, 'Ces exercices sollicitent la zone signalée. Les exercices cochés seront suspendus jusqu\'à ce que tu les réactives.'),
            linked.map(e => h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: true, onchange: ev => ev.target.checked ? sel.add(e.id) : sel.delete(e.id) }), h('span', null, e.name))),
            h('div', { class: 'row gap mt' }, h('button', { class: 'btn ghost grow', onclick: c2 }, 'Ne rien suspendre'), h('button', { class: 'btn grow', onclick: async () => { S.exercises.forEach(e => { if (sel.has(e.id)) { e.suspended = true; e.suspendedOn = date; } }); await save('exercises'); c2(); toast('Exercices suspendus.'); refresh(); } }, 'Suspendre')));
        });
      }
    }));
  return h('div', null,
    fasting ? card(null, h('p', { class: 'p' }, '🌙 Jour de jeûne prévu : hydrate-toi bien avant et après, et garde une activité légère.')) : null,
    card('Hydratation', h('div', { class: 'row between' }, h('b', { class: 'big' }, num((r.water || 0) / 1000, 2) + ' L'), h('small', { class: 'muted' }, n.water ? 'objectif ' + num(n.water / 1000, 1) + ' L' : '')), bar(n.water ? (r.water || 0) / n.water * 100 : 0, '#5B8DB8'),
      h('div', { class: 'row gap mt' }, h('button', { class: 'btn ghost', onclick: () => sv(x => x.water = Math.max(0, (x.water || 0) - 250)) }, '− 250 ml'), h('button', { class: 'btn grow', onclick: () => sv(x => x.water = (x.water || 0) + 250) }, '+ 250 ml'), h('button', { class: 'btn ghost', onclick: () => sv(x => x.water = (x.water || 0) + 500) }, '+ 500'))),
    card('Alimentation (suivi approximatif)',
      h('div', { class: 'two' },
        h('div', { class: 'field' }, h('label', null, 'Protéines (g)'), h('input', { class: 'in', type: 'number', inputmode: 'decimal', value: r.prot ?? '', onchange: e => quiet(x => x.prot = e.target.value === '' ? null : +e.target.value) }), n.protMin ? h('small', { class: 'hint' }, `repère ${n.protMin}–${n.protMax} g`) : null),
        h('div', { class: 'field' }, h('label', null, 'Énergie (kcal)'), h('input', { class: 'in', type: 'number', inputmode: 'decimal', value: r.kcal ?? '', onchange: e => quiet(x => x.kcal = e.target.value === '' ? null : +e.target.value) }), n.kcalMin ? h('small', { class: 'hint' }, `repère ${n.kcalMin}–${n.kcalMax}`) : null)),
      h('label', { class: 'lab' }, 'Ajout rapide (valeurs moyennes estimées)'),
      h('div', { class: 'chips' }, FOODS.map(f => h('button', { class: 'chip', onclick: () => sv(x => { x.prot = (x.prot || 0) + f[1]; x.kcal = (x.kcal || 0) + f[2]; (x.foods = x.foods || []).push(f[0]); }) }, '+ ' + f[0]))),
      (r.foods || []).length ? h('p', { class: 'hint' }, 'Ajouté : ' + r.foods.join(', ') + ' ', h('button', { class: 'link inl', onclick: () => sv(x => { x.foods = []; x.prot = null; x.kcal = null; }) }, 'remettre à zéro')) : null,
      h('div', { class: 'field' }, h('label', null, 'Tolérance digestive'), h('div', { class: 'chips' }, ['Bonne', 'Moyenne', 'Difficile'].map((l, i) => h('button', { class: 'chip' + (r.dig === i + 1 ? ' on' : ''), onclick: () => sv(x => x.dig = x.dig === i + 1 ? null : i + 1) }, l)))),
      h('div', { class: 'field' }, h('label', null, 'Repas, aliments mal tolérés, remarques'), h('textarea', { class: 'in', rows: 2, onchange: e => quiet(x => x.foodNote = e.target.value) }, r.foodNote || '')),
      st.budget.food ? h('div', { class: 'field' }, h('label', null, `Dépense alimentaire du jour (${st.budget.currency})`), h('input', { class: 'in', type: 'number', inputmode: 'decimal', value: r.spend ?? '', onchange: e => sv(x => x.spend = e.target.value === '' ? null : +e.target.value) }),
        h('small', { class: 'hint' }, (st.budget.foodFrom && date < st.budget.foodFrom ? `Budget de ${num(st.budget.food, 0)} ${st.budget.currency}/jour prévu à partir du ${fmtShort(st.budget.foodFrom)}.` : `Budget : ${num(st.budget.food, 0)} ${st.budget.currency}/jour` + (r.spend != null ? (r.spend <= st.budget.food ? ' · dans le budget' : ` · dépassement de ${num(r.spend - st.budget.food, 0)}`) : '')))) : null,
      h('p', { class: 'hint' }, 'Repères indicatifs, modifiables dans Profil. Ce ne sont pas des prescriptions médicales.')),
    card('Sommeil (nuit précédente)', h('div', { class: 'two' },
      h('div', { class: 'field' }, h('label', null, 'Coucher'), h('input', { class: 'in', type: 'time', value: (r.sleep || {}).bed || '', onchange: e => sv(x => (x.sleep = x.sleep || {}).bed = e.target.value) })),
      h('div', { class: 'field' }, h('label', null, 'Réveil'), h('input', { class: 'in', type: 'time', value: (r.sleep || {}).wake || '', onchange: e => sv(x => (x.sleep = x.sleep || {}).wake = e.target.value) }))),
      h('div', { class: 'field' }, h('label', null, 'Qualité'), h('div', { class: 'chips' }, [1, 2, 3, 4, 5].map(q => h('button', { class: 'chip sq' + ((r.sleep || {}).q === q ? ' on' : ''), onclick: () => sv(x => (x.sleep = x.sleep || {}).q = q) }, q)))),
      sh != null ? h('p', { class: sh < 7 ? 'warn' : 'ok-t' }, `Durée : ${num(sh, 1)} h` + (sh < 7 ? ' — en dessous de 7 h. Essaie d\'alléger la soirée.' : '')) : null),
    card('Douleurs', pain.length ? pain.map((p, i) => h('div', { class: 'pend' }, h('span', null, `${PAIN_ZONES[p.zone] || p.zone} · ${p.level}/10`, p.note ? h('small', { class: 'muted' }, ' · ' + p.note) : null), h('button', { class: 'btn sm ghost', onclick: () => sv(x => x.pain.splice(i, 1)) }, 'Retirer'))) : empty('Aucune douleur signalée ce jour.'),
      h('button', { class: 'btn ghost mt', onclick: addPain }, 'Signaler une douleur')));
}
const QS = [['q1', 'Ai-je respecté mes priorités ?', null], ['q2', 'Ai-je effectué l\'activité physique prévue ?', i => C.SPORT_TAGS.includes(i.tag)], ['q3', 'Ai-je respecté mon alimentation ?', null], ['q4', 'Ai-je respecté mes obligations spirituelles ?', i => i.d === 'spi'], ['q5', 'Ai-je progressé dans mes études ou mon travail ?', i => i.d === 'pro'], ['q6', 'Ai-je effectué les actions PINOX prévues ?', i => i.d === 'pinox']];
function dayBilan(date, { rec, plan }) {
  const r = dayRec(date); const cp = r.cp = r.cp || { a: {} }; cp.a = cp.a || {};
  const sug = {};
  QS.forEach(([k, , f]) => {
    let items; if (k === 'q1') items = (r.prio || []).filter(x => x.t).map(x => x.s); else if (f) items = plan.filter(f).map(i => r.items[i.id] && r.items[i.id].s).filter(s => s !== 'na' && s !== 'postponed'); else return;
    if (!items.length || !items.some(Boolean)) return; const d = items.filter(s => s === 'done').length, pa = items.filter(s => s === 'partial').length;
    sug[k] = d === items.length ? 'done' : d + pa > 0 ? 'partial' : 'missed';
  });
  const quiet = async () => { await touchDay(date); };
  const chips = (k) => { const w = h('div', { class: 'chips' }); const draw = () => w.replaceChildren(...Object.entries({ done: 'Oui', partial: 'En partie', missed: 'Non', postponed: 'Reporté', na: 'N. A.' }).map(([s, l]) => h('button', { type: 'button', class: 'chip' + (cp.a[k] === s ? ' on' : (!cp.a[k] && sug[k] === s ? ' sug' : '')), onclick: async () => { cp.a[k] = cp.a[k] === s ? null : s; await quiet(); draw(); } }, l))); draw(); return w; };
  const scale = (k, labels) => { const w = h('div', { class: 'chips' }); const draw = () => w.replaceChildren(...labels.map((l, i) => h('button', { type: 'button', class: 'chip' + (cp[k] === i + 1 ? ' on' : ''), onclick: async () => { cp[k] = cp[k] === i + 1 ? null : i + 1; await quiet(); draw(); } }, l))); draw(); return w; };
  const txt = (k, l) => h('div', { class: 'field' }, h('label', null, l), h('textarea', { class: 'in', rows: 2, onchange: async e => { cp[k] = e.target.value.trim(); await quiet(); } }, cp[k] || ''));
  return h('div', null,
    card('Checkpoint du jour', h('p', { class: 'hint' }, 'Aucun champ n\'est obligatoire. Le contour doré indique une suggestion déduite de tes actions : touche pour confirmer ou choisir autre chose.'),
      QS.map(([k, q]) => h('div', { class: 'field' }, h('label', null, q), chips(k))),
      h('div', { class: 'field' }, h('label', null, 'Niveau d\'énergie'), scale('energy', ['Très bas', 'Bas', 'Moyen', 'Bon', 'Excellent'])),
      h('div', { class: 'field' }, h('label', null, 'Humeur'), scale('mood', ['😞', '😕', '😐', '🙂', '😄'])),
      h('div', { class: 'field' }, h('label', null, 'Motivation'), scale('motiv', ['1', '2', '3', '4', '5'])),
      txt('success', 'Ma principale réussite'), txt('difficulty', 'Une difficulté rencontrée'), txt('improve', 'À améliorer demain'),
      h('button', { class: 'btn big mt', onclick: async () => { QS.forEach(([k]) => { if (!cp.a[k] && sug[k]) cp.a[k] = sug[k]; }); cp.done = true; cp.doneAt = new Date().toISOString(); await touchDay(date); toast('Checkpoint enregistré. Bonne fin de journée.'); refresh(); } }, cp.done ? 'Mettre à jour mon checkpoint ✓' : 'Terminer mon checkpoint du jour'),
      cp.done ? h('p', { class: 'ok-t center' }, 'Checkpoint terminé pour ce jour.') : null));
}
function dayWeek(date) {
  const ws = weekStart(date);
  return h('div', null, card('Semaine du ' + fmtShort(ws),
    [0, 1, 2, 3, 4, 5, 6].map(i => { const d = addDays(ws, i), ld = dayLoad(d), st = dayStats(d); const over = ld.load > ld.avail;
      return h('button', { class: 'wk' + (d === today() ? ' now' : ''), onclick: () => go(`#/day/${d}/check`) }, h('span', { class: 'wk-d' }, h('b', null, fmtDay(d)), h('small', { class: over || ld.warn.length ? 'warn-t' : 'muted' }, `${ld.count} actions · ${dur(ld.load)} / ${dur(ld.avail)}` + (ld.warn.length ? ' ⚠' : ''))),
        bar(ld.avail ? ld.load / ld.avail * 100 : 0, over ? 'var(--gold)' : null), h('em', null, st.rate == null ? '' : num(st.rate, 0) + ' %')); }),
    h('p', { class: 'hint' }, 'Barre = temps d\'actions prévu par rapport au temps disponible. Pour réorganiser après un imprévu : ouvre une action puis « Reporté » et choisis le nouveau jour.')));
}

/* ---------- Écran de bienvenue ---------- */
function viewWelcome() {
  return h('div', { class: 'view welcome' }, h('div', { class: 'logo' }, ring(75, 'MA', '26/27')), h('h1', null, 'MON ANNÉE'), h('p', { class: 'p' }, 'Ton tableau de bord personnel sur douze mois. Tes données restent sur cet appareil.'),
    h('button', { class: 'btn big', onclick: () => importFlow() }, 'Importer mon profil de départ ou une sauvegarde'),
    h('button', { class: 'btn ghost big', onclick: async () => { S.settings = C.defaultSettings(); await save('settings'); go('#/profile'); toast('Configuration vide créée. Règle tes paramètres.'); } }, 'Démarrer avec une configuration vide'),
    h('p', { class: 'hint' }, 'Le profil de départ est un fichier .json fourni séparément (il ne doit pas être publié sur GitHub). Il préremplit horaires, habitudes et objectifs ; tout reste modifiable.'));
}

/* ---------- Coquille et routeur ---------- */
const TABS = [['home', 'Accueil', 'home'], ['day', 'Quotidien', 'day'], ['goals', 'Objectifs', 'target'], ['reviews', 'Bilans', 'chart'], ['profile', 'Profil', 'user']];
function render() {
  const main = $('#main'), navEl = $('#nav'); const [, route = 'home', a, b] = location.hash.split('/');
  if (!C.hasData()) { navEl.hidden = true; main.replaceChildren(viewWelcome()); return; }
  navEl.hidden = false; applyTheme();
  const key = route + '|' + (a || ''); const keep = main.dataset.key === key ? main.scrollTop : 0; main.dataset.key = key;
  let v;
  try { v = route === 'day' ? viewDay(a, b) : route === 'goals' ? viewGoals(a) : route === 'domain' ? viewDomain(a, b) : route === 'reviews' ? viewReviews(a, b) : route === 'profile' ? viewProfile(a) : viewHome(); }
  catch (e) { console.error(e); v = h('div', { class: 'view' }, card('Un problème est survenu', h('p', { class: 'p' }, 'Cette page n\'a pas pu s\'afficher. Tes données ne sont pas perdues.'), h('pre', { class: 'hint' }, String(e && e.message || e)), h('button', { class: 'btn', onclick: () => go('#/home') }, 'Retour à l\'accueil'))); }
  main.replaceChildren(v); main.scrollTop = keep;
  const act = route === 'domain' ? 'goals' : TABS.some(t => t[0] === route) ? route : 'home';
  navEl.replaceChildren(...TABS.map(([k, l, ic]) => h('button', { class: k === act ? 'on' : '', 'aria-current': k === act ? 'page' : null, onclick: () => go(k === 'day' ? `#/day/${today()}/check` : '#/' + k) }, icon(ic), h('span', null, l))));
}

async function boot() {
  C.setSaveErrorHandler(e => { console.error(e); toast('Enregistrement impossible : stockage plein ou indisponible. Exporte tes données.'); });
  await C.db.init(); await C.load(); applyTheme();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  setRenderer(render); addEventListener('hashchange', render); render();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !document.querySelector('.overlay') && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') render(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    try {
      const reg = await navigator.serviceWorker.register('./service-worker.js');
      reg.addEventListener('updatefound', () => { const nw = reg.installing; nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Mise à jour installée : ferme puis rouvre l\'application.'); }); });
    } catch (e) { console.warn('Service worker non enregistré', e); }
  }
}
boot();
