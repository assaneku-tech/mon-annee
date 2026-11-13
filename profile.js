// Mon profil et mes paramètres : horaires, prières, repères, rappels, sauvegarde.
import * as C from './core.js';
import { S, save, today, fmtDay, fmtShort, num, uid, PRAYERS, DAYS, pad, diffDays, fromMin, bedMin, dur } from './core.js';
import { h, sheet, form, toast, card, empty, confirmDlg, icon } from './ui.js';
import { refresh, go, editItem, download } from './common.js';

export function applyTheme() {
  const th = (S.settings && S.settings.theme) || 'auto'; const dark = th === 'dark' || (th === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#121514' : '#F5F2EA';
}
const back = () => h('button', { class: 'icon-btn', 'aria-label': 'Retour', onclick: () => go('#/profile') }, icon('left'));
const sForm = (fields, after) => form(fields, S.settings, { onSave: async d => { if (after && after(d) === false) return; S.settings = d; await save('settings'); applyTheme(); toast('Paramètres enregistrés.'); refresh(); } });

const OB_FIELDS = [{ k: 'label', label: 'Intitulé' }, { k: 'days', label: 'Jours', type: 'days' }, { k: 'start', label: 'Début', type: 'time' }, { k: 'end', label: 'Fin', type: 'time' },
{ k: 'before', label: 'Trajet pour s\'y rendre (min)', type: 'number', min: 0 }, { k: 'after', label: 'Trajet de retour (min)', type: 'number', min: 0 },
{ k: 'from', label: 'Valable à partir du (facultatif)', type: 'date' }, { k: 'until', label: 'Valable jusqu\'au (facultatif)', type: 'date' }, { k: 'on', label: 'État', type: 'check', hint: 'Obligation active' }];
const freq = o => [1, 2, 3, 4, 5, 6, 0].filter(d => (o.days || []).includes(d)).map(d => DAYS[d]).join(' · ');

const SECTIONS = {
  general: ['Programme et apparence', () => sForm([{ k: 'name', label: 'Prénom (facultatif)' }, { k: 'start', label: 'Début du programme', type: 'date' }, { k: 'end', label: 'Fin du programme', type: 'date' },
  { k: 'theme', label: 'Thème', type: 'select', options: { auto: 'Automatique (selon le téléphone)', dark: 'Sombre', light: 'Clair' } }], d => { if (!d.start || !d.end || d.end <= d.start) { toast('Dates du programme invalides.'); return false; } })],
  horaires: ['Horaires et obligations', () => h('div', null,
    card('Obligations fixes', S.settings.obligations.length ? S.settings.obligations.map(o => h('button', { class: 'lrow' + (o.on === false ? ' off' : ''), onclick: () => obEdit(o) }, h('b', null, o.label), h('small', null, [freq(o), `${o.start}–${o.end}`, o.before ? `trajet ${o.before} min` : null, o.until ? 'jusqu\'au ' + fmtShort(o.until) : null, o.on === false ? 'inactive' : null].filter(Boolean).join(' · ')))) : empty('Aucune obligation.'),
      h('button', { class: 'btn ghost mt', onclick: () => obEdit(null) }, 'Ajouter une obligation'),
      h('p', { class: 'hint' }, 'Les trajets sont ajoutés automatiquement avant et après. Entre deux obligations rapprochées, c\'est le trajet « pour s\'y rendre » de la seconde qui est utilisé.')))],
  sommeil: ['Sommeil et temps disponible', () => h('div', null, sForm([{ k: 'wake', label: 'Heure de réveil souhaitée', type: 'time' }, { k: 'sleepGoal', label: 'Durée de sommeil à protéger (heures)', type: 'number', min: 6, max: 10, step: '0.5', hint: 'Recommandé : 7 à 9 heures.' },
  { k: 'buffer', label: 'Temps incompressible hors obligations (repas, toilette, préparation) — min', type: 'number', min: 0 }, { k: 'lunch', label: 'Pause utilisable les jours d\'obligation longue — min', type: 'number', min: 0 }], d => { if (!d.wake) { toast('Indique une heure de réveil.'); return false; } if (d.sleepGoal < 6) { toast('Protège au moins 6 heures de sommeil.'); return false; } }),
    h('p', { class: 'hint' }, `Avec ces réglages, le coucher conseillé est ${fromMin(bedMin())}. L'application signale les journées dont les actions dépassent le temps réellement disponible.`))],
  prieres: ['Prières et jeûne', () => h('div', null, sForm([{ k: 'prayers.on', label: 'Module', type: 'check', hint: 'Afficher les cinq prières dans mes journées' }, ...Object.entries(PRAYERS).map(([k, n]) => ({ k: 'prayers.times.' + k, label: n, type: 'time' })), { k: 'prayers.dur', label: 'Durée réservée par prière (min)', type: 'number', min: 0 }], d => { d.prayers.updated = today(); }),
    h('p', { class: 'hint' }, 'Les heures de prière changent au fil de l\'année : elles ne sont jamais calculées automatiquement. Saisis-les d\'après ta mosquée ou ton calendrier habituel ; un rappel te proposera de les vérifier toutes les trois semaines.' + (S.settings.prayers.updated ? ` Dernière mise à jour : ${fmtDay(S.settings.prayers.updated)}.` : '')),
    h('p', { class: 'hint' }, 'Les jours de jeûne se règlent dans Objectifs › Habitudes (jours modifiables, suspension possible).'))],
  nutrition: ['Corps et repères nutritionnels', () => h('div', null, sForm([{ type: 'title', label: 'Données de référence' }, { k: 'body.height', label: 'Taille (cm)', type: 'number' }, { k: 'body.startWeight', label: 'Poids de référence (kg)', type: 'number' }, { k: 'body.targetWeight', label: 'Objectif indicatif (kg)', type: 'number' },
  { k: 'body.fat', label: 'Masse grasse de départ (%)', type: 'number' }, { k: 'body.fatEnd', label: 'Masse grasse actuelle (%) — pour le bilan annuel', type: 'number' }, { k: 'body.bmr', label: 'Métabolisme basal affiché par l\'appareil (kcal)', type: 'number' }, { k: 'body.tdee', label: 'Dépense estimée par l\'appareil (kcal)', type: 'number' },
  { type: 'title', label: 'Repères quotidiens (indicatifs)' }, { k: 'nutri.kcalMin', label: 'Énergie — minimum (kcal)', type: 'number' }, { k: 'nutri.kcalMax', label: 'Énergie — maximum (kcal)', type: 'number' }, { k: 'nutri.protMin', label: 'Protéines — minimum (g)', type: 'number' }, { k: 'nutri.protMax', label: 'Protéines — maximum (g)', type: 'number' }, { k: 'nutri.water', label: 'Hydratation (ml)', type: 'number' }]),
    h('p', { class: 'hint' }, 'Les valeurs d\'appareil (métabolisme, dépense, masse grasse) sont des estimations. Les repères nutritionnels sont indicatifs, à réévaluer toutes les deux semaines selon tes moyennes de poids et ta tolérance digestive. Ils ne remplacent pas l\'avis d\'un professionnel de santé.'))],
  budgets: ['Budgets et PINOX', () => sForm([{ k: 'budget.currency', label: 'Devise' }, { k: 'budget.food', label: 'Budget alimentaire par jour', type: 'number' }, { k: 'budget.foodFrom', label: 'Budget alimentaire appliqué à partir du', type: 'date' }, { k: 'budget.care', label: 'Budget soins par mois', type: 'number' },
  { type: 'title', label: 'PINOX' }, { k: 'pinox.gaming', label: 'Part visée de contenus gaming (%)', type: 'number', min: 0, max: 100, hint: 'Le reste correspond aux décryptages de l\'actualité.' }])],
  rappels: ['Rappels', () => h('div', null, sForm([{ k: 'remind.cp', label: 'Heure du rappel de checkpoint', type: 'time' }, { k: 'remind.weighEvery', label: 'Rappel de pesée : tous les … jours', type: 'number', min: 1 }, { k: 'remind.backupEvery', label: 'Rappel de sauvegarde : tous les … jours', type: 'number', min: 1 }]),
    card('Comment fonctionnent les rappels', h('p', { class: 'p' }, 'Les rappels s\'affichent en haut de l\'Accueil à chaque ouverture : checkpoint du jour, bilans hebdomadaire, mensuel et trimestriel, pesée, bilan barbe, sauvegarde, heures de prière.'),
      h('p', { class: 'box' }, 'Limite à connaître : sans serveur (donc sans service payant), une application web installée ne peut pas déclencher de notification fiable lorsqu\'elle est fermée. Aucune notification système n\'est donc promise.'),
      h('p', { class: 'p' }, 'Solution fiable et gratuite : ajoute les rappels à l\'agenda de ton téléphone. Le fichier ci-dessous crée des événements récurrents avec alarme (Google Agenda ou autre).'),
      h('button', { class: 'btn', onclick: exportICS }, 'Télécharger les rappels pour mon agenda (.ics)')))],
  sauvegarde: ['Sauvegarde et restauration', backupView],
  notice: ['Notice : limites du stockage local', () => card(null,
    ...['Tes données sont enregistrées uniquement dans le navigateur de cet appareil (IndexedDB). Elles ne sont envoyées nulle part et ne sont pas synchronisées entre plusieurs appareils.',
      'Elles sont liées au navigateur ET à l\'adresse du site : un autre navigateur, un autre téléphone ou une autre adresse = une application vide.',
      'Tu peux les perdre si tu effaces les « données de site » ou l\'historique complet du navigateur, si tu désinstalles le navigateur, si le téléphone est réinitialisé, perdu ou cassé. Android peut aussi libérer de l\'espace quand le stockage est saturé (l\'application demande un stockage « persistant » pour limiter ce risque, sans garantie).',
      'La navigation privée ne conserve rien.', 'La seule protection réelle est la sauvegarde : exporte le fichier JSON au moins une fois par mois (un rappel est prévu) et range-le hors du téléphone : envoi à toi-même, Google Drive, ordinateur.',
      'Le fichier de sauvegarde contient tes données personnelles et tes photos : ne le dépose jamais dans le dépôt GitHub public.'].map(t => h('p', { class: 'p' }, t)))],
  danger: ['Réinitialisation', () => card(null, h('p', { class: 'p' }, 'Efface toutes les données de cet appareil : journal, objectifs, pesées, photos, paramètres. Action irréversible.'),
    h('button', { class: 'btn danger', onclick: async () => { if (!await confirmDlg('Supprimer toutes les données de cet appareil ? Fais d\'abord une sauvegarde si tu veux les garder.', 'Continuer', true)) return; if (!await confirmDlg('Dernière confirmation : tout sera définitivement effacé.', 'Tout effacer', true)) return; await C.wipe(); location.hash = '#/home'; refresh(); toast('Données effacées.'); } }, 'Effacer toutes mes données'))],
};
function obEdit(o) {
  const isNew = !o; const val = o || { id: uid(), days: [1, 2, 3, 4, 5], before: 0, after: 0, on: true };
  sheet(isNew ? 'Nouvelle obligation' : 'Modifier l\'obligation', close => form(OB_FIELDS, val, {
    onSave: async d => { if (!d.label || !d.start || !d.end || d.end <= d.start) return toast('Intitulé et horaires valides requis.'); const a = S.settings.obligations, i = a.findIndex(x => x.id === d.id); i < 0 ? a.push(d) : a[i] = d; await save('settings'); close(); refresh(); },
    onDelete: isNew ? null : async () => { if (!await confirmDlg('Supprimer cette obligation ?', 'Supprimer', true)) return; S.settings.obligations = S.settings.obligations.filter(x => x.id !== val.id); await save('settings'); close(); refresh(); },
  }));
}

export function viewProfile(sec) {
  if (sec && SECTIONS[sec]) return h('div', { class: 'view' }, h('header', { class: 'top row' }, back(), h('h1', null, SECTIONS[sec][0])), SECTIONS[sec][1]());
  const st = S.settings, lb = S.meta.lastBackup;
  return h('div', { class: 'view' }, h('header', { class: 'top' }, h('h1', null, 'Mon profil')),
    card(null, h('div', { class: 'kvs' }, h('div', { class: 'kv' }, h('small', null, 'Programme'), h('b', null, `${fmtShort(st.start)} → ${fmtShort(st.end)}`), h('em', null, diffDays(st.start, st.end) + ' jours')),
      h('div', { class: 'kv' }, h('small', null, 'Dernière sauvegarde'), h('b', null, lb ? fmtShort(lb.slice(0, 10)) : 'Jamais'), h('em', null, lb ? `il y a ${diffDays(lb.slice(0, 10), today())} j` : 'à faire')))),
    h('section', { class: 'card menu' }, Object.entries(SECTIONS).map(([k, [n]]) => h('button', { class: 'lrow nav', onclick: () => go('#/profile/' + k) }, h('b', null, n), icon('right', 18)))),
    h('p', { class: 'hint center' }, `MON ANNÉE v${C.VERSION} · stockage : ${C.db.mode() === 'idb' ? 'IndexedDB (local)' : 'secours localStorage'} · aucune donnée n'est envoyée en ligne.`));
}

/* ---------- Sauvegarde ---------- */
function backupView() {
  const lb = S.meta.lastBackup; const est = h('span', null, '…');
  if (navigator.storage && navigator.storage.estimate) Promise.all([navigator.storage.estimate(), navigator.storage.persisted ? navigator.storage.persisted() : false]).then(([e, p]) => est.textContent = `${num((e.usage || 0) / 1048576, 1)} Mo utilisés · stockage ${p ? 'persistant accordé' : 'non garanti persistant'}`).catch(() => est.textContent = 'non disponible'); else est.textContent = 'non disponible';
  let withPhotos = true;
  return h('div', null,
    card('Exporter', h('p', { class: 'p' }, 'Dernière sauvegarde : ', h('b', null, lb ? `${fmtDay(lb.slice(0, 10))} (il y a ${diffDays(lb.slice(0, 10), today())} j)` : 'jamais')),
      h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: true, onchange: e => withPhotos = e.target.checked }), h('span', null, 'Inclure les photos (fichier plus lourd)')),
      h('button', { class: 'btn big mt', onclick: async () => { S.meta.lastBackup = new Date().toISOString(); await save('meta'); const data = await C.exportData(withPhotos); download(`mon-annee-sauvegarde-${today()}.json`, JSON.stringify(data)); toast('Sauvegarde téléchargée. Range-la hors du téléphone.'); refresh(); } }, 'Exporter toutes mes données (JSON)'),
      h('p', { class: 'hint' }, 'Conseil : une sauvegarde par mois au minimum, envoyée vers ta messagerie ou ton Drive. Ne la publie jamais sur GitHub.')),
    card('Restaurer', h('p', { class: 'p' }, 'Le fichier est vérifié avant toute restauration, et un résumé t\'est présenté pour confirmation.'), h('button', { class: 'btn ghost', onclick: () => importFlow() }, 'Importer une sauvegarde JSON')),
    card('État du stockage', h('p', { class: 'p' }, est), h('button', { class: 'link', onclick: () => go('#/profile/notice') }, 'Lire la notice sur les limites du stockage local')));
}
export function importFlow() {
  const inp = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, onchange: async () => {
    const f = inp.files[0]; inp.remove(); if (!f) return; let obj;
    try { obj = JSON.parse(await f.text()); } catch (e) { return sheet('Fichier refusé', h('p', { class: 'p' }, 'Ce fichier n\'est pas un JSON lisible. Rien n\'a été modifié.')); }
    const v = C.validateBackup(obj);
    if (!v.ok) return sheet('Sauvegarde invalide', h('div', null, h('p', { class: 'p' }, 'Rien n\'a été modifié. Problèmes détectés :'), h('ul', { class: 'ol' }, v.err.map(e => h('li', null, e)))));
    const s = v.summary;
    sheet(s.starter ? 'Profil de départ valide' : 'Sauvegarde valide', close => h('div', null,
      h('ul', { class: 'ol' }, s.exportedAt ? h('li', null, 'Créée le ' + fmtDay(s.exportedAt.slice(0, 10))) : null, h('li', null, `${s.days} jour(s) de journal` + (s.days ? ` (${fmtShort(s.first)} → ${fmtShort(s.last)})` : '')), h('li', null, `${s.goals} objectif(s), ${s.routines} habitude(s)`), h('li', null, `${s.weights} pesée(s), ${s.contents} contenu(s) PINOX, ${s.photos} photo(s)`)),
      C.hasData() ? h('p', { class: 'warn' }, 'Attention : la restauration remplace toutes les données actuellement présentes sur cet appareil.') : null,
      h('div', { class: 'row gap mt' }, h('button', { class: 'btn ghost grow', onclick: close }, 'Annuler'), h('button', { class: 'btn grow', onclick: async () => { try { await C.restoreBackup(obj); close(); toast('Données restaurées.'); location.hash = '#/home'; refresh(); } catch (e) { console.error(e); toast('Échec de la restauration.'); } } }, C.hasData() ? 'Remplacer mes données' : 'Importer'))));
  } });
  document.body.append(inp); inp.click();
}

