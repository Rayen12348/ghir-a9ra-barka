---
date: 2026-11-08
ordre: 10
tags: [r, cheat-sheet, fiche, vecteurs, matrices, data-frame, apply, graphiques, fichiers]
---
# Cheat sheet — R

Toute la syntaxe des TP 1 à 3 sur une page. Énoncés : [[TP 1 - Introduction au langage R.pdf|TP 1]], [[TP 2 - Matrices, tableaux et listes.pdf|TP 2]], [[TP 3 - Fonctions, graphes et fichiers.pdf|TP 3]] · corrections : [[Correction TP 1 - Introduction au langage R.pdf|TP 1]], [[Correction TP 2 - Matrices, tableaux et listes|TP 2]], [[Correction TP 3 - Fonctions, graphes et fichiers|TP 3]]

## 1. Bases et vecteurs

| Je veux… | Code |
|---|---|
| Affecter | `x <- 5` (garder `=` pour les arguments des fonctions) |
| Opérateurs | `+ - * / ^`, `%%` (reste), `%/%` (division entière) |
| Type d'un objet | `class(x)`, `mode(x)`, `is.numeric(x)`, `is.na(x)` |
| Créer un vecteur | `c(7, 9, 13)` |
| Suite d'entiers | `1:10`, `10:1` |
| Suite avec un pas / une longueur | `seq(1, 10, by = 3)` → 1 4 7 10 ; `seq(0, 1, length = 11)` |
| Répéter un motif | `rep(c(0, 6), 3)` → 0 6 0 6 0 6 ; `rep(c(1, 2, 3), 4)` |
| Répéter chaque élément | `rep(1:3, each = 4)` → 1 1 1 1 2 2 2 2 3 3 3 3 |
| Répéter un nombre de fois différent | `rep(1:3, times = 1:3)` → 1 2 2 3 3 3 ; `rep(1:3, times = 3:1)` → 1 1 1 2 2 3 |
| Nommer les éléments | `names(v) <- c("Lundi", "Mardi")` |
| Taille | `length(v)` |

### Extraire

| Je veux… | Code |
|---|---|
| Le 2e élément / les 5 premiers | `v[2]` / `v[1:5]` |
| Plusieurs positions | `v[c(1, 3, 5)]` |
| Tout sauf les positions 6, 10, 12 | `v[-c(6, 10, 12)]` |
| Les éléments qui vérifient une condition | `v[v > 14]`, `v[v > 1 & v <= 5]` |
| Les **positions** des TRUE | `which(v > 14)`, `which.max(v)` |
| Remplacer selon une condition | `v[v < 0] <- 10` |

Le premier indice est **1** (`v[0]` renvoie un vecteur vide). `&` = ET, `|` = OU, `!` = NON, `==` teste l'égalité, `!=` la différence.

### Calculer sur un vecteur

| Calcul | Code |
|---|---|
| Opérations **terme à terme** | `2 * v`, `v + w`, `1 / v` (`1/0` donne `Inf`, `Inf - Inf` donne `NaN`) |
| Somme, produit, moyenne | `sum(v)`, `prod(v)`, `mean(v)` |
| Compter / proportion de TRUE | `sum(v > 0.5)` / `mean(v > 0.5)` |
| Trier les valeurs | `sort(v)`, `sort(v, decreasing = TRUE)` |
| Ordre des indices qui trie | `order(v)` puis `v[order(v)]` |
| Supprimer les doublons | `unique(v)` |
| Somme sans les valeurs manquantes | `sum(v, na.rm = TRUE)` |
| Enlever les NA | `v[!is.na(v)]` |
| Codage 0/1 d'une condition | `as.numeric(v >= 0.5)` |
| Nombres au hasard entre 0 et 1 | `runif(50)` ; `set.seed(123)` pour fixer le hasard |
| Répéter une expérience | `replicate(1000, mean(runif(100) > 0.5))` |

Formules des exercices : moyenne harmonique `length(x) / sum(1 / x)` ; constante d'Euler `sum(1 / (1:1e6)) - log(1e6)` ≈ 0,5772 ; Leibniz `4 * sum((-1)^(0:N) / (2 * (0:N) + 1))` ≈ π.

### Afficher

```r
print(x)
cat("Moyenne :", m, "\n")                    # colle les morceaux avec des espaces
sprintf("%.2f", 8.116148)                     # "8.12" : 2 décimales
cat(sprintf("%-15s : %6.3f\n", "Moyenne", m)) # aligné
```

## 2. Matrices

