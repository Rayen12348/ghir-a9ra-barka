---
date: 2026-11-09
ordre: 3
tags: [big-data, hadoop, mapreduce, java, tp, correction, anagrammes, sentiments, twitter, index-inverse, combiner]
---
# Correction TP 3 — Exercices Hadoop MapReduce

Énoncé : [[TP 3 - Exercices Hadoop MapReduce.pdf]] · code fourni pour l'exercice 2 : [[Correction TP 3 - Analyse des sentiments (code fourni).pdf]] · cours : [[Résumé - Chapitre 2 - MapReduce et YARN#20. La méthode : comment penser un problème MapReduce|la méthode MapReduce]] · avant : [[Correction TP 2 - Premier programme Hadoop MapReduce]]

> [!abstract] Ce qu'on fait
> Trois problèmes, trois programmes MapReduce construits sur le même squelette que WordCount. Dans chacun, tout se joue sur **le choix de la clé** émise par le Map : les mots aux **lettres triées** pour les anagrammes, la **classe du tweet** pour les sentiments, la **page citée** pour l'index inversé. Le Shuffle regroupe ensuite ce qui doit l'être.

> [!note] Ce qui a été vérifié
> Les trois programmes ont été compilés et exécutés avec **Hadoop 3.4.3** (Java 11), en local puis sur HDFS, avec les données de l'énoncé. Le code compile aussi pour Java 6 et 7 (`javac --release 6`), donc dans les VM Cloudera. Le code fourni pour l'exercice 2 a été compilé **tel quel** (3 erreurs), puis corrigé. Chaque piège décrit ci-dessous a été reproduit. Les sorties en sont extraites.

## 0. Comment travailler ce TP

Même installation qu'au [[Correction TP 2 - Premier programme Hadoop MapReduce#0. Comment travailler ce TP|TP 2]] : un projet Java avec les jars de Hadoop. Un seul projet suffit pour les trois exercices :

```
TP3/
├── src/
│   ├── AnagrammeMapper.java    AnagrammeReducer.java    Anagrammes.java      ← exercice 1
│   ├── SentimentMapper.java    SentimentReducer.java    SentimentMain.java   ← exercice 2
│   ├── IndexMapper.java        IndexReducer.java        IndexInverse.java    ← exercice 3
│   └── log4j.properties
└── data/
    ├── anagrammes.txt
    ├── tweets.txt
    └── pages.txt
```

Une **Run Configuration** par exercice (Run → Run Configurations, comme au TP 2) :

| Exercice | Main class | Program arguments |
|---|---|---|
| 1 | `Anagrammes` | `data/anagrammes.txt sortie_anagrammes` |
| 2 | `SentimentMain` | `data/tweets.txt sortie_sentiments` |
| 3 | `IndexInverse` | `data/pages.txt sortie_index` |

**La méthode, avant d'écrire du code.** Pour chaque exercice, répondre sur papier à quatre questions, puis faire tourner l'exemple de l'énoncé **à la main** :

1. Que contient **une ligne** d'entrée ?
2. Quels éléments doivent se retrouver **ensemble** à la fin ? Ce qu'ils ont en commun sera la **clé**.
3. Que doit émettre le **Map** pour une ligne : quelle clé, quelle valeur ?
4. Que fait le **Reduce** de la liste des valeurs d'une clé ?

| | Ligne d'entrée | Clé émise par Map | Valeur | Reduce |
|---|---|---|---|---|
| Ex. 1 | un mot | le mot, lettres **triées** | le mot | garde les groupes d'au moins 2 mots |
| Ex. 2 | un tweet | la **classe** du tweet | `1` | additionne |
| Ex. 3 | une page et ses liens | une page **citée** | la page qui la cite | liste triée des pages qui citent |

Chaque programme garde les trois classes de WordCount : on change les **types**, le corps de `map` et le corps de `reduce`. Une règle à ne pas oublier : si les types émis par le Map **diffèrent** des types de sortie finaux, il faut les déclarer avec `setMapOutputKeyClass` et `setMapOutputValueClass` (exercices 1 et 2).

## Exercice 1 : Anagrammes

### L'idée

Deux anagrammes ont les mêmes lettres, dans un autre ordre. En **triant** les lettres d'un mot, on obtient une signature identique pour tous ses anagrammes : `crane` → `acenr`, `ancre` → `acenr`. Cette signature sert de **clé** : le Shuffle range ensemble tous les mots qui la partagent.

