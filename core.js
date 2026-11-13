// MON ANNÉE — socle : dates, stockage local, état, planification, statistiques.
// Aucune donnée personnelle n'est écrite dans ce fichier : tout vient du stockage local de l'appareil.
export const APP = 'mon-annee', VERSION = 1;

/* ---------- Dates ---------- */
export const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const today = () => iso(new Date());
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const utc = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);
export const dow = s => parse(s).getDay(); // 0 = dimanche
export const weekStart = s => addDays(s, -((dow(s) + 6) % 7)); // lundi
export const monthKey = s => s.slice(0, 7);
export const monthEnd = mk => { const [y, m] = mk.split('-').map(Number); return iso(new Date(y, m, 0)); };
export const addMonths = (mk, n) => { const [y, m] = mk.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
export const toMin = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fromMin = m => `${pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${pad(((m % 60) + 60) % 60)}`;
export const dur = m => m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + pad(m % 60) : ''}` : `${m} min`;
const F = (o) => new Intl.DateTimeFormat('fr-FR', o);
export const fmtLong = s => F({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parse(s));
export const fmtShort = s => F({ day: 'numeric', month: 'short' }).format(parse(s));
export const fmtDay = s => F({ weekday: 'short', day: 'numeric', month: 'short' }).format(parse(s));
export const fmtMonth = mk => { const t = F({ month: 'long', year: 'numeric' }).format(parse(mk + '-01')); return t[0].toUpperCase() + t.slice(1); };
export const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const num = (v, d = 1) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString('fr-FR', { maximumFractionDigits: d });
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- Référentiels ---------- */
export const DOMAINS = {
  pro: { n: 'Travail & études', c: '#5B8DB8', i: 'brief' },
  phys: { n: 'Physique & santé', c: '#2F9E73', i: 'heart' },
  barbe: { n: 'Barbe & soins', c: '#B08A5B', i: 'leaf' },
  pinox: { n: 'PINOX', c: '#3FBF6E', i: 'play' },
  agri: { n: 'Projet agricole', c: '#9AA86B', i: 'sprout' },
  disc: { n: 'Discipline', c: '#C9A24B', i: 'target' },
  spi: { n: 'Spiritualité', c: '#8E7CC3', i: 'moon' },
};
export const MAIN_DOMAINS = ['pro', 'phys', 'barbe', 'pinox', 'agri', 'disc'];
export const ST = {
  done: { l: 'Validé', i: '✓', w: 1 }, partial: { l: 'Partiel', i: '◐', w: .5 },
  postponed: { l: 'Reporté', i: '→' }, missed: { l: 'Non réalisé', i: '✕', w: 0 }, na: { l: 'Non applicable', i: '–' },
};
export const PRIO = { E: 'Essentiel', I: 'Important', S: 'Secondaire' };
export const LEVELS = { A: 'Annuel', Q: 'Trimestriel', M: 'Mensuel' };
export const PRAYERS = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };
export const PINOX_STATUS = ['idée', 'recherche', 'script', 'animation', 'montage', 'prêt', 'publié'];
export const SPORT_TAGS = ['strength', 'light', 'recovery'];

/* ---------- Stockage : IndexedDB, secours localStorage ---------- */
let idb = null, mode = 'idb';
const STORES = ['kv', 'days', 'photos'];
const openDB = () => new Promise((res, rej) => {
  const r = indexedDB.open(APP, 1);
  r.onupgradeneeded = () => STORES.forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); });
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
});
const tx = (st, rw, fn) => new Promise((res, rej) => {
  const t = idb.transaction(st, rw ? 'readwrite' : 'readonly'); const q = fn(t.objectStore(st));
  t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abort'));
});
const lk = (st, k) => `ma:${st}:${k}`;
export const db = {
  async init() {
    try { if (!('indexedDB' in self)) throw 0; idb = await openDB(); await tx('kv', true, s => s.put(1, '__probe')); mode = 'idb'; }
    catch (e) { mode = 'ls'; }
    return mode;
  },
  mode: () => mode,
  async get(st, k) { if (mode === 'ls') { const v = localStorage.getItem(lk(st, k)); return v == null ? undefined : JSON.parse(v); } return tx(st, false, s => s.get(k)); },
  async set(st, k, v) { if (mode === 'ls') { localStorage.setItem(lk(st, k), JSON.stringify(v)); return; } return tx(st, true, s => s.put(v, k)); },
  async del(st, k) { if (mode === 'ls') { localStorage.removeItem(lk(st, k)); return; } return tx(st, true, s => s.delete(k)); },
  async all(st) {
    if (mode === 'ls') { const p = `ma:${st}:`, o = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(p)) o.push([k.slice(p.length), JSON.parse(localStorage.getItem(k))]); } return o; }
    return new Promise((res, rej) => { const t = idb.transaction(st), s = t.objectStore(st), ks = s.getAllKeys(), vs = s.getAll(); t.oncomplete = () => res(ks.result.map((k, i) => [k, vs.result[i]])); t.onerror = () => rej(t.error); });
  },
  async clear(st) { if (mode === 'ls') { const p = `ma:${st}:`; Object.keys(localStorage).filter(k => k.startsWith(p)).forEach(k => localStorage.removeItem(k)); return; } return tx(st, true, s => s.clear()); },
};

/* ---------- État en mémoire ---------- */
export const COLLS = ['routines', 'tasks', 'goals', 'weights', 'beard', 'products', 'contents', 'lives', 'guests', 'agri', 'trainings', 'skills', 'notes', 'exercises', 'sessions', 'reviews', 'expenses'];
export const S = { settings: null, meta: {}, days: {} };
COLLS.forEach(c => S[c] = []);
export let onSaveError = () => { };
export const setSaveErrorHandler = f => onSaveError = f;

export const defaultSettings = () => ({
  start: '2026-11-13', end: '2027-11-13', name: '', theme: 'auto',
  wake: '06:00', sleepGoal: 7, buffer: 60, lunch: 45,
  obligations: [], // {id,label,days,start,end,before,after,until,on}
  prayers: { on: false, dur: 10, updated: '', times: { fajr: '', dhuhr: '', asr: '', maghrib: '', isha: '' } },
  body: { height: null, startWeight: null, targetWeight: null, fat: null, bmr: null, tdee: null },
  nutri: { kcalMin: null, kcalMax: null, protMin: null, protMax: null, water: 2000 },
  budget: { food: 0, foodFrom: '', care: 0, currency: 'FCFA' },
  pinox: { gaming: 70 }, agriActive: false,
  remind: { cp: '21:00', weighEvery: 7, backupEvery: 30 },
});
const deepFill = (o, d) => { for (const k in d) { if (o[k] === undefined) o[k] = d[k]; else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && o[k] && typeof o[k] === 'object') deepFill(o[k], d[k]); } return o; };

export async function load() {
  const kv = Object.fromEntries(await db.all('kv'));
  S.settings = kv.settings ? deepFill(kv.settings, defaultSettings()) : null;
  S.meta = kv.meta || {};
  COLLS.forEach(c => S[c] = Array.isArray(kv[c]) ? kv[c] : []);
  S.days = Object.fromEntries(await db.all('days'));
}
export const save = c => db.set('kv', c, S[c]).catch(e => onSaveError(e));
export const saveDay = d => db.set('days', d, S.days[d]).catch(e => onSaveError(e));
export const hasData = () => !!S.settings;

/* ---------- Programme annuel ---------- */
export function program(d = today()) {
  const { start, end } = S.settings, total = diffDays(start, end);
  const el = clamp(diffDays(start, d), 0, total);
  return { start, end, total, elapsed: el, remaining: total - el, pct: el / total * 100, before: d < start, after: d > end, dayNo: clamp(diffDays(start, d) + 1, 1, total) };
}
export function quarters() {
  const { start, end } = S.settings, out = [];
  const sd = parse(start);
  for (let i = 0; i < 4; i++) {
    const a = iso(new Date(sd.getFullYear(), sd.getMonth() + 3 * i, sd.getDate()));
    const b = i === 3 ? end : addDays(iso(new Date(sd.getFullYear(), sd.getMonth() + 3 * (i + 1), sd.getDate())), -1);
    out.push({ id: 'Q' + (i + 1), n: 'Trimestre ' + (i + 1), from: a, to: b });
  }
  return out;
}
export const quarterOf = d => quarters().find(q => d >= q.from && d <= q.to) || null;
export function months() { const o = []; let m = monthKey(S.settings.start); const e = monthKey(S.settings.end); while (m <= e) { o.push(m); m = addMonths(m, 1); } return o; }
export const monthRange = mk => ({ from: mk + '-01', to: monthEnd(mk) });
export function goalRange(g) {
  if (g.level === 'Q') { const q = quarters().find(x => x.id === g.period); if (q) return q; }
  if (g.level === 'M' && g.period) return monthRange(g.period);
  return { from: S.settings.start, to: S.settings.end };
}

/* ---------- Plan du jour ---------- */
const PR = { E: 0, I: 1, S: 2 };
function livePlan(date) {
  const dw = dow(date), pr = S.settings.prayers;
  const r = S.routines.filter(x => x.active !== false && (x.days || []).includes(dw) && !(x.pausedUntil && date <= x.pausedUntil) && (!x.from || date >= x.from) && (x.tag !== 'prayer' || pr.on))
    .map(x => ({ id: x.id, t: x.title, d: x.domain, tag: x.tag || '', time: x.tag === 'prayer' ? (pr.times[x.key] || '') : (x.time || ''), dur: +x.dur || 0, p: x.priority || 'I', k: 'r' }));
  const t = S.tasks.filter(x => x.date === date).map(x => ({ id: x.id, t: x.title, d: x.domain, tag: '', time: x.time || '', dur: +x.dur || 0, p: x.priority || 'I', k: 't' }));
  return [...r, ...t].sort((a, b) => (a.time || '99') < (b.time || '99') ? -1 : (a.time || '99') > (b.time || '99') ? 1 : PR[a.p] - PR[b.p]);
}
export function planFor(date) { const rec = S.days[date]; return (date < today() && rec && rec.plan) ? rec.plan : livePlan(date); }
export function dayRec(date) { return S.days[date] || (S.days[date] = { items: {} }); }
export function touchDay(date) { const r = dayRec(date); r.items = r.items || {}; if (date >= today() || !r.plan) r.plan = livePlan(date); return saveDay(date); }
export function setStatus(date, id, s, note) {
  const r = dayRec(date); const cur = r.items[id] || {};
  if (s === null) delete cur.s; else if (s !== undefined) cur.s = s;
  if (note !== undefined) cur.n = note;
  if (!cur.s && !cur.n) delete r.items[id]; else r.items[id] = cur;
  return touchDay(date);
}
/** Reporte un élément : l'original est marqué « reporté », une copie ponctuelle est créée à la nouvelle date. */
export async function postpone(date, item, to) {
  S.tasks.push({ id: uid(), title: item.t, domain: item.d, date: to, priority: item.p, dur: item.dur, time: '', from: item.id });
  await save('tasks'); await setStatus(date, item.id, 'postponed');
  if (S.days[to]) await touchDay(to);
}
export function pendingTasks() {
  const t = today();
  return S.tasks.filter(x => x.date < t && !(S.days[x.date] && S.days[x.date].items[x.id] && S.days[x.date].items[x.id].s));
}

/* ---------- Statistiques (uniquement à partir des données saisies) ---------- */
export function dayStats(date, filter) {
  const rec = S.days[date]; let plan = planFor(date); if (filter) plan = plan.filter(filter);
  let total = 0, score = 0, answered = 0; const done = {};
  for (const it of plan) {
    const s = rec && rec.items && rec.items[it.id] && rec.items[it.id].s;
    if (s) answered++;
    if (s === 'na' || s === 'postponed') continue;
    total++; if (s) score += ST[s].w;
    if (s === 'done' || s === 'partial') done[it.tag || '_'] = (done[it.tag || '_'] || 0) + 1;
  }
  const tracked = !!rec && (Object.values(rec.items || {}).some(x => x.s) || !!(rec.cp && rec.cp.done));
  return { total, score, answered, count: plan.length, tracked, rate: tracked && total ? score / total * 100 : null, done };
}
export function rangeStats(from, to, filter) {
  let tracked = 0, total = 0, score = 0, cps = 0; const done = {};
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const rec = S.days[d]; if (!rec) continue;
    if (rec.cp && rec.cp.done) cps++;
    const s = dayStats(d, filter); if (!s.tracked) continue;
    tracked++; total += s.total; score += s.score;
    for (const k in s.done) done[k] = (done[k] || 0) + s.done[k];
  }
  return { tracked, total, score, cps, done, rate: tracked && total ? score / total * 100 : null, days: diffDays(from, to) + 1 };
}
export const sportCount = (st) => SPORT_TAGS.reduce((a, t) => a + (st.done[t] || 0), 0);
export function avgWeight(from, to) { const w = S.weights.filter(x => x.date >= from && x.date <= to && x.kg > 0); return w.length ? w.reduce((a, x) => a + +x.kg, 0) / w.length : null; }
export function lastWeight() { const w = [...S.weights].sort((a, b) => a.date < b.date ? 1 : -1)[0]; return w || null; }
export function avgField(from, to, get) { let n = 0, s = 0; for (let d = from; d <= to; d = addDays(d, 1)) { const r = S.days[d]; const v = r ? get(r) : null; if (v != null && v !== '' && !isNaN(v)) { n++; s += +v; } } return n ? { avg: s / n, n, sum: s } : null; }
export function sleepHours(sl) { if (!sl || !sl.bed || !sl.wake) return null; let m = toMin(sl.wake) - toMin(sl.bed); if (m <= 0) m += 1440; return m / 60; }
export const published = (from, to) => S.contents.filter(c => c.status === 'publié' && c.published && c.published >= from && c.published <= to);
export const livesDone = (from, to) => S.lives.filter(l => l.done && l.date >= from && l.date <= to);

export function goalProgress(g) {
  const r = goalRange(g), t = today(), b = S.settings.body;
  switch (g.auto) {
    case 'weight': {
      const tgt = +g.target || b.targetWeight; if (!b.startWeight || !tgt) return null;
      const lw = lastWeight(); if (!lw) return null;
      const a = avgWeight(addDays(lw.date, -13), lw.date);
      return clamp((a - b.startWeight) / (tgt - b.startWeight) * 100, 0, 100);
    }
    case 'pubs': return g.target ? clamp(published(r.from, r.to).length / g.target * 100, 0, 100) : null;
    case 'lives': return g.target ? clamp(livesDone(r.from, r.to).length / g.target * 100, 0, 100) : null;
    case 'beard': return g.target ? clamp(S.beard.filter(x => x.date >= r.from && x.date <= r.to).length / g.target * 100, 0, 100) : null;
    case 'checkpoints': { const end = t < r.to ? t : r.to; if (end < r.from) return 0; const st = rangeStats(r.from, end); return clamp(st.cps / (diffDays(r.from, r.to) + 1) * 100, 0, 100); }
    default: return g.status === 'done' ? 100 : (+g.progress || 0);
  }
}
export const AUTO = { '': 'Manuel (je règle le %)', weight: 'Poids (moyenne des pesées)', pubs: 'Publications PINOX publiées', lives: 'Lives réalisés', beard: 'Bilans barbe enregistrés', checkpoints: 'Checkpoints du jour terminés' };

/* ---------- Emploi du temps, temps libre, sommeil ---------- */
export function dayBlocks(date) {
  const dw = dow(date);
  const obs = S.settings.obligations.filter(o => o.on !== false && (o.days || []).includes(dw) && (!o.until || date <= o.until) && (!o.from || date >= o.from) && o.start && o.end)
    .map(o => ({ ...o, s: toMin(o.start), e: toMin(o.end) })).sort((a, b) => a.s - b.s);
  const out = [];
  obs.forEach((o, i) => {
    const prev = obs[i - 1], bf = +o.before || 0;
    if (!prev) { if (bf) out.push({ s: o.s - bf, e: o.s, label: 'Trajet', type: 'trajet' }); }
    else {
      const gap = o.s - prev.e, pa = +prev.after || 0;
      if (gap >= pa + bf + 60) { if (pa) out.push({ s: prev.e, e: prev.e + pa, label: 'Trajet', type: 'trajet' }); if (bf) out.push({ s: o.s - bf, e: o.s, label: 'Trajet', type: 'trajet' }); }
      else if (bf) out.push({ s: prev.e, e: prev.e + bf, label: 'Trajet', type: 'trajet', conflict: gap < bf });
      else if (gap < 0) o.conflict = true;
    }
    out.push({ s: o.s, e: o.e, label: o.label, type: 'ob', conflict: o.conflict });
    if (i === obs.length - 1 && +o.after) out.push({ s: o.e, e: o.e + +o.after, label: 'Trajet retour', type: 'trajet' });
  });
  return out.sort((a, b) => a.s - b.s);
}
export function bedMin() { return toMin(S.settings.wake) - S.settings.sleepGoal * 60 + 1440; }
export function dayLoad(date) {
  const st = S.settings, w = toMin(st.wake), bed = bedMin(), blocks = dayBlocks(date);
  // union des blocs dans la fenêtre d'éveil
  let busy = 0, cur = w; const free = [];
  for (const b of blocks) { const s = clamp(b.s, w, bed), e = clamp(b.e, w, bed); if (s > cur && s - cur >= 15) free.push({ s: cur, e: s }); if (e > cur) { busy += e - Math.max(s, cur); cur = e; } }
  if (bed - cur >= 15) free.push({ s: cur, e: bed });
  const rec = S.days[date];
  const plan = planFor(date).filter(i => { const s = rec && rec.items[i.id] && rec.items[i.id].s; return s !== 'na' && s !== 'postponed'; });
  const inBlock = m => blocks.some(b => m >= b.s && m < b.e);
  const prayersOut = plan.filter(i => i.tag === 'prayer' && i.time && !inBlock(toMin(i.time))).length * (st.prayers.dur || 10);
  const longOb = blocks.some(b => b.type === 'ob' && b.e - b.s >= 360);
  const avail = Math.max(0, bed - w - busy - prayersOut - (+st.buffer || 0) + (longOb ? (+st.lunch || 0) : 0));
  const items = plan.filter(i => i.tag !== 'prayer');
  const load = items.reduce((a, i) => a + (i.dur || 0), 0);
  const late = items.filter(i => i.time && toMin(i.time) + (i.dur || 0) > bed);
  const clash = blocks.filter(b => b.conflict);
  const warn = [];
  if (load > avail) warn.push(`Journée chargée : ${dur(load)} d'actions prévues pour environ ${dur(avail)} réellement disponibles. Reporter une action protège ton sommeil.`);
  else if (items.length > 12) warn.push(`${items.length} actions prévues aujourd'hui : c'est beaucoup. Tu peux en reporter sans regret.`);
  late.forEach(i => warn.push(`« ${i.t} » se termine après l'heure de coucher conseillée (${fromMin(bed)}).`));
  clash.forEach(() => warn.push(`Le temps de trajet entre deux obligations est insuffisant : vérifie tes horaires.`));
  return { blocks, free, avail, load, warn, bed, wake: w, count: items.length };
}
export function sleepAlert() {
  const t = today(); const nights = [];
  for (let i = 0; i < 14 && nights.length < 7; i++) { const r = S.days[addDays(t, -i)]; const h = r && sleepHours(r.sleep); if (h != null) nights.push(h); }
  const short = nights.filter(h => h < 7).length;
  return nights.length >= 3 && short >= 3 ? { short, n: nights.length, avg: nights.reduce((a, b) => a + b, 0) / nights.length } : null;
}

