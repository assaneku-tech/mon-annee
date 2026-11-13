// Éléments partagés : lignes de checkpoint, feuille de statut, formulaires objectifs / habitudes / tâches.
import { S, save, ST, PRIO, DOMAINS, LEVELS, AUTO, today, addDays, fmtDay, uid, setStatus, postpone, touchDay, dur, quarters, months, fmtMonth, monthKey, quarterOf, goalProgress, num } from './core.js';
import { h, sheet, form, toast, confirmDlg, bar, icon } from './ui.js';

let renderer = () => { };
export const setRenderer = f => renderer = f;
export const refresh = () => renderer();
export const go = hash => { if (location.hash === hash) renderer(); else location.hash = hash; };

const domOpts = () => Object.fromEntries(Object.entries(DOMAINS).map(([k, v]) => [k, v.n]));
export const dot = d => h('i', { class: 'dot', style: { background: (DOMAINS[d] || {}).c || 'var(--muted)' } });

/* ---------- Ligne de checkpoint ---------- */
export function itemRow(date, it, noDom) {
  const rec = S.days[date], cur = (rec && rec.items[it.id]) || {};
  const meta = [it.time, it.dur ? dur(it.dur) : null, noDom ? null : (DOMAINS[it.d] || {}).n].filter(Boolean).join(' · ');
  return h('div', { class: 'item st-' + (cur.s || 'none') },
    h('button', { class: 'stbtn', 'aria-label': (cur.s ? ST[cur.s].l : 'À faire') + ' : ' + it.t, onclick: async () => { await setStatus(date, it.id, cur.s === 'done' ? null : 'done'); refresh(); } }, cur.s ? ST[cur.s].i : ''),
    h('button', { class: 'item-b', onclick: () => statusSheet(date, it) },
      h('span', { class: 'item-t' }, it.p === 'E' ? h('i', { class: 'star', title: 'Essentiel' }, '★ ') : null, it.t),
      h('span', { class: 'item-m' }, noDom ? null : dot(it.d), meta, cur.s && cur.s !== 'done' ? ' · ' + ST[cur.s].l : ''),
      cur.n ? h('span', { class: 'item-n' }, '« ' + cur.n + ' »') : null));
}

export function statusSheet(date, it) {
  const rec = S.days[date], cur = (rec && rec.items[it.id]) || {};
  sheet(it.t, close => {
    const note = h('textarea', { class: 'in', rows: 2, placeholder: 'Note facultative…' }, cur.n || '');
    const apply = async s => { await setStatus(date, it.id, s, note.value.trim()); close(); refresh(); };
    const when = h('input', { class: 'in', type: 'date', value: addDays(date, 1), min: addDays(date, 1) });
    const postBox = h('div', { class: 'box', hidden: true }, h('label', null, 'Reporter au'), when,
      h('button', { class: 'btn mt', onclick: async () => { if (!when.value || when.value <= date) return toast('Choisis une date ultérieure.'); await setStatus(date, it.id, undefined, note.value.trim()); await postpone(date, it, when.value); close(); refresh(); toast('Reporté au ' + fmtDay(when.value) + '.'); } }, 'Confirmer le report'));
    const routine = S.routines.find(r => r.id === it.id), task = S.tasks.find(t => t.id === it.id);
    return h('div', null,
      h('div', { class: 'stgrid' }, Object.entries(ST).map(([k, v]) => h('button', { class: 'stopt st-' + k + (cur.s === k ? ' on' : ''), onclick: () => k === 'postponed' ? (postBox.hidden = !postBox.hidden) : apply(k) }, h('b', null, v.i), v.l))),
      postBox, h('div', { class: 'field mt' }, h('label', null, 'Note'), note),
      h('div', { class: 'row gap wrap mt' },
        h('button', { class: 'btn ghost', onclick: () => apply(cur.s === undefined ? undefined : cur.s) }, 'Enregistrer la note'),
        cur.s ? h('button', { class: 'btn ghost', onclick: () => apply(null) }, 'Effacer le statut') : null,
        it.tag === 'strength' ? h('button', { class: 'btn ghost', onclick: () => { close(); sessionForm(date); } }, 'Noter ma séance') : null,
        routine ? h('button', { class: 'btn ghost', onclick: () => { close(); routineForm(routine); } }, 'Modifier l\'habitude') : null,
        task ? h('button', { class: 'btn ghost', onclick: () => { close(); taskForm(task); } }, 'Modifier la tâche') : null));
  });
}

