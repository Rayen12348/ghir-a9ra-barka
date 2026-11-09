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

## Travaux pratiques

| TP | Sujet | Correction |
|---|---|---|
| TP 1 — Initiation à Hadoop | préparer la VM Cloudera, manipuler HDFS (`hadoop fs`) sur le fichier de ventes `purchases.txt` | [[Correction TP 1 - Initiation à Hadoop]] |
| TP 2 — Premier programme Hadoop MapReduce | WordCount en Java avec Eclipse : exécution locale, puis JAR lancé sur le cluster | [[Correction TP 2 - Premier programme Hadoop MapReduce]] |
| TP 3 — Exercices Hadoop MapReduce | anagrammes, analyse des sentiments de tweets, index web inversé | [[Correction TP 3 - Exercices Hadoop MapReduce]] |

Les énoncés (PDF) sont dans **TP**, les corrections dans **Corrections**. Chaque correction commence par **comment travailler le TP** : avec la VM Cloudera de l'énoncé, ou avec Hadoop installé sur son propre PC. Elle déroule ensuite le TP pas à pas, avec le code, les résultats et les erreurs des énoncés, tous vérifiés avec Hadoop 3.4.3. Le code fourni pour l'exercice 2 du TP 3 est aussi dans **Corrections**, avec sa version corrigée.

Quiz en ligne de l'enseignante : [introduction](https://takwabenaichagader.github.io/bigdata-session1-quiz/) · [HDFS](https://takwabenaichagader.github.io/bigdata-ch2-HDFS-quiz/) · [MapReduce](https://takwabenaichagader.github.io/mapreduce-part2-training/).

Même UE que Virtualisation et Cloud.
