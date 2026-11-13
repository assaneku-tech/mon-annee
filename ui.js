// Petits outils d'interface : création d'éléments, feuilles modales, formulaires, graphiques SVG.
import { DAYS, num } from './core.js';

export const $ = (s, r = document) => r.querySelector(s);
function add(e, kids) { for (const k of kids.flat(Infinity)) { if (k == null || k === false || k === '') continue; e.append(k instanceof Node ? k : document.createTextNode(String(k))); } return e; }
export function h(tag, a, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  return add(e, kids);
}
export function s(tag, a, ...kids) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); }
  return add(e, kids);
}
const IC = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10', day: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4M8 14l3 3 5-6', target: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4a5 5 0 100 10 5 5 0 000-10zm0 4a1 1 0 100 2 1 1 0 000-2z',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6', plus: 'M12 5v14M5 12h14',
  brief: 'M3 8h18v12H3zM9 8V5h6v3', heart: 'M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.500-7 10-7 10z', leaf: 'M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l8-8',
  play: 'M5 5h14v14H5zM10 9l5 3-5 3z', sprout: 'M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 14c0-3 3-5 7-5 0 3-3 5-7 5z', moon: 'M20 14A8 8 0 019 4a8 8 0 1011 10z',
  left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', x: 'M6 6l12 12M18 6L6 18', edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', bell: 'M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4', save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
};
export const icon = (n, size = 22) => s('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, s('path', { d: IC[n] || IC.target }));

/* ---------- Feuille modale, confirmation, toast ---------- */
export function sheet(title, body, opts = {}) {
  const close = () => { ov.classList.remove('open'); setTimeout(() => ov.remove(), 180); opts.onClose && opts.onClose(); };
  const ov = h('div', { class: 'overlay', onclick: e => { if (e.target === ov) close(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-label': title },
      h('div', { class: 'sheet-head' }, h('h2', null, title), h('button', { class: 'icon-btn', 'aria-label': 'Fermer', onclick: close }, icon('x'))),
      h('div', { class: 'sheet-body' }, typeof body === 'function' ? body(close) : body)));
  document.body.append(ov); requestAnimationFrame(() => ov.classList.add('open'));
  return close;
}
export function confirmDlg(msg, ok = 'Confirmer', danger = false) {
  return new Promise(res => {
    let done = false;
    const close = sheet('Confirmation', c => h('div', null, h('p', { class: 'p' }, msg),
      h('div', { class: 'row gap' }, h('button', { class: 'btn ghost grow', onclick: () => { done = true; c(); res(false); } }, 'Annuler'),
        h('button', { class: 'btn grow ' + (danger ? 'danger' : ''), onclick: () => { done = true; c(); res(true); } }, ok))), { onClose: () => { if (!done) res(false); } });
  });
}
export function toast(msg) { const t = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(t); requestAnimationFrame(() => t.classList.add('open')); setTimeout(() => { t.classList.remove('open'); setTimeout(() => t.remove(), 250); }, 2600); }

/* ---------- Formulaire générique ---------- */
// field: {k,label,type,options,placeholder,min,max,step,hint}
export function form(fields, values, { onSave, onDelete, saveLabel = 'Enregistrer' } = {}) {
  const v = { ...values }; const get = (o, k) => k.split('.').reduce((a, p) => a == null ? a : a[p], o);
  const set = (o, k, val) => { const ps = k.split('.'); let a = o; ps.slice(0, -1).forEach(p => a = a[p] = a[p] && typeof a[p] === 'object' ? a[p] : {}); a[ps[ps.length - 1]] = val; };
  const data = JSON.parse(JSON.stringify(v));
  const ctl = f => {
    const cur = get(data, f.k);
    switch (f.type) {
      case 'select': return h('select', { class: 'in', onchange: e => set(data, f.k, e.target.value) }, Object.entries(f.options).map(([val, lab]) => h('option', { value: val, selected: String(cur ?? '') === val }, lab)));
      case 'textarea': return h('textarea', { class: 'in', rows: f.rows || 3, placeholder: f.placeholder || '', oninput: e => set(data, f.k, e.target.value) }, cur || '');
      case 'check': return h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: !!cur, onchange: e => set(data, f.k, e.target.checked) }), h('span', null, f.hint || ''));
      case 'days': { const sel = new Set(cur || []); return h('div', { class: 'chips' }, [1, 2, 3, 4, 5, 6, 0].map(d => { const b = h('button', { type: 'button', class: 'chip' + (sel.has(d) ? ' on' : ''), onclick: () => { sel.has(d) ? sel.delete(d) : sel.add(d); b.classList.toggle('on'); set(data, f.k, [...sel]); } }, DAYS[d]); return b; })); }
      case 'multi': { const sel = new Set(cur || []); return h('div', { class: 'chips' }, f.options.map(o => { const b = h('button', { type: 'button', class: 'chip' + (sel.has(o) ? ' on' : ''), onclick: () => { sel.has(o) ? sel.delete(o) : sel.add(o); b.classList.toggle('on'); set(data, f.k, [...sel]); } }, o); return b; })); }
      case 'scale': { const wrap = h('div', { class: 'chips' }); const draw = () => { wrap.replaceChildren(...[1, 2, 3, 4, 5].map(n => h('button', { type: 'button', class: 'chip sq' + (+get(data, f.k) === n ? ' on' : ''), onclick: () => { set(data, f.k, +get(data, f.k) === n ? null : n); draw(); } }, n))); }; draw(); return wrap; }
      case 'range': { const out = h('b', null, (cur || 0) + ' %'); return h('div', { class: 'row gap' }, h('input', { type: 'range', class: 'grow', min: 0, max: 100, step: 5, value: cur || 0, oninput: e => { set(data, f.k, +e.target.value); out.textContent = e.target.value + ' %'; } }), out); }
      default: return h('input', { class: 'in', type: f.type || 'text', value: cur ?? '', placeholder: f.placeholder || '', min: f.min, max: f.max, step: f.step || (f.type === 'number' ? 'any' : null), inputmode: f.type === 'number' ? 'decimal' : null,
        oninput: e => set(data, f.k, f.type === 'number' ? (e.target.value === '' ? null : +e.target.value) : e.target.value) });
    }
  };
  return h('form', { class: 'form', onsubmit: e => { e.preventDefault(); onSave && onSave(data); } },
    fields.filter(Boolean).map(f => f.type === 'title' ? h('h3', { class: 'ftitle' }, f.label) : f.type === 'note' ? h('p', { class: 'hint' }, f.label) :
      h('div', { class: 'field' }, h('label', null, f.label), ctl(f), f.hint && f.type !== 'check' ? h('small', { class: 'hint' }, f.hint) : null)),
    h('div', { class: 'row gap mt' }, onDelete ? h('button', { type: 'button', class: 'btn ghost danger-t', onclick: onDelete }, 'Supprimer') : null, h('button', { class: 'btn grow', type: 'submit' }, saveLabel)));
}

