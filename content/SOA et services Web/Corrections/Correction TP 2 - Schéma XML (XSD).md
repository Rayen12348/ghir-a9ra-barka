---
date: 2026-11-08
ordre: 2
tags: [soa, xml, xsd, tp, correction, xmllint, restriction, pattern, occurrences, extension]
---
# Correction TP 2 — Schéma XML (XSD)

Énoncé : [[TP 2 - Schéma XML (XSD).pdf]] · Hamdi Aloulou, Raouia Fredj · cours : [[Résumé - Chapitre 3 - Schéma XML]] · avant : [[Correction TP 1 - Technologies XML]]

Tous les schémas ci-dessous ont été validés avec `xmllint --noout --schema schema.xsd document.xml`, qui répond `document.xml validates` ; les messages d'erreur cités sont ceux de `xmllint`.

> [!tip] Méthode pour écrire un schéma à partir d'un document
> 1. la **racine** devient un `xs:element` global ;
> 2. un élément qui contient des **enfants ou des attributs** a un `xs:complexType` ; un élément qui ne contient que du **texte** a un type simple ;
> 3. les enfants vont dans une `xs:sequence` **dans l'ordre du document** ;
> 4. pour chaque enfant : **combien de fois** (`minOccurs`, `maxOccurs`) et **quel type** (`xs:string`, `xs:integer`, `xs:date`…) ;
> 5. les attributs se déclarent **après** la `sequence`, avec `use="required"` s'ils sont obligatoires.

## Partie 1

### Exercice 1 : éléments simples

**a)** Un élément qui ne contient que du texte :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="message" type="xs:string"/>
</xs:schema>
```

**b)** Un élément complexe avec trois enfants dans l'ordre :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="personne">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="nom" type="xs:string"/>
        <xs:element name="prenom" type="xs:string"/>
        <xs:element name="age" type="xs:integer"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
```

### Exercice 2 : les attributs

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="produit">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="nom" type="xs:string"/>
        <xs:element name="prix" type="xs:decimal"/>
      </xs:sequence>
      <xs:attribute name="ref" type="xs:string" use="required"/>
      <xs:attribute name="devise" type="xs:string" default="TND"/>
    </xs:complexType>
  </xs:element>
</xs:schema>
```

- `ref` : `use="required"` (obligatoire) ;
- `devise` : facultatif (c'est la valeur par défaut de `use`) avec `default="TND"` : si le document ne la donne pas, l'application lit `TND`. `default` n'est permis **que** sur un attribut optionnel.

### Exercice 3 : nombre d'occurrences

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="classe">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="etudiant" type="xs:string" minOccurs="1" maxOccurs="30"/>
        <xs:element name="delegue" type="xs:string" minOccurs="0" maxOccurs="1"/>
      </xs:sequence>
      <xs:attribute name="nom" type="xs:string" use="required"/>
    </xs:complexType>
  </xs:element>
</xs:schema>
```

`minOccurs="1" maxOccurs="30"` pour les étudiants, `minOccurs="0" maxOccurs="1"` pour le délégué (les valeurs `1` sont celles par défaut, les écrire rend le schéma plus lisible).

### Exercice 4 : restrictions sur les valeurs

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="etudiant">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="cin">
          <xs:simpleType>
            <xs:restriction base="xs:string">
              <xs:pattern value="[0-9]{8}"/>
            </xs:restriction>
          </xs:simpleType>
        </xs:element>
        <xs:element name="note">
          <xs:simpleType>
            <xs:restriction base="xs:decimal">
              <xs:minInclusive value="0"/>
              <xs:maxInclusive value="20"/>
            </xs:restriction>
          </xs:simpleType>
        </xs:element>
        <xs:element name="sexe">
          <xs:simpleType>
            <xs:restriction base="xs:string">
              <xs:enumeration value="M"/>
              <xs:enumeration value="F"/>
            </xs:restriction>
          </xs:simpleType>
        </xs:element>
        <xs:element name="codePostal">
          <xs:simpleType>
            <xs:restriction base="xs:string">
              <xs:pattern value="[0-9]{4}"/>
            </xs:restriction>
          </xs:simpleType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
