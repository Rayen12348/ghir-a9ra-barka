---
date: 2026-11-08
ordre: 3
tags: [soa, resume, xml, xsd, schema, simpletype, complextype, sequence, choice, minoccurs, maxoccurs, attributs]
---
# Résumé — Chapitre 3 : schéma XML

Support : [[Chapitre 3 - Schéma XML.pdf]] (27 diapositives) · Hamdi Aloulou · ISIMa · précédent : [[Résumé - Chapitre 2 - Le langage XML]] · suite : [[Résumé - Chapitre 4 - Développement de services web avec Spring Boot]] · TP lié : [[Correction TP 2 - Schéma XML (XSD)]]

Un **schéma XML** (fichier `.xsd`) décrit la **structure** qu'un document XML doit respecter : quels éléments, dans quel ordre, combien de fois, avec quels attributs et quels **types** de valeurs. Un document conforme est **valide**. Le chapitre présente la racine `xsd:schema`, la déclaration des **éléments** (types prédéfinis, **simples**, **complexes**, **anonymes**), les opérateurs **`sequence`** et **`choice`**, les **occurrences** et les **attributs**, avec trois exercices.

## Le chapitre en un coup d'œil

| Diapositives | Thème |
|---|---|
| 3 à 6 | rôle du schéma, exemple, structure globale, espace de noms |
| 7 à 15 | déclarer des éléments : types prédéfinis, simples, complexes, `sequence`, `choice`, types anonymes |
| 16 et 17 | `minOccurs`, `maxOccurs` |
| 18 à 20 | exercice 1 : une bibliographie |
| 21 à 24 | attributs, exercice 2 |
| 25 à 27 | exercice 3 : déduire un schéma d'un document (la cave) |

## 1. Rôle d'un schéma XML

*Diapositive 3*

> [!definition] Schéma XML
> Document (lui-même en XML) qui **décrit la structure d'un document XML**. Il permet de spécifier le **type des données** (une **quarantaine de types prédéfinis**), de définir des types **simples** et **complexes**, et de contrôler les **occurrences** des données.

Avantage sur la DTD (chapitre 2) : la **syntaxe XML** et le **typage fort** (un nombre, une date, une énumération…).

## 2. Relier un document à son schéma

*Diapositives 4 et 6*

```xml
<!-- schema.xsd -->
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xsd:element name="entree">
    <xsd:complexType>
      <xsd:sequence>
        <xsd:element name="nom" type="xsd:string" minOccurs="0" maxOccurs="1"/>
        <xsd:element name="telephone" type="xsd:decimal"/>
        <xsd:element name="email"/>                 <!-- sans type : n'importe quel contenu -->
      </xsd:sequence>
    </xsd:complexType>
  </xsd:element>
</xsd:schema>
```

```xml
<!-- document XML -->
<?xml version="1.0" standalone="no"?>
<entree xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="schema.xsd">
  <telephone>0123456789</telephone>
  <email>contact@exemple.tn</email>
</entree>
```

| Élément | Rôle |
|---|---|
| `<xsd:schema>` | **racine** de tout schéma |
| `xmlns:xsd="http://www.w3.org/2001/XMLSchema"` | **espace de noms** des schémas, associé au préfixe `xsd` (ou `xs`) |
| `xmlns:xsi=".../XMLSchema-instance"` + `xsi:noNamespaceSchemaLocation="schema.xsd"` | dans le **document**, indique **quel fichier** schéma utiliser |
| `standalone="no"` | le document dépend d'un fichier externe |

> [!warning] Le document de la diapositive 4 n'est pas valide
> `email` est déclaré sans `minOccurs` : par défaut il est **obligatoire** (`minOccurs="1"`). Le document de la diapositive ne contient que `<telephone>` ; `xmllint` répond : `Element 'entree': Missing child element(s). Expected is ( email )`. Il faut ajouter `<email>` (comme ci-dessus) ou déclarer `minOccurs="0"`.

