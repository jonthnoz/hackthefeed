# Analyse exploratoire du compte Sokka et décisions produit

Le produit doit rechercher et interpréter le secteur pour les builders non marketeurs et les marketeurs qui délèguent cette recherche. La découverte des approches récurrentes fait partie du résultat livré. L'utilisateur n'a pas à fournir les références ni à les qualifier lui-même.

## Sources et portée de l'observation

La recherche Oriane du 7 novembre 2026 sur le handle exact `sokka_map` et la plateforme TikTok a retourné zéro profil et zéro contenu. Cela indique l'absence de correspondances dans cette recherche, pas l'absence de publications.

La lecture publique TikTok a exposé le profil, mais le navigateur a rencontré un CAPTCHA avant d'afficher les vidéos. Aucun CAPTCHA n'a été résolu. Une récupération alternative via Influencers.club, accessible dans Firecrawl Alexandria, a retourné 19 publications, sans page supplémentaire. Les données sont conservées dans [sokka-posts.json](sokka-posts.json).

Cinq fichiers vidéo ont été téléchargés dans `sokka-media`. Des planches montrent les premières secondes à intervalles de deux secondes, puis huit images réparties sur la durée entière. L'analyse ci-dessous est visuelle. Elle ne repose pas sur une écoute ou une transcription de la bande sonore. Les métadonnées des fichiers sont dans [metadata.json](sokka-media/metadata.json).

## Formats effectivement observés

| Publication | Observations visuelles | Compteurs reçus |
|---|---|---|
| [Récit des restaurants envoyés](https://www.tiktok.com/@sokka_map/video/7705106745051401504) | Illustration 2D, personnages, accumulation de vidéos de restaurants, passage à une sortie concrète, puis carte et écran de marque. | 729 vues, 47 likes, 0 commentaire. |
| [Rendez-vous dans une heure](https://www.tiktok.com/@sokka_map/video/7704775856211758368) | Récit illustré avec horloge, difficulté à retrouver un ramen parmi les favoris, recherche sur carte, puis sortie au restaurant. | 758 vues, 42 likes, 0 commentaire. |
| [Plage et démonstration](https://www.tiktok.com/@sokka_map/video/7704042853609114913) | Paysage attirant, partage de la publication, analyse dans l'app, fiche du lieu, carte et écran de marque. | 736 vues, 14 likes, 0 commentaire. |
| [Introduction UGC puis capture d'écran](https://www.tiktok.com/@sokka_map/video/7697287517472640289) | Visage en ouverture, texte annonçant les lieux sur une carte, partage et démonstration de l'interface. | 814 vues, 17 likes, 0 commentaire. |
| [Introduction UGC puis téléphone filmé](https://www.tiktok.com/@sokka_map/video/7697274631098600736) | Visage et problème des adresses introuvables en ouverture, puis démonstration en filmant un téléphone. | 9 692 vues, 6 likes, 0 commentaire. |

Les premiers plans illustrés et les démonstrations sont distincts, mais ils peuvent porter une même promesse. Le téléphone filmé et la capture d'écran sont aussi deux réalisations différentes d'une démo d'app. UGC n'implique ici aucune conclusion sur l'origine réelle ou générée du visage.

## Ce que ces résultats permettent de dire

Sur la photographie reçue, la publication à 9 692 vues possède environ 0,06 % de likes par vue. Le récit à 729 vues possède environ 6,45 % de likes par vue. Le second récit atteint environ 5,54 %. Ces ratios sont des taux de likes, pas le taux d'interactions Oriane : le fournisseur alternatif ne retourne pas de partages pour ces publications.

Le format le plus diffusé et ceux qui ont reçu le plus de likes ne coïncident donc pas dans ce petit ensemble. L'ancienneté, la distribution payante éventuelle et les conditions de publication ne sont pas connues. Aucune supériorité causale d'un format n'est établie. Les compteurs ne fournissent pas non plus les installations ou la compréhension du produit par les spectateurs.

Une hypothèse de travail est que les récits illustrés donnent une situation à reconnaître, tandis que les démonstrations donnent une preuve d'usage. Cela suggère de comparer une ouverture par problème, une ouverture par résultat et une ouverture par énigme. Il faut tester ces variantes plutôt que déclarer que l'une fonctionne mieux.

## Deux capacités à traiter séparément

Le porteur du projet précise deux capacités. Sokka peut organiser les lieux extraits de publications. Sokka peut aussi identifier une adresse absente du texte explicite grâce à des indices. Cette seconde capacité provient de sa description, pas d'une vérification technique de l'app.

Les planches montrent surtout un passage de la publication au lieu enregistré. Elles n'établissent pas systématiquement quels indices ont permis la détection, ni que l'adresse était absente de toutes les données d'entrée. Pour communiquer la deuxième capacité, une future démonstration devrait rendre ce contraste observable.

| Capacité | Promesse à explorer | Références voisines utiles |
|---|---|---|
| Organiser les lieux | Retrouver et utiliser ses favoris au bon moment. | Favoris, listes, itinéraires, organisation de voyage. |
| Détecter une adresse implicite | Trouver le lieu malgré le nom ou l'adresse manquante. | Recherche visuelle, identification, enquête, révélation d'un résultat. |

Le produit doit associer chaque fonction à plusieurs promesses et plusieurs formes de démonstration. Une catégorie globale « voyage » ne suffit pas à préparer ces recherches.

## Décision sur le LLM

Le LLM est retenu pour deux responsabilités centrales. Il transforme une description d'app en problèmes, bénéfices et pistes de recherche. Il interprète ensuite les textes et images des références pour expliquer leur pertinence et leurs approches récurrentes. Un modèle multimodal est nécessaire au périmètre choisi pour que cette interprétation ne dépende pas uniquement des légendes.

Le LLM n'est pas chargé de produire les compteurs, de calculer les taux ni de décider arbitrairement qu'une vidéo a performé. Oriane fournit les références et métriques disponibles. Le code applique les seuils, calcule les ratios et compte les exemples par groupe. La synthèse produite par modèle reste reliée à ces preuves.

La qualité de cette automatisation n'est pas encore évaluée. Les [spécifications](hackathon-spec.md) retiennent cette architecture fonctionnelle pour le prototype, avec une grille commune et des observations émergentes. La préparation interne ne doit pas figer une bibliothèque de recettes que les vrais utilisateurs seraient obligés de remplir.

## Démonstration de hackathon recommandée

Le builder fournit Sokka. Le produit identifie ses deux capacités. Il recherche des vidéos avec des signaux de performance dans chaque direction, puis affiche les approches observées et les exemples qui les soutiennent. Enfin, il propose deux concepts distincts pour la même app.

Le premier concept peut partir de favoris accumulés avant une sortie. Le second peut partir d'un lieu attirant dont l'adresse manque, puis montrer sa résolution à partir d'indices et son enregistrement sur la carte. Ces concepts sont des recommandations à tester, pas des vidéos validées comme gagnantes.

La séquence centrale de la démo doit rendre visible la différence entre ces recherches et ces recommandations. L'interface doit fournir l'étude du secteur au builder, plutôt que lui demander de sélectionner et analyser lui-même les références.
