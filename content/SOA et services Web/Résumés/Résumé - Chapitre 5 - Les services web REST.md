---
date: 2026-11-08
ordre: 5
tags: [soa, resume, rest, restful, http, crud, json, spring-boot, restcontroller, requestmapping, pathvariable, requestbody]
---
# Résumé — Chapitre 5 : les services web REST

Support : [[Chapitre 5 - Les services web REST.pdf]] (46 diapositives) · Hamdi Aloulou · ISIMa · précédent : [[Résumé - Chapitre 4 - Développement de services web avec Spring Boot]] · suite : [[Résumé - Chapitre 6 - Spring Data JPA]]

Après un rappel de **HTTP**, le chapitre définit **REST** : un style d'architecture **orienté ressources**, **sans état**, où chaque ressource a une **URI** et où la **méthode HTTP** dit quelle opération **CRUD** effectuer. Il présente le format **JSON** (objets, tableaux, valeurs), puis la façon d'écrire une **API REST avec Spring Boot** : `@RestController`, `@RequestMapping`, `@GetMapping`…, `@RequestBody`, `@PathVariable`.

## Le chapitre en un coup d'œil

| Diapositives | Thème |
|---|---|
| 2 à 10 | rappel HTTP : URI, méthodes, requête, réponse |
| 11 à 27 | REST : définition, sans état, ressources, CRUD, étapes d'un échange, RESTful, formats |
| 28 à 37 | JSON : objet, valeur, tableau, équivalent XML, exercice de correction |
| 38 à 46 | API REST avec Spring Boot : annotations |

## 1. Rappel : HTTP

*Diapositives 3 à 10*

