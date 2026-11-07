# Décision de recherche et préparation de la démonstration

Le périmètre est prêt pour une implémentation de hackathon centrée sur la recherche créative pour builders. Le produit part du besoin de l'app, récupère des contenus avec des signaux de performance et explique les approches observées. Une exploration large des contenus populaires reste utile en complément.

## Comparaison réalisée

Trois briefs ont été définis avant les appels : organiser des lieux sauvegardés, identifier un lieu sans adresse explicite et réviser avec des flashcards. Chaque brief a reçu deux appels guidés par le besoin et deux appels sur un domaine large, triés par vues puis interactions. Tous partageaient les mêmes contraintes : TikTok, légende anglaise, vidéos du 1 août au 7 novembre 2026, au moins 10 000 vues et 200 interactions, six résultats par appel.

Le [protocole](final-protocol.json) et les [réponses](final-results.json) conservent cette comparaison. Douze appels ont retourné 72 lignes, représentant 59 contenus distincts. Une seule passe a été réalisée par combinaison de brief et de stratégie. Ces observations ne permettent pas de déclarer une supériorité statistique ou une précision générale.

Les références insuffisantes ont motivé deux recherches de rattrapage, décrites séparément dans [le protocole de suivi](final-followup-protocol.json). Deux appels ont enrichi neuf vidéos au total avec des frames et segments. Un appel a récupéré une page de vingt publications d'un même créateur, sur 49 correspondances. Le total de cette nouvelle phase est de 17 recherches et trois assets texte. Aucune réponse d'erreur n'a été reçue.

Les [contrôles locaux](verify-final.mjs) se relancent avec `node research/oriane/verify-final.mjs`. Ils vérifient le budget de comparaison, les contraintes observables et les réponses conservées. Les [résultats calculés](final-verification.json) ne sont pas un score de qualité du LLM. Les neuf vidéos enrichies possèdent une légende anglaise dans les données retournées. Le filtre de langue n'est pas vérifié individuellement sur les autres résultats, car la projection `default` n'expose pas ce champ.

## Ce que la comparaison change

| Observation | Décision |
|---|---|
| Le domaine voyage et restaurants trié par popularité remonte des campagnes alimentaires, du divertissement et des contenus de célébrités. | Le domaine seul ne suffit pas à sélectionner les références. Garder un contrôle du lien au besoin. |
| La recherche orientée vers l'organisation trouve un guide avec une carte et une démonstration de préparation de voyage, mais aussi des résultats hors sujet. | Utiliser plusieurs formulations et rejeter les candidats sans transfert concret. Ne pas afficher tout le résultat de recherche à l'utilisateur. |
| Dans les études, la recherche populaire trouve une démonstration Gemini pertinente, tandis que la recherche visuelle trouve des apps voisines. | Garder un petit canal d'exploration populaire. Aucune stratégie ne remplace toutes les autres. |
| Plusieurs résultats lexicaux correspondent uniquement à l'OCR, parfois au milieu d'un sujet sans rapport. | Ne pas compter un mot présent à l'écran comme preuve de pertinence. Pour les recherches de rattrapage, privilégier légende et parole. |
| L'identification d'une adresse fournit peu de références directes dans la première passe. | Élargir explicitement vers les mécanismes d'identification visuelle et de révélation, sans les faire passer pour des concurrents. |
| La recherche complémentaire Instagram trouve un planificateur Paris et une présentation de lieux sauvegardés dans Veya. | Pour la démo, conserver plusieurs plateformes. Un filtre TikTok strict réduit les références utiles. |

Les vidéos populaires peuvent donc apporter une référence valable, mais les résultats observés ne justifient pas d'en faire l'unique point d'entrée. La décision produit est un ensemble de recherches guidées par le besoin, complété par une recherche plus large à l'intérieur du contexte. La part exacte de chaque canal reste un paramètre à évaluer pendant le prototype.