```

| Contrainte | Facette |
|---|---|
| CIN : exactement 8 chiffres | `pattern` `[0-9]{8}` sur une **chaîne** (un entier perdrait le zéro de tête de `09876543`) |
| note entre 0 et 20 | `decimal` + `minInclusive` / `maxInclusive` |
| sexe M ou F | `enumeration` |
| code postal : 4 chiffres | `pattern` `[0-9]{4}` |

Test avec des valeurs fausses (`9876543`, `21`, `H`, `51000`) :

```
Element 'cin': [facet 'pattern'] The value '9876543' is not accepted by the pattern '[0-9]{8}'.
Element 'note': [facet 'maxInclusive'] The value '21' is greater than the maximum value allowed ('20').
Element 'sexe': [facet 'enumeration'] The value 'H' is not an element of the set {'M', 'F'}.
Element 'codePostal': [facet 'pattern'] The value '51000' is not accepted by the pattern '[0-9]{4}'.
```

### Exercice 5 : détecter les erreurs

```xml
<produit>
  <prix>vingt</prix>
  <nom>Souris</nom>
  <couleur>noire</couleur>
</produit>
```

| # | Erreur | Règle du schéma de l'exercice 2 |
|---|---|---|
| 1 | l'attribut **`ref` manque** | `use="required"` |
| 2 | **`prix` avant `nom`** | la `xs:sequence` impose l'ordre `nom`, `prix` |
| 3 | **`vingt`** n'est pas un nombre | `prix` est de type `xs:decimal` |
| 4 | l'élément **`couleur`** n'est pas déclaré | la séquence ne contient que `nom` et `prix` |

`xmllint` s'arrête à la première erreur de structure, il faut corriger et relancer :

```
Element 'produit': The attribute 'ref' is required but missing.
Element 'prix': This element is not expected. Expected is ( nom ).
```

puis, une fois l'ordre corrigé :

```
Element 'prix': 'vingt' is not a valid value of the atomic type 'xs:decimal'.
```

## Partie 2

### Exercice 6 : utilisateur Twitter

Avec le schéma tel quel, la compilation échoue :

```
element decl. 'utilisateur-twitter', attribute 'type': The QName value ' utilisateurType ' does not resolve to a(n) type definition.
```

Après correction (`type="utilisateurType"`), un document valide :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<utilisateur-twitter xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                     xsi:noNamespaceSchemaLocation="twitter.xsd">
  <profil id="1024">
    <pseudo>rayen_glsi</pseudo>
    <password>Isima2026!</password>
    <email>rayen@exemple.tn</email>
  </profil>
  <tweet>Premier TP sur les schémas XML.</tweet>
  <tweet>xmllint dit : validates</tweet>
</utilisateur-twitter>
```

À respecter : `profil` puis **au moins un** `tweet` ; l'attribut `id` **obligatoire** et entier ; un mot de passe d'**au moins 9 caractères**. Avec `<password>court</password>` :

```
Element 'password': [facet 'minLength'] The value has a length of '5'; this underruns the allowed minimum length of '9'.
```

### Exercice 7 : employé

**a.** Un document associé :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<employer id="17" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:noNamespaceSchemaLocation="employe.xsd">
  <nom>Mansouri</nom>
  <prénom>Youssef</prénom>
  <date_de_recrutement>2024-09-01</date_de_recrutement>
</employer>
```

`date_de_recrutement` est un `xsd:date` : format **`AAAA-MM-JJ`** obligatoire. Avec `01/09/2024` :

```
Element 'date_de_recrutement': '01/09/2024' is not a valid value of the atomic type 'xs:date'.
```

**b.** `xmllint --noout --schema employe.xsd employe.xml` → `employe.xml validates`.

> [!warning] L'encodage déclaré doit être celui du fichier
> Le schéma déclare `encoding="ISO-8859-1"`, mais les éditeurs actuels enregistrent en **UTF-8**. L'élément `prénom` est alors mal décodé et le schéma ne compile même pas :
> ```
> Element '{http://www.w3.org/2001/XMLSchema}element', attribute 'name': 'prÃ©nom' is not a valid value of the atomic type 'xs:NCName'.
> ```
> Solution : écrire `encoding="UTF-8"` dans la déclaration (ou enregistrer réellement le fichier en ISO-8859-1). Les deux versions ont été testées : elles valident.

### Exercice 8 : personne et enfants

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="personne">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="nom" type="xs:string"/>
        <xs:element name="prenom" type="xs:string"/>
        <xs:element name="dateNaissance" type="xs:date"/>
        <xs:element name="ville" type="xs:string"/>
        <xs:element name="sexe">
          <xs:simpleType>
            <xs:restriction base="xs:string">
              <xs:enumeration value="Homme"/>
              <xs:enumeration value="Femme"/>
            </xs:restriction>
          </xs:simpleType>
        </xs:element>
        <xs:element name="enfants" minOccurs="0">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="nom_complet" type="xs:string" maxOccurs="unbounded"/>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
```

