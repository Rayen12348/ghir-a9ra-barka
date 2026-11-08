---
date: 2026-11-08
ordre: 2
tags: [r, tp, correction, matrices, data-frame, listes, apply, eigen]
---
# Correction TP 2 — Matrices, tableaux et listes

Énoncé : [[TP 2 - Matrices, tableaux et listes.pdf]] · Dr. Abbassi A. · précédent : [[Correction TP 1 - Introduction au langage R.pdf|Correction TP 1]] · suivant : [[Correction TP 3 - Fonctions, graphes et fichiers]] · fiche : [[Cheat sheet - R]]

Les sorties affichées sous chaque bloc ont été obtenues en exécutant le code avec R 4.6. Les parties « Saisir le script suivant » du TP (listings 1 à 7) servent à découvrir les fonctions : cette correction traite les **parties pratiques** et signale au passage les pièges des listings.

> [!abstract] Les trois structures du TP
> | Structure | Contenu | Accès |
> |---|---|---|
> | `matrix` | un **seul type**, 2 dimensions | `M[ligne, colonne]` |
> | `data.frame` | colonnes de **types différents** (une colonne = une variable, une ligne = un individu) | `df$colonne`, `df[ligne, colonne]` |
> | `list` | **n'importe quoi**, même d'autres listes | `L$nom`, `L[[position]]` |

## III. Matrices

### Exercice 1

```r
vect_x <- rep(2, 5)            # 2 2 2 2 2
vect_y <- seq(-1, 3, by = 1)   # -1 0 1 2 3
matrix_A <- cbind(vect_x, vect_y)   # 5 lignes, 2 colonnes
matrix_A[2, ] <- c(2, 4)            # remplace toute la 2e ligne
matrix_A
```

```
     vect_x vect_y
[1,]      2     -1
[2,]      2      4
[3,]      2      1
[4,]      2      2
[5,]      2      3
```

`cbind` colle les vecteurs **en colonnes** ; `matrix(c(vect_x, vect_y), ncol = 2)` donne la même matrice (sans les noms de colonnes).

### Exercice 2

**1. Créer la matrice, avec `cbind` puis avec `matrix`**

```r
matrix_A <- cbind(c(2, 10, 4), c(23, 6, 7), c(8, 90, 12))            # on donne les colonnes
matrix_A <- matrix(c(2, 23, 8, 10, 6, 90, 4, 7, 12), nrow = 3, byrow = TRUE)  # on écrit les lignes
```

> [!warning] `byrow = TRUE`
> Par défaut `matrix` remplit **colonne par colonne**. Sans `byrow = TRUE`, on obtiendrait la transposée.

**2. Moyenne et produit des lignes et des colonnes** (`apply(M, 1, f)` = par ligne, `apply(M, 2, f)` = par colonne)

```r
apply(matrix_A, 1, sum) / ncol(matrix_A)   # moyennes des lignes   : 11.00 35.33  7.67
apply(matrix_A, 2, sum) / nrow(matrix_A)   # moyennes des colonnes :  5.33 12.00 36.67
apply(matrix_A, 1, prod)                   # produits des lignes   :  368 5400  336
apply(matrix_A, 2, prod)                   # produits des colonnes :   80  966 8640
```

`apply(matrix_A, 1, mean)` donne directement les mêmes moyennes ; l'énoncé demande `sum`, d'où la division par l'effectif.

**3. Les deux premières lignes**

```r
matrix_B <- matrix_A[1:2, ]
```

**4. Sommes**

```r
matrix_A[1, ] + matrix_A[2, ]   # ligne 1 + ligne 2, terme à terme : 12 29 98
sum(matrix_A[1:2, ])            # total des deux lignes : 139
matrix_A[, 1] + matrix_A[, 3]   # colonne 1 + colonne 3 : 10 100 16
sum(matrix_A[, c(1, 3)])        # total des deux colonnes : 126
```

**5. `t`, `det`, `diag` et la trace**

| Commande | Résultat | Rôle |
|---|---|---|
| `t(matrix_A)` | lignes ↔ colonnes | transposée |
| `det(matrix_A)` | `4772` | déterminant (non nul : la matrice est inversible) |
| `diag(matrix_A)` | `2 6 12` | diagonale |
| `sum(diag(matrix_A))` | **`20`** | trace |

L'énoncé écrit `diag(A)` : la matrice s'appelle `matrix_A`.

**6. Trois carrés qui ne se valent pas**

```r
matrix_A^2              # chaque coefficient au carré
matrix_A * matrix_A     # identique : produit terme à terme
matrix_A %*% matrix_A   # vrai produit matriciel A × A
```

```
> matrix_A^2                      > matrix_A %*% matrix_A
     [,1] [,2] [,3]                    [,1] [,2] [,3]
[1,]    4  529   64               [1,]  266  240 2182
[2,]  100   36 8100               [2,]  440  896 1700
[3,]   16   49  144               [3,]  126  218  806
```