| Je veux… | Code |
|---|---|
| Créer (rempli par colonne) | `matrix(1:20, nrow = 5)` |
| Créer (rempli par ligne) | `matrix(1:20, nrow = 5, byrow = TRUE)` |
| Coller des colonnes / des lignes | `cbind(a, b)` / `rbind(a, b)` |
| Dimensions | `dim(M)`, `nrow(M)`, `ncol(M)` |
| Un élément / une ligne / une colonne | `M[2, 3]` / `M[2, ]` / `M[, 3]` |
| Supprimer la ligne 2 | `M[-2, ]` |
| Éléments qui vérifient une condition | `M[M > 700]` |
| Positions des TRUE | `which(M[1, ] > 600)` |
| Transposée, déterminant, diagonale | `t(M)`, `det(M)`, `diag(M)` |
| Trace | `sum(diag(M))` |
| Inverse **matricielle** | `solve(M)` |
| Résoudre `M x = b` | `solve(M, b)` |
| Valeurs / vecteurs propres | `e <- eigen(M)` puis `e$values`, `e$vectors` |
| Puissance `M^n` sans boucle | `P %*% diag(e$values^n) %*% solve(P)` avec `P <- e$vectors` |

### Les 3 pièges des matrices

| Code | Ce que ça fait vraiment |
|---|---|
| `A * B` | produit **terme à terme** |
| `A %*% B` | **vrai** produit matriciel |
| `A^2` | chaque élément au carré (≠ `A %*% A`) |
| `A^(-1)` ou `1/A` | inverse de **chaque élément** (≠ `solve(A)`) |

## 3. La famille apply

| Fonction | S'applique à | Exemple |
|---|---|---|
| `apply(M, 1, f)` | chaque **ligne** d'une matrice / data.frame | `apply(M, 1, sum)` |
| `apply(M, 2, f)` | chaque **colonne** | `apply(M, 2, mean)` |
| `tapply(x, groupe, f)` | x découpé **par groupe** | `tapply(iris$Sepal.Length, iris$Species, mean)` |
| `lapply(liste, f)` | chaque élément d'une liste → **liste** | `lapply(L, mean)` |
| `sapply(liste, f)` | pareil → **vecteur** | `sapply(L, mean)` |

Raccourcis : `rowSums`, `colSums`, `rowMeans`, `colMeans`.

## 4. data.frame (tableau de données)

Colonne = variable, ligne = individu, types différents autorisés.

| Je veux… | Code |
|---|---|
| Créer | `data.frame(nom = c(...), age = c(...))` |
| Nommer colonnes / lignes | `names(df) <- c(...)` / `row.names(df) <- c(...)` |
| Structure, résumé, début | `str(df)`, `summary(df)`, `head(df)` |
| Une colonne | `df$age` ou `df[, 2]` |
| Filtrer des lignes | `df[df$age > 20, ]` ou `subset(df, age > 20)` |
| Trier par une colonne | `df[order(df$age), ]` (décroissant : `decreasing = TRUE`) |
| Réordonner les colonnes | `df[, order(colSums(df))]` |
| Compter les modalités | `table(df$sexe)` |
| Variable qualitative | `as.factor(x)` |
| Matrice → data.frame | `as.data.frame(M)` |
| Vérifier le type | `class(df)`, `is.data.frame(df)` |

> Taper `height` seul donne une erreur : la colonne est **dans** `women`, il faut `women$height`.

## 5. Listes

Un « sac » qui peut tout contenir.

```r
L <- list(nom = "Ali", notes = c(12, 15), ok = TRUE)
L$notes      # par nom
L[[2]]       # par position (double crochet)
names(L)     # noms des éléments
```

`eigen()`, `optim()`, `fitdistr()`… renvoient des listes : on lit le résultat avec `$`.

## 6. Boucles et conditions

```r
for (i in 1:10) { ... }            # pour i de 1 à 10
while (i < 10) { i <- i + 1 }      # tant que (penser à faire avancer i !)
repeat { ...; if (cond) break }    # toujours, sortie avec break
if (x > 0) { ... } else { ... }
next                               # passer au tour suivant
```

> Règle d'or : **éviter les boucles**. Vectoriser (`sum(x[x < 10])`) ou utiliser `apply`. Ordre de vitesse : boucle < apply < calcul matriciel.

## 7. Fonctions

```r
ma_fonction <- function(x, n = 2) {   # n = 2 : valeur par défaut
  y <- x^n                            # y est LOCAL (n'existe pas dehors)
  return(y)                           # sinon : dernière ligne renvoyée
}
ma_fonction(3)        # 9
ma_fonction(3, n = 3) # 27
```

- Plusieurs résultats → `return(list(a = ..., b = ...))`.
- Toujours passer en argument ce dont la fonction a besoin (ne pas compter sur les variables extérieures).
- Astuce logique : `TRUE` vaut 1 et `FALSE` vaut 0 → `n - !biased` vaut `n-1` ou `n`.
- `%/%` = division entière, `%%` = reste (`n %% 2 == 1` → n impair).

## 8. Graphiques