`sexe` limité à `Homme` / `Femme` par énumération, `dateNaissance` en `xs:date`, `enfants` facultatif (une personne peut ne pas en avoir) et au moins un `nom_complet` quand il est présent.

## Partie 3

### Exercice 9 : livre

> [!warning] Le document de l'énoncé est mal formé
> Le commentaire `<!-- fichier livre.xml -->` est **avant** la déclaration `<?xml ...?>` : `XML declaration allowed only at the start of the document`. On le déplace après.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="livre">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="titre" type="xs:string"/>
        <xs:element name="auteur" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="nom" type="xs:string"/>
              <xs:element name="prenom" type="xs:string"/>
            </xs:sequence>
            <xs:attribute name="idAuteur" type="xs:positiveInteger" use="optional"/>
          </xs:complexType>
        </xs:element>
        <xs:element name="presentation" type="xs:string"/>
        <xs:element name="resume" type="xs:string"/>
      </xs:sequence>
      <xs:attribute name="isbn" use="required">
        <xs:simpleType>
          <xs:restriction base="xs:string">
            <xs:pattern value="[0-9]{3}-[0-9]-[0-9]{4}-[0-9]{4}-[0-9]"/>
          </xs:restriction>
        </xs:simpleType>
      </xs:attribute>
    </xs:complexType>
  </xs:element>
</xs:schema>
```

| Observation dans le document | Déclaration |
|---|---|
| `isbn` sur la racine | attribut **obligatoire**, format ISBN-13 `978-2-7177-2113-4` vérifié par `pattern` |
| trois `auteur`, dont un seul avec `idAuteur` | `maxOccurs="unbounded"` ; `idAuteur` **facultatif** |
| `<resume/>` vide | `xs:string` accepte la chaîne vide |

Document corrigé (`livre.xml validates`) :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- fichier livre.xml -->
<livre xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:noNamespaceSchemaLocation="livre.xsd" isbn="978-2-7177-2113-4">
  <titre>XSD pour les nuls</titre>
  <auteur>
    <nom>Dupond</nom>
    <prenom>Jean</prenom>
  </auteur>
  <auteur idAuteur="1">
    <nom>Dupont</nom>
    <prenom>Fred</prenom>
  </auteur>
  <auteur>
    <nom>Paul</nom>
    <prenom>Machin</prenom>
  </auteur>
  <presentation>Ce livre est une introduction au schéma XSD</presentation>
  <resume/>
</livre>
```

### Exercice 10 : courrier

