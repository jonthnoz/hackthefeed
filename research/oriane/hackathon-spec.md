# Cadrage du prototype de recherche créative pour apps mobiles

Statut proposé après la première vérification Oriane. Le prototype aide un créateur d'app à découvrir des vidéos marketing pertinentes, comprendre leur présentation et préparer des idées adaptées à son produit. Il fonctionne à partir du besoin de l'utilisateur final, même si les concurrents directs sont peu présents.

La [vérification finale](final-findings.md) complète ce cadrage. Le parcours principal de démonstration est Sokka et les lieux sauvegardés. La détection d'une adresse absente est une branche d'inspiration par mécanismes voisins. Une app de notes transformées en flashcards et quiz fournit le sujet de secours hors voyage. Le [brief de démonstration](demo-brief.md) décrit le déroulé proposé.

Les capacités vérifiées et leurs limites sont dans [findings.md](findings.md). Le choix produit est d'utiliser un LLM multimodal pour transformer le brief en recherches et interpréter les références. Sa qualité reste à évaluer pendant le prototype. Les métriques, filtres et calculs restent déterministes.

## Décisions de produit

Le public cible est le builder non marketeur, ainsi que le marketeur qui souhaite déléguer la recherche. Le produit découvre les formes récurrentes d'un secteur à chaque étude. Cette découverte est une fonction livrée à l'utilisateur. La préparation du projet sert à définir une grille d'observation et à vérifier les capacités de recherche, pas à constituer une liste figée de recettes par secteur.

| Étape | Choix | Justification |
|---|---|---|
| Comprendre l'app et préparer les recherches | LLM retenu. | Traduire des fonctions en problèmes, bénéfices et propositions voisines sans règles spécifiques à chaque app. |
| Trouver les contenus et leurs compteurs | Oriane. | Le modèle ne doit pas inventer les sources ni les chiffres. |
| Filtrer les signaux de performance et calculer les ratios | Code déterministe. | Les bornes, tris, dénominateurs et effectifs doivent être vérifiables. |
| Qualifier la pertinence, les promesses et la présentation | LLM multimodal retenu. | Les légendes ne suffisent pas pour comprendre une démonstration ou distinguer ce qui est montré de ce qui est seulement évoqué. |
| Identifier les récurrences | Labels interprétés par modèle, puis regroupements et décomptes déterministes. | Séparer l'interprétation de la mesure. La synthèse conserve les exemples et les effectifs. |
| Adapter une approche à l'app | Même modèle, sortie courte et sourcée. | Produire une proposition concrète à partir des références analysées. |

Ce choix cadre le prototype. Il ne constitue pas une validation déjà acquise de la précision du modèle. Une grille interne commune guide l'analyse et reste extensible avec des observations émergentes. L'utilisateur ne remplit pas cette grille.

## Parcours principal

1. L'utilisateur fournit une URL d'app ou une description, puis choisit la langue des références. Il peut ajouter un problème client, des fonctions et des concurrents connus.
2. Le système propose un brief court et modifiable. Il sépare les fonctions réellement fournies, les bénéfices supposés et les publics possibles. Une URL inaccessible déclenche la saisie d'une description.
3. Le système prépare des recherches lexicales et visuelles. Il montre les axes retenus et permet de retirer un axe trop éloigné.
4. Le système sélectionne les références et présente les approches récurrentes observées. Chaque approche est reliée à des vidéos, des images horodatées et des interactions. Le système distingue références directes, voisines et mécanismes transposables.
5. Le système recommande des approches pour les différentes promesses de l'app, puis propose des hooks et des séquences sourcés. L'utilisateur peut explorer les références et modifier la proposition, sans devoir étudier le secteur lui-même.

L'objectif de la démonstration est de produire quelques références convaincantes et des idées exploitables pour deux apps de domaines différents. Le nombre de résultats ne constitue pas à lui seul une réussite.

## Informations du brief

| Élément | Origine et traitement |
|---|---|
| Nom et description | Saisie utilisateur ou fiche d'app accessible. |
| Fonctions | Extraites de la source. Toute fonction inférée reste marquée comme hypothèse. |
| Problèmes et bénéfices | Proposés par LLM, éditables. |
| Publics et situations | Hypothèses de recherche, pas des segments établis par Oriane. |
| Langue | Choix explicite. Langue des paroles et langue de légende restent distinctes. |
| Pays | Facultatif, défini comme localisation du contenu ou du profil. Ne pas le présenter comme pays de l'audience. |
| Exemples ou concurrents | Facultatifs. Le système peut chercher sans noms de marques. |

