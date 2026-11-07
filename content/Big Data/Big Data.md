---
icone: BD
couleur: yellow
prof: Dr. Ing. Takwa Ben Aïcha Gader
description: "Framework et techniques Big Data — dimensionner une architecture, Hadoop, HDFS, MapReduce et YARN."
ordre: 7
---
**Framework et techniques Big Data** · code `573103511` · Semestre 5 · ISIMa · année 2026-2027

| UE | Coef | Crédits | Régime | Cours | TD | TP | Total |
|---|---|---|---|---|---|---|---|
| Cloud & Big Data (`573103510`) | 1 | 2 | Mixte | 10,5 h | — | 21 h | 31,5 h |

Le cours complet s'intitule **Big Data avec Python** : données à grande échelle avec Hadoop, MapReduce et Spark, NoSQL et Python, avec évaluation des compétences et TP.

## Plan du cours

1. **Chapitre 1 — Introduction au Big Data** : de la donnée à la décision, le cas M42, dimensionner avec des unités (débit, stockage, latence p95), les 5 V, qualité de la donnée, scale-up et scale-out, partitionner et répliquer, batch et streaming, la carte de décision
2. **Chapitre 2, partie 1 — Hadoop et HDFS** : pourquoi Hadoop, *write once, read many*, blocs de 128 MiB, distribution et réplication, NameNode et DataNodes, heartbeats et pannes, lecture et écriture en pipeline, commandes `hdfs dfs`
3. **Chapitre 2, partie 2 — MapReduce et YARN** : data locality, paires (clé, valeur), HDFS Block et InputSplit, Map, Shuffle + Sort, Reduce, Combiner, moyenne distribuée, data skew et salting, YARN, WordCount, le cas des taxis de New York

Chaque partie a son support (PDF) dans **Cours** et sa fiche détaillée dans **Résumés**, avec les calculs, les commandes et le code vérifiés (WordCount et commandes HDFS exécutés avec Hadoop 3.4.3). Le support de la partie 1 commence par un rappel du chapitre 1 (diapositives 1 à 5).

Quiz en ligne de l'enseignante : [introduction](https://takwabenaichagader.github.io/bigdata-session1-quiz/) · [HDFS](https://takwabenaichagader.github.io/bigdata-ch2-HDFS-quiz/) · [MapReduce](https://takwabenaichagader.github.io/mapreduce-part2-training/).

Même UE que Virtualisation et Cloud.