**Structure globale** (diapositive 5) : un schéma contient des **déclarations d'éléments**, des **déclarations d'attributs** et des **définitions de types** ; chaque élément a un type **prédéfini** ou **défini dans le schéma**.

## 3. Déclarer des éléments

*Diapositives 7 à 10*

```xml
<xsd:element name="title" type="xsd:string"/>          <!-- type prédéfini -->
<xsd:element name="bibliography" type="Bib"/>          <!-- type défini dans le schéma -->
```

**Types prédéfinis** (diapositive 8) :

| Famille | Types |
|---|---|
| nombres | `integer`, `positiveInteger`, `negativeInteger`, `int`, `long`, `short`, `byte`, `unsigned…`, `decimal`, `float`, `double` |
| texte | `string`, `normalizedString`, `token` |
| divers | `boolean`, `anyURI`, `language`, `hexBinary` |
| dates | `date`, `time`, `dateTime`, `duration`, `gYear`, `gMonth`, `gDay`, `gYearMonth`, `gMonthDay` |
| identifiants | `ID`, `IDREF`, `IDREFS`, `NMTOKEN`, `NMTOKENS` |

> [!definition] Type simple
> Valeur **textuelle sans élément enfant ni attribut**, obtenue en **restreignant** un type prédéfini.

```xml
<xs:simpleType name="choixOuiNon">
  <xs:restriction base="xs:string">
    <xs:enumeration value="oui"/>
    <xs:enumeration value="non"/>
  </xs:restriction>
</xs:simpleType>
<xs:element name="choix" type="choixOuiNon"/>
```

