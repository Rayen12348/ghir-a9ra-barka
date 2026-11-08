---
date: 2026-11-08
ordre: 0
tags: [soa, spring-boot, sts, maven, tp, correction, tomcat, whitelabel, jar, application-properties]
---
# Correction TP 0 — Créer une application avec Spring Boot

Énoncé : [[TP 0 - Créer une application avec Spring Boot.pdf]] · cours : [[Résumé - Chapitre 4 - Développement de services web avec Spring Boot]] · suite (le CRUD) : [[Résumé - Chapitre 5 - Les services web REST]], [[Résumé - Chapitre 6 - Spring Data JPA]]

> [!abstract] Ce qu'on fait
> Installer **Spring Tools (STS)**, générer le projet **Microcommerce** avec Spring Initializr, le **lancer** (Tomcat embarqué sur le port 8080), comprendre la page **Whitelabel Error Page**, produire un **JAR exécutable**, puis changer le **port** dans `application.properties`.

> [!note] Ce qui a été vérifié
> Le projet a été généré avec les paramètres du TP sur Spring Initializr (Spring Boot **4.1.2**, Java 17) : les fichiers et le `pom.xml` ci-dessous en sont tirés. Les messages de démarrage et la page d'erreur sont ceux qu'affiche Spring Boot.

## I. Installer Spring Tools