/* ---------- Composants ---------- */
export const card = (title, ...kids) => h('section', { class: 'card' }, title ? h('h3', { class: 'card-t' }, title) : null, ...kids);
export const bar = (pct, color) => h('div', { class: 'bar' }, h('i', { style: { width: (pct == null ? 0 : Math.max(0, Math.min(100, pct))) + '%', background: color || null } }));
export const empty = t => h('p', { class: 'empty' }, t);
export const seg = (opts, cur, on) => h('div', { class: 'seg', role: 'tablist' }, Object.entries(opts).map(([k, l]) => h('button', { class: k === cur ? 'on' : '', role: 'tab', 'aria-selected': k === cur, onclick: () => on(k) }, l)));
export function ring(pct, label, sub) {
  const r = 44, c = 2 * Math.PI * r;
  return h('div', { class: 'ring' }, s('svg', { viewBox: '0 0 100 100', width: 108, height: 108 },
    s('circle', { cx: 50, cy: 50, r, fill: 'none', stroke: 'var(--line)', 'stroke-width': 8 }),
    s('circle', { cx: 50, cy: 50, r, fill: 'none', stroke: 'var(--gold)', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-dasharray': `${c * Math.min(100, pct) / 100} ${c}`, transform: 'rotate(-90 50 50)' })),
    h('div', { class: 'ring-in' }, h('b', null, label), h('small', null, sub)));
}
export const legend = () => h('div', { class: 'legend' },
  h('span', null, h('i', { class: 'lg data' }), 'Saisi'), h('span', null, h('i', { class: 'lg goal' }), 'Objectif'),
  h('span', null, h('i', { class: 'lg est' }), 'Estimation'), h('span', null, h('i', { class: 'lg calc' }), 'Calculé'));

/* ---------- Graphiques SVG interactifs (aucune dépendance) ---------- */
// series: [{name, kind:'data'|'goal'|'est'|'calc', pts:[{x:number, y:number, label}]}], x numérique (jours)
export function lineChart({ series, unit = '', xTicks = [], height = 190 }) {
  const all = series.flatMap(z => z.pts); const dataPts = series.filter(z => z.kind !== 'goal').flatMap(z => z.pts);
  const W = 340, H = height, L = 38, R = 10, T = 12, B = 24;
  const box = h('div', { class: 'chart' }); const tip = h('div', { class: 'tip' }, dataPts.length ? 'Touchez un point pour le détail' : 'Aucune donnée saisie pour cette période');
  if (!all.length) { box.append(tip); return box; }
  let x0 = Math.min(...all.map(p => p.x)), x1 = Math.max(...all.map(p => p.x)), y0 = Math.min(...all.map(p => p.y)), y1 = Math.max(...all.map(p => p.y));
  if (x0 === x1) x1 = x0 + 1; const padY = (y1 - y0) * .12 || 1; y0 -= padY; y1 += padY;
  const X = x => L + (x - x0) / (x1 - x0) * (W - L - R), Y = y => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'svg' });
  for (let i = 0; i <= 3; i++) { const yv = y0 + (y1 - y0) * i / 3; svg.append(s('line', { x1: L, x2: W - R, y1: Y(yv), y2: Y(yv), class: 'grid' }), s('text', { x: L - 5, y: Y(yv) + 3, class: 'ax', 'text-anchor': 'end' }, num(yv, 1))); }
  xTicks.forEach(t => { if (t.x >= x0 && t.x <= x1) svg.append(s('text', { x: X(t.x), y: H - 6, class: 'ax', 'text-anchor': 'middle' }, t.label)); });
  const mark = s('circle', { r: 7, class: 'mark', visibility: 'hidden' });
  series.forEach(z => {
    if (!z.pts.length) return;
    svg.append(s('polyline', { points: z.pts.map(p => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' '), class: 'ln ' + z.kind }));
    if (z.kind === 'data' || z.kind === 'calc') z.pts.forEach(p => svg.append(s('circle', { cx: X(p.x), cy: Y(p.y), r: z.pts.length > 40 ? 2 : 3.2, class: 'pt ' + z.kind })));
  });
  svg.append(mark);
  const pick = ev => {
    const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * W; let best = null, bd = 1e9;
    series.filter(z => z.kind !== 'goal').forEach(z => z.pts.forEach(p => { const d = Math.abs(X(p.x) - px); if (d < bd) { bd = d; best = { p, z }; } }));
    if (!best) return; mark.setAttribute('cx', X(best.p.x)); mark.setAttribute('cy', Y(best.p.y)); mark.setAttribute('visibility', 'visible');
    tip.textContent = `${best.p.label} — ${num(best.p.y, 2)} ${unit} (${best.z.name})`;
  };
  svg.addEventListener('pointerdown', pick); svg.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') pick(e); });
  box.append(svg, tip); return box;
}
// bars: [{label, value:number|null, detail}] ; null = non renseigné (jamais affiché comme 0)
export function barChart({ bars, unit = '', max, kind = 'calc', height = 170, goal }) {
  const W = 340, H = height, L = 30, R = 6, T = 12, B = 26; const box = h('div', { class: 'chart' });
  const vals = bars.map(b => b.value).filter(v => v != null); const tip = h('div', { class: 'tip' }, vals.length ? 'Touchez une barre pour le détail' : 'Aucune donnée saisie pour cette période');
  const m = max || Math.max(1, ...vals, goal || 0) * 1.1; const bw = (W - L - R) / Math.max(bars.length, 1);
  const Y = v => T + (1 - v / m) * (H - T - B); const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'svg' });
  for (let i = 0; i <= 2; i++) { const yv = m * i / 2; svg.append(s('line', { x1: L, x2: W - R, y1: Y(yv), y2: Y(yv), class: 'grid' }), s('text', { x: L - 4, y: Y(yv) + 3, class: 'ax', 'text-anchor': 'end' }, num(yv, 0))); }
  if (goal != null) svg.append(s('line', { x1: L, x2: W - R, y1: Y(goal), y2: Y(goal), class: 'ln goal' }));
  const every = Math.ceil(bars.length / 7); let selEl = null;
  bars.forEach((b, i) => {
    const x = L + i * bw + bw * .15, w = bw * .7; const empty = b.value == null;
    const rect = s('rect', { x, width: w, y: empty ? Y(0) - 3 : Y(Math.min(b.value, m)), height: empty ? 3 : Math.max(2, Y(0) - Y(Math.min(b.value, m))), rx: Math.min(4, w / 2), class: empty ? 'bar-empty' : 'bar-r ' + kind });
    const hit = s('rect', { x: L + i * bw, width: bw, y: T, height: H - T - B, fill: 'transparent', onpointerdown: () => { selEl && selEl.classList.remove('sel'); rect.classList.add('sel'); selEl = rect; tip.textContent = `${b.full || b.label} — ${empty ? 'non renseigné' : num(b.value, 1) + ' ' + unit}${b.detail ? ' · ' + b.detail : ''}`; } });
    svg.append(rect, hit);
    if (i % every === 0) svg.append(s('text', { x: x + w / 2, y: H - 8, class: 'ax', 'text-anchor': 'middle' }, b.label));
  });
  box.append(svg, tip); return box;
}