HTTP est un protocole **requête / réponse** au-dessus de **TCP/IP** (détails dans le [[Résumé - Chapitre 1 - Introduction aux architectures orientées services#9. Le protocole HTTP|chapitre 1]]).

- **URI** (*Uniform Resource Identifier* ; la diapositive 5 écrit « Unique Resource Identificator ») : identifie une ressource de manière unique, `protocole://hôte:port/chemin` ;
- méthodes : **GET** (récupérer), **POST** (envoyer des données), **PUT** (modifier), **DELETE** (supprimer) ; aussi HEAD, TRACE, CONNECT ;
- **requête** = en-tête (**ligne de requête** + en-têtes optionnels) + **corps** ;
- **réponse** = en-tête (**ligne de statut** + en-têtes) + **corps** optionnel.

```http
POST /bibliotheque/licences HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Content-Length: 52

{"nom": "licence", "description": "licence ISIMa"}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
Date: Sun, 08 Nov 2026 16:05:39 GMT

{"id": 7, "nom": "licence", "description": "licence ISIMa"}
```

L'en-tête **`Content-Type`** dit le format du corps envoyé ; **`Accept`** dit le format attendu en retour.

## 2. REST

*Diapositives 12 et 13*

> [!definition] REST (*REpresentational State Transfer*)
> **Style d'architecture** inspiré du Web, **fortement basé sur HTTP** et ses méthodes (GET, POST, PUT, DELETE), **orienté ressources** identifiées par des **URI**.

> [!important] Sans état (*stateless*)
> Chaque requête contient **toutes les informations nécessaires** à son traitement et est traitée **indépendamment** des autres : le serveur ne garde **ni session ni état** du client. Avantage : moins de ressources système, et n'importe quelle instance du service peut répondre (scalabilité).

## 3. Ressources et CRUD

*Diapositives 15, 16 et 25*

> [!definition] Ressource
> **Objet identifiable** du système (livre, personne, client, catégorie, prêt), identifié de manière unique par une **URI** : dans `https://jsonplaceholder.typicode.com/users/2`, `users` est la collection et `2` la **clé primaire** de la ressource dans la base.

| Opération CRUD | Méthode HTTP | URI | Code de succès |
|---|---|---|---|
| **C**reate : créer | **POST** | `/users` (la collection) | **201 Created** (ou 204 No Content) |
| **R**ead : lire sans modifier | **GET** | `/users` (toute la liste) ou `/users/2` (une ressource) | **200 OK** |
| **U**pdate : mettre à jour | **PUT** | `/users/2` | **200 OK** |
| **D**elete : supprimer | **DELETE** | `/users/2` | **200 OK** (ou 204) |

**Plusieurs actions pour une même URI** : c'est la **méthode** qui décide. `/users/2` accepte GET, PUT, DELETE ; `/users` accepte GET et POST.

## 4. Les étapes d'un échange

*Diapositives 17 à 24*

```mermaid
sequenceDiagram
  participant C as Client
  participant S as Serveur REST
  C->>S: 1. ressource (URI) + action (méthode) : GET /users/2
  S->>S: 2. identifie la ressource et la méthode, exécute l'action
  S-->>C: représentation de la ressource (JSON) + code d'état 200
  C->>C: 3. lit le code : 200/201 → succès ; 4xx/5xx → raison de l'échec
```

| Requête | Corps envoyé | Réponse |
|---|---|---|
| `POST /users` | `{"name": "Mario", "username": "Mario", "email": "Mario@karina.biz"}` | **201**, `{"id": 11}` |
| `GET /users/2` | — | **200**, `{"id": 2, "name": "Ervin Howell", "username": "Antonette", ...}` |
| `GET /users` | — | **200**, un **tableau** de tous les utilisateurs |
| `PUT /users/2` | `{"username": "Ervin"}` | **200**, `{"username": "Ervin", "id": 2}` |
| `DELETE /users/2` | — | **200**, `{}` |

## 5. RESTful

*Diapositive 26*

Lire avec un POST, mettre à jour avec un DELETE, supprimer avec un PUT : **REST ne l'interdit pas techniquement**, mais l'API **ne respecte plus les exigences REST**, elle n'est pas **RESTful**. Une API RESTful utilise **chaque méthode pour son sens**.

## 6. Représentation des données

*Diapositive 27*

- **GET** : le serveur envoie au client l'**état** (la représentation) de la ressource ;
- **POST, PUT** : le client envoie au serveur l'état d'une ressource.

Formats possibles selon l'API : **JSON** (le plus courant), **XML**, CSV, texte brut.

## 7. JSON

*Diapositives 29 à 34*

> [!definition] JSON (*JavaScript Object Notation*)
> Format d'échange de données **facile à lire** pour un humain et **facile à interpréter** pour une machine. Deux structures : l'**objet** (collection de paires clé/valeur, entre **accolades**) et le **tableau** (liste ordonnée, entre **crochets**).

| Structure | Syntaxe | Exemple |
|---|---|---|
| **Objet** | `{ "clé": valeur, ... }` ; clé entre guillemets, suivie de `:`, paires séparées par `,`, **non ordonnées** | `{"nom": "Ahmed"}` |
| **Tableau** | `[ valeur, valeur, ... ]`, **ordonné** | `[{"nom": "Ahmed"}, {"nom": "Sana"}, {"nom": "Walid"}]` |

**Valeurs possibles** : une **chaîne** entre **guillemets doubles**, un **nombre** (entier ou décimal), un **booléen** (`true`, `false`), un **objet**, `null` *(complément : et aussi un **tableau**)*.

```json
{
  "titre": "The Social network",
  "année": 2010,
  "réalisateur": {"nom": "Fincher", "prénom": "David"},
  "acteurs": [
    {"prénom": "Jesse", "nom": "Eisenberg"},
    {"prénom": "Rooney", "nom": "Mara"}
  ]
}
```

| JSON | Équivalent XML |
|---|---|
| objet `"réalisateur": {...}` | élément `<réalisateur>` avec des enfants |
| tableau `"acteurs": [...]` | éléments `<acteur>` **répétés** |
| `"année": 2010` (nombre) | `<année>2010</année>` (tout est texte, le type vient du schéma) |

JSON est plus **court** (pas de balise fermante) et se lit directement en JavaScript ; XML a les **attributs**, les **espaces de noms** et la validation par **XSD**.

## 8. Exercice : corriger un JSON

*Diapositives 35 à 37*

| Erreur dans « Taxi driver » | Règle |
|---|---|
| `'Vétéran ... peu à peu.'` entre apostrophes | les chaînes sont entre **guillemets doubles** |
| la chaîne du résumé coupée sur plusieurs lignes | une chaîne ne contient **pas de retour à la ligne brut** (l'écrire sur une ligne, ou `\n`) |
| `prénom: "Martin"`, `{nom: "Jodie"`, `{nom: "Robert"` | les **clés** sont entre guillemets doubles |
| `"rôle": "1962" }` suivi de `{nom: ...` | **virgule** entre deux éléments d'un tableau |
| `"rôle": "Travis Bickle ", }` | **pas de virgule finale** avant `}` ou `]` |
| le tableau `acteurs` se termine par `}` | un tableau ouvert par `[` se ferme par `]` |

```json
{
  "titre": "Taxi driver",
  "année": 1976,
  "genre": "drama",
  "résumé": "Vétéran de la Guerre du Vietnam, Travis Bickle est chauffeur de taxi dans la ville de New York. La violence quotidienne l'affecte peu à peu.",
  "pays": "USA",
  "réalisateur": {"nom": "Scorcese", "prénom": "Martin", "date_naissance": "1962"},
  "acteurs": [
    {"nom": "Jodie", "prénom": "Foster", "date_naissance": null, "rôle": "1962"},
    {"nom": "Robert", "prénom": "De Niro", "date_naissance": "1943", "rôle": "Travis Bickle "}
  ]
}
```

Ce document est **bien formé** (vérifié avec un analyseur JSON, comme jsonlint.com). Le **contenu** reste discutable (Scorsese s'écrit avec deux « s », Jodie Foster est née en 1962 et joue Iris) : un validateur vérifie la **syntaxe**, pas le **sens**.

## 9. Une API REST avec Spring Boot

*Diapositives 39 à 46*

`@SpringBootApplication` regroupe trois annotations :

| Annotation | Rôle |
|---|---|
| `@Configuration` | la classe peut définir des **beans** de configuration, à la place des fichiers XML |
| `@EnableAutoConfiguration` | génère au démarrage les configurations nécessaires **d'après les dépendances** du classpath |
| `@ComponentScan` | **scanne** le package et ses sous-packages pour trouver les composants |

| Annotation | Où | Rôle |
|---|---|---|
| `@RestController` | classe | la classe traite des **requêtes REST** ; les valeurs renvoyées sont écrites dans le corps de la réponse (en JSON) |
| `@RequestMapping("/api")` | classe | **préfixe** de toutes les URI du contrôleur |
| `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping` | méthode | associe la méthode à une **méthode HTTP** et une **URI** |
| `value` | paramètre | l'URI à laquelle répondre |
| `produces` | paramètre | format **renvoyé** (GET) : `application/json`, `application/xml`, `text/plain` |
| `consumes` | paramètre | format **accepté en entrée** (POST, PUT) |
| `@RequestBody` | paramètre de méthode | convertit le **JSON (ou XML) du corps** en objet Java |
| `@PathVariable("id")` | paramètre de méthode | récupère la **variable de l'URI** `{id}` |

```java
@RestController
@RequestMapping("/api")
public class ProduitController {

    @GetMapping(value = "/produits", produces = "application/json")
    public List<Product> listeProduits() { ... }                       // GET /api/produits

    @GetMapping("/produits/{id}")
    public Product afficherUnProduit(@PathVariable("id") int id) { ... } // GET /api/produits/5

    @PostMapping(value = "/produits", consumes = "application/json")
    public void ajouterUnProduit(@RequestBody Product produit) { ... }  // POST /api/produits

    @PutMapping("/produits/{id}")
    public Product modifier(@PathVariable int id, @RequestBody Product produit) { ... }

    @DeleteMapping("/produits/{id}")
    public void supprimer(@PathVariable int id) { ... }
}
```

> [!warning] La virgule entre les paramètres
> Les diapositives 43 et 45 écrivent `@GetMapping(value = "/produits" produces = "application/json")` : il manque la **virgule** entre `value` et `produces` (ou `consumes`), sinon le code ne compile pas.

*(Complément : pour choisir le code de retour, une méthode renvoie `ResponseEntity<Product>` : `ResponseEntity.status(HttpStatus.CREATED).body(p)` pour un 201, `ResponseEntity.notFound().build()` pour un 404. Sans cela, Spring renvoie 200.)*

## À retenir

> [!abstract] Résumé
> - **REST** : style d'architecture **orienté ressources** (URI), basé sur **HTTP**, **sans état**.
> - CRUD ↔ méthodes : **POST** créer (201), **GET** lire (200), **PUT** modifier (200), **DELETE** supprimer (200/204) ; même URI, actions différentes selon la méthode ; utiliser chaque méthode pour son sens = **RESTful**.
> - **JSON** : objet `{ "clé": valeur }`, tableau `[ ... ]` ; valeurs : chaîne (guillemets **doubles**), nombre, `true`/`false`, objet, tableau, `null` ; pas de virgule finale.
> - Spring Boot : `@RestController` + `@RequestMapping` (préfixe) ; `@GetMapping`/`@PostMapping`/`@PutMapping`/`@DeleteMapping` ; `produces` (sortie), `consumes` (entrée) ; `@RequestBody` (corps → objet) ; `@PathVariable` (`{id}` de l'URI).