/* ---------- Séance de renforcement ---------- */
export function sessionForm(date) {
  const ex = S.exercises.filter(e => !e.suspended); const susp = S.exercises.filter(e => e.suspended);
  const old = S.sessions.find(x => x.date === date) || { id: uid(), date, entries: {} };
  sheet('Ma séance — ' + fmtDay(date), close => form([
    susp.length ? { type: 'note', label: 'Exercices suspendus (douleur signalée) : ' + susp.map(e => e.name).join(', ') + '. Ils ne sont pas proposés.' } : null,
    ...ex.map(e => ({ k: 'entries.' + e.id, label: e.name, placeholder: e.base || 'ex. 3 × 10', hint: e.note || null })),
    ex.length ? null : { type: 'note', label: 'Aucun exercice actif. Ajoute-les dans Objectifs › Physique & santé › Séances.' },
    { k: 'feel', label: 'Ressenti (1 = difficile, 5 = très bien)', type: 'scale' }, { k: 'note', label: 'Commentaire', type: 'textarea', rows: 2 },
    { type: 'note', label: 'Arrête tout mouvement douloureux. Signale la douleur dans Quotidien › Suivi pour suspendre les exercices concernés.' },
  ], old, { onSave: async d => { const i = S.sessions.findIndex(x => x.id === d.id); i < 0 ? S.sessions.push(d) : S.sessions[i] = d; await save('sessions'); close(); toast('Séance enregistrée.'); refresh(); } }));
}

/* ---------- CRUD générique sur une collection ---------- */
export function editItem(coll, title, fields, item, defaults = {}, after) {
  const isNew = !item; const val = item || { id: uid(), ...defaults };
  sheet((isNew ? 'Ajouter — ' : 'Modifier — ') + title, close => form(fields, val, {
    onSave: async d => {
      if (after) { const r = await after(d, isNew); if (r === false) return; }
      const i = S[coll].findIndex(x => x.id === d.id); i < 0 ? S[coll].push(d) : S[coll][i] = d;
      await save(coll); close(); refresh(); toast('Enregistré.');
    },
    onDelete: isNew ? null : async () => { if (!await confirmDlg('Supprimer définitivement cet élément ?', 'Supprimer', true)) return; S[coll] = S[coll].filter(x => x.id !== val.id); await save(coll); close(); refresh(); toast('Supprimé.'); },
  }));
}