*(Complément : d'autres facettes de `restriction` : `minInclusive`, `maxInclusive`, `length`, `minLength`, `maxLength`, `pattern` (expression régulière), `totalDigits`.)*

> [!definition] Type complexe
> Élément qui contient **des éléments enfants** et/ou **des attributs**.

```xml
<xs:complexType name="TypeAdresse">
  <xs:sequence>
    <xs:element name="Numero" type="xs:positiveInteger"/>
    <xs:element name="Rue1" type="xs:string"/>
    <xs:element name="Rue2" type="xs:string"/>
    <xs:element name="Ville" type="xs:string"/>
    <xs:element name="CP" type="xs:decimal"/>
    <xs:element name="Pays" type="xs:string"/>
  </xs:sequence>
</xs:complexType>
<xs:element name="adresse" type="TypeAdresse"/>
```

## 4. `sequence` et `choice`

*Diapositives 11 et 12*

| Opérateur | Le document doit contenir… | Exemple |
|---|---|---|
| `<xsd:sequence>` | **tous** les éléments, **dans cet ordre** | `book` = `title`, `author`, `year`, `publisher` |
| `<xsd:choice>` | **un seul** des éléments proposés | `publication` = `book` **ou** `article` **ou** `report` |

```xml
<xsd:complexType name="publicationType">
  <xsd:choice>
    <xsd:element name="book" type="xsd:string"/>
    <xsd:element name="article" type="xsd:string"/>
    <xsd:element name="report" type="xsd:string"/>
  </xsd:choice>
</xsd:complexType>
<xsd:element name="publication" type="publicationType"/>
```

*(Complément : `<xsd:all>` exige chaque élément au plus une fois, dans **n'importe quel ordre**.)*

## 5. Type nommé ou type anonyme

*Diapositives 13 à 15*

| | Type **nommé** | Type **anonyme** |
|---|---|---|
| Écriture | `<xsd:complexType name="publicationType">` puis `<xsd:element ... type="publicationType"/>` | le `complexType` (ou `simpleType`) est écrit **dans** l'`xsd:element`, **sans nom** |
| Réutilisation | **oui**, plusieurs éléments peuvent l'utiliser | **non**, il sert à cet élément seulement |

```xml
<xsd:element name="publication">
  <xsd:complexType>
    <xsd:choice>
      <xsd:element name="book" type="xsd:string"/>
      <xsd:element name="article" type="xsd:string"/>
      <xsd:element name="report" type="xsd:string"/>
    </xsd:choice>
  </xsd:complexType>
</xsd:element>
```

## 6. Occurrences

*Diapositives 16 et 17*

| Attribut | Sens | Défaut |
|---|---|---|
| `minOccurs` | nombre **minimal** d'apparitions (`0` = optionnel) | **1** |
| `maxOccurs` | nombre **maximal** (`unbounded` = illimité) | **1** |

```xml
<xsd:element name="nom" type="xsd:string" minOccurs="0" maxOccurs="1"/>   <!-- 0 ou 1 -->
<xsd:element name="telephone" type="xsd:decimal" maxOccurs="unbounded"/>  <!-- 1 ou plus -->
<xsd:element name="email"/>                                               <!-- exactement 1 -->
```

## 7. Attributs

*Diapositive 21*

```xml
<xsd:attribute name="nom_attribut" type="type"/>
```

- un attribut a **toujours un type simple** ;
- `use="optional"` (défaut) ou `use="required"` ;
- `default="valeur"` : valeur prise si l'attribut est absent ; `fixed="valeur"` : valeur imposée ;
- les `xsd:attribute` se placent dans le `complexType`, **après** la `sequence` / le `choice`.

```xml
<!-- <montant devise="Euro" horsTaxe="true"/> -->
<xsd:element name="montant">
  <xsd:complexType>
    <xsd:attribute name="devise" type="xsd:string" default="Euro"/>
    <xsd:attribute name="horsTaxe" type="xsd:boolean" use="required"/>
  </xsd:complexType>
</xsd:element>
```

> [!warning] `use="required"` et `default` sont incompatibles
> La diapositive 21 déclare `horsTaxe` avec `use="required" default="true"`. Un attribut obligatoire est toujours présent : une valeur par défaut n'a pas de sens, et le schéma est **refusé** (`xmllint` : *The value of the attribute 'use' must be 'optional' if the attribute 'default' is present*). Garder **l'un ou l'autre**. Attention aussi à la casse : `default="EURO"` et la valeur `"Euro"` du document sont deux chaînes différentes.

## 8. Les exercices

### Exercice 1 : bibliographie

*Diapositives 18 à 20*

```xml
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xsd:element name="biblio">
    <xsd:complexType>
      <xsd:sequence>
        <xsd:element name="livre" maxOccurs="unbounded">
          <xsd:complexType>
            <xsd:sequence>
              <xsd:element name="titre" type="xsd:string"/>
              <xsd:element name="auteur" type="xsd:string" maxOccurs="unbounded"/>
              <xsd:element name="infosEdition">
                <xsd:complexType>
                  <xsd:sequence>
                    <xsd:element name="editeur" type="xsd:string"/>
                    <xsd:element name="lieuEdition" type="xsd:string"/>
                    <xsd:element name="lieuImpression" type="xsd:string"/>
                    <xsd:element name="ISBN" type="xsd:string"/>
                  </xsd:sequence>
                </xsd:complexType>
              </xsd:element>
            </xsd:sequence>
          </xsd:complexType>
        </xsd:element>
      </xsd:sequence>
    </xsd:complexType>
  </xsd:element>
</xsd:schema>
```

Plusieurs livres et plusieurs auteurs : `maxOccurs="unbounded"`. Les informations d'édition forment un sous-élément complexe.

### Exercice 2 : ajouter des attributs

*Diapositives 22 à 24*

- `titre` reçoit un attribut optionnel `sousTitre` **tout en gardant son texte** : `<xsd:complexType mixed="true">` (contenu **mixte** : texte + attribut) ;
- `infosEdition` perd les éléments `ISBN` et `lieuImpression`, qui deviennent des **attributs** : `ISBN` **requis**, `lieuImpression` **optionnel**.

```xml
<xsd:element name="titre">
  <xsd:complexType mixed="true">
    <xsd:attribute name="sousTitre" type="xsd:string" use="optional"/>
  </xsd:complexType>
</xsd:element>
...
<xsd:element name="infosEdition">
  <xsd:complexType>
    <xsd:sequence>
      <xsd:element name="editeur" type="xsd:string"/>
      <xsd:element name="lieuEdition" type="xsd:string"/>
    </xsd:sequence>
    <xsd:attribute name="lieuImpression" type="xsd:string"/>
    <xsd:attribute name="ISBN" type="xsd:string" use="required"/>
  </xsd:complexType>
</xsd:element>
```

*(Complément : la forme plus stricte pour « du texte + un attribut » est un `simpleContent` : `<xsd:complexType><xsd:simpleContent><xsd:extension base="xsd:string"><xsd:attribute name="sousTitre" type="xsd:string"/></xsd:extension></xsd:simpleContent></xsd:complexType>` ; `mixed="true"` accepte aussi des éléments enfants mêlés au texte.)*

### Exercice 3 : déduire un schéma (la cave)

*Diapositives 25 à 27*

```xml
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xsd:element name="cave">
    <xsd:complexType>
      <xsd:sequence>
        <xsd:element name="appellation" type="app" minOccurs="1" maxOccurs="unbounded"/>
      </xsd:sequence>
    </xsd:complexType>
  </xsd:element>

  <xsd:complexType name="app">                       <!-- type nommé, défini à part -->
    <xsd:sequence>
      <xsd:element name="chateau" minOccurs="0" maxOccurs="unbounded">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="nom" type="xsd:string"/>
            <xsd:element name="adresse" type="xsd:string"/>
            <xsd:element name="téléphone" type="xsd:string"/>
          </xsd:sequence>
          <xsd:attribute name="id" type="xsd:string" use="required"/>
        </xsd:complexType>
      </xsd:element>
    </xsd:sequence>
    <xsd:attribute name="id" type="xsd:string" use="required"/>
    <xsd:attribute name="nom" type="xsd:string"/>
  </xsd:complexType>
</xsd:schema>
```

Méthode : partir de la **racine**, puis pour chaque élément se demander **combien de fois** il apparaît, **ce qu'il contient** (texte ou enfants), **quels attributs** il porte et de **quel type** sont les valeurs.

> [!note] Écarts avec la solution du cours
> La solution des diapositives tape `id` en `xsd:integer` et `téléphone` en `xsd:decimal` : c'est valide pour ce document (`01`, `0101`, `0556124321` sont des entiers), mais un identifiant ou un numéro de téléphone est un **code** dont les zéros de tête comptent : `xsd:string` (ou une restriction par `pattern`) est plus juste. Elle met aussi `maxOccurs="unbounded"` sur `nom`, alors qu'un château a un seul nom.

## À retenir

> [!abstract] Résumé
> - Un **XSD** décrit la structure d'un document XML ; un document conforme est **valide**. Racine `<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">` ; lien côté document : `xsi:noNamespaceSchemaLocation="fichier.xsd"`.
> - `xsd:element name type` ; types **prédéfinis** (`string`, `integer`, `decimal`, `boolean`, `date`…), **simples** (restriction, `enumeration`) ou **complexes** (enfants et/ou attributs).
> - **`sequence`** = tous, dans l'ordre ; **`choice`** = un seul ; (`all` = chacun au plus une fois, ordre libre).
> - Type **nommé** (réutilisable, `type="..."`) ou **anonyme** (écrit dans l'élément).
> - `minOccurs` / `maxOccurs` : **1 par défaut** ; `0` = optionnel, `unbounded` = illimité.
> - `xsd:attribute` : type simple, `use="required"` ou optionnel, `default` **seulement** si optionnel ; placé après la `sequence`.