/* ---------- Photos (stockées localement, jamais envoyées) ---------- */
export const photo = { get: id => db.get('photos', id), set: (id, v) => db.set('photos', id, v), del: id => db.del('photos', id) };
export function shrinkImage(file, max = 1100) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .8)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image illisible')); }; img.src = url;
  });
}

/* ---------- Sauvegarde / restauration ---------- */
export async function exportData(withPhotos = true) {
  const kv = { settings: S.settings, meta: S.meta }; COLLS.forEach(c => kv[c] = S[c]);
  const photos = withPhotos ? Object.fromEntries(await db.all('photos')) : {};
  return { app: APP, version: VERSION, exportedAt: new Date().toISOString(), data: { kv, days: S.days, photos } };
}
export function validateBackup(o) {
  const err = [];
  if (!o || typeof o !== 'object') return { ok: false, err: ['Le fichier n\'est pas un JSON valide.'] };
  if (o.app !== APP) err.push('Ce fichier n\'est pas une sauvegarde de MON ANNÉE.');
  if (typeof o.version !== 'number' || o.version > VERSION) err.push('Version de sauvegarde non prise en charge.');
  const d = o.data;
  if (!d || typeof d !== 'object' || !d.kv || typeof d.kv !== 'object') err.push('Structure de données absente.');
  else {
    if (!d.kv.settings || typeof d.kv.settings !== 'object' || !/^\d{4}-\d\d-\d\d$/.test(d.kv.settings.start || '')) err.push('Paramètres absents ou invalides.');
    COLLS.forEach(c => { if (d.kv[c] !== undefined && !Array.isArray(d.kv[c])) err.push(`Section « ${c} » invalide.`); });
    if (d.days && (typeof d.days !== 'object' || Object.keys(d.days).some(k => !/^\d{4}-\d\d-\d\d$/.test(k)))) err.push('Journal quotidien invalide.');
    if (d.photos && typeof d.photos !== 'object') err.push('Section photos invalide.');
  }
  if (err.length) return { ok: false, err };
  const days = Object.keys(d.days || {}).sort();
  return { ok: true, err, summary: { exportedAt: o.exportedAt, days: days.length, first: days[0], last: days[days.length - 1], weights: (d.kv.weights || []).length, goals: (d.kv.goals || []).length, routines: (d.kv.routines || []).length, contents: (d.kv.contents || []).length, photos: Object.keys(d.photos || {}).length, starter: !!o.starter } };
}
export async function restoreBackup(o) {
  const d = o.data;
  await db.clear('kv'); await db.clear('days'); await db.clear('photos');
  for (const k of ['settings', 'meta', ...COLLS]) if (d.kv[k] !== undefined) await db.set('kv', k, d.kv[k]);
  for (const k in (d.days || {})) await db.set('days', k, d.days[k]);
  for (const k in (d.photos || {})) await db.set('photos', k, d.photos[k]);
  await load();
}
export async function wipe() { await db.clear('kv'); await db.clear('days'); await db.clear('photos'); await load(); }