### À la main, sur l'exemple de l'énoncé

| Mot (valeur) | Lettres triées (clé) |
|---|---|
| crane | `acenr` |
| imaginer | `aegiimnr` |
| surface | `acefrsu` |
| metropole | `eelmooprt` |
| migraine | `aegiimnr` |
| structure | `cerrsttuu` |
| ancre | `acenr` |

Après le Shuffle, 5 clés triées : `acefrsu` [surface] · `acenr` [crane, ancre] · `aegiimnr` [imaginer, migraine] · `cerrsttuu` [structure] · `eelmooprt` [metropole]. Le Reduce ne garde que les groupes de **2 mots ou plus** : il reste 2 lignes.

### Le code

`AnagrammeMapper.java`

```java
import java.io.IOException;
import java.util.Arrays;
import java.util.StringTokenizer;
import org.apache.hadoop.io.LongWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Mapper;

public class AnagrammeMapper extends Mapper<LongWritable, Text, Text, Text> {

    private final Text cle = new Text();   // le mot, lettres triées : "acenr"
    private final Text mot = new Text();   // le mot lui-même : "crane"

    @Override
    protected void map(LongWritable offset, Text ligne, Context context)
            throws IOException, InterruptedException {
        StringTokenizer itr = new StringTokenizer(ligne.toString());
        while (itr.hasMoreTokens()) {
            String m = itr.nextToken().toLowerCase();
            char[] lettres = m.toCharArray();
            Arrays.sort(lettres);                 // crane -> a c e n r
            cle.set(new String(lettres));
            mot.set(m);
            context.write(cle, mot);              // ("acenr", "crane")
        }
    }
}
```

`AnagrammeReducer.java`

```java
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.apache.hadoop.io.NullWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Reducer;

public class AnagrammeReducer extends Reducer<Text, Text, Text, NullWritable> {

    @Override
    protected void reduce(Text cle, Iterable<Text> mots, Context context)
            throws IOException, InterruptedException {
        List<String> groupe = new ArrayList<String>();
        for (Text m : mots) {
            String s = m.toString();              // copie : Hadoop réutilise l'objet Text
            if (!groupe.contains(s)) {            // un mot répété ne compte qu'une fois
                groupe.add(s);
            }
        }
        if (groupe.size() >= 2) {                 // au moins deux mots = des anagrammes
            Collections.sort(groupe);             // ordre stable d'une exécution à l'autre
            StringBuilder ligne = new StringBuilder();
            for (String s : groupe) {
                if (ligne.length() > 0) ligne.append(' ');
                ligne.append(s);
            }
            context.write(new Text(ligne.toString()), NullWritable.get());   // "ancre crane"
        }
    }
}
```

`Anagrammes.java` : la sortie du Map est `(Text, Text)`, la sortie finale `(Text, NullWritable)`. `NullWritable` est une valeur vide : `TextOutputFormat` n'écrit alors que la clé, sans tabulation.

```java
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.NullWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.lib.input.FileInputFormat;
import org.apache.hadoop.mapreduce.lib.output.FileOutputFormat;

public class Anagrammes {
    public static void main(String[] args) throws Exception {
        if (args.length != 2) {
            System.err.println("Usage : Anagrammes <entrée> <sortie>");
            System.exit(2);
        }
        Job job = Job.getInstance(new Configuration(), "anagrammes");
        job.setJarByClass(Anagrammes.class);
        job.setMapperClass(AnagrammeMapper.class);
        job.setReducerClass(AnagrammeReducer.class);
        job.setMapOutputKeyClass(Text.class);       // sortie du Map : (Text, Text)
        job.setMapOutputValueClass(Text.class);
        job.setOutputKeyClass(Text.class);          // sortie finale : (Text, rien)
        job.setOutputValueClass(NullWritable.class);
        FileInputFormat.addInputPath(job, new Path(args[0]));
        FileOutputFormat.setOutputPath(job, new Path(args[1]));
        System.exit(job.waitForCompletion(true) ? 0 : 1);
    }
}
```

### Résultat

`data/anagrammes.txt` contient les 7 mots de l'énoncé, un par ligne.

```
$ cat sortie_anagrammes/part-r-00000
ancre crane
imaginer migraine
```

