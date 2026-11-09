---
date: 2026-11-09
ordre: 2
tags: [big-data, hadoop, mapreduce, wordcount, java, eclipse, tp, correction, combiner, hadoop-jar, yarn]
---
# Correction TP 2 — Premier programme Hadoop MapReduce (WordCount)

Énoncé : [[TP 2 - Premier programme Hadoop MapReduce.pdf]] · cours : [[Résumé - Chapitre 2 - MapReduce et YARN#16. WordCount : MapReduce sur un exemple simple|WordCount dans le cours]], [[Résumé - Chapitre 2 - MapReduce et YARN#10. Le Combiner : réduire le trafic avant le Shuffle|le Combiner]] · avant : [[Correction TP 1 - Initiation à Hadoop]] · suite : [[Correction TP 3 - Exercices Hadoop MapReduce]]

> [!abstract] Ce qu'on fait
> On écrit en Java le « Hello World » de MapReduce, **WordCount**, qui compte les mots d'un texte : un **Mapper** émet `(mot, 1)`, un **Reducer** additionne les 1 de chaque mot, et une classe **WordCount** configure le job. On l'exécute d'abord **en local** depuis Eclipse, sur des fichiers du disque, puis on l'exporte en **JAR** et on le lance **sur le cluster** avec `hadoop jar`, sur des fichiers HDFS.

> [!note] Ce qui a été vérifié
> Le code de l'énoncé a été compilé **tel quel** et exécuté avec Hadoop 3.4.3 (Java 11) : en local, sur HDFS, puis sur un vrai YARN (installation de la [[Correction TP 1 - Initiation à Hadoop#B. Sur votre PC, sans VM (complément, hors énoncé)|méthode B du TP 1]]). Il compile aussi pour Java 6 et 7 (`javac --release 6` et `--release 7`), donc dans les VM Cloudera. Chaque erreur citée ci-dessous a été reproduite. Les sorties en sont extraites.

## 0. Comment travailler ce TP

| | VM Cloudera (énoncé) | Votre PC (méthode B du TP 1) |
|---|---|---|
| Éditeur | Eclipse, déjà installé | Eclipse, IntelliJ IDEA ou VS Code, ou `javac` en ligne de commande |
| Java | 1.7 dans les captures de l'énoncé (VM QuickStart 5.3) | 11 |
| Jars de Hadoop | `/usr/lib/hadoop` et `/usr/lib/hadoop/client` | `~/hadoop/share/hadoop/` : `common`, `common/lib`, `hdfs`, `mapreduce`, `yarn` |
| Exécution « cluster » | Hadoop déjà démarré dans la VM | démons démarrés (TP 1, étape 4) |

Le projet à obtenir :

```
WordCount/
├── src/
│   ├── TokenizerMapper.java
│   ├── IntSumReducer.java
│   ├── WordCount.java
│   └── log4j.properties       ← complément : voir la progression du job (section 4)
└── data/
    └── wordCountTest.txt      ← petit texte de test
```

La méthode, dans l'ordre : écrire les trois classes → tester en local sur un petit fichier → vérifier `part-r-00000` → exporter le JAR → mettre les données dans HDFS → `hadoop jar` → lire le résultat dans HDFS.

## 1. Créer le projet (énoncé page 2)

**File → New → Project → Java Project → Next**, nom `WordCount`, **Finish**. Laisser le JRE proposé. Les classes vont dans `src`, dans le *default package*, comme dans l'énoncé.

## 2. Ajouter les jars de Hadoop (énoncé pages 2 à 6)

Clic droit sur le projet → **Properties → Java Build Path → Libraries → Add External JARs...**

- **dans la VM** : tous les `.jar` de `/usr/lib/hadoop`, puis, en recommençant, tous ceux de `/usr/lib/hadoop/client` (en minuscules : l'énoncé écrit « Client », mais Linux distingue les majuscules) ;
- **sur votre PC** (complément) : tous les `.jar` de ces cinq dossiers de `~/hadoop/share/hadoop/` : `common`, `common/lib`, `hdfs`, `mapreduce`, `yarn`.

Dans la fenêtre de choix, `Ctrl+A` sélectionne tous les fichiers d'un dossier. Les jars apparaissent ensuite sous **Referenced Libraries**.

> [!warning] Si un dossier manque, le job plante au lancement
> Erreurs obtenues avec Hadoop 3.4.3 en retirant un groupe de jars :
>
> | Jars oubliés | Erreur |
> |---|---|
> | `hadoop-mapreduce-client-common` (dossier `client` dans la VM) | `java.io.IOException: Cannot initialize Cluster. Please check your configuration for mapreduce.framework.name and the correspond server addresses.` |
> | dossier `yarn` | `java.lang.NoClassDefFoundError: org/apache/hadoop/yarn/exceptions/YarnException` |
> | dossier `hdfs` | `java.lang.NoClassDefFoundError: org/apache/hadoop/hdfs/DistributedFileSystem` |
>
> Le message « Cannot initialize Cluster » ne parle pas de jar : il veut dire que Hadoop ne trouve pas de quoi exécuter le job, même en local.

## 3. Les trois classes (énoncé pages 6 et 7)

Clic droit sur `src` → **New → Class**, une fois par classe. Le code est celui de l'énoncé ; seuls les commentaires sont ajoutés.

### TokenizerMapper : découper en mots

```java
import org.apache.hadoop.io.IntWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Mapper;
import java.io.IOException;
import java.util.StringTokenizer;

//                                     entrée : (position, ligne)   sortie : (mot, 1)
public class TokenizerMapper extends Mapper<Object, Text, Text, IntWritable> {

    private final static IntWritable one = new IntWritable(1);
    private Text word = new Text();     // réutilisé à chaque mot, au lieu d'un new par mot

    public void map(Object key, Text value, Mapper.Context context)
            throws IOException, InterruptedException {
        StringTokenizer itr = new StringTokenizer(value.toString());  // coupe sur les espaces
        while (itr.hasMoreTokens()) {
            word.set(itr.nextToken());
            context.write(word, one);   // émet (mot, 1)
        }
    }
}
```

Les quatre types de `Mapper<Object, Text, Text, IntWritable>` :

| Type | Rôle | Ici |
|---|---|---|
| `Object` (KEYIN) | clé d'entrée | la position de la ligne dans le fichier (un `LongWritable`), inutilisée |
| `Text` (VALUEIN) | valeur d'entrée | une ligne du fichier |
| `Text` (KEYOUT) | clé de sortie | un mot |
| `IntWritable` (VALUEOUT) | valeur de sortie | le nombre 1 |

`Text` et `IntWritable` sont les versions Hadoop de `String` et `int` : elles savent s'écrire et se relire sur le réseau pendant le Shuffle.

### IntSumReducer : additionner

```java
import org.apache.hadoop.io.IntWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Reducer;
import java.io.IOException;

//                                       entrée : (mot, [1, 1, ...])   sortie : (mot, total)
public class IntSumReducer extends Reducer<Text, IntWritable, Text, IntWritable> {

    private IntWritable result = new IntWritable();

    public void reduce(Text key, Iterable<IntWritable> values, Context context)
            throws IOException, InterruptedException {
        int sum = 0;
        for (IntWritable val : values) {          // toutes les valeurs de ce mot
            System.out.println("value: " + val.get());
            sum += val.get();
        }
        System.out.println("--> Sum = " + sum);
        result.set(sum);
        context.write(key, result);               // émet (mot, total)
    }
}
```

Les `System.out.println` servent à **voir** les valeurs reçues (section 4). Le Reducer ne reçoit pas toutes les paires du job : il reçoit **une clé à la fois**, avec la liste de ses valeurs, déjà regroupée par le Shuffle.

### WordCount : configurer et lancer le job

```java
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.IntWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.lib.input.FileInputFormat;
import org.apache.hadoop.mapreduce.lib.output.FileOutputFormat;

public class WordCount {
    public static void main(String[] args) throws Exception {
        Configuration conf = new Configuration();
        Job job = Job.getInstance(conf, "word count");          // nom visible dans YARN
        job.setJarByClass(WordCount.class);                     // le JAR à envoyer aux nœuds
        job.setMapperClass(TokenizerMapper.class);
        job.setCombinerClass(IntSumReducer.class);              // pré-somme côté Map
        job.setReducerClass(IntSumReducer.class);
        job.setOutputKeyClass(Text.class);                      // types de sortie
        job.setOutputValueClass(IntWritable.class);
        FileInputFormat.addInputPath(job, new Path(args[0]));   // 1er argument : entrée
        FileOutputFormat.setOutputPath(job, new Path(args[1])); // 2e argument : sortie (ne doit pas exister)
        System.exit(job.waitForCompletion(true) ? 0 : 1);       // lance et attend ; true = affiche la progression
    }
}
```

**Pourquoi `IntSumReducer` peut servir de Combiner.** Le Combiner fait une première somme **dans chaque tâche Map**, avant le Shuffle. C'est correct ici pour deux raisons : l'addition est associative et commutative (additionner des sous-totaux donne le même total), et les types d'entrée et de sortie du Reducer sont identiques, `(Text, IntWritable)`. Une moyenne, par exemple, ne pourrait pas réutiliser son Reducer ainsi (voir [[Résumé - Chapitre 2 - MapReduce et YARN#11. La moyenne distribuée : pourquoi mean(mean(...)) est faux|la moyenne distribuée]]).

> [!remarque] `Mapper.Context` dans `map` : ça marche, avec un avertissement
> L'énoncé écrit `Mapper.Context context`, le type « brut », sans ses paramètres. Le test confirme que la méthode **redéfinit bien** `map` : le job compte correctement. Le compilateur affiche seulement deux avertissements (`[rawtypes] found raw type: Mapper.Context`, `[unchecked] unchecked call to write`). Écrire `Context context`, comme dans le Reducer, les fait disparaître.

> [!remarque] Classes internes : possibles, mais `static`
> L'énoncé dit que déclarer le Mapper et le Reducer comme classes internes est « même déconseillé ». C'est pourtant ce que fait l'exemple officiel de Hadoop, et la version du cours ([[Résumé - Chapitre 2 - MapReduce et YARN#16. WordCount : MapReduce sur un exemple simple|section 16 du résumé]]). La seule règle : une classe interne doit être **`public static`**, car Hadoop la crée lui-même par réflexion. Sans `static`, le job échoue :
> ```
> java.lang.NoSuchMethodException: WordCountInner$TokenizerMapper.<init>()
> ```

## 4. Exécution locale (énoncé pages 8 et 9)

En local, Hadoop n'utilise ni HDFS ni YARN : tout se passe dans un seul processus Java, sur votre disque. C'est le cas quand on lance depuis Eclipse, car le projet ne contient que des jars, aucune configuration de cluster.

**1. Un petit fichier de test.** Clic droit sur le projet → **New → Folder** `data`, puis **New → File** `wordCountTest.txt` :

```
hadoop stocke les fichiers dans hdfs
mapreduce calcule sur les fichiers de hdfs
hadoop et mapreduce
```

Un texte court, dont on peut vérifier le résultat **à la main** : 3 lignes, 16 mots, 11 mots différents.

**2. Run Configurations.** **Run → Run Configurations... → Java Application**, double-clic pour une nouvelle configuration :

- onglet **Main** : Project `WordCount`, Main class `WordCount` ;
- onglet **Arguments**, *Program arguments* : `data/wordCountTest.txt outputWordCount` ;
- *Working directory* : laisser **Default**, la racine du projet. Les chemins relatifs partent de là.

**Apply**, puis **Run**.

**3. La console.** Les `println` du Reducer apparaissent deux fois, car `IntSumReducer` sert aussi de Combiner :

```
value: 1
--> Sum = 1
value: 1
--> Sum = 1
...
value: 1
value: 1
--> Sum = 2
...
value: 2
--> Sum = 2
```

| Ordre | Qui affiche | Mots (triés) | Affichage |
|---|---|---|---|
| 1 | le **Combiner**, dans la tâche Map | calcule, dans, de, et, stocke, sur | `value: 1` puis `--> Sum = 1` |
| | | fichiers, hadoop, hdfs, les, mapreduce | `value: 1`, `value: 1`, `--> Sum = 2` |
| 2 | le **Reducer** | calcule, dans, de, et, stocke, sur | `value: 1` puis `--> Sum = 1` |
| | | fichiers, hadoop, hdfs, les, mapreduce | **`value: 2`** puis `--> Sum = 2` |

Le Reducer reçoit `value: 2` et non deux fois `value: 1` : le Combiner a déjà additionné les deux 1 de chaque mot. C'est exactement son rôle.

**4. Les compteurs**, à la fin de la console :

```
Map input records=3
Map output records=16
Combine input records=16
Combine output records=11
Reduce input groups=11
Reduce input records=11
Reduce output records=11
Bytes Written=99
```

| Compteur | Valeur | Explication |
|---|---|---|
| Map input records | 3 | une entrée par **ligne** |
| Map output records | 16 | une paire `(mot, 1)` par **mot** |
| Combine output records | 11 | une paire par mot **différent** : 16 paires réduites à 11 avant le Shuffle |
| Reduce input groups | 11 | 11 clés, donc 11 appels à `reduce` |
| Reduce output records | 11 | 11 lignes dans le résultat |

**5. Le résultat.** Clic droit sur le projet → **Refresh** (F5) : le répertoire `outputWordCount` apparaît, avec `_SUCCESS` (fichier vide : le job a réussi), `part-r-00000` (le résultat), et deux fichiers cachés `.crc` (sommes de contrôle).

```
$ cat outputWordCount/part-r-00000
calcule	1
dans	1
de	1
et	1
fichiers	2
hadoop	2
hdfs	2
les	2
mapreduce	2
stocke	1
sur	1
```

Une ligne par mot, `mot<TAB>total`, **triée par clé** : c'est le Shuffle qui a trié. Le nom : `part` + `r` (sortie d'un **R**educer) + `00000` (le Reducer numéro 0, le seul ici).

> [!warning] Les erreurs du premier lancement
> | Symptôme | Cause | Solution |
> |---|---|---|
> | `FileAlreadyExistsException: Output directory .../outputWordCount already exists` | le job ne remplace jamais une sortie existante | supprimer `outputWordCount` (clic droit → Delete) avant de relancer, ou changer le 2e argument |
> | `ArrayIndexOutOfBoundsException: Index 0 out of bounds for length 0` à la ligne `args[0]` | aucun argument donné (Run sans Run Configuration) | remplir *Program arguments* |
> | `log4j:WARN No appenders could be found for logger...`, puis plus aucune trace de progression | Eclipse ne trouve pas de configuration de logs | créer `src/log4j.properties` (ci-dessous) |
> | `WARN ... Hadoop command-line option parsing not performed. Implement the Tool interface...` | simple conseil de Hadoop | sans conséquence, à ignorer |
> | un groupe `Shuffle Errors` dans les compteurs | c'est seulement le nom du groupe | toutes ses valeurs (`BAD_ID`, `IO_ERROR`...) valent 0 |

`src/log4j.properties` (complément, hors énoncé), testé avec Hadoop 3.4.3. La console affiche ensuite `Running job`, `map 100% reduce 100%` et `completed successfully` :

```properties
log4j.rootLogger=INFO, console
log4j.appender.console=org.apache.log4j.ConsoleAppender
log4j.appender.console.layout=org.apache.log4j.PatternLayout
log4j.appender.console.layout.ConversionPattern=%d{HH:mm:ss} %-5p %c{1}: %m%n
```

## 5. Exécution sur le cluster (énoncé pages 9 à 11)

Le même programme tourne sur le cluster **sans modification**. Seuls changent les chemins (ils désignent alors HDFS) et la façon de le lancer.

**1. Exporter le JAR.** Clic droit sur `src` → **Export → Java → JAR file → Next**. Garder *Export generated class files and resources*, ne pas exporter le dossier `lib` s'il existe (les jars de Hadoop sont déjà sur le cluster), choisir la destination, par exemple `/home/cloudera/WordCount.jar`, puis **Finish**.

Sans Eclipse (complément), depuis le dossier du projet :

```sh
mkdir -p classes
javac -cp "$(hadoop classpath)" -d classes src/*.java
jar cf WordCount.jar -C classes .
```

**2. Mettre le texte dans HDFS**, puis lancer le job. `<chemin>` est le dossier où le JAR a été exporté :

```sh
hadoop fs -put wordcount.txt
hadoop jar <chemin>/WordCount.jar WordCount wordcount.txt output
```

Sortie sur YARN (installation de la méthode B) :

```
INFO impl.YarnClientImpl: Submitted application application_1794218285490_0001
INFO mapreduce.Job: Running job: job_1794218285490_0001
INFO mapreduce.Job: Job job_1794218285490_0001 running in uber mode : false
INFO mapreduce.Job:  map 100% reduce 0%
INFO mapreduce.Job:  map 100% reduce 100%
INFO mapreduce.Job: Job job_1794218285490_0001 completed successfully
```

Les quatre arguments de `hadoop jar` : le **JAR**, la **classe main**, puis les deux arguments du programme (`args[0]` et `args[1]`), ici des chemins **HDFS** relatifs à `/user/<login>`.

**3. Lire le résultat.**

```
$ hadoop fs -ls output
Found 2 items
-rw-r--r--   1 rayen supergroup          0 2026-11-09 10:42 output/_SUCCESS
-rw-r--r--   1 rayen supergroup         87 2026-11-09 10:42 output/part-r-00000
$ hadoop fs -cat output/part-r-00000
calcule	1
dans	1
...
```

(Ici `wordcount.txt` contient le même texte que le test local, d'où le même résultat.)

> [!remarque] Erreur de l'énoncé : `part-00000`
> L'énoncé affiche le résultat avec `hadoop fs -cat output/part-00000`. Avec ce programme, le fichier s'appelle **`part-r-00000`**, comme l'énoncé le dit lui-même à la page 9 :
> ```
> $ hadoop fs -cat output/part-00000
> cat: `output/part-00000': No such file or directory
> ```
> `part-00000` est le nom donné par l'ancienne API de Hadoop (`org.apache.hadoop.mapred`). Le TP utilise la nouvelle (`org.apache.hadoop.mapreduce`), qui ajoute `-r-` (ou `-m-` pour un job sans Reducer). Dans le doute, `hadoop fs -ls output` montre le vrai nom.

> [!warning] Les erreurs propres au cluster
> | Symptôme | Cause | Solution |
> |---|---|---|
> | `FileAlreadyExistsException: Output directory hdfs://.../output already exists` | un premier lancement a déjà créé `output` | `hadoop fs -rm -r output`, puis relancer |
> | `ClassNotFoundException: WordCount` (ou `bigdata.WordCount`) | la classe est dans un *package*, ou le nom est mal écrit | donner le **nom complet** : `paquet.WordCount` si les classes sont dans `paquet` |
> | `Input path does not exist: hdfs://.../wordcount.txt` | le texte est resté sur le disque local | `hadoop fs -put wordcount.txt` d'abord |
> | les lignes `value: ...` n'apparaissent plus dans le terminal | sur YARN, le code tourne dans des **containers**, pas dans le terminal | les lire dans les journaux des containers (ci-dessous) |

**Où sont passés les `println` ?** Sur YARN, chaque tâche Map ou Reduce tourne dans son propre container. Ce qu'elle écrit sur `System.out` va dans le fichier `stdout` du container. Avec l'installation de la méthode B, on le trouve dans `~/hadoop/logs/userlogs/` :

```
$ cat ~/hadoop/logs/userlogs/application_1794218285490_0001/container_1794218285490_0001_01_000002/stdout
value: 1
--> Sum = 1
...
```

Le même fichier est accessible depuis l'interface YARN (`http://localhost:8088` → l'application → *Logs*). `yarn logs -applicationId ...` ne fonctionne que si l'agrégation des journaux est activée (`yarn.log-aggregation-enable`). Sans elle, la commande répond `File /tmp/logs/... does not exist`.

## 6. Ce qui s'est passé, en un schéma

```mermaid
flowchart LR
  F["wordCountTest.txt<br/>3 lignes"] --> M["Map<br/>16 paires (mot, 1)"]
  M --> C["Combiner<br/>11 paires, ex. (hdfs, 2)"]
  C --> S["Shuffle + Sort<br/>11 clés triées"]
  S --> R["Reduce<br/>11 appels"]
  R --> O["part-r-00000<br/>11 lignes"]
```

Pour une version plus grande (le poème du cours, avec et sans Combiner, compteurs mesurés), voir [[Résumé - Chapitre 2 - MapReduce et YARN#16. WordCount : MapReduce sur un exemple simple|la section 16 du résumé]].

## 7. Récapitulatif des remarques sur l'énoncé

| Page | Dans l'énoncé | En réalité |
|---|---|---|
| 4 | dossier `hadoop>Client` | `/usr/lib/hadoop/client`, en minuscules |
| 6 | Mapper et Reducer en classes internes « déconseillé » | courant (exemple officiel, cours) ; il faut seulement `public static` |
| 6 | `Mapper.Context context` | fonctionne, avec deux avertissements ; `Context context` est plus propre |
| 11 | fichier « worcount.txt » | `wordcount.txt`, comme dans la commande juste en dessous |
| 11 | `hadoop fs -ls` puis `output` sur deux lignes | une seule commande : `hadoop fs -ls output` |
| 11 | `hadoop fs -cat output/part-00000` | `output/part-r-00000` |

## Questions de révision

1. Que représentent les quatre types de `Mapper<Object, Text, Text, IntWritable>` ?
2. Pourquoi peut-on utiliser `IntSumReducer` comme Combiner ? Citer un calcul où ce serait faux.
3. Sur le fichier de test, `Map output records=16` et `Combine output records=11`. D'où viennent ces nombres ?
4. Pourquoi le Reducer affiche-t-il `value: 2` et non deux fois `value: 1` pour « hadoop » ?
5. Que se passe-t-il si on relance le job sans rien changer ? Pourquoi Hadoop refuse-t-il ?
6. Que signifient `r` et `00000` dans `part-r-00000` ?
7. Où vont les `System.out.println` du Reducer quand le job tourne sur YARN ?
8. En exécution locale, d'où viennent les fichiers lus : HDFS ou disque local ? Et avec `hadoop jar` sur le cluster ?

> [!question]- Réponses
> 1. Clé et valeur **d'entrée** (position de la ligne, ligne), puis clé et valeur **de sortie** (mot, 1).
> 2. L'addition est associative et commutative, et le Reducer a les mêmes types en entrée et en sortie : additionner des sous-totaux donne le bon total. Pour une **moyenne**, la moyenne des moyennes partielles est fausse dès que les groupes n'ont pas la même taille.
> 3. 16 = nombre de mots du fichier (une paire par mot) ; 11 = nombre de mots **différents** (le Combiner a fusionné les doublons de la tâche Map).
> 4. Le Combiner a déjà additionné les deux `(hadoop, 1)` en `(hadoop, 2)` dans la tâche Map ; le Reducer ne reçoit qu'une valeur.
> 5. `FileAlreadyExistsException` : Hadoop ne remplace jamais un répertoire de sortie, pour ne pas écraser par erreur le résultat d'un long calcul. Il faut le supprimer ou changer de nom.
> 6. `r` : écrit par un **Reducer** (`m` pour un job sans Reducer). `00000` : numéro du Reducer (un seul ici, donc 0).
> 7. Dans le fichier `stdout` du container de chaque tâche, consultable via l'interface YARN (port 8088) ou dans `logs/userlogs/` ; pas dans le terminal.
> 8. En local : disque local (la configuration par défaut est `file:///`). Avec `hadoop jar` sur le cluster : HDFS, avec des chemins relatifs à `/user/<login>`.