La liste de fonctions n'est pas un préalable obligatoire. Le brief peut partir d'une phrase de problème et être corrigé avant ou après la première recherche.

## Élargissement de la recherche

Le moteur propose des axes explicites, dans cet ordre.

| Niveau | Question | Exemple Sokka |
|---|---|---|
| Direct | Quelle app résout presque le même problème ? | Sauvegarder les lieux repérés dans des posts sur une carte. |
| Voisin dans le domaine | Quel produit répond à un autre besoin du même contexte ? | Itinéraire de voyage, découverte de restaurants, adresses entre amis. |
| Mécanisme transposable | Quelle autre démonstration rend un bénéfice comparable évident ? | Transformer des éléments dispersés en une vue organisée, retrouver quelque chose au bon moment. |

Chaque référence conserve son niveau et une phrase qui justifie le transfert. Les mécanismes hors domaine ne doivent pas remplacer silencieusement les résultats directs. L'utilisateur peut demander l'élargissement même si des concurrents existent.

Le LLM formule des variantes lexicales par langue et des descriptions visuelles courtes. Oriane effectue la recherche. Un modèle réévalue ensuite la pertinence sur les données retournées. Cette étape doit rejeter les résultats attirants visuellement mais sans rapport avec le brief. La simple appartenance à une catégorie de voyage ou de fitness n'établit pas l'utilité marketing.

Budget proposé pour une première recherche produit, à ajuster après vérification des crédits réels : quatre requêtes initiales, puis au maximum deux élargissements. Réutiliser les assets existants et enrichir un petit nombre de résultats avec `full`. La passe d'étude de 15 recherches ne doit pas devenir le coût par utilisateur du MVP.

## Catégories de contenu

Les catégories sont multi-labels. Les prompts servent à rechercher des candidats et ne deviennent jamais les labels définitifs.

| Dimension | Valeurs initiales |
|---|---|
| Présentation | UGC, capture d'écran ou démo d'app, composition graphique, montage de scènes réelles, mixte, indéterminé. |
| Mouvement | Motion design observable sur une séquence, non établi. Une image statique seule ne prouve pas une animation. |
| Angle | Problème puis solution, démonstration, témoignage, avant puis après, recommandation, histoire, indéterminé. |
| Style visuel | Réaliste, anime, illustration 2D, 3D, mixte, indéterminé. |

UGC décrit une présentation personnelle ou un témoignage dans un style de créateur. Il ne déclare pas si la personne est réelle ou générée. Un podcast n'est pas automatiquement du UGC. Une démo d'app peut accompagner du UGC ou une composition graphique.

La classification automatique éventuelle cite au moins une frame ou un passage. L'interface permet de corriger le label. Les labels fondés uniquement sur une miniature portent cette limite.

## Fiche de référence

Chaque fiche comporte le lien de publication, le créateur, la plateforme, la date, la durée et le niveau de pertinence. Les métriques sont les vues, likes, commentaires, partages et taux d'interactions lorsqu'ils sont disponibles. La date de collecte accompagne les compteurs.

Les images montrent leur timestamp réel. La miniature est distincte d'une frame d'ouverture. Pour le texte, distinguer la légende, l'OCR d'une frame et la parole transcrite.

Un segment allant de 0 à 5,52 secondes reste un segment de 5,52 secondes. Le système ne prétend pas isoler les mots prononcés avant 3 secondes. Une première frame à 5,5 secondes produit un état explicite de couverture insuffisante pour le visuel d'ouverture. Une frame noire ne compte pas comme preuve lisible du hook.

## Comparaison des interactions

La recherche part d'un domaine assez large et applique des seuils de vues ou d'interactions dans Oriane avant la décomposition détaillée. Le système vérifie ensuite le rapport au brief sur les candidats retenus. Un contenu hors sujet n'est pas analysé en profondeur parce qu'il possède beaucoup de vues. Le coût d'analyse porte ainsi sur une présélection avec des signaux de performance.

La diffusion et les réactions restent deux dimensions visibles. Une vidéo très vue mais peu aimée ne doit pas être automatiquement recommandée avant une vidéo moins vue qui suscite davantage de réactions. Les seuils sont des choix de sélection, pas une définition universelle du succès. Les mesures restent séparées de la similarité visuelle.

Le MVP affiche des observations par vidéo et le nombre d'exemples dans chaque groupe. Il ne déduit pas qu'un format est meilleur à partir de quelques exemples. Les republications d'une même création sont regroupées autant que les preuves permettent de les reconnaître. La même vidéo TikTok et Instagram n'est pas deux idées indépendantes.