| Compteur | Valeur | Sens |
|---|---|---|
| Map input records | 7 | 7 mots |
| Map output records | 7 | une paire `(signature, mot)` par mot |
| Reduce input groups | 5 | 5 signatures différentes |
| Reduce output records | 2 | 2 groupes d'anagrammes |

> [!remarque] « crane ancre » ou « ancre crane » ?
> L'énoncé affiche `crane ancre`. Hadoop trie les **clés**, jamais les valeurs d'une même clé : leur ordre n'est pas garanti. Sans le `Collections.sort`, l'exécution de test a donné `ancre crane` et `migraine imaginer`. Le tri alphabétique rend la sortie identique d'une exécution à l'autre. Les deux réponses sont justes : seul le **contenu** des groupes compte.

> [!warning] Les pièges de l'exercice 1
> **Garder l'objet `Text` au lieu de le copier.** Hadoop réutilise **le même objet** `Text` pour toutes les valeurs de l'itérateur et change seulement son contenu. Ce Reducer semble correct :
> ```java
> List<Text> groupe = new ArrayList<Text>();
> for (Text m : mots) {
>     groupe.add(m);            // FAUX : on garde la référence, pas le mot
> }
> ```
> Il donne pourtant :
> ```
> crane crane
> imaginer imaginer
> ```
> Toutes les cases de la liste désignent le même objet, qui contient le dernier mot lu. D'où le `m.toString()`, qui fait une copie.
>
> **Oublier `setMapOutputKeyClass` / `setMapOutputValueClass`.** Hadoop suppose alors que le Map émet les types de sortie finaux, `(Text, NullWritable)` :
> ```
> java.io.IOException: Type mismatch in value from map: expected org.apache.hadoop.io.NullWritable, received org.apache.hadoop.io.Text
> ```
>
> **Utiliser le Reducer comme Combiner.** Impossible ici. Ses types de sortie ne sont pas ceux du Map, et surtout il **élimine** les mots seuls : un Combiner ne voit qu'une tâche Map, et pourrait supprimer `crane` alors que `ancre` se trouve dans une autre tâche.
>
> **Majuscules et doublons.** `Crane` et `ancre` n'ont pas la même signature sans `toLowerCase()`. Un mot présent deux fois formerait un faux groupe (`crane crane`) sans le test `contains`.

## Exercice 2 : Analyse des sentiments des tweets

### L'idée

C'est un **WordCount où le « mot » est la classe du tweet**. Le Map lit un tweet, cherche des mots positifs et négatifs, décide d'une classe et émet `(classe, 1)`. Le Reduce additionne les 1 de chaque classe.

| Mots trouvés | Classe |
|---|---|
| seulement des positifs | `satisfait` |
| seulement des négatifs | `insatisfait` |
| les deux (sentiments contradictoires) | `inconcluant` |
| aucun | `inconcluant` |

### À la main, sur l'exemple de l'énoncé

| Tweet | Positif | Négatif | Classe |
|---|---|---|---|
| @acme Votre service client est nul | | nul | insatisfait |
| @acme 30min d'attente... très insatisfait | | insatisfait | insatisfait |
| Très satisfait par un produit super !! @acme | satisfait, super | | satisfait |
| merci d'avoir RT @acme | | | inconcluant |
| @acme produit déjà cassé, super insatisfait ! | super | insatisfait | inconcluant |

Total : insatisfait 2, satisfait 1, inconcluant 2, comme dans l'énoncé. Le dernier tweet est clairement mécontent, mais la règle de l'énoncé le classe « inconcluant » : « super » y est un intensif, pas un compliment. C'est la limite d'une analyse par mots-clés.

### Le code fourni ne compile pas tel quel

> [!remarque] Les types génériques ont disparu du PDF
> Le PDF [[Correction TP 3 - Analyse des sentiments (code fourni).pdf]] contient `public class SentimentMapper extends Mapper {`, `Set positifs = new HashSet(...)`, `reduce(Text key, Iterable values, ...)` : tout ce qui était entre `<` et `>` a été perdu lors de la conversion en PDF. Compilé tel quel, il donne 3 erreurs :
> ```
> SentimentMapper.java: error: method does not override or implement a method from a supertype
> SentimentReducer.java: error: method does not override or implement a method from a supertype
> SentimentReducer.java: error: incompatible types: Object cannot be converted to Text
> ```
> Sans ses types, `Mapper` attend `map(Object, Object, Context)` : la méthode `map(LongWritable, Text, Context)` ne redéfinit rien, et `@Override` le signale. Même chose pour `reduce`, et la boucle `for (Text val : values)` parcourt des `Object`.
>
> La correction ajoute **seulement les types** : `Mapper<LongWritable, Text, Text, Text>`, `Set<String>`, `HashSet<String>`, `Reducer<Text, Text, Text, Text>`, `Iterable<Text>`. La logique est inchangée.