**7. Trois « inverses »**

| Commande | Ce qu'elle calcule |
|---|---|
| `1/matrix_A` | l'inverse de **chaque coefficient** ($1/2$, $1/23$, …) |
| `matrix_A^(-1)` | la même chose que `1/matrix_A` |
| `solve(matrix_A)` | la **matrice inverse** $A^{-1}$ |

```r
round(solve(matrix_A) %*% matrix_A, 10)   # on retrouve l'identité
```

> [!important] À retenir
> En R, `*`, `^` et `/` agissent **coefficient par coefficient**. Le produit matriciel s'écrit `%*%` et l'inverse matricielle `solve()`.

**8. Résoudre le système** $AX = b$

$$\begin{cases} 2x + 23y + 8z = 5 \\ 10x + 6y + 90z = 6 \\ 4x + 7y + 12z = 7 \end{cases}$$

```r
b <- c(5, 6, 7)
X <- solve(matrix_A, b)
X                  # 2.1047779  0.0947192 -0.1735122
matrix_A %*% X     # vérification : 5 6 7
```

Donc $x \approx 2{,}1048$, $y \approx 0{,}0947$, $z \approx -0{,}1735$. `solve(A, b)` est préférable à `solve(A) %*% b` : même résultat, sans calculer l'inverse.

**9. Lignes de `t(matrix_A)` dont la somme dépasse 30, en une ligne**

```r
t(matrix_A)[rowSums(t(matrix_A)) > 30, ]
```

```
     [,1] [,2] [,3]
[1,]   23    6    7
[2,]    8   90   12
```

Les sommes des lignes de la transposée valent 16, 36 et 110 : on garde les lignes 2 et 3. `rowSums(x)` est un raccourci de `apply(x, 1, sum)`.

## V. Tableaux de données

### Exercice 1 : le jeu de données `iris`

**1.** `class(iris)` renvoie `"data.frame"` et `is.data.frame(iris)` renvoie `TRUE`.

**2.** `str(iris)` : **150 fleurs** (individus) décrites par **5 variables**, 4 mesures en centimètres (`Sepal.Length`, `Sepal.Width`, `Petal.Length`, `Petal.Width`) et l'espèce `Species`, un facteur à 3 modalités (setosa, versicolor, virginica, 50 fleurs chacune).

**3.** `summary(iris)`

```
  Sepal.Length    Sepal.Width     Petal.Length    Petal.Width          Species  
 Min.   :4.300   Min.   :2.000   Min.   :1.000   Min.   :0.100   setosa    :50  
 1st Qu.:5.100   1st Qu.:2.800   1st Qu.:1.600   1st Qu.:0.300   versicolor:50  
 Median :5.800   Median :3.000   Median :4.350   Median :1.300   virginica :50  
 Mean   :5.843   Mean   :3.057   Mean   :3.758   Mean   :1.199                  
 3rd Qu.:6.400   3rd Qu.:3.300   3rd Qu.:5.100   3rd Qu.:1.800                  
 Max.   :7.900   Max.   :4.400   Max.   :6.900   Max.   :2.500                  
```

- individus **versicolor** : **50** ;
- moyenne de `Sepal.Width` : **3,057** ;
- plus petite valeur de `Sepal.Width` : **2,0**.

**4. Garder les setosa**

```r
iris2 <- iris[iris$Species == "setosa", ]    # ou subset(iris, Species == "setosa")
dim(iris2)                                   # 50 5
```

**5. Trier les setosa selon la longueur du sépale**

```r
iris2[order(iris2$Sepal.Length), ]           # decreasing = TRUE pour l'ordre décroissant
```

```
   Sepal.Length Sepal.Width Petal.Length Petal.Width Species
14          4.3         3.0          1.1         0.1  setosa
9           4.4         2.9          1.4         0.2  setosa
39          4.4         3.0          1.3         0.2  setosa
...
```

`order()` renvoie l'**ordre des lignes** ; on le place dans les crochets, avant la virgule.

**6. Moyennes des 4 variables numériques**

```r
apply(iris[, 1:4], 2, mean)
#> Sepal.Length  Sepal.Width Petal.Length  Petal.Width
#>     5.843333     3.057333     3.758000     1.199333
```

La colonne 5 (`Species`) est exclue : `mean` d'un facteur n'a pas de sens.

**7. Moyenne de `Sepal.Length` par espèce**

```r
tapply(iris$Sepal.Length, iris$Species, mean)
#>     setosa versicolor  virginica
#>      5.006      5.936      6.588
```

`tapply(valeurs, groupes, fonction)` découpe les valeurs par groupe puis applique la fonction à chaque morceau.

### Exercice 2 : étudiants par académie et par filière

**1. Le data.frame `z`**

