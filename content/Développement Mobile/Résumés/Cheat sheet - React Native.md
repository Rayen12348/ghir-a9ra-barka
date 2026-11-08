---
date: 2026-11-08
ordre: 10
tags: [react-native, expo, cheat-sheet, fiche, jsx, props, state, flatlist, styles, navigation, git]
---
# Cheat sheet — React Native et Expo

Tout ce qui sert dans les TP sur une page. Cours : [[Résumé - Chapitre 2 - Composants de base]] · corrections : [[Correction TP 2 - Projet Expo et écran des produits|TP 2]], [[Correction TP 4 - Écran de détails du produit|TP 4]], [[Correction TP 5 - Panier (ShoppingCart)|TP 5]], [[Correction TP 6 - Totaux du panier et navigation|TP 6]]

## 1. Commandes

| Je veux… | Commande |
|---|---|
| Créer un projet (template **blank**, **JavaScript**) | `npx create-expo-app@latest` |
| Lancer le serveur | `npm start` ou `npx expo start` |
| Lancer si le Wi-Fi bloque Expo Go | `npx expo start --tunnel` |
| Vider le cache après un changement bizarre | `npx expo start -c` |
| Ajouter une bibliothèque **compatible avec le SDK** | `npx expo install <paquet>` |
| Vérifier les versions | `npx expo install --check` |
| Corriger les versions | `npx expo install --fix` |
| Diagnostiquer le projet | `npx expo-doctor` |

Dans le terminal d'Expo : `r` recharge l'application, `a` ouvre l'émulateur Android, `w` la version web, `j` le débogueur.

## 2. Structure du projet des TP

```
App.js                       ← point d'entrée : affiche <Navigation /> (TP 6)
src/
├── navigation.js            ← la pile d'écrans
├── data/products.js, cart.js
├── components/CartListItem.js
└── screens/ProductScreen.js, ProductDetailsScreen.js, ShoppingCart.js
```

Un import est **relatif au fichier qui importe** et respecte les **majuscules** : depuis `src/screens/`, `../data/products` ; depuis `src/`, `./screens/ProductScreen`.

## 3. Un composant

```jsx
import { StyleSheet, View, Text } from 'react-native';

const Carte = ({ titre, prix }) => {        // props déstructurées
  return (
    <View style={styles.container}>
      <Text style={styles.titre}>{titre}</Text>
      <Text>{prix} $</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  titre: { fontSize: 24, fontWeight: 'bold' },
});

export default Carte;                        // import Carte from './Carte';
```

| Règle JSX | Exemple |
|---|---|
| JavaScript entre accolades | `<Text>{product.name}</Text>`, `{price * quantity}` |
| Objet passé en prop : doubles accolades | `style={{ width: 200, height: 200 }}`, `source={{ uri: url }}` |
| Tout texte dans `<Text>` | jamais de texte nu dans une `<View>` |
| Un seul élément racine | envelopper dans `<View>` ou un fragment `<>…</>` |
| Fonction passée, pas appelée | `onPress={addToCart}` (et non `addToCart()`) |
| Fonction avec argument | `onPress={() => setIsHungry(false)}` |
| Commentaire dans le JSX | `{/* commentaire */}` |
| Condition | `{isHungry ? 'hungry' : 'full'}`, `{estVide && <Text>Vide</Text>}` |

## 4. Props et state

| | Props | State |
|---|---|---|
| Qui les fixe | le **parent** : `<Cat name="Maru" />` | le composant lui-même |
| Lecture | `props.name` ou `({ name })` | la variable d'état |
| Modification | non (lecture seule) | avec le **setter**, qui relance le rendu |
| Usage | configurer | données qui **changent** (saisie, clics, compteur) |

```jsx
import { useState } from 'react';

const [count, setCount] = useState(0);        // [valeur, setter] = useState(initiale)
<Button title={`Clics : ${count}`} onPress={() => setCount(count + 1)} />

const [text, setText] = useState('');
<TextInput value={text} onChangeText={setText} placeholder="Tapez ici" />
```