`SentimentMapper.java` (code fourni, types rétablis, remis en forme)

```java
import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.StringTokenizer;
import org.apache.hadoop.io.LongWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Mapper;

public class SentimentMapper extends Mapper<LongWritable, Text, Text, Text> {

    private final Text sentiment = new Text();
    private final Text tweet = new Text();

    private static final Set<String> positifs = new HashSet<String>(
        Arrays.asList("satisfait", "super", "excellent", "bien", "formidable",
                      "parfait", "genial"));
    private static final Set<String> negatifs = new HashSet<String>(
        Arrays.asList("nul", "insatisfait", "bof", "incompetents", "mauvais",
                      "horrible", "decevant"));

    @Override
    public void map(LongWritable key, Text value, Context context)
            throws IOException, InterruptedException {
        StringTokenizer tokenizer = new StringTokenizer(value.toString());
        boolean positif = false;
        boolean negatif = false;
        while (tokenizer.hasMoreTokens()) {
            String mot = tokenizer.nextToken()
                                  .toLowerCase()
                                  .replaceAll("[^a-zA-Z]", "");
            if (positifs.contains(mot)) { positif = true; }
            if (negatifs.contains(mot)) { negatif = true; }
        }
        if (positif && negatif) {
            sentiment.set("inconcluant");
        } else if (positif) {
            sentiment.set("satisfait");
        } else if (negatif) {
            sentiment.set("insatisfait");
        } else {
            sentiment.set("inconcluant");
        }
        tweet.set("1");
        context.write(sentiment, tweet);
    }
}
```

Le nettoyage de chaque mot : `toLowerCase()`, puis `replaceAll("[^a-zA-Z]", "")` supprime tout ce qui n'est pas une lettre sans accent. `nul!!!` devient `nul`, `@acme` devient `acme`, `"Très` devient `trs`. Les ensembles `Set` rendent le test `contains` immédiat.

`SentimentReducer.java`

```java
import java.io.IOException;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Reducer;

public class SentimentReducer extends Reducer<Text, Text, Text, Text> {

    @Override
    public void reduce(Text key, Iterable<Text> values, Context context)
            throws IOException, InterruptedException {
        int somme = 0;
        for (Text val : values) {
            somme += Integer.parseInt(val.toString());
        }
        context.write(key, new Text(String.valueOf(somme)));
    }
}
```

`SentimentMain.java`

```java
import java.io.IOException;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.lib.input.FileInputFormat;
import org.apache.hadoop.mapreduce.lib.output.FileOutputFormat;

public class SentimentMain {
    public static void main(String[] args)
            throws IOException, InterruptedException, ClassNotFoundException {
        Configuration conf = new Configuration();
        Job job = Job.getInstance(conf, "Analyse des sentiments");
        job.setJarByClass(SentimentMain.class);
        job.setMapperClass(SentimentMapper.class);
        job.setReducerClass(SentimentReducer.class);
        job.setMapOutputKeyClass(Text.class);
        job.setMapOutputValueClass(Text.class);
        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(Text.class);
        FileInputFormat.addInputPath(job, new Path(args[0]));
        FileOutputFormat.setOutputPath(job, new Path(args[1]));
        System.exit(job.waitForCompletion(true) ? 0 : 1);
    }
}
```

### Résultat

`data/tweets.txt` contient les 5 tweets de l'énoncé, guillemets compris, un par ligne.

```
$ cat sortie_sentiments/part-r-00000
inconcluant	2
insatisfait	2
satisfait	1
```

Mêmes nombres que l'énoncé. Deux différences de présentation : les classes sortent **triées par ordre alphabétique** (le Shuffle trie les clés), et au format `clé<TAB>valeur`.

Pour obtenir exactement le format de l'énoncé (complément, testé), le Reducer écrit toute la ligne dans la clé, avec une valeur vide :