Le schéma reprend le courrier du [[Correction TP 1 - Technologies XML#Exercice 4 : le courrier|TP 1, exercice 4]].

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">

  <xs:element name="courrier">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="lettre" type="lettreType" maxOccurs="unbounded"/>
      </xs:sequence>
      <xs:attribute name="code" type="codeType" use="required"/>
    </xs:complexType>
  </xs:element>

  <xs:complexType name="lettreType">
    <xs:sequence>
      <xs:element name="expedition" type="adresseType"/>
      <xs:element name="destination" type="adresseDestinationType"/>
      <xs:element name="ville" type="xs:string"/>
      <xs:element name="date" type="dateType"/>
      <xs:element name="objet" type="xs:string"/>
      <xs:element name="corps">
        <xs:complexType>
          <xs:sequence>
            <xs:element name="paragraphe" type="xs:string" maxOccurs="unbounded"/>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="adresseType">
    <xs:sequence>
      <xs:element name="nom">
        <xs:complexType>
          <xs:simpleContent>
            <xs:extension base="xs:string">
              <xs:attribute name="civilite" type="civiliteType" use="required"/>
            </xs:extension>
          </xs:simpleContent>
        </xs:complexType>
      </xs:element>
      <xs:element name="numero" type="xs:positiveInteger"/>
      <xs:element name="appartement" type="xs:string" minOccurs="0"/>
      <xs:element name="rue" type="xs:string"/>
      <xs:element name="codePostal" type="codePostalType"/>
      <xs:element name="ville" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="adresseDestinationType">
    <xs:complexContent>
      <xs:extension base="adresseType">
        <xs:sequence>
          <xs:element name="pays" type="xs:string"/>
        </xs:sequence>
      </xs:extension>
    </xs:complexContent>
  </xs:complexType>

  <xs:complexType name="dateType">
    <xs:sequence>
      <xs:element name="jour" type="jourType"/>
      <xs:element name="mois" type="moisType"/>
      <xs:element name="annee" type="anneeType"/>
    </xs:sequence>
  </xs:complexType>

  <xs:simpleType name="codeType">
    <xs:restriction base="xs:string">
      <xs:pattern value="C..[0-9]"/>
    </xs:restriction>
  </xs:simpleType>

  <xs:simpleType name="civiliteType">
    <xs:restriction base="xs:string">
      <xs:enumeration value="M"/>
      <xs:enumeration value="Mme"/>
      <xs:enumeration value="Mlle"/>
    </xs:restriction>
  </xs:simpleType>

  <xs:simpleType name="codePostalType">
    <xs:restriction base="xs:string">
      <xs:pattern value="[0-9]{4}"/>
    </xs:restriction>
  </xs:simpleType>

  <xs:simpleType name="jourType">
    <xs:restriction base="xs:integer">
      <xs:minInclusive value="1"/>
      <xs:maxInclusive value="31"/>
    </xs:restriction>
  </xs:simpleType>

  <xs:simpleType name="moisType">
    <xs:restriction base="xs:string">
      <xs:enumeration value="janvier"/>
      <xs:enumeration value="février"/>
      <xs:enumeration value="mars"/>
      <xs:enumeration value="avril"/>
      <xs:enumeration value="mai"/>
      <xs:enumeration value="juin"/>
      <xs:enumeration value="juillet"/>
      <xs:enumeration value="août"/>
      <xs:enumeration value="septembre"/>
      <xs:enumeration value="octobre"/>
      <xs:enumeration value="novembre"/>
      <xs:enumeration value="décembre"/>
    </xs:restriction>
  </xs:simpleType>

  <xs:simpleType name="anneeType">
    <xs:restriction base="xs:integer">
      <xs:minExclusive value="2000"/>
      <xs:totalDigits value="4"/>
    </xs:restriction>
  </xs:simpleType>
</xs:schema>
```

| Contrainte | Solution |
|---|---|
| code : `C` + 2 caractères + 1 chiffre | `pattern` `C..[0-9]` (le `.` accepte n'importe quel caractère) |
| civilité M, Mme ou Mlle **devant le nom** | attribut `civilite` de `nom`, par `simpleContent` : du texte **et** un attribut |
| numéro, rue, code postal, ville obligatoires ; appartement optionnel | `appartement` en `minOccurs="0"` |
| code postal de 4 chiffres | `pattern` `[0-9]{4}` |
| destination = expédition + pays | **`xs:extension`** de `adresseType` : on réutilise le type en ajoutant `pays` |
| jour de 1 à 31 | `integer` + `minInclusive` 1, `maxInclusive` 31 |
| mois valide | `enumeration` des 12 mois |
| année > 2000, 4 chiffres au plus | `minExclusive` 2000 + `totalDigits` 4 |
| plusieurs lettres, plusieurs paragraphes | `maxOccurs="unbounded"` |

**2. Validation** : `xmllint --noout --schema courrier.xsd courrier.xml` → `courrier.xml validates`. Avec un code `X12`, un jour `32` et une année `1999` :

```
Element 'courrier', attribute 'code': [facet 'pattern'] The value 'X12' is not accepted by the pattern 'C..[0-9]'.
Element 'jour': [facet 'maxInclusive'] The value '32' is greater than the maximum value allowed ('31').
Element 'annee': [facet 'minExclusive'] The value '1999' must be greater than '2000'.
```
