---
date: 2026-11-08
ordre: 3
tags: [r, tp, correction, fonctions, graphiques, plot, packages, mass, leaflet, fichiers]
---
# Correction TP 3 — Fonctions, graphes et fichiers

Énoncé : [[TP 3 - Fonctions, graphes et fichiers.pdf]] · Dr. Abbassi A. · précédent : [[Correction TP 2 - Matrices, tableaux et listes]] · fiche : [[Cheat sheet - R]]

Les sorties et les graphiques ci-dessous viennent de l'exécution du code avec R 4.6.

## III. Fonctions

> [!definition] Écrire une fonction
> ```r
> nom <- function(arg1, arg2 = valeur_par_defaut) {
>   ...
>   return(resultat)   # sans return, R renvoie la dernière expression évaluée
> }
> ```
> Les variables créées **dans** la fonction sont **locales** : elles disparaissent à la sortie et ne modifient pas celles de l'environnement de travail.

### Exercice 1 : `myMedian`

Méthode : trier l'échantillon (statistique d'ordre), puis prendre l'élément du milieu si $n = 2k + 1$, la moyenne des deux éléments du milieu si $n = 2k$.

```r
myMedian <- function(x) {
  x <- sort(x)          # x(1) <= x(2) <= ... <= x(n)
  n <- length(x)
  k <- n %/% 2          # division entière : 7 %/% 2 = 3
  if (n %% 2 == 1) {    # reste de la division : n impair
    return(x[k + 1])
  } else {
    return((x[k] + x[k + 1]) / 2)
  }
}
```

**Comparaison avec `median`**

```r
myMedian(c(7, 1, 5, 3, 9));     median(c(7, 1, 5, 3, 9))      # 5 et 5  (trié : 1 3 [5] 7 9)
myMedian(c(7, 1, 5, 3, 9, 11)); median(c(7, 1, 5, 3, 9, 11))  # 6 et 6  (trié : 1 3 [5 7] 9 11)
ech <- rnorm(1001)
myMedian(ech) == median(ech)                                   # TRUE
```

> [!warning] Les indices
> En R, le premier élément est `x[1]` : la formule $X_{k+1}$ de l'énoncé se traduit directement par `x[k + 1]`, sans décalage.

### Exercice 2 : `myestvar`

$$s^2_{\text{sans biais}} = \frac{1}{n-1}\sum_{i=1}^n (x_i - \bar x)^2 \qquad s^2_{\text{biaisée}} = \frac{1}{n}\sum_{i=1}^n (x_i - \bar x)^2$$

**1. Avec une structure de contrôle**

```r
myestvar <- function(x, biased = FALSE) {
  n  <- length(x)
  sc <- sum((x - mean(x))^2)   # somme des carrés des écarts
  if (biased) {
    return(sc / n)
  } else {
    return(sc / (n - 1))
  }
}
```

**2. Avec les opérateurs logiques**, sans `if` : dans un calcul, `TRUE` vaut 1 et `FALSE` vaut 0.

```r
myestvar2 <- function(x, biased = FALSE) {
  sum((x - mean(x))^2) / (length(x) - !biased)   # !biased vaut 1 si biased = FALSE
}
```

| Appel | Résultat |
|---|---|
| `x <- c(2, 4, 4, 4, 5, 5, 7, 9)` | |
| `myestvar(x)`, `myestvar2(x)`, `var(x)` | `4.571429` (les trois) |
| `myestvar(x, biased = TRUE)`, `myestvar2(x, TRUE)` | `4` |

`var()` de R calcule l'estimateur **sans biais**.

### Pièges du listing 2

- la ligne 9 appelle `power2(5)` alors que la fonction s'appelle `power_2` : l'erreur vient d'abord de ce nom ;
- avec `n <- 3`, `power_2(5)` renvoie 125 : la fonction a pris le `n` de l'environnement de travail, d'où le conseil de **passer toutes les variables en arguments** ;
- après l'appel, `y` vaut toujours 0 : le `y` de la fonction était local.

## V. Graphiques

| Fonction | Rôle |
|---|---|
| `plot(x, y, ...)` | crée un **nouveau** graphique |
| `lines(x, y, ...)` | **ajoute** une courbe au graphique courant |
| `points(x, y, ...)` | **ajoute** des points |
| `par(mfrow = c(l, c))` | découpe la fenêtre en `l` lignes et `c` colonnes |

Options de `plot` : `type = "l"` (ligne), `col`, `main` (titre), `xlab`, `ylab`, `xlim`, `ylim`, `pch` (symbole), `cex` (taille).

### Exercice 1 : la fonction sinus