```java
public class SentimentReducerFormat extends Reducer<Text, Text, Text, NullWritable> {
    @Override
    public void reduce(Text key, Iterable<Text> values, Context context)
            throws IOException, InterruptedException {
        int somme = 0;
        for (Text val : values) {
            somme += Integer.parseInt(val.toString());
        }
        context.write(new Text("(\"" + key + "\";" + somme + ")"), NullWritable.get());
    }
}
// dans le main : job.setOutputValueClass(NullWritable.class);
```

```
("inconcluant";2)
("insatisfait";2)
("satisfait";1)
```

> [!warning] Les pièges de l'exercice 2
> **Les accents.** La liste contient `decevant`, `genial`, `incompetents` sans accent, mais le nettoyage **supprime** la lettre accentuée au lieu de la remplacer : `décevant` devient `dcevant` et n'est jamais reconnu. Avec trois tweets de test (`livraison décevant`, `service génial, merci`, `techniciens incompétents`) et un `NUL !!!`, le code fourni donne :
> ```
> inconcluant	3
> insatisfait	1
> ```
> au lieu de 3 insatisfaits et 1 satisfait. La correction (complément) : retirer les accents **avant** de nettoyer, avec `java.text.Normalizer` (`import java.text.Normalizer;`) :
> ```java
> String mot = Normalizer.normalize(tokenizer.nextToken(), Normalizer.Form.NFD)
>                        .toLowerCase()
>                        .replaceAll("\\p{M}", "")      // é -> e : on enlève les accents
>                        .replaceAll("[^a-z]", "");
> ```
> Résultat sur les mêmes tweets : `insatisfait 3`, `satisfait 1`. Sur les tweets de l'énoncé, rien ne change.
>
> **Le fichier doit être en UTF-8.** Hadoop lit le texte en UTF-8. Le même fichier enregistré en ISO-8859-1 (Latin-1) redonne `inconcluant 3` même avec `Normalizer` : les lettres accentuées sont mal décodées.
>
> **Les lignes vides.** Une ligne vide ne contient aucun mot : elle est comptée `inconcluant`. Un fichier `super` / ligne vide / `nul` donne `inconcluant 1`, `insatisfait 1`, `satisfait 1`. Pour l'éviter, ajouter au début de `map` : `if (value.toString().trim().isEmpty()) return;`.

> [!tip] Complément : un Combiner, et `IntWritable`
> Ici, contrairement à l'exercice 1, `SentimentReducer` **peut** servir de Combiner : une somme de sommes partielles reste juste, et ses types d'entrée et de sortie sont les mêmes, `(Text, Text)`. Avec `job.setCombinerClass(SentimentReducer.class);`, les compteurs montrent `Combine input records=5`, `Combine output records=3`, et le résultat est identique. Sur des dizaines de milliers de tweets, le Shuffle ne transporte plus que 3 paires par tâche Map. Transporter le `1` dans un `IntWritable`, comme au TP 2, éviterait aussi les `Integer.parseInt`.

## Exercice 3 : Index web inversé

### L'idée

Une ligne donne les liens **sortants** d'une page : `P1:P2,P3` veut dire « P1 contient des liens vers P2 et P3 ». On veut les liens **entrants** : pour chaque page, qui la cite ? Il suffit de **retourner chaque lien** : pour `P1:P2,P3`, le Map émet `(P2, P1)` et `(P3, P1)`. Le Shuffle regroupe ensuite, pour chaque page, toutes les pages qui la citent.

### À la main, sur l'exemple de l'énoncé

| Ligne | Paires émises par le Map |
|---|---|
| `P1:P2,P3` | (P2, P1), (P3, P1) |
| `P2:P1,P4` | (P1, P2), (P4, P2) |
| `P3:P1,P4` | (P1, P3), (P4, P3) |
| `P4:P1,P2,P3` | (P1, P4), (P2, P4), (P3, P4) |

9 paires. Après le Shuffle : P1 ← [P2, P3, P4] · P2 ← [P1, P4] · P3 ← [P1, P4] · P4 ← [P2, P3]. C'est le résultat de l'énoncé.

### Le code

`IndexMapper.java`

```java
import java.io.IOException;
import org.apache.hadoop.io.LongWritable;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Mapper;

public class IndexMapper extends Mapper<LongWritable, Text, Text, Text> {

    private final Text cible = new Text();
    private final Text source = new Text();

    @Override
    protected void map(LongWritable offset, Text ligne, Context context)
            throws IOException, InterruptedException {
        String[] parties = ligne.toString().split(":");   // "P1:P2,P3" -> "P1" | "P2,P3"
        if (parties.length != 2) {
            return;                                      // ligne vide ou mal formée
        }
        source.set(parties[0].trim());
        for (String page : parties[1].split(",")) {
            if (!page.trim().isEmpty()) {
                cible.set(page.trim());
                context.write(cible, source);            // (P2, P1) : P2 est référencée par P1
            }
        }
    }
}
```

