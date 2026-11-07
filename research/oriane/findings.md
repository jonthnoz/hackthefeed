# Vérification des recherches Oriane pour le hackathon

Le projet vise à aider le créateur d'une app à trouver des références marketing utiles, y compris hors de ses concurrents directs. Sokka sert de cas concret. La première passe valide la recherche combinée et la récupération de preuves. Elle ne valide pas un classement automatique des formats qui génèrent le plus d'interactions.

## Protocole et portée

Le [protocole](protocol.json) a été écrit avant les appels. La passe comprend 15 recherches de contenus et 6 créations d'assets. Les réponses contiennent 90 lignes et 76 identifiants uniques. Les répétitions incluent volontairement des contrôles, la pagination et un enrichissement des mêmes vidéos. Ces 76 identifiants ne correspondent donc pas à 76 publicités pertinentes.

Les résultats proviennent des six premiers éléments de chaque requête, sauf l'enrichissement ciblé. Ce n'est pas un échantillon aléatoire. Les recherches ont consommé les opérations prévues, mais le coût en crédits n'est pas exposé dans les réponses conservées.

Les sources sont la [documentation REST](https://connect.oriane.xyz/rest/docs), son [snapshot OpenAPI](openapi.json), les [requêtes et réponses](results.json), et les images conservées dans `media`. Les jugements manuels sont dans [annotations.json](annotations.json). Le contrôle local se relance avec `node research/oriane/verify.mjs`, sans appel réseau ni consommation de crédits.

## Les recherches disponibles

| Méthode | Fonctionnement documenté | Usage recommandé |
|---|---|---|
| `exactMatch` | Valeur complète du champ. Les valeurs dépassant 256 caractères ne correspondent pas. | Handle ou champ court connu. |
| `includesExactly` | Expression dans le champ, avec opérateur entre les expressions. | Noms d'apps, fonctions, formulations du problème. |
| `includesFuzzy` | Tous les mots d'une valeur, dans n'importe quel ordre, avec mots partiels. | Variantes lexicales, avec contrôle des faux positifs. |
| `visualSimilarity` avec asset texte | Création d'un asset texte, puis recherche visuelle par son identifiant. | Scènes, formats et descriptions de démonstrations. |
| `visualSimilarity` avec asset image | Image HTTPS ou base64 transformée en asset de référence. | Trouver des visuels proches d'un exemple choisi. |

`includesExactly`, `includesFuzzy` et les deux types de similarité ont été exécutés dans cette passe. `exactMatch` et sa limite de 256 caractères ont été lus dans le schéma, sans test dédié. Les usages recommandés restent des choix de conception.

`includesFuzzy` n'est pas une promesse de recherche par synonymes ou de compréhension d'une proposition de valeur. Dans cette passe, la requête `save places travel app` a remonté des promotions de pizzas et des vidéos de voyage générales. Augmenter le nombre de résultats n'améliore pas nécessairement leur utilité.

Le mode visuel accepte des assets texte de 300 caractères maximum. Les images peuvent être JPEG, PNG ou WebP, jusqu'à 20 Mio. Un asset est réutilisable. Les descriptions courtes et visuelles conviennent mieux à ce mécanisme qu'un long brief commercial. Cette dernière recommandation reste à comparer expérimentalement.

Chaque niveau de requête combine filtres et sous-requêtes avec `and` ou `or`. Les groupes sont imbriquables sur deux niveaux. Les opérateurs des valeurs et ceux des champs sont distincts. Le schéma prévoit au maximum 500 valeurs de filtre et 10 références de similarité visuelle sur l'ensemble d'une requête. Les noms de groupes peuvent être retournés dans `matchedQueries`. Ce dernier mécanisme est documenté, mais n'a pas été testé dans cette passe.

Le tri par pertinence doit être explicite. Le défaut documenté est `publishedAt`. Utiliser `visualSimilarity` pour explorer un style et `transcriptRelevance` pour une recherche dans les paroles. Le tri par interactions doit intervenir après un contrôle de pertinence.

## Résultats des hypothèses

| Hypothèse | Observation | Décision |
|---|---|---|
| H1. Les méthodes lexicales et visuelles apportent des résultats différents. | La recherche exacte trouve Wanderlog et Gobi. La recherche visuelle sans ces noms trouve un planificateur Paris et Trip Builder. | Validée comme capacité complémentaire. Pas de mesure générale de précision. |
| H2. Les catégories visuelles peuvent orienter la recherche. | Les six miniatures anime contiennent de l'anime, dont deux avec présentateur. Quatre miniatures UGC sont compatibles, une est une couverture graphique ambiguë et une montre un podcast. | Recherche utile pour présélectionner. Le label final doit venir de l'analyse des preuves. |
| H2. Le motion design peut être isolé proprement. | Cinq résultats sur six concernent surtout des tutoriels de création ou de montage. Ziggo Dome fournit un candidat d'annonce d'app graphique. | Non validée pour isoler automatiquement du motion design pur. Affiner les prompts et exclure les tutoriels avant une promesse produit. |
| H3. Élargir au besoin utilisateur apporte des références utiles. | Le corpus voyage inclut un planificateur Paris et Trip Builder. Le second domaine trouve un suivi de brossage, un outil de programme sportif et un mood tracker. | Validée comme piste de découverte. Généralisation partielle, avec tri de pertinence nécessaire. |
| H4. Vision et filtres peuvent être combinés. | Une recherche combine deux assets en AND, une sous-requête texte, Instagram, une période, une langue de légende et un minimum d'interactions. Les six résultats respectent plateforme, dates et minimum observables. | Combinaison acceptée. La langue de légende n'est pas exposée dans la projection `default`, donc cette contrainte n'a pas été contrôlée sur les valeurs retournées. |
| H5. Les preuves disponibles suffisent pour analyser les premières secondes. | Quatre vidéos détaillées sur six ont une frame avant ou à trois secondes. Quatre ont une transcription. Le premier segment de chacune de ces quatre dépasse trois secondes. | Validation partielle de la couverture. L'extraction exacte des mots avant trois secondes n'est pas établie. Afficher la fenêtre réellement disponible. |
| H6. Les interactions peuvent soutenir des comparaisons plus justes. | Sur les 90 lignes, le taux retourné correspond à `interactionsCount / viewsCount * 100`. La cohorte d'un même profil prévue au protocole n'a pas été récupérée. | Vérification partielle. La cohérence des taux est établie sur ces lignes. Une comparaison plus juste entre contenus reste à évaluer avec la cohorte manquante. |

Le contrôle par cohorte de profil est reporté pour rester dans le budget des 15 recherches. Aucun résultat de normalisation par créateur n'est revendiqué. La création d'un asset image a été retenue pour vérifier les deux entrées documentées du mode visuel.

Les annotations visuelles concernent les miniatures effectivement ouvertes, pas l'intégralité des vidéos. Les images d'une séquence Ziggo Dome à 0, 4,64 et 17 secondes ont aussi été ouvertes. La première est noire. Cela confirme qu'une frame horodatée disponible peut rester inutilisable.

## Exemples qui justifient l'élargissement

- [Les Frenchies](https://www.instagram.com/reel/Dej6cCAjahp/) présente un planificateur Paris qui rassemble carte et itinéraire. La frame de 2 secondes contient un appel à regarder la vidéo avant de préparer son voyage. Le problème de dispersion entre onglets est transférable à une app qui rassemble des lieux.
- [Trip Builder](https://www.tiktok.com/@david.and.rebecca/video/7674975360970181918) est présenté comme un moyen de sauvegarder les posts de voyage, trouver les lieux et créer un itinéraire. L'exemple est proche de Sokka malgré l'absence de marque dans le prompt de recherche. Sa première frame indexée est à 5,5 secondes, donc elle ne prouve pas le visuel du hook.
- [Ziggo Dome](https://www.instagram.com/reel/DeYvWaaxOPz/) fournit une annonce graphique d'app dans le domaine des événements. C'est une référence de présentation possible, pas un concurrent de Sokka.

La requête de second domaine associe habitudes, sport et apprentissage des langues. Elle vérifie que la recherche n'est pas limitée au voyage. Elle ne constitue pas un test contrôlé de précision sur une seule autre catégorie d'apps.

## Pagination, seuils et projections

Une deuxième page a repris l'`aiSearchAnchor` reçu à la première page. L'ancre est conservée et les deux pages ne partagent aucun identifiant. C'est un contrôle de continuité sur deux pages, pas une garantie de stabilité à long terme.

Les seuils de similarité sont documentés entre 0 et 1. Ajouter `minScore: 0.7` à la requête voyage, en conservant le tri visuel, produit les mêmes six premiers résultats et le même total annoncé. Cela ne prouve ni que le seuil est ignoré ni que les résultats sont pertinents. Les scores ne doivent pas être présentés comme une probabilité ou une qualité calibrée. Leur distribution et l'effet de plusieurs seuils restent à vérifier.

La requête combinant `minScore: 0.4`, des contraintes textuelles et un tri par interactions remonte notamment des vidéos de voyage très populaires sans app. Le total annoncé dépasse celui de la recherche visuelle initiale. Les changements simultanés de filtres et de tri empêchent d'en attribuer la cause. Ne pas utiliser ces totaux pour mesurer la taille d'un marché ou le gain de rappel.

La référence image anime revient elle-même en première position. Les cinq résultats suivants portent sur le même personnage ou univers d'après leurs légendes. Ce comportement est utile pour affiner une direction visuelle, mais peut réduire la diversité des idées.

`basic` convient à l'identité et aux compteurs. `default` ajoute transcription et OCR globaux. `full` fournit frames, segments et langues. La récupération détaillée doit être ciblée sur des candidats sélectionnés. Le schéma REST consulté ne fournit pas de champ de téléchargement direct du fichier vidéo complet dans ces réponses.

## Mesure et qualité des preuves

Les likes, commentaires et partages sont exposés séparément. Leur disponibilité et leur fraîcheur doivent accompagner les comparaisons. Zéro ne doit pas être transformé en preuve d'absence d'intérêt lorsque la collecte de la plateforme n'est pas établie. Le taux d'interactions reste distinct de la similarité visuelle.

Les langues de légende et de transcription sont distinctes. Le mood tracker japonais possède une transcription vide avec un code de langue `id`. Une valeur de langue isolée ne suffit donc pas à établir la langue réellement parlée. Les filtres de localisation concernent le contenu ou le profil, pas l'audience ni un ciblage publicitaire.

Une comparaison de formats demanderait une collecte qui ne sélectionne pas uniquement les posts les plus vus, des groupes comparables, un regroupement des republications et une vérification des labels. Les exemples sponsorisés déclarés doivent être signalés. Le résultat peut rester une association descriptive, sans attribuer les interactions au hook.

## Décision de cadrage

Le périmètre réalisable est un assistant qui part d'un brief d'app, cherche des références directes puis voisines, explique leur pertinence et propose des adaptations reliées aux preuves. Un LLM peut proposer les problèmes, bénéfices et formulations à rechercher, puis classer les candidats. Cette orchestration n'a pas encore été implémentée ou évaluée.

Le MVP peut exposer des catégories visuelles multi-labels et des interactions observées. Il doit conserver les inconnues et permettre la correction des catégories. L'analyse exacte des trois premières secondes, une statistique fiable par pays d'audience et un classement causal des formats ne sont pas validés par cette passe.

Les [spécifications proposées](hackathon-spec.md) découlent de ces résultats. Les contrôles quantitatifs calculés sont dans [verification.json](verification.json).