Une lecture indépendante a qualifié tous les candidats de la comparaison, sans voir leur stratégie de recherche. Les [labels et raisons](final-independent-labels.json) distinguent référence directe, voisine, mécanisme transposable, hors sujet et preuve insuffisante. La qualification repose sur les textes fournis ; les images de la sélection finale ont été inspectées séparément.

| Brief | Guidé par le besoin, références directes ou voisines | Domaine populaire, références directes ou voisines |
|---|---|---|
| Lieux sauvegardés | 6 sur 12 candidats distincts | 0 sur 11 |
| Identification de lieu | 3 sur 12, plus 3 mécanismes transposables | 0 sur 11 |
| Flashcards et pratique | 6 sur 12 | 4 sur 12 |

Ce sont les décisions d'un évaluateur sur une passe, pas une estimation de précision représentative. Les candidats non retenus ne sont pas tous hors sujet : certains manquent de preuves. Le résultat soutient la recherche guidée pour le parcours choisi et conserve l'exploration populaire comme complément, notamment dans les études.

Les deux briefs Sokka avaient le même domaine large et ont reçu les mêmes résultats populaires. Une implémentation peut partager ces résultats entre les deux briefs au lieu de payer deux fois les mêmes appels.

## Recherche retenue pour le prototype

1. Le LLM propose plusieurs promesses à partir du brief de l'app. Il distingue les informations fournies et ses hypothèses.
2. Pour la promesse étudiée, il produit des expressions lexicales et une description visuelle courte. Une recherche plus large fournit un canal complémentaire de découverte.
3. Oriane applique les contraintes de période, format, plateforme et signaux de performance avant la décomposition détaillée.
4. Le système déduplique les résultats et vérifie leur utilité pour le brief. Il distingue le problème identique, le besoin voisin et le mécanisme transposable.
5. Le LLM multimodal décrit les preuves des candidats retenus. Le code regroupe et compte les labels. Une synthèse explique les approches observées et propose une adaptation.
6. Si les références sont insuffisantes, le système élargit une fois vers des besoins ou mécanismes voisins et signale la distance. Il peut aussi conclure à des preuves insuffisantes.

Le LLM est retenu pour l'expansion et l'interprétation. Les filtres, dénominateurs, tris et décomptes restent déterministes. Cette étude a utilisé des formulations et jugements produits par des agents ; elle n'a pas construit ou évalué la chaîne automatisée du futur produit.

## Sujets à retenir

| Sujet | État | Usage de démonstration |
|---|---|---|
| Sokka, retrouver et organiser ses lieux sauvegardés | Prêt. Plusieurs références de carte, de planification et de situation vécue sont inspectables. | Parcours principal. |
| Sokka, retrouver une adresse absente grâce à des indices | Prêt pour une branche d'inspiration, avec distance aux sources affichée. Les références enrichies sont surtout des mécanismes voisins. | Montrer que changer la promesse change les recherches et les idées. Ne pas prétendre établir une tendance d'apps concurrentes. |
| App de révision, transformer des notes en flashcards et quiz | Prêt comme sujet de secours ou second domaine. Les sources montrent ces fonctions, au-delà d'une simple mention de marque. | Démontrer la généralisation hors voyage. |
| Répétition espacée strictement | Non validée comme sous-sujet spécialisé dans le budget testé. | Ne pas attribuer aux sources une méthode de planification des révisions qu'elles ne démontrent pas. |

La qualification « prêt » signifie que des sources vérifiées permettent une démonstration du parcours. Elle ne signifie pas qu'un classement de formats gagnants ou une mesure de conversion a été validé. La branche d'identification ne satisfait pas un critère exigeant trois références directes ou voisines dans le même domaine ; elle utilise des mécanismes transposables.

## Références inspectées