`IndexReducer.java` : un `TreeSet` trie les pages et supprime les doublons (deux liens de P2 vers P1 ne comptent qu'une fois).

```java
import java.io.IOException;
import java.util.TreeSet;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Reducer;

public class IndexReducer extends Reducer<Text, Text, Text, Text> {

    @Override
    protected void reduce(Text page, Iterable<Text> sources, Context context)
            throws IOException, InterruptedException {
        TreeSet<String> triees = new TreeSet<String>();        // triées et sans doublon
        for (Text s : sources) {
            triees.add(s.toString());
        }
        StringBuilder liste = new StringBuilder();
        for (String s : triees) {
            if (liste.length() > 0) liste.append(", ");
            liste.append(s);
        }
        context.write(page, new Text(liste.toString()));   // ("P1", "P2, P3, P4")
    }
}
```

`IndexInverse.java` : par défaut, `TextOutputFormat` sépare la clé et la valeur par une tabulation. La propriété `mapreduce.output.textoutputformat.separator` la remplace par `": "`. Map et Reduce émettent tous deux `(Text, Text)` : `setOutputKeyClass` et `setOutputValueClass` suffisent.

```java
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.lib.input.FileInputFormat;
import org.apache.hadoop.mapreduce.lib.output.FileOutputFormat;

public class IndexInverse {
    public static void main(String[] args) throws Exception {
        Configuration conf = new Configuration();
        // séparateur clé/valeur en sortie : ": " au lieu de la tabulation
        conf.set("mapreduce.output.textoutputformat.separator", ": ");
        Job job = Job.getInstance(conf, "index inverse");
        job.setJarByClass(IndexInverse.class);
        job.setMapperClass(IndexMapper.class);
        job.setReducerClass(IndexReducer.class);
        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(Text.class);
        FileInputFormat.addInputPath(job, new Path(args[0]));
        FileOutputFormat.setOutputPath(job, new Path(args[1]));
        System.exit(job.waitForCompletion(true) ? 0 : 1);
    }
}
```

### Résultat

`data/pages.txt` contient les 4 lignes de l'énoncé.

```
$ cat sortie_index/part-r-00000
P1: P2, P3, P4
P2: P1, P4
P3: P1, P4
P4: P2, P3
```

Compteurs : `Map input records=4` (4 pages), `Map output records=9` (9 liens retournés), `Reduce input groups=4` (4 pages citées), `Reduce output records=4`.

> [!warning] Les pièges de l'exercice 3
> **`conf.set` après `Job.getInstance`.** `Job.getInstance(conf)` **copie** la configuration. Un `conf.set(...)` placé après n'a plus d'effet : avec la ligne déplacée sous `getInstance`, la sortie redevient `P1<TAB>P2, P3, P4`. Il faut régler `conf` **avant** de créer le job, ou passer par `job.getConfiguration().set(...)`.
>
> **L'ordre des pages.** Comme à l'exercice 1, les valeurs arrivent dans un ordre non garanti : sans tri, l'exécution de test a donné `P1: P4, P3, P2` et `P4: P3, P2`. Le `TreeSet` trie par ordre **alphabétique** : avec plus de 9 pages, `P10` passerait avant `P2`.
>
> **Les pages que personne ne cite** n'apparaissent pas dans le résultat : aucune paire n'a cette page pour clé. Dans l'exemple, chaque page est citée au moins une fois.
>
> **Les espaces.** `P1: P2, P3` en entrée donnerait des clés `" P2"`. Les `trim()` du Mapper les enlèvent.

## Exécution sur le cluster (les trois exercices)

Exporter le projet en `TP3.jar` (Export → Java → JAR file, comme au TP 2), puis :

```
$ hadoop fs -mkdir tp3
$ hadoop fs -put data/anagrammes.txt data/tweets.txt data/pages.txt tp3/
$ hadoop fs -ls tp3
Found 3 items
-rw-r--r--   1 rayen supergroup         58 2026-11-09 10:51 tp3/anagrammes.txt
-rw-r--r--   1 rayen supergroup         39 2026-11-09 10:51 tp3/pages.txt
-rw-r--r--   1 rayen supergroup        206 2026-11-09 10:51 tp3/tweets.txt
$ hadoop jar TP3.jar Anagrammes tp3/anagrammes.txt tp3/sortie_anagrammes
$ hadoop fs -cat tp3/sortie_anagrammes/part-r-00000
ancre crane
imaginer migraine
$ hadoop jar TP3.jar SentimentMain tp3/tweets.txt tp3/sortie_sentiments
$ hadoop fs -cat tp3/sortie_sentiments/part-r-00000
inconcluant	2
insatisfait	2
satisfait	1
$ hadoop jar TP3.jar IndexInverse tp3/pages.txt tp3/sortie_index
$ hadoop fs -cat tp3/sortie_index/part-r-00000
P1: P2, P3, P4
P2: P1, P4
P3: P1, P4
P4: P2, P3
```

Chaque `hadoop jar` se termine par `Job ... completed successfully`. Un seul JAR contient les trois programmes : le **deuxième argument** de `hadoop jar` choisit la classe `main` à lancer. Si les classes sont dans des *packages*, donner le nom complet (`anagrammes.Anagrammes`).

Les erreurs du TP 2 restent valables : sortie déjà existante (`hadoop fs -rm -r tp3/sortie_...`), fichier d'entrée resté en local, `println` visibles seulement dans les journaux YARN.

## Questions de révision

1. Pourquoi utiliser les lettres triées comme clé dans l'exercice 1 ? Que se passerait-il avec le mot lui-même comme clé ?
2. Pourquoi ne peut-on pas utiliser `AnagrammeReducer` comme Combiner, alors que `SentimentReducer` le peut ?
3. Un Reducer range les objets `Text` reçus dans une `List<Text>`, puis les affiche. Qu'obtient-on, et pourquoi ?
4. Pourquoi le code fourni pour l'exercice 2 ne compile-t-il pas ? Que faut-il ajouter ?
5. Pourquoi le tweet « livraison décevant » est-il classé inconcluant par le code fourni ? Comment corriger ?
6. Combien de paires le Map de l'exercice 3 émet-il sur l'exemple ? Combien d'appels à `reduce` ?
7. Comment obtenir `P1: P2, P3, P4` au lieu de `P1<TAB>P2, P3, P4` ? Où placer cette ligne dans le `main` ?
8. Quand faut-il appeler `setMapOutputKeyClass` et `setMapOutputValueClass` ?

> [!question]- Réponses
> 1. Tous les anagrammes ont la même suite de lettres triées : le Shuffle les regroupe sous la même clé. Avec le mot lui-même, chaque mot aurait sa propre clé : aucun regroupement.
> 2. `AnagrammeReducer` change les types (sortie `NullWritable`) et **filtre** les groupes d'un seul mot : appliqué à une seule tâche Map, il supprimerait des mots dont l'anagramme est dans une autre tâche. `SentimentReducer` fait une somme (associative), avec les mêmes types en entrée et en sortie : additionner des sous-totaux donne le bon total.
> 3. La même valeur répétée (`crane crane`) : Hadoop réutilise un seul objet `Text` et ne change que son contenu. Il faut copier avec `toString()` (ou `new Text(m)`).
> 4. Les types génériques ont été perdus dans le PDF : sans eux, `map` et `reduce` ne redéfinissent pas les méthodes de Hadoop (`@Override` échoue) et les valeurs sont des `Object`. Il faut rétablir `Mapper<LongWritable, Text, Text, Text>`, `Reducer<Text, Text, Text, Text>`, `Iterable<Text>` et `Set<String>`.
> 5. `replaceAll("[^a-zA-Z]", "")` supprime le `é` : `dcevant` n'est pas dans la liste. Retirer d'abord les accents avec `Normalizer.normalize(..., Form.NFD)` puis `replaceAll("\\p{M}", "")`, et enregistrer le fichier en UTF-8.
> 6. **9** paires (une par lien), **4** appels à `reduce` (une par page citée).
> 7. `conf.set("mapreduce.output.textoutputformat.separator", ": ");`, **avant** `Job.getInstance(conf, ...)`, car le job copie la configuration.
> 8. Quand le Map émet des types différents de la sortie finale (exercice 1 : `(Text, Text)` puis `(Text, NullWritable)`). Sinon, Hadoop signale `Type mismatch ... from map`.