```r
x <- seq(0, 10, by = 0.01)          # pas fin pour une courbe lisse
plot(x, sin(x), type = "l")         # 1.

plot(x, sin(x), type = "l",         # 2.
     ylim = c(-1.5, 1.5),
     main = "Graphique de la fonction sinus",
     xlab = "Angle", ylab = "Sinus")

lines(x, x / (2 * pi), col = "red")                         # 3. droite y = x / (2π), en rouge
points(c(0, 2), c(1.3, -1), pch = "*", col = "blue", cex = 2.5)   # 4. points (0 ; 1,3) et (2 ; -1)
```

![[r-tp3-sinus.png|640]]

> [!tip] `points(x, y)`
> Les abscisses vont ensemble dans le premier vecteur, les ordonnées dans le second : `points(c(0, 2), c(1.3, -1))`, et non `points(c(0, 1.3), c(2, -1))`.

### Exercice 2 : fenêtre 2 × 2

```r
x     <- seq(-5, 5, by = 0.01)
x_pos <- seq(0.01, 5, by = 0.01)    # ln n'est défini que pour x > 0

par(mfrow = c(2, 2))                # remplie ligne par ligne
plot(x, cos(x), type = "l", main = "Cosinus", xlab = "x", ylab = "cos(x)")                    # haut gauche
plot(x, sin(x), type = "l", main = "Sinus", xlab = "x", ylab = "sin(x)")                      # haut droite
plot(x, exp(x), type = "l", main = "Exponentielle", xlab = "x", ylab = "exp(x)")              # bas gauche
plot(x_pos, log(x_pos), type = "l", main = "Logarithme népérien", xlab = "x", ylab = "ln(x)") # bas droite
par(mfrow = c(1, 1))                # revenir à une seule case
```

![[r-tp3-2x2.png|640]]

En R, `log()` est le logarithme **népérien** ; `log10()` le logarithme décimal.

## VI. Fonctions utiles (listings 6 et 7)

Résultats sur le jeu `women` : moyenne de `height` 65, variance 20, écart-type 4,47, médiane 65, quartiles 58 / 61,5 / 65 / 68,5 / 72, corrélation `height`–`weight` **0,995** (la relation est presque linéaire).

Analyse numérique avec $f(x) = \sin(x)/x$ :

| Commande | Résultat |
|---|---|
| `integrate(my_function, 0, 5)` | $\int_0^5 f \approx 1{,}5499$ |
| `optim(0.1, my_function)` | minimum local en $x \approx 4{,}493$, $f \approx -0{,}217$ |
| `optim(10, my_function)` | autre minimum local en $x \approx 10{,}904$, $f \approx -0{,}091$ |
| `uniroot(my_function, lower = .1, upper = 6)` | racine $x \approx 3{,}1416 = \pi$ |

> [!note] Avertissement de `optim`
> Pour une fonction d'une seule variable, `optim` avec sa méthode par défaut (Nelder-Mead) affiche « one-dimensional optimization by Nelder-Mead is unreliable ». Le résultat reste correct ; pour supprimer l'avertissement : `optim(0.1, my_function, method = "Brent", lower = 0.1, upper = 8)`.

Le listing 6 écrit « Histogramme de weight » pour `hist(women$height)` : l'histogramme est bien celui de `height`.

## VII. Graphiques statistiques

### Exercice 1 : `iris`

```r
# 1. Histogramme de la longueur des sépales
hist(iris$Sepal.Length, main = "Longueur des sépales",
     xlab = "Longueur (cm)", ylab = "Effectif")

# 2. Une variable numérique selon une variable qualitative : boîtes à moustaches
boxplot(Sepal.Length ~ Species, data = iris,
        main = "Longueur des sépales par espèce",
        xlab = "Espèce", ylab = "Longueur (cm)",
        col = c("pink", "lightgreen", "lightblue"))
```

![[r-tp3-iris.png|720]]

Lecture : les médianes valent 5,0 (setosa), 5,9 (versicolor) et 6,5 cm (virginica). Les setosa ont les sépales les plus courts, les virginica les plus longs ; un point isolé (4,9 cm) apparaît comme valeur atypique chez les virginica. La formule `y ~ groupe` se lit « y en fonction du groupe ».

### Exercice 2 : camemberts (données de l'exercice 2 du TP 2)

```r
z <- data.frame(Lettres  = c(12220, 15310, 112958, 8960, 12125),
                Sciences = c(6596, 6999, 40244, 6170, 8233),
                Medecine = c(7223, 10921, 46146, 4661, 6653),
                Sport    = c(357, 395, 1247, 279, 553),
                IUT      = c(2239, 3111, 7629, 4013, 3178),
                row.names = c("Bordeaux", "Lyon", "Paris", "Rennes", "Toulouse"))

pie(apply(z, 2, sum), main = "Étudiants par discipline")   # 1. totaux des colonnes
pie(apply(z, 1, sum), main = "Étudiants par académie")     # 2. totaux des lignes
```

