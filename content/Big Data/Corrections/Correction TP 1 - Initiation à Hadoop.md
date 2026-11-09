---
date: 2026-11-09
ordre: 1
tags: [big-data, hadoop, hdfs, tp, correction, cloudera, virtualbox, hadoop-fs, purchases, installation]
---
# Correction TP 1 — Initiation à Hadoop (HDFS)

Énoncé : [[TP 1 - Initiation à Hadoop.pdf]] · cours : [[Résumé - Chapitre 2 - Hadoop et HDFS#13. Les commandes HDFS|les commandes HDFS]], [[Résumé - Chapitre 2 - Hadoop et HDFS#6. Un fichier HDFS devient une suite de blocs|les blocs]] · suite : [[Correction TP 2 - Premier programme Hadoop MapReduce]]

> [!abstract] Ce qu'on fait
> On prépare une machine où Hadoop fonctionne déjà (la **VM Cloudera**), puis on manipule **HDFS** depuis un terminal : créer un répertoire, y envoyer le fichier de ventes **purchases.txt** (201,5 Mio, 4 138 476 lignes), le lister, lire sa fin, puis essayer chaque commande de la Table 1 (`-put`, `-get`, `-cat`, `-mv`, `-rm`...).

> [!note] Ce qui a été vérifié
> Toutes les commandes ont été exécutées avec **Hadoop 3.4.3** (Java 11) sur un HDFS de test à un DataNode et une réplication de 1, comme dans la VM, avec le vrai `purchases.txt` de la VM (211 312 924 octets). Les sorties ci-dessous en sont extraites (identifiants de blocs raccourcis). Par rapport à la VM, seuls l'utilisateur (`training` dans l'énoncé) et la date changent. La configuration de la section 0.B a été testée avec Hadoop 3.4.3 : HDFS et YARN démarrent et exécutent le WordCount du TP 2.

## 0. Comment travailler ce TP

Il faut d'abord un Hadoop qui marche. L'énoncé utilise une machine virtuelle toute prête. Si votre PC la supporte mal, la méthode B installe Hadoop directement. Les commandes du TP sont **les mêmes** dans les deux cas.

| | A. La VM Cloudera (énoncé) | B. Hadoop sur votre PC (complément) |
|---|---|---|
| Système | Windows, Linux ou macOS + VirtualBox | Linux, ou Windows avec WSL 2 (Ubuntu) |
| À télécharger | la VM : archive de 1,77 Go | Hadoop 3.4.x + `purchases.txt.gz` (38 Mo) |
| Version de Hadoop | 2.0.0-cdh4.1.1 | 3.4.x |
| Démarrage de Hadoop | automatique avec la VM | 4 commandes à lancer (ci-dessous) |
| Mémoire conseillée | 2 Go pour la VM si le PC a 8 Go | rien de particulier |

### A. Avec la VM Cloudera (Partie 1 de l'énoncé, page 1)

1. Installer **VirtualBox** (`https://www.virtualbox.org/`).
2. Télécharger la VM avec le lien de l'énoncé : `Cloudera-Udacity-Training-VM-4.1.1.c.zip`. Le lien répond toujours (vérifié le 9 novembre 2026, 1,77 Go).
3. Décompresser l'archive avec **7-Zip**. On obtient le disque de la machine : `ClouderaTraining-VM-4.1.1.c.vmdk`.
4. Dans VirtualBox, **Nouvelle** :
   - nom `Hadoop`, type **Linux**. L'énoncé choisit la version « Ubuntu (64 bits) ». La VM est en réalité une **CentOS**, donc « Red Hat (64-bit) » serait plus exact, mais ce choix ne règle que des valeurs par défaut de VirtualBox ;
   - mémoire : **1024 Mo minimum**. Donnez 2048 Mo si votre PC a 8 Go de RAM, Hadoop sera plus à l'aise ;
   - disque : **Utiliser un fichier de disque dur virtuel existant**, puis choisir le `.vmdk`.
5. **Configuration → Réseau → Interface 1 → Accès par pont**, puis OK.
6. **Démarrer**. Hadoop se lance avec la machine, il n'y a rien à faire de plus.
7. Clavier : la VM est en QWERTY anglais. **System → Preferences → Keyboard → Layouts**, ajouter *French*, le placer en premier.
8. Ouvrir un **terminal** et vérifier :

```sh
hadoop version        # Hadoop 2.0.0-cdh4.1.1 dans la VM
```

### B. Sur votre PC, sans VM (complément, hors énoncé)

À faire une seule fois. Sous Windows, utilisez **WSL 2 avec Ubuntu**. Hadoop ne tourne pas directement sous Windows sans outils supplémentaires (`winutils.exe`).

**1. Java 11 et Hadoop.** Hadoop 3.4 fonctionne avec Java 8 ou 11.

```sh
sudo apt install openjdk-11-jdk          # Ubuntu / WSL
# télécharger hadoop-3.4.x.tar.gz sur https://hadoop.apache.org/releases.html, puis :
tar -xzf hadoop-3.4.*.tar.gz
mv hadoop-3.4.*/ ~/hadoop
```

**2. Variables d'environnement**, à la fin de `~/.bashrc` (puis `source ~/.bashrc`) :

```sh
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64    # chemin sous Ubuntu
export HADOOP_HOME=$HOME/hadoop
export PATH=$HADOOP_HOME/bin:$HADOOP_HOME/sbin:$PATH
```

Mettre aussi la ligne `export JAVA_HOME=...` dans `~/hadoop/etc/hadoop/hadoop-env.sh` : les démons ne lisent pas toujours votre `.bashrc`.

**3. Quatre fichiers de configuration** dans `~/hadoop/etc/hadoop/`. Remplacez `VOTRE_LOGIN` par votre nom d'utilisateur (`whoami`) : les fichiers XML ne comprennent ni `~` ni `$HOME`.

`core-site.xml` : où se trouve HDFS.

```xml
<configuration>
  <property><name>fs.defaultFS</name><value>hdfs://localhost:9000</value></property>
  <property><name>hadoop.tmp.dir</name><value>/home/VOTRE_LOGIN/hadoop-data/tmp</value></property>
</configuration>
```

`hdfs-site.xml` : un seul DataNode, donc une seule copie de chaque bloc.

```xml
<configuration>
  <property><name>dfs.replication</name><value>1</value></property>
  <property><name>dfs.namenode.name.dir</name><value>/home/VOTRE_LOGIN/hadoop-data/namenode</value></property>
  <property><name>dfs.datanode.data.dir</name><value>/home/VOTRE_LOGIN/hadoop-data/datanode</value></property>
</configuration>
```

`mapred-site.xml` et `yarn-site.xml` ne servent qu'à partir du TP 2 (lancer des jobs sur YARN). Autant les écrire maintenant :

```xml
<!-- mapred-site.xml -->
<configuration>
  <property><name>mapreduce.framework.name</name><value>yarn</value></property>
  <property><name>mapreduce.application.classpath</name>
    <value>/home/VOTRE_LOGIN/hadoop/share/hadoop/mapreduce/*:/home/VOTRE_LOGIN/hadoop/share/hadoop/mapreduce/lib/*</value></property>
</configuration>
```

```xml
<!-- yarn-site.xml -->
<configuration>
  <property><name>yarn.nodemanager.aux-services</name><value>mapreduce_shuffle</value></property>
  <property><name>yarn.nodemanager.env-whitelist</name>
    <value>JAVA_HOME,HADOOP_COMMON_HOME,HADOOP_HDFS_HOME,HADOOP_CONF_DIR,CLASSPATH_PREPEND_DISTCACHE,HADOOP_YARN_HOME,HADOOP_HOME,PATH,LANG,TZ,HADOOP_MAPRED_HOME</value></property>
</configuration>
```

**4. Formater HDFS (une seule fois) et démarrer les démons.**

```sh
hdfs namenode -format                    # UNE fois, à l'installation
hdfs --daemon start namenode
hdfs --daemon start datanode
yarn --daemon start resourcemanager      # utile à partir du TP 2
yarn --daemon start nodemanager
jps                                      # doit lister NameNode, DataNode, ResourceManager, NodeManager
hdfs dfs -mkdir -p /user/$USER           # votre répertoire personnel dans HDFS (voir section 2)
```

Pour arrêter : les mêmes commandes avec `stop`, dans l'ordre inverse. Interfaces web : HDFS sur `http://localhost:9870`, YARN sur `http://localhost:8088`.

`hdfs --daemon start` lance chaque démon directement. Les scripts `start-dfs.sh` et `start-yarn.sh` passent par `ssh localhost` et demandent donc un serveur SSH et une clé.

> [!warning] Ne pas reformater HDFS
> `hdfs namenode -format` efface le système de fichiers et lui donne un nouvel identifiant de cluster. L'ancien DataNode refuse alors de démarrer (« Incompatible clusterIDs » dans ses logs), et `jps` n'affiche plus `DataNode`. Si c'est arrivé, arrêtez tout, videz `~/hadoop-data/datanode`, puis redémarrez.

**5. Les données du TP.** Le fichier de la VM est publié par Udacity. La version téléchargée a été comparée à celle de la VM : elles sont identiques, octet pour octet.

```sh
mkdir -p ~/udacity_training/data && cd ~/udacity_training/data
wget https://content.udacity-data.com/courses/ud617/purchases.txt.gz
gunzip purchases.txt.gz                  # donne purchases.txt, 211 312 924 octets
```

## 1. Se placer à côté des données (énoncé page 2)

```sh
cd ~/udacity_training/data
ls -l purchases.txt
head -2 purchases.txt
```

```
2012-01-01	09:00	San Jose	Men's Clothing	214.05	Amex
2012-01-01	09:00	Fort Worth	Women's Clothing	153.57	Visa
```

Chaque ligne est un **achat** : date, heure, ville, catégorie, montant, moyen de paiement, séparés par des **tabulations**. C'est ce format que les Mappers découperont dans les TP suivants.

> [!remarque] Le chemin de l'énoncé
> L'énoncé parle de `/udacity_training/data` (à la racine) et dit qu'il contient `code` et `data`. Dans la VM, le dossier est dans le répertoire personnel : `~/udacity_training`, qui contient `code` et `data`. Le fichier est dans `~/udacity_training/data`. Si `cd` échoue, retrouvez-le avec `find ~ -name purchases.txt`.

## 2. Créer un répertoire dans HDFS

```sh
hadoop fs -mkdir myinput
```

Un chemin qui ne commence pas par `/` est **relatif à votre répertoire personnel HDFS**, `/user/<login>`. `myinput` est donc `/user/training/myinput` dans la VM.

> [!warning] Sur une installation neuve (méthode B)
> Le répertoire personnel n'existe pas encore, et la commande échoue :
> ```
> mkdir: `hdfs://localhost:9000/user/<login>': No such file or directory
> ```
> Il faut le créer une fois : `hdfs dfs -mkdir -p /user/$USER`. Dans la VM, `/user/training` existe déjà.

`hadoop fs` ou `hdfs dfs` ? Pour HDFS, c'est la même chose. `hadoop fs` accepte n'importe quel système de fichiers connu de Hadoop (local, HDFS, S3...), `hdfs dfs` ne parle qu'à HDFS. Le cours utilise `hdfs dfs`, le TP `hadoop fs`.

## 3. Copier purchases.txt dans HDFS

Depuis le dossier local où se trouve le fichier :

```sh
hadoop fs -put purchases.txt myinput/
```

Rien ne s'affiche si tout va bien. Pendant ce temps, le client demande au NameNode où écrire, puis envoie les blocs aux DataNodes (voir [[Résumé - Chapitre 2 - Hadoop et HDFS#11. Écrire dans HDFS : pipeline et confirmations|l'écriture en pipeline]]).

## 4. Lister le répertoire

```
$ hadoop fs -ls myinput
Found 1 items
-rw-r--r--   1 rayen supergroup  211312924 2026-11-09 10:40 myinput/purchases.txt
```

| Colonne | Valeur | Sens |
|---|---|---|
| 1 | `-rw-r--r--` | permissions, comme sous Linux (`d` au début pour un répertoire) |
| 2 | `1` | **facteur de réplication** : 1 dans la VM (un seul DataNode), 3 par défaut sur un vrai cluster ; `-` pour un répertoire |
| 3 et 4 | `rayen supergroup` | propriétaire et groupe (`training` dans la VM) |
| 5 | `211312924` | taille en octets, soit 201,5 Mio |
| 6 et 7 | date et heure | dernière modification |
| 8 | `myinput/purchases.txt` | chemin |

## 5. Lire la fin du fichier

> [!remarque] Erreur de l'énoncé : `purchase.txt`
> L'énoncé envoie `purchases.txt`, puis tape `hadoop fs -tail myinput/purchase.txt`, **sans le s**. Sa sortie montre un fichier nommé `purchase.txt`, sans doute renommé lors de la préparation de l'énoncé. Avec le fichier envoyé à l'étape 3, la commande de l'énoncé échoue :
> ```
> $ hadoop fs -tail myinput/purchase.txt
> tail: `myinput/purchase.txt': No such file or directory
> ```

La bonne commande :

```
$ hadoop fs -tail myinput/purchases.txt
31	17:59	Norfolk	Toys	164.34	MasterCard
2012-12-31	17:59	Chula Vista	Music	380.67	Visa
2012-12-31	17:59	Hialeah	Toys	115.21	MasterCard
2012-12-31	17:59	Indianapolis	Men's Clothing	158.28	MasterCard
2012-12-31	17:59	Norfolk	Garden	414.09	MasterCard
2012-12-31	17:59	Baltimore	DVDs	467.3	Visa
2012-12-31	17:59	Santa Ana	Video Games	144.73	Visa
2012-12-31	17:59	Gilbert	Consumer Electronics	354.66	Discover
2012-12-31	17:59	Memphis	Sporting Goods	124.79	Amex
2012-12-31	17:59	Chicago	Men's Clothing	386.54	MasterCard
2012-12-31	17:59	Birmingham	CDs	118.04	Cash
2012-12-31	17:59	Las Vegas	Health and Beauty	420.46	Amex
2012-12-31	17:59	Wichita	Toys	383.9	Cash
2012-12-31	17:59	Tucson	Pet Supplies	268.39	MasterCard
2012-12-31	17:59	Glendale	Women's Clothing	68.05	Amex
2012-12-31	17:59	Albuquerque	Toys	345.7	MasterCard
2012-12-31	17:59	Rochester	DVDs	399.57	Amex
2012-12-31	17:59	Greensboro	Baby	277.27	Discover
2012-12-31	17:59	Arlington	Women's Clothing	134.95	MasterCard
2012-12-31	17:59	Corpus Christi	DVDs	441.61	Discover
```

C'est exactement la sortie de l'énoncé. Pourquoi la première ligne commence-t-elle par `31	17:59` ? `-tail` n'affiche pas les dernières *lignes* mais le **dernier kilo-octet** (1 024 octets) du fichier, sans se soucier des fins de ligne. Le premier achat affiché est donc coupé : c'est la fin de `2012-12-31	17:59	Norfolk	Toys	164.34	MasterCard`.

## 6. Voir les blocs du fichier (complément, hors énoncé)

HDFS a découpé le fichier en blocs (voir [[Résumé - Chapitre 2 - Hadoop et HDFS#6. Un fichier HDFS devient une suite de blocs|le cours]]). `fsck` les montre :

```
$ hdfs fsck /user/rayen/myinput/purchases.txt -files -blocks
/user/rayen/myinput/purchases.txt 211312924 bytes, replicated: replication=1, 2 block(s):  OK
0. BP-...:blk_1073741827_1003 len=134217728 Live_repl=1
1. BP-...:blk_1073741828_1004 len=77095196 Live_repl=1
Status: HEALTHY
```

Avec des blocs de 128 Mio (134 217 728 octets) : $211\,312\,924 = 134\,217\,728 + 77\,095\,196$, donc **2 blocs**, le second à moitié plein. Le dernier bloc n'occupe sur le disque que sa taille réelle (73,5 Mio), pas 128 Mio.

Deux autres commandes donnent la taille et l'espace occupé :

```
$ hadoop fs -du -h myinput
201.5 M  201.5 M  myinput/purchases.txt
$ hadoop fs -stat "taille=%b bloc=%o replication=%r" myinput/purchases.txt
taille=211312924 bloc=134217728 replication=1
```

`-du -h` affiche deux colonnes : la taille du fichier, puis l'espace disque consommé **avec toutes les copies**. Avec une réplication de 3, la seconde colonne vaudrait 604,6 M.

## 7. La Table 1, commande par commande (énoncé page 4)

Sur un petit fichier local `file.txt` de deux lignes :

```
$ hadoop fs -put file.txt
$ hadoop fs -put file.txt
put: `file.txt': File exists
$ hadoop fs -ls
Found 2 items
-rw-r--r--   1 rayen supergroup         40 2026-11-09 10:41 file.txt
drwxr-xr-x   - rayen supergroup          0 2026-11-09 10:40 myinput
$ hadoop fs -cat file.txt
ligne 1 de file.txt
ligne 2 de file.txt
$ hadoop fs -mv file.txt newfile.txt
$ hadoop fs -get newfile.txt
$ hadoop fs -get newfile.txt
get: `newfile.txt': File exists
$ hadoop fs -rm newfile.txt
Deleted newfile.txt
$ hadoop fs -rm -r myinput2
rm: `myinput2': No such file or directory
$ hadoop fs -rm -f -r myinput2
$ hadoop fs -ls /
Found 1 items
drwxr-xr-x   - rayen supergroup          0 2026-11-09 10:39 /user
```

| Commande | Ce qu'elle fait | À savoir |
|---|---|---|
| `hadoop fs -ls` | liste **votre répertoire personnel** `/user/<login>` | pour la racine : `hadoop fs -ls /` ; tout l'arbre : `-ls -R` |
| `hadoop fs -put file.txt` | copie un fichier **local → HDFS** | refuse d'écraser (`File exists`) ; `-put -f` force |
| `hadoop fs -get file.txt` | copie **HDFS → local**, dans le dossier courant | refuse d'écraser une copie locale |
| `hadoop fs -tail file.txt` | affiche le **dernier Ko** | la première ligne peut être coupée |
| `hadoop fs -cat file.txt` | affiche tout le fichier | sur 200 Mio, ça défile longtemps : `Ctrl+C`, ou ajouter `\| head` |
| `hadoop fs -cat file.txt \| less` | page par page | `less` est la commande Linux locale qui reçoit le flux ; `q` pour quitter |
| `hadoop fs -mv a b` | renomme ou déplace **dans HDFS** | ne copie pas entre le disque local et HDFS |
| `hadoop fs -rm newfile.txt` | supprime un fichier | si la corbeille HDFS est activée, le fichier part dans `.Trash` (message « Moved ... to trash ») au lieu d'être supprimé |
| `hadoop fs -mkdir myinput` | crée un répertoire | `-p` crée aussi les parents manquants |
| `hadoop fs -rm -f -r myinput` | supprime un répertoire et son contenu | `-r` : récursif ; `-f` : pas d'erreur s'il n'existe pas |

> [!remarque] Erreur de la Table 1 : `hadoop fs -ls`
> La table dit « afficher le contenu du répertoire racine ». Sans argument, la commande affiche en fait le **répertoire personnel** `/user/<login>` : ci-dessus, elle montre `file.txt` et `myinput`, alors que `hadoop fs -ls /` ne montre que `/user`. La racine se liste avec `hadoop fs -ls /`.

## 8. Récapitulatif des erreurs de l'énoncé

| Page | Dans l'énoncé | En réalité |
|---|---|---|
| 1 | version « Ubuntu (64 bits) » pour la VM | la VM est une CentOS ; sans conséquence |
| 2 | `/udacity_training/data` contient `code` et `data` | c'est `~/udacity_training` qui contient `code` et `data` |
| 3 | `hadoop fs -tail myinput/purchase.txt` | le fichier envoyé s'appelle `purchases.txt` |
| 4 | `hadoop fs -ls` : contenu de la racine | contenu de `/user/<login>` ; la racine est `hadoop fs -ls /` |

## Questions de révision

1. Où se trouve, dans HDFS, le répertoire créé par `hadoop fs -mkdir myinput` ?
2. Sur une installation neuve, `hadoop fs -mkdir myinput` répond `No such file or directory`. Pourquoi, et comment corriger ?
3. Pourquoi la sortie de `hadoop fs -tail` commence-t-elle par une ligne incomplète ?
4. `purchases.txt` fait 211 312 924 octets. Combien de blocs avec des blocs de 128 Mio ? Et de 64 Mio ?
5. Que vaut la deuxième colonne de `hadoop fs -du -h` pour ce fichier avec une réplication de 3 ?
6. `hadoop fs -put file.txt` répond `File exists`. Que faire ?
7. Quelle différence entre `-mv` et `-get` ? Entre `hadoop fs` et `hdfs dfs` ?
8. Pourquoi faut-il éviter de relancer `hdfs namenode -format` ?

> [!question]- Réponses
> 1. Dans le répertoire personnel : `/user/<login>/myinput`, donc `/user/training/myinput` dans la VM.
> 2. Le répertoire personnel `/user/<login>` n'existe pas encore. On le crée une fois : `hdfs dfs -mkdir -p /user/$USER`.
> 3. `-tail` affiche le dernier kilo-octet (1 024 octets), pas les dernières lignes ; la coupure tombe au milieu d'une ligne.
> 4. 128 Mio : $211\,312\,924 = 134\,217\,728 + 77\,095\,196$, **2 blocs**. 64 Mio : $3 \times 67\,108\,864 = 201\,326\,592$, il reste $9\,986\,332$ octets (9,5 Mio), donc **4 blocs**.
> 5. Trois copies : $3 \times 201{,}5 \approx$ **604,6 M**.
> 6. Le fichier existe déjà dans HDFS. Ajouter `-f` pour l'écraser (`hadoop fs -put -f file.txt`), ou le supprimer d'abord avec `-rm`.
> 7. `-mv` déplace ou renomme **à l'intérieur de HDFS** ; `-get` copie de HDFS **vers le disque local**. `hadoop fs` marche avec tout système de fichiers connu de Hadoop, `hdfs dfs` seulement avec HDFS ; pour HDFS, elles sont équivalentes.
> 8. Le formatage efface HDFS et change l'identifiant du cluster : les données sont perdues et l'ancien DataNode ne démarre plus (« Incompatible clusterIDs »).