1. télécharger **Spring Tools for Eclipse** sur `https://spring.io/tools` (archive `spring-tools-for-eclipse-4.x.y.RELEASE-...`) ;
2. décompresser : dossier `sts-4.x.y.RELEASE` (avec `configuration`, `plugins`, `features`, l'exécutable `SpringToolSuite4`) ;
3. lancer `SpringToolSuite4.exe` (Windows) ou `./SpringToolSuite4` (Linux), choisir un **workspace**.

> [!warning] Le JDK
> STS embarque son propre Java pour **s'exécuter**, mais le projet se **compile** avec le JDK configuré dans *Window → Preferences → Java → Installed JREs*. La version choisie dans l'assistant (17 ou 21) doit être **inférieure ou égale** à celle de ce JDK : un projet en Java 21 ne compile pas avec un JDK 17 (« release version 21 not supported »). Vérifier avec `java -version`.

## II. Créer le projet

**File → New → Spring Starter Project** :

| Champ | Valeur |
|---|---|
| Name | `Microcommerce` |
| Type | Maven |
| Packaging | Jar |
| Java Version | 17 ou 21 |
| Group | `com.ecommerce` |
| Artifact | `Microcommerce` |
| Package | `com.ecommerce.microcommerce` |
| Dépendances | **Spring Web**, **Spring Boot DevTools** |

Structure générée :

```
Microcommerce/
├── mvnw, mvnw.cmd, .mvn/                      ← Maven Wrapper : Maven sans l'installer
├── pom.xml
└── src/
    ├── main/
    │   ├── java/com/ecommerce/microcommerce/
    │   │   └── MicrocommerceApplication.java
    │   └── resources/
    │       ├── application.properties         ← contient déjà spring.application.name=Microcommerce
    │       ├── static/                        ← fichiers HTML, CSS, JS
    │       └── templates/                     ← vues (Thymeleaf)
    └── test/java/com/ecommerce/microcommerce/
        └── MicrocommerceApplicationTests.java
```

La classe principale :

```java
package com.ecommerce.microcommerce;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MicrocommerceApplication {

    public static void main(String[] args) {
        SpringApplication.run(MicrocommerceApplication.class, args);
    }
}
```

- `@SpringBootApplication` = `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan` : Spring configure l'application d'après les dépendances et scanne `com.ecommerce.microcommerce` **et ses sous-packages** ;
- `main()` est le **point d'entrée** : `SpringApplication.run` démarre le conteneur Spring et le Tomcat embarqué.

Le cœur du `pom.xml` généré :

```xml
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>4.1.2</version>
</parent>
<groupId>com.ecommerce</groupId>
<artifactId>Microcommerce</artifactId>
<version>0.0.1-SNAPSHOT</version>
<properties>
  <java.version>17</java.version>
</properties>
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webmvc</artifactId>       <!-- « Spring Web » -->
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webmvc-test</artifactId>
    <scope>test</scope>
  </dependency>
</dependencies>
<build>
  <plugins>
    <plugin>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-maven-plugin</artifactId>   <!-- fabrique le JAR exécutable -->
    </plugin>
  </plugins>
</build>
```

> [!note] `starter-web` ou `starter-webmvc` ?
> Depuis **Spring Boot 4**, la case « Spring Web » ajoute **`spring-boot-starter-webmvc`** (l'ancien `spring-boot-starter-web`, que citent le cours et les tutoriels écrits pour Spring Boot 3). Même rôle : Spring MVC, Tomcat embarqué, Jackson. Aucune `<version>` n'est écrite : le **parent** fixe toutes les versions.

**Maven Dependencies** (étape 9) : on y repère **Jackson** (conversion Java ↔ JSON), **Tomcat embed** (le serveur), **Logback** (les logs), Spring Core, Spring Web MVC. **Hibernate n'y est pas** : il n'arrive qu'avec `spring-boot-starter-data-jpa`.

## III. Exécuter et tester

**Run As → Java Application** (ou **Run As → Spring Boot App**). La console affiche notamment :

```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
...
Tomcat initialized with port 8080 (http)
Tomcat started on port 8080 (http) with context path '/'
Started MicrocommerceApplication in 1.9 seconds (process running for 2.3)
```

`http://localhost:8080` dans le navigateur :

```
Whitelabel Error Page
This application has no explicit mapping for /error, so you are seeing this as a fallback.
Sun Nov 08 19:45:12 CET 2026
There was an unexpected error (type=Not Found, status=404).
```

**Pourquoi cette erreur ?** Tomcat **a bien reçu** la requête (le serveur fonctionne), mais **aucun contrôleur** (`@Controller`, `@RestController`) ne traite l'URL `/` et il n'y a pas de page `index.html` dans `static/`. Spring Boot répond **404 Not Found** et génère automatiquement cette page d'erreur « en marque blanche ». Avec `curl http://localhost:8080`, la même erreur arrive en **JSON** :

```json
{"timestamp":"2026-11-08T18:45:12.345Z","status":404,"error":"Not Found","path":"/"}
```

> [!tip] Faire disparaître la page d'erreur
> Il suffit d'un endpoint :
> ```java
> package com.ecommerce.microcommerce.web;
>
> import org.springframework.web.bind.annotation.GetMapping;
> import org.springframework.web.bind.annotation.RestController;
>
> @RestController
> public class AccueilController {
>     @GetMapping("/")
>     public String accueil() {
>         return "Microcommerce fonctionne";
>     }
> }
> ```
> Le package `...microcommerce.web` est un **sous-package** de la classe principale : `@ComponentScan` le trouve. Placé ailleurs (`com.autre`), le contrôleur serait ignoré et la page Whitelabel resterait. Avec **DevTools**, l'application redémarre seule à chaque sauvegarde.

## IV. Générer et exécuter le JAR

**Run As → Maven install** (ou `./mvnw clean package` dans un terminal) : Maven compile, lance les tests, puis le `spring-boot-maven-plugin` crée le JAR dans `target/`.

```sh
# arrêter d'abord l'application lancée dans STS (bouton carré rouge) : sinon « Port 8080 was already in use »
java -jar target/Microcommerce-0.0.1-SNAPSHOT.jar
```

> [!warning] Le nom du JAR
> Le JAR s'appelle `artifactId-version.jar`. L'**Artifact** saisi est `Microcommerce`, avec une **majuscule** : le fichier est `target/Microcommerce-0.0.1-SNAPSHOT.jar`, pas `microcommerce-...` comme dans l'énoncé. Sous Linux et macOS, les noms de fichiers sont sensibles à la casse : `java -jar target/microcommerce-0.0.1-SNAPSHOT.jar` répond « Unable to access jarfile ». Utiliser la complétion avec Tab.

L'application démarre comme dans STS, avec `Tomcat started on port 8080`. DevTools est **désactivé automatiquement** quand l'application est lancée depuis un JAR (mode production).

**Pourquoi un JAR ?** Un seul fichier qui contient le code compilé, les ressources, **toutes les dépendances et Tomcat** : on lance l'application **sans IDE** et **sans serveur à installer**, sur toute machine qui a Java (Windows, Linux, serveur, cloud, conteneur Docker). C'est le passage du **développement** à la **production**.

> [!note] « Port 8080 was already in use »
> Si l'application de STS tourne encore, le JAR échoue avec :
> ```
> Web server failed to start. Port 8080 was already in use.
> Action: Identify and stop the process that's listening on port 8080 or configure this application to listen on another port.
> ```
> Arrêter l'autre instance, ou changer de port (partie V).

## V. Personnaliser la configuration

`src/main/resources/application.properties` :

```properties
spring.application.name=Microcommerce
server.port=9090
```

Après redémarrage : `Tomcat started on port 9090 (http)`, et l'application répond sur `http://localhost:9090`. Le port peut aussi se changer **sans modifier le fichier**, au lancement : `java -jar target/Microcommerce-0.0.1-SNAPSHOT.jar --server.port=9091`.

## Résumé

| Étape | Résultat attendu |
|---|---|
| projet généré | `MicrocommerceApplication` avec `@SpringBootApplication`, `pom.xml` avec Spring Web et DevTools |
| exécution dans STS | `Tomcat started on port 8080`, page **Whitelabel Error Page** (404 : aucun contrôleur) |
| `Maven install` | `target/Microcommerce-0.0.1-SNAPSHOT.jar` |
| `java -jar ...` | même démarrage, sans IDE |
| `server.port=9090` | application sur `http://localhost:9090` |

**Suite** : une classe `Produit`, un `ProduitController` en `@RestController` avec les méthodes GET, POST, PUT, DELETE (voir [[Résumé - Chapitre 5 - Les services web REST#9. Une API REST avec Spring Boot|chapitre 5]]), puis la persistance avec Spring Data JPA ([[Résumé - Chapitre 6 - Spring Data JPA|chapitre 6]]).