![[r-tp3-camemberts.png|720]]

Parts : Lettres 49,2 %, Médecine 23,0 %, Sciences 20,8 %, IUT 6,1 %, Sport 0,9 % ; Paris 63,4 %, Lyon 11,2 %, Toulouse 9,4 %, Bordeaux 8,7 %, Rennes 7,3 %.

Variante, un camembert des disciplines pour chaque académie :

```r
par(mfrow = c(2, 3))
for (ville in row.names(z)) pie(unlist(z[ville, ]), main = ville)   # unlist : ligne -> vecteur
par(mfrow = c(1, 1))
```

## IX. Packages

`install.packages("nom")` **une seule fois** (téléchargement), `library(nom)` **à chaque session** (chargement).

### Exercice 1 : `MASS` et la loi exponentielle

```r
library(MASS)                       # MASS est livré avec R
set.seed(42)                        # mêmes tirages à chaque exécution
echantillon <- rexp(100, rate = 2)  # 1. n = 100, λ = 2
hist(echantillon, freq = FALSE,     # freq = FALSE : axe en densité
     main = "Échantillon de taille 100 d'une loi Exp(2)", xlab = "x", ylab = "Densité")

fit <- fitdistr(echantillon, "exponential")   # 2. estimation de λ
fit
#>      rate
#>   1.7788683
#>  (0.1778868)
curve(dexp(x, rate = fit$estimate), add = TRUE, col = "red", lwd = 2)
```

![[r-tp3-exponentielle.png|640]]

- $\hat\lambda = 1{,}78$, avec un écart-type de 0,18 : la vraie valeur 2 est à un peu plus d'un écart-type ;
- l'estimateur du maximum de vraisemblance de $\lambda$ est $1/\bar x$ : `1 / mean(echantillon)` donne la même valeur ;
- `freq = FALSE` est indispensable : sans lui l'histogramme est en effectifs et la densité, qui ne dépasse pas 2, serait écrasée en bas du graphique ; `add = TRUE` trace la courbe par-dessus.

### Exercice 2 : carte avec `leaflet`

```r
install.packages("leaflet")   # une seule fois
library(leaflet)

lieux <- data.frame(
  nom = c("Lieu de naissance (Mahdia)", "EURIA (Brest)"),
  lat = c(35.5047, 48.3985),
  lng = c(11.0622, -4.5040)
)

leaflet(lieux) %>%
  addTiles() %>%                                      # fond OpenStreetMap
  addMarkers(lng = ~lng, lat = ~lat, popup = ~nom)    # ~ : colonne du data.frame
```

Chacun remplace la première ligne par son propre lieu de naissance (clic droit sur Google Maps ou OpenStreetMap pour lire latitude et longitude). L'EURIA est l'école d'actuariat de l'université de Bretagne Occidentale, à Brest. La carte s'ouvre dans l'onglet **Viewer** de RStudio ; `%>%` enchaîne les étapes (« puis »).

## X. Fichiers

| Format | Fonction | Option clé |
|---|---|---|
| `.csv` (séparateur `,`) | `read.csv("f.csv")` | `stringsAsFactors = TRUE` pour avoir des facteurs |
| `.csv` français (séparateur `;`, décimale `,`) | `read.csv2("f.csv")` | |
| `.txt` délimité | `read.delim("f.txt", sep = "\|")` | `header = TRUE/FALSE` |
| `.txt` générique | `read.table("f.txt", sep = "\t", col.names = c(...))` | |
| `.xls`, `.xlsx` | `readxl::read_excel("f.xlsx", sheet = 1)` | package `readxl` |
| écrire | `write.csv(df, "f.csv", row.names = FALSE)` | |

Le chemin peut être local ou une URL. Test sans internet :

```r
write.csv(iris, "iris_export.csv", row.names = FALSE)
iris_relu <- read.csv("iris_export.csv", stringsAsFactors = TRUE)
str(iris_relu)          # 150 obs. of 5 variables, Species redevenu Factor
file.remove("iris_export.csv")
```

> [!warning] Pièges du listing 8
> - les lignes « Exemple 1 : » et « Exemple 2 : » ne sont pas des commentaires : les recopier provoque une erreur, il faut les précéder de `#` ;
> - les `+` en début de ligne (lignes 46 et 47) sont l'**invite de la console** quand une instruction continue sur plusieurs lignes : il ne faut pas les taper ;
> - `read.csv(url(url_csv))` fonctionne, mais `read.csv(url_csv)` suffit : R accepte directement une adresse web.