export function routineForm(r, defaults = {}) {
  editItem('routines', 'habitude / activité', [
    { k: 'title', label: 'Intitulé' }, { k: 'domain', label: 'Domaine', type: 'select', options: domOpts() },
    { k: 'days', label: 'Jours concernés', type: 'days', hint: '7 jours = habitude quotidienne ; sinon activité hebdomadaire.' },
    { k: 'time', label: 'Heure (facultatif)', type: 'time' }, { k: 'dur', label: 'Durée estimée (min)', type: 'number', min: 0 },
    { k: 'priority', label: 'Priorité', type: 'select', options: PRIO },
    { k: 'active', label: 'État', type: 'check', hint: 'Active (décoche pour désactiver sans supprimer)' },
    { k: 'pausedUntil', label: 'Suspendre jusqu\'au (facultatif)', type: 'date' },
  ], r, { domain: 'disc', days: [1, 2, 3, 4, 5, 6, 0], priority: 'I', active: true, dur: 15, from: today(), ...defaults },
    async d => { if (!d.title || !d.title.trim()) { toast('Donne un intitulé.'); return false; } if (!(d.days || []).length) { toast('Choisis au moins un jour.'); return false; } setTimeout(() => S.days[today()] && touchDay(today()), 0); });
}
export function taskForm(t, defaults = {}) {
  editItem('tasks', 'tâche ponctuelle', [
    { k: 'title', label: 'Intitulé' }, { k: 'domain', label: 'Domaine', type: 'select', options: domOpts() },
    { k: 'date', label: 'Date / échéance', type: 'date' }, { k: 'time', label: 'Heure (facultatif)', type: 'time' },
    { k: 'dur', label: 'Durée estimée (min)', type: 'number', min: 0 }, { k: 'priority', label: 'Priorité', type: 'select', options: PRIO },
  ], t, { domain: 'pro', date: today(), priority: 'I', dur: 30, ...defaults },
    async d => { if (!d.title || !d.title.trim()) { toast('Donne un intitulé.'); return false; } if (!d.date) { toast('Choisis une date.'); return false; } });
}
export function periodOptions(level) {
  if (level === 'Q') return Object.fromEntries(quarters().map(q => [q.id, `${q.n} (${fmtDay(q.from)} → ${fmtDay(q.to)})`]));
  if (level === 'M') return Object.fromEntries(months().map(m => [m, fmtMonth(m)]));
  return { '': 'Toute l\'année' };
}
export function goalForm(g, defaults = {}) {
  const level = (g || defaults).level || 'M';
  const q = quarterOf(today());
  editItem('goals', 'objectif ' + LEVELS[level].toLowerCase(), [
    { k: 'title', label: 'Objectif' }, { k: 'domain', label: 'Domaine', type: 'select', options: domOpts() },
    level !== 'A' ? { k: 'period', label: 'Période', type: 'select', options: periodOptions(level) } : null,
    level !== 'A' ? { k: 'parent', label: 'Rattaché à (facultatif)', type: 'select', options: { '': '— aucun —', ...Object.fromEntries(S.goals.filter(x => level === 'Q' ? x.level === 'A' : x.level !== 'M').map(x => [x.id, `${LEVELS[x.level]} · ${x.title}`])) } } : null,
    { k: 'priority', label: 'Priorité', type: 'select', options: PRIO }, { k: 'due', label: 'Échéance (facultatif)', type: 'date' },
    { k: 'status', label: 'État', type: 'select', options: { active: 'Actif', paused: 'Suspendu temporairement', done: 'Atteint' } },
    { k: 'auto', label: 'Mesure de la progression', type: 'select', options: AUTO },
    { k: 'target', label: 'Valeur cible (si mesure automatique)', type: 'number', hint: 'Ex. 80 (kg), 30 (publications), 4 (lives).' },
    { k: 'progress', label: 'Progression manuelle', type: 'range' }, { k: 'note', label: 'Notes', type: 'textarea', rows: 2 },
  ], g, { level, domain: 'disc', priority: 'I', status: 'active', auto: '', progress: 0, period: level === 'Q' ? (q ? q.id : 'Q1') : level === 'M' ? monthKey(today()) : '', ...defaults },
    async d => { if (!d.title || !d.title.trim()) { toast('Donne un intitulé.'); return false; } });
}
export function goalRow(g) {
  const p = goalProgress(g), D = DOMAINS[g.domain] || {};
  return h('button', { class: 'goal' + (g.status === 'paused' ? ' paused' : ''), onclick: () => goalForm(g) },
    h('span', { class: 'goal-h' }, dot(g.domain), h('b', null, g.title), h('em', null, g.status === 'paused' ? 'en veille' : p == null ? 'non renseigné' : num(p, 0) + ' %')),
    bar(g.status === 'paused' ? 0 : p, D.c),
    h('span', { class: 'item-m' }, [LEVELS[g.level], g.level === 'Q' ? g.period : g.level === 'M' && g.period ? fmtMonth(g.period) : null, PRIO[g.priority], g.auto ? 'calcul automatique' : null, g.due ? 'échéance ' + fmtDay(g.due) : null].filter(Boolean).join(' · ')));
}
export function addMenu(date) {
  sheet('Ajouter', close => h('div', { class: 'menu' },
    h('button', { class: 'btn ghost', onclick: () => { close(); taskForm(null, { date: date || today() }); } }, 'Une tâche ponctuelle'),
    h('button', { class: 'btn ghost', onclick: () => { close(); routineForm(null); } }, 'Une habitude ou activité hebdomadaire'),
    h('button', { class: 'btn ghost', onclick: () => { close(); goalForm(null, { level: 'M' }); } }, 'Un objectif mensuel'),
    h('button', { class: 'btn ghost', onclick: () => { close(); goalForm(null, { level: 'Q' }); } }, 'Un jalon trimestriel'),
    h('button', { class: 'btn ghost', onclick: () => { close(); goalForm(null, { level: 'A' }); } }, 'Un objectif annuel')));
}
export const fab = on => h('button', { class: 'fab', 'aria-label': 'Ajouter', onclick: on }, icon('plus', 26));
export const download = (name, text, type = 'application/json') => { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
