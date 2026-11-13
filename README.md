# MON ANNÉE — 2026/2027

Application web progressive (PWA) de pilotage personnel sur douze mois : checkpoints quotidiens, objectifs annuels / trimestriels / mensuels, bilans et graphiques.
Elle fonctionne hors connexion, s'installe sur l'écran d'accueil d'Android et **conserve toutes les données sur l'appareil**.

## 1. Choix techniques et limites

| Sujet | Choix | Pourquoi |
|---|---|---|
| Code | HTML, CSS, JavaScript natif (modules), sans framework ni étape de compilation | Rien à installer, rien à maintenir, rapide sur un téléphone de milieu de gamme |
| Données | IndexedDB (secours automatique : localStorage) | Local, gratuit, hors ligne |
| Hors ligne | Service worker (cache des fichiers de l'application) | L'application s'ouvre sans Internet après la première visite |
| Graphiques | SVG faits maison, tactiles | Aucune bibliothèque externe à télécharger |
| Hébergement | GitHub Pages | Gratuit, HTTPS (obligatoire pour une PWA) |

Limites à connaître :

- **Aucune synchronisation.** Les données vivent dans un seul navigateur, sur un seul appareil. Changer de téléphone ou de navigateur = exporter puis importer la sauvegarde JSON.
- **Le stockage local peut être effacé** (suppression des « données de site », réinitialisation, téléphone perdu, stockage saturé). La seule protection est la sauvegarde JSON régulière. La notice complète est dans l'application : Profil › Notice.
- **Pas de notifications système.** Sans serveur, une PWA ne peut pas déclencher de notification fiable quand elle est fermée. À la place : rappels affichés à l'ouverture, et un fichier `.ics` (Profil › Rappels) qui crée de vraies alarmes récurrentes dans l'agenda du téléphone.
- **Heures de prière** : jamais calculées, toujours saisies à la main (Profil › Prières). Les valeurs du profil de départ sont approximatives et doivent être corrigées.
- Les repères nutritionnels, de poids et d'entraînement sont indicatifs : ce ne sont pas des prescriptions médicales.

## 2. Fichiers

```
index.html              page unique
style.css               thème sombre / clair
app.js                  démarrage, navigation, Accueil, Mon quotidien
core.js                 dates, stockage, calculs, planification, sauvegarde
ui.js                   composants, formulaires, graphiques
common.js               checkpoints, objectifs, habitudes, tâches
domains.js              espaces par domaine (physique, barbe, PINOX, pro, agricole, discipline)
reviews.js              bilans et graphiques
profile.js              paramètres, rappels, sauvegarde
manifest.webmanifest    installation sur l'écran d'accueil
service-worker.js       fonctionnement hors connexion
icon-*.png              icônes
```

Tous les fichiers sont au même niveau (pas de sous-dossier) pour pouvoir être envoyés sur GitHub depuis un téléphone.

**Confidentialité du dépôt.** Le code ne contient aucune donnée personnelle (ni poids, ni santé, ni horaires). Tes informations de départ sont dans un fichier séparé, `mon-annee-profil-depart.json`, que tu importes une seule fois dans l'application. **Ne mets jamais ce fichier ni tes sauvegardes dans le dépôt** (le fichier `.gitignore` les exclut si tu utilises git).

## 3. Publier gratuitement sur GitHub Pages (depuis Android)

1. Dans Chrome, ouvre **github.com** et crée un compte gratuit (ou connecte-toi).
2. Touche **+** › **New repository**. Nom : `mon-annee`. Choisis **Public** (nécessaire pour GitHub Pages gratuit). Coche **Add a README file**. Touche **Create repository**.
3. Sur le téléphone, ouvre l'application **Fichiers**, touche `mon-annee-app.zip` puis **Extraire**. Tu obtiens un dossier avec 15 fichiers.
4. Dans le dépôt GitHub : **Add file** › **Upload files** › **choose your files**. Si le menu n'apparaît pas, active « Version pour ordinateur » dans le menu ⋮ de Chrome.
5. Sélectionne **tous les fichiers du dossier extrait** (appui long sur le premier, puis touche les autres). Ne sélectionne pas `mon-annee-profil-depart.json`.
6. En bas de page, touche **Commit changes**.
7. Va dans **Settings** › **Pages**. Sous « Build and deployment » : Source = **Deploy from a branch**, Branch = **main**, dossier **/ (root)**, puis **Save**.
8. Attends une à deux minutes, recharge la page : l'adresse apparaît, de la forme `https://TON-PSEUDO.github.io/mon-annee/`.

## 4. Installer sur le téléphone

1. Ouvre l'adresse ci-dessus dans **Chrome** (pas en navigation privée).
2. Menu **⋮** › **Ajouter à l'écran d'accueil** › **Installer**.
3. Lance l'application depuis son icône.
4. Sur l'écran de bienvenue : **Importer mon profil de départ** et choisis `mon-annee-profil-depart.json`. Un résumé s'affiche ; confirme.
5. Va dans **Profil › Prières** pour corriger les heures, puis **Profil › Rappels** pour télécharger les rappels d'agenda.

Utilise toujours la même icône (même navigateur, même adresse) : c'est là que sont tes données.

## 5. Utilisation au quotidien

- **Accueil** : jour du programme, rappels, 3 priorités, obligations, checkpoints à traiter.
- **Valider** : touche le rond. **Autre statut** (partiel, reporté, non réalisé, non applicable) ou **note** : touche la ligne.
- **Quotidien › Suivi** : eau, protéines, digestion, dépense, sommeil, douleurs. Signaler une douleur propose de suspendre les exercices concernés.
- **Quotidien › Bilan** : questions du soir puis « Terminer mon checkpoint du jour ».
- **Bouton +** : tâche ponctuelle, habitude, objectif mensuel, jalon trimestriel, objectif annuel.
- **Objectifs** : six domaines, chacun avec ses outils (pesées, séances, calendrier éditorial PINOX, lives, bilans barbe avec photo, formations…).
- **Bilans** : semaine, mois, trimestre, année, graphiques filtrables par période et par domaine.
- **Profil › Sauvegarde** : export JSON (au moins une fois par mois), import avec vérification.

Règles de calcul : le taux de réalisation ne porte que sur les jours réellement suivis (validé = 1, partiel = 0,5 ; reporté et non applicable exclus). Une donnée absente s'affiche « — » ou « non renseigné », jamais zéro.

## 6. Mettre à jour l'application

Remplace les fichiers dans le dépôt, puis change `mon-annee-v1` en `mon-annee-v2` dans `service-worker.js`. L'application se met à jour à l'ouverture suivante ; les données ne sont pas touchées. Fais quand même une sauvegarde avant.

## 7. Tests réalisés

Dans Chromium en format mobile (390 × 844) : import du profil, refus d'un fichier invalide, validation en un geste, statuts partiel / reporté / non applicable avec note, calcul du taux, suivi du sommeil, suspension d'exercices après douleur, pesée, contenu PINOX, bilans, persistance après fermeture et réouverture, export puis effacement puis restauration, ouverture hors connexion, thème clair et sombre. Calculs de dates vérifiés (365 jours, trimestres, mois, changement d'année).

Non testé : installation réelle sur un téléphone Android et import du fichier `.ics` dans Google Agenda.