/* ---------- Rappels pour l'agenda du téléphone (.ics) ---------- */
function exportICS() {
  const st = S.settings, t = today().replace(/-/g, ''), until = st.end.replace(/-/g, '') + 'T235900';
  const start = st.start > today() ? st.start.replace(/-/g, '') : t; const cp = st.remind.cp.replace(':', '') + '00';
  const ev = (id, title, dt, rule, desc) => ['BEGIN:VEVENT', `UID:${id}@mon-annee`, `DTSTAMP:${t}T000000`, `DTSTART:${dt}`, `DURATION:PT10M`, `RRULE:${rule};UNTIL=${until}`, `SUMMARY:${title}`, `DESCRIPTION:${desc}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].join('\r\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MON ANNEE//FR', 'CALSCALE:GREGORIAN',
    ev('cp', 'MON ANNÉE — checkpoint du jour', `${start}T${cp}`, 'FREQ=DAILY', 'Ouvre l\'application et termine ton checkpoint.'),
    ev('hebdo', 'MON ANNÉE — bilan hebdomadaire', `${start}T180000`, 'FREQ=WEEKLY;BYDAY=SU', 'Bilan de la semaine et 3 priorités.'),
    ev('mensuel', 'MON ANNÉE — bilan mensuel', `${start}T181500`, 'FREQ=MONTHLY;BYMONTHDAY=-1', 'Bilan du mois, objectifs du mois suivant.'),
    ev('mesures', 'MON ANNÉE — mesures physiques et photo barbe', `${start}T063000`, 'FREQ=MONTHLY;BYMONTHDAY=13', 'Pesée, mensurations, photo.'),
    ev('pesee', 'MON ANNÉE — pesée', `${start}T053000`, `FREQ=DAILY;INTERVAL=${Math.max(1, +st.remind.weighEvery || 7)}`, 'Pesée au réveil.'),
    ev('sauvegarde', 'MON ANNÉE — sauvegarde des données', `${start}T183000`, 'FREQ=MONTHLY;BYMONTHDAY=1', 'Profil › Sauvegarde › Exporter.'), 'END:VCALENDAR'].join('\r\n');
  download('mon-annee-rappels.ics', ics, 'text/calendar');
  toast('Fichier téléchargé : ouvre-le pour l\'ajouter à ton agenda.');
}