```r
z <- data.frame(c(12220, 15310, 112958, 8960, 12125),
                c(6596, 6999, 40244, 6170, 8233),
                c(7223, 10921, 46146, 4661, 6653),
                c(357, 395, 1247, 279, 553),
                c(2239, 3111, 7629, 4013, 3178))
names(z)     <- c("Lettres", "Sciences", "Medecine", "Sport", "IUT")
row.names(z) <- c("Bordeaux", "Lyon", "Paris", "Rennes", "Toulouse")
```

**2. Total par académie (par ligne), puis tri croissant**

```r
total_academie <- apply(z, 1, sum)
#> Bordeaux     Lyon    Paris   Rennes Toulouse
#>    28635    36736   208224    24083    30742
z[order(total_academie), ]   # Rennes, Bordeaux, Toulouse, Lyon, Paris
```

**3. Total par filière (par colonne), puis tri croissant**

```r
total_filiere <- apply(z, 2, sum)
#>  Lettres Sciences Medecine    Sport      IUT
#>   161573    68242    75604     2831    20170
z[, order(total_filiere)]    # Sport, IUT, Sciences, Medecine, Lettres
```

Trier les **colonnes** : l'ordre se place **après** la virgule.

**4. Académies où Sciences > Médecine, en une ligne**

```r
z[z$Sciences > z$Medecine, ]
#>          Lettres Sciences Medecine Sport  IUT
#> Rennes      8960     6170     4661   279 4013
#> Toulouse   12125     8233     6653   553 3178
```

## VII. Listes

### Exercice 1

```r
ma_fiche <- list(nom = "Ben Maaoui",
                 parents = c(pere = "Prénom du père", mere = "Prénom de la mère"),
                 departement_naissance = "Mahdia")
ma_fiche$parents["mere"]     # accès par nom
ma_fiche[[3]]                # accès par position
```

Chacun met ses propres valeurs : la liste mélange un texte et un vecteur nommé, ce qu'un vecteur ou une matrice ne permettrait pas.

### Exercice 2 : éléments propres de `matrix_A`

**1. Valeurs et vecteurs propres**

```r
vp <- eigen(matrix_A)
vp$values     # 41.602297 -12.201009  -9.401288
P <- vp$vectors
det(P)        # 0.0636 (non nul)
```

$A$ est $3 \times 3$ et possède **3 valeurs propres réelles distinctes**, donc ses vecteurs propres forment une base : **$A$ est diagonalisable**, $A = P D P^{-1}$ avec $D = \text{diag}(\lambda_1, \lambda_2, \lambda_3)$. Le déterminant non nul de $P$ le confirme.

**2. $A^n$ sans boucle**

$$A^n = P D^n P^{-1}, \qquad D^n = \text{diag}(\lambda_1^n, \lambda_2^n, \lambda_3^n)$$

```r
A10 <- P %*% diag(vp$values^10) %*% solve(P)
A50 <- P %*% diag(vp$values^50) %*% solve(P)
```

```
> A10
             [,1]         [,2]         [,3]
[1,] 2.398956e+15 4.169852e+15 1.332751e+16
[2,] 3.712689e+15 6.453562e+15 2.062315e+16
[3,] 1.202088e+15 2.089504e+15 6.677621e+15
```

Vérification avec une boucle (pour contrôler seulement) :

```r
verif <- diag(3)
for (i in 1:10) verif <- verif %*% matrix_A
all.equal(A10, verif)   # TRUE
```

> [!warning] `solve(P)` et non `t(P)`
> Le listing 4 reconstruit sa matrice avec `t(result$vectors)` : c'est juste **parce qu'elle est symétrique** (ses vecteurs propres sont orthonormés, donc $P^{-1} = P^T$). `matrix_A` n'est pas symétrique : il faut `solve(P)`.

## Pièges des listings

| Listing | Ce qui est écrit | Ce qu'il faut savoir |
|---|---|---|
| 1, ligne 19 | `dim(matrix_prod)` « affiche les dimensions de matrix_prod_1 » | ce sont deux objets différents (5 × 4 et 4 × 4) |
| 3, lignes 59 et 60 | `height` tout seul | erreur « objet introuvable » : la colonne est **dans** `women`, il faut `women$height` |
| 7, ligne 2 | `matrix(rep(1, 10^8), nrow = 10^4)` | 800 Mo de mémoire et une double boucle de plusieurs minutes : tester avec `10^6` et `nrow = 10^3` |
| 7, ligne 19 | `x %% rep(1, nrow(x))` | `%%` est le **modulo** : le produit matriciel est `x %*% rep(1, ncol(x))` |
| 7, ligne 21 | variables `a`, `b`, `c`, `d` | appeler une variable `c` masque la fonction `c()` dans la suite du script |

**Conclusion du listing 7** : boucles imbriquées ≫ `apply` > produit matriciel. Avec R, on **vectorise** dès que possible.