Pour l'organisation, [le guide Barcelone](https://www.tiktok.com/@inbetweenpics/video/7692828170608774414) montre une carte et évoque le problème des lieux sauvegardés difficiles à retrouver. [Le planificateur Paris](https://www.instagram.com/reel/Dej6cCAjahp/) rassemble carte et itinéraire. [La préparation de promenades](https://www.instagram.com/reel/DcZDQILTXTu/) présente une routine et plusieurs outils, dont Veya pour sauvegarder les lieux. Leurs compteurs indexés sont respectivement 20 800, 36 628 et 94 580 vues. La séquence Paris avait déjà été inspectée dans la première passe.

Pour l'identification, [GeoGuessr et les indices du ciel](https://www.tiktok.com/@zi8gzag/video/7694704032438340872) illustre une déduction de position. [La recherche d'un objet d'occasion par image](https://www.instagram.com/reel/DceWpCsgjHt/) montre une image inconnue transformée en résultat retrouvé. Leurs compteurs indexés sont 271 100 et 36 010 vues. Ce sont des mécanismes de référence, pas des preuves de performance d'une app comme Sokka. Une troisième piste, [le jeu de vérification d'images](https://www.instagram.com/reel/Dc3w-rnis8u/), a été consultée via légende, transcription et miniature ; elle n'a pas reçu le même enrichissement détaillé.

Pour les études, [Gauth](https://www.tiktok.com/@degrasya77/video/7676403440951545109) montre un problème de compréhension et une interaction avec le téléphone. [Gemini](https://www.tiktok.com/@googlegemini/video/7676162365683027213) montre une personne accompagnée d'incrustations d'interface. [WPS](https://www.tiktok.com/@ccx.study/video/7691163513296866580) montre une situation de surcharge scolaire et des outils numériques. Les images ne démontrent pas à elles seules l'efficacité pédagogique des produits.

La lecture détaillée a confirmé une démonstration de notes transformées en flashcards dans WPS. Une [frame inspectée à 48,8 secondes](final-media/wps-flashcards-proof.webp) montre la carte, ses réponses et les actions de maîtrise. Ce passage n'apparaissait pas dans les trois frames de la planche générale. C'est un exemple de l'intérêt de sélectionner des frames selon l'OCR et le moment de démonstration, en plus des images d'ouverture.

Les planches [lieux](final-media/places-sheet.jpg), [identification](final-media/identify-sheet.jpg) et [études](final-media/study-sheet.jpg) regroupent les premières, médianes et dernières frames indexées de trois vidéos par planche. Ce ne sont pas des séquences continues ni des échantillons uniformes dans le temps. Les timestamps et URL sont dans le [manifest](final-media/manifest.json).

## Limites résolues ou reportées

La récupération d'une cohorte par profil est maintenant vérifiée. La page de vingt posts n'est pas une cohorte exhaustive et ne valide pas une normalisation de performance. Les dates, formats et conditions de diffusion doivent encore être pris en compte avant toute comparaison relative.

Les frames et segments montrent des couvertures variables. Certaines vidéos offrent un premier segment court et des images dès le début ; d'autres n'ont aucune frame avant trois secondes. La démo doit afficher les vrais timestamps et éviter la promesse d'une extraction exacte systématique du hook.

Les seuils de similarité n'ont pas été calibrés. La première passe avait observé les mêmes résultats avec un seuil de 0,7. Le prototype peut utiliser le classement de similarité et qualifier les candidats sans présenter le score comme une probabilité.

Les prix directs Oriane, la disponibilité d'une ingestion à la demande et les limites opérationnelles du compte restent à confirmer avec le fournisseur avant de fixer un coût par utilisateur. Ils ne sont pas nécessaires pour une démonstration sur les références déjà récupérées. Le compte Sokka lui-même n'a pas été trouvé dans l'index lors de la passe précédente ; le produit doit distinguer ce cas d'un compte sans publications.

Le [brief de démonstration](demo-brief.md) fixe le scénario proposé. L'implémentation attend les consignes du porteur de projet.
