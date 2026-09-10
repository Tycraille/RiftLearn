import type { Entry } from './types'

/** Reference dictionary: its keys define `MessageKey`. */
export const fr = {
  // App shell
  'app.loadingCards': 'Chargement des cartes…',
  'nav.home': 'Accueil',
  'nav.decks': 'Paquets',
  'nav.cards': 'Cartes',
  'nav.settings': 'Réglages',

  // Shared
  'common.back': 'Retour',
  'common.create': 'Créer',
  'common.cancel': 'Annuler',
  'common.close': 'Fermer',
  'common.delete': 'Supprimer',
  'common.percent': '{n} %',
  'common.cards': { one: '{n} carte', other: '{n} cartes' },
  'common.reviews': { one: '{n} révision', other: '{n} révisions' },

  // Study modes
  'mode.image.label': 'Image → nom + effet',
  'mode.image.short': 'Image',
  'mode.image.description': 'Reconnaître la carte à partir de son illustration : nom, coût, effet.',
  'mode.name.label': 'Nom → effet + coût',
  'mode.name.short': 'Nom',
  'mode.name.description': 'Réciter le coût et le texte de la carte à partir de son nom.',
  'mode.quiz.label': 'Quiz à choix multiples',
  'mode.quiz.short': 'Quiz',
  'mode.quiz.description': 'Questions générées automatiquement : coût, domaine, effet.',

  // Card types (deck labels)
  'type.Unit': 'Unités',
  'type.Spell': 'Sorts',
  'type.Gear': 'Équipements',
  'type.Rune': 'Runes',
  'type.Battlefield': 'Champs de bataille',

  // Card progress status
  'status.new': 'nouvelle',
  'status.learning': 'en cours',
  'status.mature': 'maîtrisée',
  'status.matureLegend': 'maîtrisée (≥ 21 j)',

  // FSRS states
  'cardState.0': 'Nouvelle',
  'cardState.1': 'Apprentissage',
  'cardState.2': 'Révision',
  'cardState.3': 'Réapprentissage',

  // Intervals
  'interval.lessThanMinute': '< 1 min',
  'interval.minutes': '{n} min',
  'interval.hours': '{n} h',
  'interval.days': '{n} j',
  'interval.months': '{n} mois',
  'interval.years': { one: '{n} an', other: '{n} ans' },

  // Quiz prompts
  'quiz.energy': 'Quel est le coût en énergie de « {name} » ?',
  'quiz.domain': 'Quel est le domaine de « {name} » ?',
  'quiz.nameFromText': 'Quelle carte a cet effet ?',
  'quiz.nameFromImage': 'Quelle est cette carte ?',

  // Card components
  'card.energy': '{n} énergie',
  'card.runeAny': 'rune de n’importe quel domaine',
  'card.rune': 'rune {domain}',
  'card.noText': 'Pas de texte.',
  'card.might': 'puissance',
  'card.exhaust': 'épuiser',
  'card.hiddenAlt': 'Carte à deviner',
  'card.flavour': '« {text} »',
  'stats.playRate': 'Taux de jeu',
  'stats.winRate': 'Taux de victoire',
  'stats.avgCopies': 'Copies moy.',
  'stats.decks': 'Decks',

  // Dashboard
  'dashboard.metaCount': {
    one: '{n} carte méta (≥ {threshold} % de taux de jeu)',
    other: '{n} cartes méta (≥ {threshold} % de taux de jeu)',
  },
  'dashboard.studyNow': 'Réviser maintenant',
  'dashboard.due': 'dues',
  'dashboard.new': 'nouvelles',
  'dashboard.streak': { one: 'jour d’affilée', other: 'jours d’affilée' },
  'dashboard.today': 'aujourd’hui',
  'dashboard.lastWeeks': '12 dernières semaines',
  'dashboard.heatmapCell': '{day} : {reviews}',
  'dashboard.progressTitle': 'Progression par domaine et type',
  'dashboard.breakdown': '{mature}/{total} · {fresh} nouv.',

  // Decks
  'decks.section.all': 'Méta',
  'decks.section.custom': 'Mes paquets',
  'decks.section.domain': 'Par domaine',
  'decks.section.type': 'Par type',
  'decks.section.set': 'Par set',
  'decks.all': 'Toutes les cartes méta',
  'decks.subtitle': 'Cartes jouées dans ≥ {threshold} % des decks',
  'decks.changeThreshold': 'changer le seuil',
  'decks.newDeck': '+ Nouveau paquet',
  'decks.noCustom': 'Aucun paquet personnalisé. Importe une decklist ou ajoute des cartes depuis leur fiche.',
  'decks.due': { one: '{n} due', other: '{n} dues' },
  'decks.new': { one: '{n} nouvelle', other: '{n} nouvelles' },
  'decks.mature': { one: '{n} maîtrisée', other: '{n} maîtrisées' },
  'decks.confirmDelete': 'Supprimer le paquet « {name} » ?',
  'decks.study': 'Réviser',
  'decks.form.name': 'Nom du paquet',
  'decks.form.namePlaceholder': 'Ex. Deck Akali Vendetta',
  'decks.form.decklist': 'Decklist (une carte par ligne : « 3 Defy », « Defy x3 »…)',
  'decks.form.recognized': { one: '{n} carte reconnue', other: '{n} cartes reconnues' },
  'decks.form.unknown': { one: '{n} inconnue : {names}', other: '{n} inconnues : {names}' },
  'decks.form.hint': 'Tu peux aussi ajouter des cartes une par une depuis leur fiche dans l’onglet Cartes.',

  // Cards browser
  'cards.search': 'Rechercher (nom ou texte)…',
  'cards.allDomains': 'Tous domaines',
  'cards.allTypes': 'Tous types',
  'cards.allSets': 'Tous sets',
  'cards.sort.play': 'Tri : taux de jeu',
  'cards.sort.win': 'Tri : taux de victoire',
  'cards.sort.energy': 'Tri : coût',
  'cards.sort.name': 'Tri : nom',
  'cards.metaOnly': 'Seulement ≥ {threshold} % de taux de jeu',
  'cards.showMore': 'Afficher plus ({n} restantes)',

  // Card detail
  'cardDetail.notFound': 'Carte introuvable.',
  'cardDetail.progress': 'Progression',
  'cardDetail.col.mode': 'Mode',
  'cardDetail.col.state': 'État',
  'cardDetail.col.next': 'Prochaine',
  'cardDetail.col.reps': 'Vues',
  'cardDetail.col.lapses': 'Oublis',
  'cardDetail.due': 'due',
  'cardDetail.in': 'dans {interval}',
  'cardDetail.confirmForget': 'Remettre cette carte à zéro pour ce mode ?',
  'cardDetail.forget': 'oublier',
  'cardDetail.totalReviews': '{reviews} au total.',
  'cardDetail.addToDeck': 'Ajouter à un paquet',
  'cardDetail.newDeckPlaceholder': 'Nouveau paquet…',

  // Study session
  'study.deckNotFound': 'Paquet introuvable',
  'study.preparing': 'Préparation de la session…',
  'study.reviewBadge': 'révision',
  'study.remaining': { one: '{n} restante', other: '{n} restantes' },
  'study.namePrompt': 'Coût ? Effet ?',
  'study.pickAnswer': 'Choisis une réponse',
  'study.next': 'Suivant',
  'study.flip': 'Retourner',
  'study.spaceKey': 'Espace',
  'study.grade.again': 'Encore',
  'study.grade.hard': 'Difficile',
  'study.grade.good': 'Bien',
  'study.grade.easy': 'Facile',
  'study.done': 'Session terminée',
  'study.answers': 'Réponses',
  'study.missed': 'Ratées',
  'study.minutes': 'Minutes',
  'study.nothingToStudy':
    'Rien à réviser pour l’instant dans ce paquet. Reviens plus tard ou augmente le quota de nouvelles cartes dans les réglages.',
  'study.backToDecks': 'Retour aux paquets',

  // Settings
  'settings.language': 'Langue',
  'settings.threshold': 'Seuil de taux de jeu',
  'settings.thresholdValue': '≥ {threshold} % → {cards}',
  'settings.thresholdHelp': 'Une carte entre dans les paquets si elle est jouée dans au moins ce pourcentage des decks de tournoi.',
  'settings.dailyNew': 'Nouvelles cartes / jour / mode',
  'settings.dailyReviews': 'Révisions max / jour / mode',
  'settings.enabledModes': 'Modes actifs',
  'settings.backup': 'Sauvegarde',
  'settings.backupHelp': 'La progression est stockée dans ce navigateur. Exporte-la pour la transférer sur un autre appareil.',
  'settings.export': 'Exporter (JSON)',
  'settings.import': 'Importer…',
  'settings.reset': 'Remise à zéro',
  'settings.confirmReset': 'Effacer toute la progression (états et historique) ? Les paquets personnalisés sont conservés.',
  'settings.resetDone': 'Progression remise à zéro.',
  'settings.confirmImport': 'Remplacer la progression locale par « {file} » ({cards}, {reviews}) ?',
  'settings.importDone': 'Progression importée.',
  'settings.importFailed': 'Import impossible : {error}',
  'settings.data': 'Données',
  'settings.dataSummary': '{cards} · stats calculées sur {decks} decks · import du {date}',
  'settings.sources': 'Sources :',
  'settings.sourcesStats': '(stats) et',
  'settings.sourcesCards': '(fiches). Pour rafraîchir :',

  // Progress import errors (thrown by db/repo.ts)
  'import.invalidJson': 'Le fichier n’est pas un JSON valide.',
  'import.notRiftlearn': 'Ce fichier n’est pas un export RiftLearn v1.',
  'import.incomplete': 'Export incomplet.',
} satisfies Record<string, Entry>

export type MessageKey = keyof typeof fr