| Fonction | Rôle |
|---|---|
| `plot(x, y)` | **nouveau** graphique |
| `lines(x, y)` | **ajoute** une courbe |
| `points(x, y)` | **ajoute** des points |
| `curve(f, a, b)` | trace une fonction (`add = TRUE` pour superposer) |
| `abline(h = 0)` / `abline(a, b)` | droite horizontale / y = a + bx |
| `par(mfrow = c(2, 2))` | découpe en 2×2 (revenir : `c(1, 1)`) |
| `dev.off()` | ferme le graphique |

**Options de `plot`** : `type = "p"/"l"/"b"`, `col = "red"`, `main = "Titre"`, `xlab`, `ylab`, `xlim = c(a, b)`, `ylim = c(a, b)`, `pch = 19` ou `"*"` (symbole), `cex = 2` (taille), `lwd = 2` (épaisseur).

> Pour une courbe lisse : `x <- seq(0, 10, by = 0.01)`, pas `0:10`.

### Graphiques statistiques

| Graphique | Pour | Code |
|---|---|---|
| Histogramme | 1 variable numérique | `hist(x)` (`freq = FALSE` pour une densité) |
| Boîte à moustaches | numérique, ou numérique par groupe | `boxplot(x)`, `boxplot(y ~ groupe, data = df)` |
| Barres | variable qualitative | `barplot(table(x))` |
| Camembert | répartition en parts | `pie(table(x))` ou `pie(colSums(df))` |

## 9. Statistique et analyse numérique

| Calcul | Code |
|---|---|
| Moyenne, médiane | `mean(x)`, `median(x)` |
| Variance (sans biais, ÷ n−1), écart-type | `var(x)`, `sd(x)` |
| Quantiles, min / max | `quantile(x)`, `min(x)`, `max(x)` |
| Corrélation | `cor(x, y)` |
| Intégrale | `integrate(f, 0, 5)` |
| Minimum local | `optim(depart, f, method = "Brent", lower = a, upper = b)` ou `optimize(f, c(a, b))` |
| Racine de f(x) = 0 | `uniroot(f, lower = a, upper = b)$root` |

### Lois de probabilité : préfixe + nom

| Préfixe | Sens | Exemple |
|---|---|---|
| `r` | simuler des valeurs | `rnorm(100)`, `rexp(100, rate = 2)`, `runif(30)` |
| `d` | densité | `dexp(x, rate = 2)` |
| `p` | fonction de répartition | `pnorm(1.96)` |
| `q` | quantile | `qnorm(0.975)` |

`sample(1:50, 5)` : tirage sans remise ; `sample(c("H","F"), 100, replace = TRUE)` : avec remise. `set.seed(42)` : même hasard à chaque exécution.

## 10. Packages

```r
install.packages("leaflet")   # UNE fois (télécharger)
library(leaflet)              # À CHAQUE session (charger)
```

- **MASS** : `fitdistr(x, "exponential")` estime les paramètres d'une loi.
- **leaflet** : `leaflet(df) %>% addTiles() %>% addMarkers(lng = ~lng, lat = ~lat, popup = ~nom)`.
- `%>%` se lit « puis » ; `~col` veut dire « la colonne `col` du tableau ».

## 11. Fichiers

| Format | Lire | Écrire |
|---|---|---|
| `.csv` (séparateur `,`) | `read.csv("f.csv")` | `write.csv(df, "f.csv", row.names = FALSE)` |
| `.csv` français (`;`) | `read.csv2("f.csv")` | `write.csv2(...)` |
| `.txt` | `read.delim("f.txt", sep = "\t")`, `read.table(...)` | `write.table(...)` |
| `.xls` / `.xlsx` | `readxl::read_excel("f.xlsx")` | `openxlsx::write.xlsx(df, "f.xlsx")` |

**Arguments utiles** : `header = TRUE/FALSE` (1re ligne = noms ?), `sep = ","`/`";"`/`"\t"`/`"|"`, `col.names = c(...)`, `stringsAsFactors = TRUE`. Le fichier peut être un chemin local ou une URL. `file.path("dossier", "f.txt")` construit un chemin.

> Les `+` en début de ligne dans le PDF sont l'invite de la console : **ne pas les recopier**.

## 12. Erreurs fréquentes

| Message / symptôme | Cause probable |
|---|---|
| `objet 'x' introuvable` | faute de frappe (`power2` vs `power_2`), variable non créée, ou colonne sans `df$` |
| `non-conformable arguments` | tailles incompatibles pour `%*%` (colonnes de A ≠ lignes de B) |
| La console affiche `+` et attend | parenthèse ou accolade non fermée → `Échap` |
| `NaNs produced` avec `log` | `log` de nombres ≤ 0 |
| Courbe en segments | pas assez de points → `seq(..., by = 0.01)` |
| La densité ne se superpose pas à l'histogramme | oubli de `hist(x, freq = FALSE)` |
| Résultats incohérents avec `TRUE`/`FALSE` | une variable nommée `T` ou `F` écrase leurs abréviations : éviter `T`, `F`, `c`, `t`, `mean` comme noms |
