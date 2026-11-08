---
date: 2026-11-08
ordre: 2
tags: [react-native, expo, tp, correction, image, flatlist, git, github]
---
# Correction TP 2 — Projet Expo et écran des produits

Énoncé : [[TP 2 - Projet Expo et écran des produits.pdf]] · Mme Waderni Sajida · cours : [[Résumé - Chapitre 2 - Composants de base]] · suite : [[Correction TP 4 - Écran de détails du produit]] · fiche : [[Cheat sheet - React Native]]

> [!abstract] Ce qu'on construit
> Un projet Expo vide, puis un écran `ProductScreen` qui affiche les chaussures du fichier `products.js` en **grille de deux colonnes** avec une `FlatList`. Le projet est ensuite versionné avec **Git** et publié sur **GitHub**.

Le code ci-dessous a été vérifié avec Expo SDK 57 (React Native 0.86) : le projet compile et l'écran s'affiche comme sur la capture.

## Préparation : créer et lancer le projet

```sh
npx create-expo-app@latest      # template "blank", langage JavaScript
cd nom-du-projet
npm start                       # puis scanner le QR code avec Expo Go
```

> [!warning] Template `blank` en JavaScript obligatoire
> Le template par défaut crée un projet TypeScript avec Expo Router (dossier `app/`, fichiers `.tsx`) : la suite du TP ne correspond plus. Choisir **blank** et **JavaScript** ; on obtient un seul `App.js` à la racine. Le téléphone et l'ordinateur doivent être sur le **même réseau Wi-Fi** pour qu'Expo Go charge le projet (sinon `npx expo start --tunnel`).

## Étapes 1 et 2 : la première image

Dans `App.js`, importer `Image` et l'ajouter dans le `return` :

```jsx
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://notjustdev-dummy.s3.us-east-2.amazonaws.com/nike/nike1.png' }}
        style={styles.image}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', aspectRatio: 1 },
});
```

| Prop de `Image` | Rôle |
|---|---|
| `source={{ uri: '...' }}` | l'image à afficher ; une image distante est un **objet** `{ uri }`, d'où les doubles accolades |
| `style` | la taille : une image distante **n'a pas de taille par défaut**, sans largeur et hauteur elle est invisible |

`width: '100%'` prend toute la largeur ; `aspectRatio: 1` calcule la hauteur pour garder une image **carrée**. Mettre les styles dans `StyleSheet.create` plutôt qu'en ligne garde le JSX lisible et réutilise les mêmes objets.

## Étapes 3 et 4 : les données

```
mon-projet/
├── App.js
└── src/
    ├── data/
    │   └── products.js     ← fichier fourni par l'enseignante
    └── screens/
        └── ProductScreen.js
```

`products.js` exporte un **tableau d'objets** (`id`, `image`, `images`, `name`, `price`, `sizes`, `description`) :

```js
import products from './src/data/products';   // depuis App.js
import products from '../data/products';      // depuis src/screens/ProductScreen.js
```

Le chemin est **relatif au fichier qui importe** : `../` remonte d'un dossier.

## Étapes 5 à 7 : la grille avec FlatList

```jsx
<FlatList
  data={products}
  renderItem={({ item }) => (
    <View style={styles.itemContainer}>
      <Image source={{ uri: item.image }} style={styles.image} />
    </View>
  )}
  numColumns={2}
  keyExtractor={(item) => item.id}
/>
```

| Prop | Rôle |
|---|---|
| `data={products}` | la **source** : un élément de la liste par produit |
| `renderItem={({ item }) => ...}` | comment afficher **un** élément ; `item` est un produit, `{ item }` le **déstructure** depuis l'objet `{ item, index }` que reçoit la fonction |
| `numColumns={2}` | deux colonnes ; chaque case fait `width: '50%'` |
| `keyExtractor={(item) => item.id}` | une **clé unique** par élément, pour que React suive les éléments quand la liste change |

> [!note] Le `key={2}` de l'énoncé
> `numColumns` ne peut pas changer pendant que la liste est affichée (erreur « Changing numColumns on the fly is not supported »). Donner à la `FlatList` une `key` qui dépend du nombre de colonnes force React à la recréer. Avec un nombre de colonnes fixe, `key={2}` n'est pas nécessaire ; `keyExtractor`, lui, l'est.

## Étapes 8 et 9 : l'écran produit

`src/screens/ProductScreen.js` :

```jsx
import { StyleSheet, View, Image, FlatList } from 'react-native';
import products from '../data/products';

const ProductScreen = () => {
  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={2}
      renderItem={({ item }) => (
        <View style={styles.itemContainer}>
          <Image source={{ uri: item.image }} style={styles.image} />
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  itemContainer: { width: '50%', padding: 1 },
  image: { width: '100%', aspectRatio: 1 },
});

export default ProductScreen;
```

`App.js` :

```jsx
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import ProductScreen from './src/screens/ProductScreen';

export default function App() {
  return (
    <View style={styles.container}>
      <ProductScreen />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
```

> [!warning] `flex: 1` sur la `View` qui contient la liste
> L'énoncé écrit `<View><ProductScreen /></View>` sans style. Sans `flex: 1`, la `View` n'occupe pas toute la hauteur de l'écran et la `FlatList` peut ne pas défiler. On enlève aussi `alignItems: 'center'` et `justifyContent: 'center'` de l'étape 1, qui centrent et rétrécissent la grille.

![[mobile-tp2-produits.png|300]]

## Étapes 10 à 12 : Git et GitHub

```sh
git status                         # fichiers modifiés et non suivis
git diff                           # différences pas encore ajoutées
git add .                          # tout mettre dans l'index (zone de préparation)
git commit -m "change text to hello world"
git status                         # plus rien à valider

# Étape 11 : dépôt GitHub créé SANS README
git remote add origin <URL-du-dépôt>
git branch -M main                 # renommer la branche en main
git push -u origin main            # -u : retenir origin/main pour les prochains push

# Étape 12 : deuxième modification
git add .
git commit -m "2eme modification"
git push
```

| Commande | Rôle |
|---|---|
| `git status` | état du dépôt : modifiés, ajoutés, non suivis |
| `git diff` | contenu des modifications **non encore ajoutées** |
| `git add .` | prépare toutes les modifications pour le prochain commit |
| `git commit -m "..."` | enregistre un instantané dans l'historique local |
| `git remote add origin URL` | relie le dépôt local au dépôt GitHub |
| `git push -u origin main` | envoie la branche ; ensuite `git push` suffit |

> [!tip] Pourquoi « sans README » ?
> Un dépôt GitHub créé avec un README contient déjà un commit que le dépôt local n'a pas : le premier `git push` est refusé (« rejected, fetch first »). `create-expo-app` initialise déjà un dépôt Git avec un premier commit, donc `git init` n'est pas nécessaire. Le dossier `node_modules` n'est pas envoyé : il est listé dans `.gitignore`.

Cycle à retenir : **modifier → `git add .` → `git commit -m "message"` → `git push`**.