Une phase ultérieure peut ajouter des références par créateur, durée, période et plateforme, avec un effectif minimum défini avant analyse. Cette comparaison n'a pas été validée dans la première passe. Les installations, ventes et audiences géographiques ne sont pas inférées.

## Sortie créative

Pour chaque idée, le système fournit un problème ciblé, un hook proposé, une suite de plans et le bénéfice de l'app à montrer. Les sources permettent de comprendre ce qui a inspiré l'idée.

Une idée adaptée à Sokka peut montrer un Reel de restaurant, l'action de partage et l'épingle créée. Cette séquence est une proposition à tester, pas une conclusion de performance. Pour une app d'habitudes, les exemples de progression ou de rappels deviennent plus pertinents que la carte. Les sorties doivent changer avec le brief.

La génération de vidéos n'est pas requise pour démontrer ce parcours.

## Deux promesses distinctes dans le cas Sokka

La première promesse consiste à conserver et organiser les lieux repérés. La deuxième, précisée par le porteur du projet, consiste à identifier une adresse qui n'est pas directement mentionnée grâce aux indices du contenu. Le système doit conserver ces deux axes, plutôt que réduire l'app à sa fonction de carte.

| Promesse | Problème | Familles de références à rechercher | Preuve attendue dans une proposition |
|---|---|---|---|
| Organiser les lieux | Les publications enregistrées deviennent difficiles à retrouver au bon moment. | Favoris, listes, cartes personnelles, préparation de voyages. | La transformation d'un contenu sauvegardé en lieu consultable sur la carte. |
| Identifier une adresse absente | Un lieu donne envie, mais le nom ou l'adresse manque. | Recherche visuelle, identification d'objets ou de lieux, enquêtes et révélations. | L'absence d'adresse au départ, des indices observables, puis une identification vérifiée. |

Le second axe est une hypothèse créative à explorer. Il ne démontre pas qu'un format d'enquête surperforme un format de sauvegarde. L'analyse du compte existant doit distinguer attention pour le lieu et compréhension de la capacité de l'app.

## Séquence de démonstration du hackathon

Une démonstration d'environ 90 secondes suit un parcours complet. Le builder colle le lien de son app. Le système distingue ses promesses, trouve les références et fait apparaître quelques approches avec leurs preuves. Le builder ouvre une approche et obtient une adaptation visuelle sourcée.

Le moment central montre comment deux fonctions d'une même app conduisent à deux recherches et deux propositions créatives différentes. Pour Sokka, passer de l'organisation de favoris à l'identification d'une adresse cachée doit changer les références et le scénario proposé. Cette comparaison est plus démonstrative qu'une longue liste de vidéos.

Le montage utilise une capture du prototype avec ses vrais résultats, puis montre le storyboard proposé. Les données mises en cache sont signalées comme telles. Une génération complète de vidéo et une analyse exhaustive de plusieurs pays sont hors du premier parcours.

## Critères de réussite du prototype

- Pour deux briefs d'apps de domaines distincts, retrouver au moins trois références directes ou voisines acceptées par le porteur de projet. Documenter pourquoi les autres sont rejetées.
- Montrer un élargissement utile lorsque la recherche directe fournit trop peu de références.
- Distinguer sujet, style visuel et angle. Ne pas appeler toute vidéo parlant de motion design une annonce en motion design.
- Relier chaque description de hook à sa source et à la fenêtre temporelle réellement disponible.
- Afficher les métriques reçues avec leurs inconnues, sans conversion en promesse de ventes.
- Préparer au moins deux idées adaptées à chaque brief, chacune reliée à des références pertinentes.
- Respecter le budget de requêtes configuré et conserver requêtes, identifiants et résultats nécessaires à une reprise.

Ces critères évaluent la démonstration. Ils ne constituent pas un test statistique de supériorité du produit.

## Vérifications qui restent avant une promesse plus large

La vérification finale a comparé une recherche orientée par besoin et une recherche populaire sur trois briefs, avec une qualification indépendante des candidats. La future chaîne automatisée d'expansion et de classification n'a pas encore été implémentée ou évaluée. Le premier incrément doit vérifier ses décisions sur les références conservées et sur un nouveau brief. Il faut aussi confirmer le coût en crédits, mieux calibrer les seuils et vérifier les cas sans langue ou sans média utilisable.

Le périmètre retenu peut être spécifié et prototypé sans attendre une analyse exhaustive de tous les formats et pays. Les fonctions de classement automatique des formats les plus performants demandent une collecte et une évaluation supplémentaires.
