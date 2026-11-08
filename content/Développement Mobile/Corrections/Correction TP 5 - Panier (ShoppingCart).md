---
date: 2026-11-08
ordre: 5
tags: [react-native, tp, correction, pressable, onpress, flatlist, composants, props, expo-vector-icons]
---
# Correction TP 5 — Panier (ShoppingCart)

Énoncé : [[TP 5 - Panier (ShoppingCart).pdf]] · cours : [[Résumé - Chapitre 2 - Composants de base#7. Props|props]] · avant : [[Correction TP 4 - Écran de détails du produit]] · suite : [[Correction TP 6 - Totaux du panier et navigation]]

> [!abstract] Ce qu'on construit
> Le bouton « Add to cart » réagit au clic, puis un écran **panier** affiche chaque article (image, nom, taille, quantité, total de la ligne) grâce à un composant réutilisable `CartListItem` répété par une `FlatList`.

```
src/
├── components/
│   └── CartListItem.js      ← un article du panier (composant)
├── data/
│   ├── cart.js              ← le contenu du panier
│   └── products.js
└── screens/
    ├── ProductDetailsScreen.js
    ├── ProductScreen.js
    └── ShoppingCart.js      ← la liste des articles (écran)
```

## Étapes 1 et 2 : `onPress` sur le bouton

Dans `ProductDetailsScreen.js`, déclarer la fonction **dans** le composant, avant le `return`, puis la brancher sur le `Pressable` :

```jsx
const ProductDetailsScreen = () => {
  const product = products[0];
  const { width } = useWindowDimensions();

  const addToCart = () => {
    console.warn('add to cart');
  };

  return (
    <View style={{ flex: 1 }}>
      {/* ... galerie et textes du TP 4 ... */}
      <Pressable onPress={addToCart} style={styles.button}>
        <Text style={styles.buttonText}>Add to cart</Text>
      </Pressable>
    </View>
  );
};
```

- on passe **la fonction** : `onPress={addToCart}`, sans parenthèses. `onPress={addToCart()}` l'appellerait **à chaque rendu** au lieu de l'appeler au clic ;
- `console.warn` affiche le message en **jaune** dans le terminal et dans l'application (Expo Go) : pratique pour vérifier qu'un clic est bien reçu.

## Étape 3 : les données du panier

`src/data/cart.js` exporte un tableau d'articles ; chaque article contient **un produit**, une **taille** et une **quantité** :

```js
export default [
  {
    product: {
      id: '1',
      image: 'https://notjustdev-dummy.s3.us-east-2.amazonaws.com/nike/nike1.png',
      name: 'Wild Berry',
      price: 160,
    },
    size: 42,
    quantity: 2,
  },
  // Air Force 1 (169 $, taille 43, quantité 1), Nike Cosmic (129 $, taille 44, quantité 1)
];
```

## Étape 4 : le composant `CartListItem`

`src/components/CartListItem.js` :

```jsx
import { View, Text, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';

const CartListItem = ({ cartItem }) => {
  const increaseQuantity = () => {};
  const decreaseQuantity = () => {};

  return (
    <View style={styles.container}>
      <Image source={{ uri: cartItem.product.image }} style={styles.image} />
      <View style={styles.contentContainer}>
        <Text style={styles.name}>{cartItem.product.name}</Text>
        <Text style={styles.size}>Size {cartItem.size}</Text>
        <View style={styles.footer}>
          <Feather onPress={decreaseQuantity} name="minus-circle" size={24} color="gray" />
          <Text style={styles.quantity}>{cartItem.quantity}</Text>
          <Feather onPress={increaseQuantity} name="plus-circle" size={24} color="gray" />
          <Text style={styles.itemTotal}>
            ${cartItem.product.price * cartItem.quantity}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 10, paddingHorizontal: 20, flexDirection: 'row' },
  contentContainer: { flex: 1, marginLeft: 10 },
  image: { width: '40%', aspectRatio: 1 },
  name: { fontWeight: '500', fontSize: 18 },
  size: { fontSize: 16, color: 'gray' },
  quantity: { marginHorizontal: 10, fontWeight: 'bold', color: 'gray' },
  footer: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center' },
  itemTotal: { fontSize: 16, marginLeft: 'auto', fontWeight: '500' },
});

export default CartListItem;
```

| Élément | Explication |
|---|---|
| `({ cartItem })` | le composant reçoit ses **props** et en extrait `cartItem` (déstructuration de `props.cartItem`) |
| `cartItem.product.image` | on descend dans l'objet : article → produit → image |
| `${cartItem.product.price * cartItem.quantity}` | le `$` est du **texte** affiché, `{...}` calcule le total de la ligne (160 × 2 = 320) |
| `flexDirection: 'row'` | image à gauche, infos à droite (par défaut React Native empile en colonne) |
| `marginTop: 'auto'` | pousse la ligne des boutons **en bas** de la colonne d'infos |
| `marginLeft: 'auto'` | pousse le prix **à droite** |
| `increaseQuantity`, `decreaseQuantity` | vides pour l'instant : modifier la quantité demande un **état partagé** (Redux, d'où l'installation de `react-redux`) |

**Installation** : `@expo/vector-icons` est déjà inclus dans un projet Expo. Pour ajouter une bibliothèque dans un projet Expo, préférer `npx expo install <paquet>` à `npm install` : Expo choisit la version compatible avec le SDK du projet.

```sh
npx expo install @expo/vector-icons
npm install react-redux
```

`Feather` est une des familles d'icônes du paquet ; les noms (`minus-circle`, `plus-circle`) se cherchent sur le site icons.expo.fyi.

## Étape 5 : l'écran `ShoppingCart`

`src/screens/ShoppingCart.js` :

```jsx
import { FlatList } from 'react-native';
import cart from '../data/cart';
import CartListItem from '../components/CartListItem';

const ShoppingCart = () => {
  return (
    <FlatList
      data={cart}
      renderItem={({ item }) => <CartListItem cartItem={item} />}
    />
  );
};

export default ShoppingCart;
```

`App.js` rend `<ShoppingCart />` dans la `View` principale (`flex: 1`) :

```jsx
import ShoppingCart from './src/screens/ShoppingCart';
// ...
<View style={styles.container}>
  <ShoppingCart />
  <StatusBar style="auto" />
</View>
```

![[mobile-tp5-panier.png|300]]

## Composant ou écran ?

| | Composant (`components/`) | Écran (`screens/`) |
|---|---|---|
| Taille | une **petite partie** de l'interface | une **page complète** |
| Exemple | `CartListItem` : un article | `ShoppingCart` : tout le panier |
| Réutilisation | répété, utilisé dans plusieurs écrans | branché sur la **navigation** |
| Données | reçues par **props** | importées (ici `cart.js`) puis passées aux composants |

`ShoppingCart` affiche la liste complète en répétant `CartListItem` : l'écran assemble, le composant affiche **un** élément.

## Pourquoi tant de bibliothèques ?

React Native garde une base **légère et modulaire** : les icônes, l'état global (Redux) ou la navigation s'ajoutent par des bibliothèques, selon les besoins de chaque application. **Flutter** inclut plus de widgets dès le départ (icônes, animations), au prix d'un framework plus lourd ; **Ionic**, construit sur Cordova, a aussi besoin de plugins pour les fonctions natives mais intègre beaucoup de composants visuels.

> [!warning] Erreur fréquente : `Unable to resolve "../components/CartListItem"`
> Le chemin d'import doit correspondre exactement au dossier et au nom du fichier, **majuscules comprises** : `components/CartListItem.js`, pas `Components/` ni `cartListItem.js`. Le dossier `components` se crée dans `src`, à côté de `screens` et `data`.