Hooks courants : `useState` (état), `useEffect` (effets, appels d'API), `useContext` (donnée partagée), `useWindowDimensions` (`const { width, height } = useWindowDimensions()`). Un Hook s'appelle **en haut** du composant, jamais dans un `if` ou une boucle.

## 5. Composants de base

| Composant | Équivalent web | Props utiles |
|---|---|---|
| `View` | `div` | `style` |
| `Text` | `p`, `span` | `style`, `numberOfLines` |
| `Image` | `img` | `source={{ uri }}` ou `source={require('./a.png')}`, `style` (**taille obligatoire** pour une image distante), `resizeMode` |
| `TextInput` | `input` | `value`, `onChangeText`, `placeholder`, `keyboardType`, `secureTextEntry` |
| `Button` | `button` | `title`, `onPress`, `color`, `disabled` (peu stylable) |
| `Pressable` | bouton personnalisé | `onPress`, `style` ; on met un `<Text>` dedans |
| `ScrollView` | `div` défilant | `horizontal`, `pagingEnabled`, `contentContainerStyle` |
| `FlatList` | liste virtualisée | voir ci-dessous |
| `SectionList` | liste par sections | `sections`, `renderItem`, `renderSectionHeader` |

Icônes Expo : `import { Feather } from '@expo/vector-icons'` puis `<Feather name="plus-circle" size={24} color="gray" onPress={...} />` (noms sur icons.expo.fyi).

## 6. FlatList

```jsx
<FlatList
  data={products}                                   // le tableau
  renderItem={({ item, index }) => <Carte titre={item.name} prix={item.price} />}
  keyExtractor={(item) => item.id}                  // clé unique (string)
  numColumns={2}                                    // grille
  horizontal                                        // ou défilement horizontal
  pagingEnabled                                     // une page à la fois
  showsHorizontalScrollIndicator={false}
  ListHeaderComponent={EnTete}                      // avant la liste
  ListFooterComponent={Totaux}                      // après la liste
  ListEmptyComponent={<Text>Panier vide</Text>}
  contentContainerStyle={{ paddingBottom: 100 }}    // place pour un bouton flottant
/>
```

**ScrollView** rend **tous** ses enfants (peu d'éléments) ; **FlatList** ne rend que ce qui est **visible** (longues listes).

## 7. Styles et flexbox

| Propriété | Valeurs / effet |
|---|---|
| `flex: 1` | prendre toute la place disponible (à mettre sur le conteneur de l'écran) |
| `flexDirection` | `'column'` (**défaut** en React Native) ou `'row'` |
| `justifyContent` | axe principal : `'flex-start'`, `'center'`, `'space-between'`, `'space-around'` |
| `alignItems` | axe secondaire : `'stretch'` (défaut), `'center'`, `'flex-start'` |
| `alignSelf` | alignement d'un seul enfant : `'center'` |
| `marginTop: 'auto'`, `marginLeft: 'auto'` | pousser un élément en bas / à droite |
| `width: '50%'`, `aspectRatio: 1` | taille relative, hauteur déduite (carré) |
| `position: 'absolute'` + `bottom: 30` | élément flottant (bouton fixé en bas) |
| `padding`, `paddingHorizontal`, `margin`, `marginVertical` | espacements (nombres sans unité) |
| `borderRadius: 100`, `borderTopWidth: 1`, `borderColor` | bords |
| `fontSize`, `fontWeight: '500'` (chaîne), `color`, `lineHeight`, `letterSpacing` | texte |

Les tailles sont des **nombres sans unité** (points indépendants de la densité de l'écran) ou des pourcentages entre guillemets. Les noms sont en **camelCase** (`backgroundColor`, pas `background-color`).

## 8. Navigation (React Navigation)

```sh
npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context
```

```jsx
// src/navigation.js
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const Navigation = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="Products" component={ProductScreen} />
      <Stack.Screen name="Cart" component={ShoppingCart} options={{ title: 'Panier' }} />
    </Stack.Navigator>
  </NavigationContainer>
);

// App.js : return <Navigation />;
```

Aller vers un écran : `const navigation = useNavigation();` (import depuis `@react-navigation/native`) puis `navigation.navigate('Cart')` ; revenir : `navigation.goBack()`.

## 9. Git

| Commande | Rôle |
|---|---|
| `git status` / `git diff` | état / modifications non ajoutées |
| `git add .` | tout préparer |
| `git commit -m "message"` | enregistrer |
| `git remote add origin <URL>` | relier à GitHub (dépôt créé **sans** README) |
| `git branch -M main` | renommer la branche |
| `git push -u origin main` puis `git push` | envoyer |

Cycle : **modifier → `git add .` → `git commit -m "..."` → `git push`**.

## 10. Erreurs fréquentes

| Message / symptôme | Cause probable |
|---|---|
| `Unable to resolve module ./screens/ProductsScreen` | nom de fichier ou chemin faux (`ProductScreen.js`, `../` au lieu de `./`, majuscules) |
| `Text strings must be rendered within a <Text> component` | texte nu dans une `View` |
| `Adjacent JSX elements must be wrapped in an enclosing tag` | deux éléments renvoyés sans `<View>` ni `<>…</>` |
| `Each child in a list should have a unique "key" prop` | `keyExtractor` manquant ou ids en double |
| Image invisible | pas de `width`/`height` (ou `aspectRatio`) sur une image distante, ou `uri` vide |
| La liste ne défile pas, l'écran est coupé | conteneur parent sans `flex: 1` |
| La fonction s'exécute au chargement, pas au clic | `onPress={f()}` au lieu de `onPress={f}` |
| L'application plante après une installation | version incompatible avec le SDK : `npx expo install --fix` |
| Expo Go ne trouve pas le projet | téléphone et PC sur des réseaux différents : `npx expo start --tunnel` |
