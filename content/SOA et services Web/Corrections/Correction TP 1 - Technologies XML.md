---
date: 2026-11-08
ordre: 1
tags: [soa, xml, tp, correction, bien-forme, arbre, xsd, key, keyref, id, idref]
---
# Correction TP 1 — Technologies XML

Énoncé : [[TP 1 - Technologies XML.pdf]] · Raouia Fredj · cours : [[Résumé - Chapitre 2 - Le langage XML]] et [[Résumé - Chapitre 3 - Schéma XML]] · suite : [[Correction TP 2 - Schéma XML (XSD)]]

> [!note] Ce qui a été vérifié
> Chaque document de cette correction a été passé à `xmllint --noout` (bien formé) ; les schémas des exercices 9 et 16 ont été validés avec `xmllint --schema`, y compris les cas d'erreur montrés. Les exercices de conception (6, 7, 8, 13, 14, 15) ont **plusieurs bonnes réponses** : ce qui compte est de justifier ses choix.

## Rappel : les définitions

| Terme | Définition |
|---|---|
| **XML** | *eXtensible Markup Language* : **méta-langage** du W3C (1996, Jon Bosak) pour **décrire et échanger des données structurées** ; sous-ensemble de SGML ; on y définit ses propres balises |
| **DTD** | *Document Type Definition* : grammaire d'un vocabulaire XML (éléments autorisés, imbrications, attributs), avec une **syntaxe propre**, non XML |
| **XSD** | *XML Schema Definition* : grammaire **écrite en XML**, avec des **types** (entier, date…), des occurrences et des contraintes |
| **XSL** | *eXtensible Stylesheet Language* : feuilles de style pour **transformer** (XSLT) ou **présenter** un document XML (en HTML par exemple) |
| **document XML** | texte composé d'un **prologue** et d'un **élément racine** unique qui contient tous les autres |
| **élément** | balise ouvrante + contenu + balise fermante : `<nom>Ali</nom>` |
| **élément vide** | sans contenu : `<note/>` ou `<note></note>` |
| **attribut** | paire `nom="valeur"` dans la balise ouvrante : `<livre lang="fr">` |
| **bien formé** | respecte la **syntaxe** XML (une racine, balises fermées et bien imbriquées, valeurs entre guillemets…) |
| **valide** | bien formé **et** conforme à une **DTD** ou un **schéma** |

**Pourquoi une structure d'arbre ?** Il y a **une seule racine**, et les balises doivent être **correctement imbriquées** (on ferme dans l'ordre inverse de l'ouverture) : chaque élément est donc contenu dans **exactement un parent**. Les éléments forment des nœuds, leurs contenus des sous-arbres, le texte et les éléments vides des feuilles.

## Exercice 1 : le document des notes

**1. Non, il n'est pas bien formé.**

| Erreur | Règle violée |
|---|---|
| `date=3 janvier` | une valeur d'attribut est **entre guillemets** |
| `<to>Bob</To>` | XML **respecte la casse** : `to` ≠ `To` |
| un commentaire **dans** la balise ouvrante `<note date="5 janvier" <!-- ... --> >` | un commentaire ne se place **pas dans une balise** |
| `<from>Bob` sans `</from>` | toute balise ouvrante est **fermée** |
| `No problem & see you soon` | `&` est **interdit** dans le texte : `&amp;` |
| trois éléments `<note>` au premier niveau | **une seule racine** |

**2. Document corrigé** (bien formé selon `xmllint`) :

```xml
<?xml version="1.0"?>
<!-- this is a note -->
<notes>
  <note date="3 janvier">
    <to>Bob</to>
    <from>Alice</from>
    <heading>Reminder</heading>
    <body>Don't forget me this weekend!</body>
  </note>
  <note date="5 janvier">
    <!-- this is another note -->
    <to>Alice</to>
    <from>Bob</from>
    <body>No problem &amp; see you soon</body>
  </note>
  <note/>
</notes>
```

## Exercice 2 : de HTML à XML

**b.** `<H2>` affiche un **titre de niveau 2**, `<UL>` une **liste à puces** (non numérotée), `<I>` du texte en **italique**.

**c.** HTML sert à **présenter** des données (mise en forme pour l'affichage), pas à les décrire.

**d.** Ce sont les **auteurs** du livre.

**e.** **Paris** est le **lieu d'édition** et **1999** l'**année d'édition**.

**f.** Fichier complété et corrigé (prologue ajouté, balises complétées, espaces parasites `</ PRENOM >` et `< ... >` supprimés, coquille « Jean-Chrisotophe » corrigée) :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<BIBLIO module="XML">
  <LIVRE lang="fr">
    <AUTEUR>
      <NOM>Bernadac</NOM>
      <PRENOM>Jean-Christophe</PRENOM>
    </AUTEUR>
    <AUTEUR>
      <NOM>Knab</NOM>
      <PRENOM>François</PRENOM>
    </AUTEUR>
    <TITRE>Construire une application XML</TITRE>
    <EDITEUR>
      <NOM>Eyrolles</NOM>
      <LIEU>Paris</LIEU>
    </EDITEUR>
    <DATEEDITION>1999</DATEEDITION>
  </LIVRE>
</BIBLIO>
```

Le XML dit **ce qu'est** chaque donnée (nom, prénom, titre, éditeur, lieu, date) : un programme peut maintenant retrouver tous les livres d'Eyrolles ou tous les auteurs.

## Exercice 3 : le Monde

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Monde>
  <Continent>
    <nom>AFRIQUE</nom>
    <liste/>
  </Continent>
  <Continent>
    <nom>AMERIQUE</nom>
    <liste/>
  </Continent>
  <Continent>
    <nom>ASIE</nom>
    <liste>
      <pays/>
      <pays/>
      <pays>
        <nom>Japon</nom>
        <capitale>Tokyo</capitale>
        <monnaie>Yen</monnaie>
      </pays>
      <pays/>
      <pays/>
    </liste>
  </Continent>
  <Continent>
    <nom>EUROPE</nom>
    <liste/>
  </Continent>
  <Continent>
    <nom>OCEANIE</nom>
    <liste/>
  </Continent>
</Monde>
```

Les pays non détaillés sont laissés vides (`<pays/>`), comme le permet l'énoncé.

## Exercice 4 : le courrier

Choix : le **code** du courrier et la **civilité** sont des **attributs** (des identifiants courts, pas du contenu) ; tout le reste est en éléments. L'appartement est absent de la première adresse d'expédition (optionnel), le pays n'apparaît que dans les adresses de destination.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<courrier code="CAB7" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="courrier.xsd">
  <lettre>
    <expedition>
      <nom civilite="M">Sami Ben Ali</nom>
      <numero>12</numero>
      <rue>Rue de la République</rue>
      <codePostal>5100</codePostal>
      <ville>Mahdia</ville>
    </expedition>
    <destination>
      <nom civilite="Mme">Amel Trabelsi</nom>
      <numero>4</numero>
      <appartement>B3</appartement>
      <rue>Avenue Habib Bourguiba</rue>
      <codePostal>1000</codePostal>
      <ville>Tunis</ville>
      <pays>Tunisie</pays>
    </destination>
    <ville>Mahdia</ville>
    <date>
      <jour>8</jour>
      <mois>novembre</mois>
      <annee>2026</annee>
    </date>
    <objet>Demande de stage</objet>
    <corps>
      <paragraphe>Madame,</paragraphe>
      <paragraphe>Je me permets de vous adresser ma candidature pour un stage d'été.</paragraphe>
      <paragraphe>Veuillez agréer, Madame, mes salutations distinguées.</paragraphe>
    </corps>
  </lettre>
  <lettre>
    <expedition>
      <nom civilite="Mlle">Sara Gharbi</nom>
      <numero>7</numero>
      <rue>Rue Ibn Khaldoun</rue>
      <codePostal>4000</codePostal>
      <ville>Sousse</ville>
    </expedition>
    <destination>
      <nom civilite="M">Karim Mansouri</nom>
      <numero>30</numero>
      <rue>Rue de Marseille</rue>
      <codePostal>7500</codePostal>
      <ville>Paris</ville>
      <pays>France</pays>
    </destination>
    <ville>Sousse</ville>
    <date>
      <jour>15</jour>
      <mois>octobre</mois>
      <annee>2026</annee>
    </date>
    <objet>Invitation</objet>
    <corps>
      <paragraphe>Cher Karim,</paragraphe>
      <paragraphe>Je t'invite à la soutenance de mon projet de fin d'études.</paragraphe>
    </corps>
  </lettre>
</courrier>
```

Le [[Correction TP 2 - Schéma XML (XSD)#Exercice 10 : courrier|TP 2, exercice 10]] écrit le schéma de ce document et vérifie les contraintes (code `C..[0-9]`, jour de 1 à 31, mois valide, année > 2000).

## Exercice 5 : la liste de tâches

**Réponse : B.**

| Choix | Verdict |
|---|---|
| **A** | trois éléments `tasklist` au premier niveau : **plusieurs racines** (`Extra content at the end of the document`) |
| **B** | **une racine**, trois `task` avec un attribut `name` entre guillemets : **bien formé** et conforme |
| **C** | valeurs d'attributs **sans guillemets** (`AttValue: " or ' expected`) |
| **D** | la dernière ligne `<tasklist>` **ouvre** au lieu de fermer (`</tasklist>`) : racine jamais fermée |

## Exercice 6 : des articles

Une proposition :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<article>
  <titre>Les services web REST</titre>
  <texte>
    <paragraphe>Une API <important>RESTful</important> utilise chaque méthode HTTP pour son sens <ref cible="b1"/>.</paragraphe>
    <paragraphe>Le format <important>JSON</important> est le plus utilisé <ref cible="b2"/>.</paragraphe>
  </texte>
  <bibliographie>
    <ouvrage id="b1">
      <titre>RESTful Web Services</titre>
      <auteur>Leonard Richardson</auteur>
      <auteur>Sam Ruby</auteur>
      <dateParution>2007</dateParution>
      <editeur>O'Reilly</editeur>
    </ouvrage>
    <site id="b2">
      <nom>JSON.org</nom>
      <url>https://www.json.org</url>
    </site>
  </bibliographie>
</article>
```

**Possibilités de codage discutées** :

- **contenu mixte** pour les paragraphes : du texte entrecoupé d'éléments `<important>` et `<ref>`, au lieu de découper le paragraphe en morceaux ;
- les références bibliographiques dans le texte **pointent** vers les entrées par un **identifiant** (`<ref cible="b1"/>`), sans recopier l'entrée ;
- « soit un site, soit un ouvrage » : deux **éléments différents** (`<site>`, `<ouvrage>`), ce qui correspond à un `xs:choice` dans un schéma ; l'autre option, un seul élément `<entree type="site|ouvrage">`, oblige à rendre facultatifs des champs qui ne le sont pas ;
- plusieurs auteurs : un élément `<auteur>` **répété** plutôt qu'une chaîne « A et B ».

## Exercice 7 : les brèves

```xml
<?xml version="1.0" encoding="UTF-8"?>
<breves>
  <breve theme="sport" xml:lang="fr" date="2026-11-08">
    <titre>Victoire de l'équipe nationale</titre>
    <texte>L'équipe s'impose 2 à 0 en match amical.</texte>
    <photo src="images/match.jpg" legende="Le deuxième but"/>
    <lien url="https://exemple.tn/match">Le résumé complet du match</lien>
  </breve>
  <breve theme="bourse" xml:lang="en" date="2026-11-07">
    <titre>Markets close higher</titre>
    <texte>The main index gained 1.2% on Friday.</texte>
  </breve>
</breves>
```

**La langue** : l'attribut standard **`xml:lang`** (valeurs `fr`, `en`), prévu par XML et compris par les outils ; c'est une **métadonnée** de la brève, donc un attribut. Autre option : regrouper par langue (`<breves lang="fr">…</breves>`), utile seulement si on affiche une langue à la fois.

**Les thèmes** : trois codages possibles.

| Codage | Exemple | Avantage | Inconvénient |
|---|---|---|---|
| attribut | `<breve theme="sport">` | une brève = **un seul** thème garanti ; filtrage facile ; un schéma limite les valeurs par énumération | — |
| regroupement | `<theme nom="sport"><breve>…</breve></theme>` | affichage par thème direct | une brève ne peut être déplacée sans changer de parent |
| élément par thème | `<sport><breve>…</breve></sport>` | lisible | ajouter un thème change la **structure** du vocabulaire |

L'attribut est le plus adapté : « chaque brève correspond à un **unique** thème ». La **photo** est facultative (élément vide avec `src`), les **liens** sont répétables avec la phrase de résumé comme contenu.

## Exercice 8 : la salle de concert

```xml
<?xml version="1.0" encoding="UTF-8"?>
<salle>
  <nom>Théâtre de l'Opéra</nom>
  <adresse>Avenue Habib Bourguiba, Tunis</adresse>
  <telephone>+216 71 000 000</telephone>
  <presentation>Construit en <annee>1902</annee>, le théâtre a accueilli <refArtiste ref="a1"/> lors du <refConcert ref="c1"/>.</presentation>
  <artistes>
    <artiste id="a1">
      <nom>Bouchnak</nom><prenom>Lotfi</prenom>
      <dateNaissance>1952-05-21</dateNaissance>
      <site>https://exemple.tn/lotfi</site>
      <biographie>Chanteur et compositeur, actif depuis <annee>1970</annee>.</biographie>
    </artiste>
    <artiste id="a2">
      <nom>Ben Mahmoud</nom><prenom>Amina</prenom>
      <dateNaissance>1990-02-11</dateNaissance>
      <photo>images/amina.jpg</photo>
      <biographie>Jeune interprète révélée en <annee>2015</annee>.</biographie>
    </artiste>
  </artistes>
  <chansons>
    <chanson id="s1">
      <titre>Ana Mouwaten</titre>
      <auteur>Adam Fethi</auteur>
      <compositeur>Lotfi Bouchnak</compositeur>
      <texte>Créée en <annee>2011</annee>, reprise par <refArtiste ref="a2"/>.</texte>
    </chanson>
  </chansons>
  <concerts>
    <concert id="c1">
      <titre>Soirée caritative</titre>
      <date>2026-12-20</date>
      <description>Plusieurs chanteurs se succèdent au profit d'une association.</description>
      <tourDeChant>
        <interpretation chanson="s1"><interprete ref="a1"/><interprete ref="a2"/></interpretation>
      </tourDeChant>
    </concert>
  </concerts>
</salle>
```

**Choix discutés** :

- **artistes** et **chansons** sont décrits **une seule fois**, dans leurs listes, avec un `id` ; les concerts et les textes les **référencent** (`ref="a1"`, `chanson="s1"`) : pas de redondance quand un artiste chante dans plusieurs concerts ;
- un tour de chant est une **liste d'interprétations** ; chaque interprétation peut avoir **plusieurs** interprètes (duos, soirées caritatives) ;
- dans les textes (présentation, biographie, historique), **contenu mixte** : `<annee>` et les références `<refArtiste>`, `<refConcert>` sont distinguées du texte ;
- photo et site web sont des éléments **facultatifs**.

## Exercice 9 : bandes dessinées (XML Schema avec key/keyref)

Les personnes sont décrites une fois (`personnes/personne` avec un `id`) ; les BD y font référence par `auteur/@ref` et `illustrateur/@ref`. **`xs:key`** déclare l'identifiant unique, **`xs:keyref`** oblige chaque référence à désigner une clé existante.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">

  <xs:element name="bibliotheque">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="personnes">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="personne" type="personneType" maxOccurs="unbounded"/>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
        <xs:element name="serie" type="serieType" maxOccurs="unbounded"/>
      </xs:sequence>
    </xs:complexType>
    <xs:key name="clePersonne">
      <xs:selector xpath="personnes/personne"/>
      <xs:field xpath="@id"/>
    </xs:key>
    <xs:keyref name="refAuteur" refer="clePersonne">
      <xs:selector xpath="serie/bd/auteur"/>
      <xs:field xpath="@ref"/>
    </xs:keyref>
    <xs:keyref name="refIllustrateur" refer="clePersonne">
      <xs:selector xpath="serie/bd/illustrateur"/>
      <xs:field xpath="@ref"/>
    </xs:keyref>
  </xs:element>

  <xs:complexType name="personneType">
    <xs:sequence>
      <xs:element name="nom" type="nomType"/>
      <xs:element name="prenom" type="nomType"/>
    </xs:sequence>
    <xs:attribute name="id" type="xs:string" use="required"/>
  </xs:complexType>

  <xs:complexType name="serieType">
    <xs:sequence>
      <xs:element name="titre" type="nomType"/>
      <xs:element name="bd" type="bdType" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="bdType">
    <xs:sequence>
      <xs:element name="sousTitre" type="nomType" minOccurs="0"/>
      <xs:element name="auteur" type="refType" maxOccurs="unbounded"/>
      <xs:element name="illustrateur" type="refType"/>
      <xs:element name="resume" type="resumeType"/>
      <xs:element name="dateSortie" type="xs:date"/>
      <xs:element name="couverture" type="xs:anyURI" minOccurs="0"/>
    </xs:sequence>
    <xs:attribute name="numero" type="xs:positiveInteger" use="optional"/>
  </xs:complexType>

  <xs:complexType name="refType">
    <xs:attribute name="ref" type="xs:string" use="required"/>
  </xs:complexType>

  <xs:complexType name="resumeType" mixed="true">
    <xs:sequence>
      <xs:element name="personnage" type="xs:string" minOccurs="0" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <xs:simpleType name="nomType">
    <xs:restriction base="xs:string">
      <xs:minLength value="1"/>
      <xs:maxLength value="100"/>
    </xs:restriction>
  </xs:simpleType>
</xs:schema>
```

Document valide :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bibliotheque xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="bd.xsd">
  <personnes>
    <personne id="p1"><nom>Goscinny</nom><prenom>René</prenom></personne>
    <personne id="p2"><nom>Uderzo</nom><prenom>Albert</prenom></personne>
    <personne id="p3"><nom>Sattouf</nom><prenom>Riad</prenom></personne>
  </personnes>
  <serie>
    <titre>Astérix</titre>
    <bd numero="1">
      <auteur ref="p1"/>
      <illustrateur ref="p2"/>
      <resume>Le village de <personnage>Astérix</personnage> et <personnage>Obélix</personnage> résiste à l'envahisseur romain.</resume>
      <dateSortie>1961-10-29</dateSortie>
    </bd>
    <bd numero="2">
      <sousTitre>La Serpe d'or</sousTitre>
      <auteur ref="p1"/>
      <illustrateur ref="p2"/>
      <resume><personnage>Panoramix</personnage> a cassé sa serpe d'or.</resume>
      <dateSortie>1962-01-01</dateSortie>
      <couverture>images/serpe-dor.jpg</couverture>
    </bd>
  </serie>
  <serie>
    <titre>L'Arabe du futur</titre>
    <bd>
      <auteur ref="p3"/>
      <illustrateur ref="p3"/>
      <resume>L'enfance de <personnage>Riad</personnage> entre la Libye, la Syrie et la Bretagne.</resume>
      <dateSortie>2014-05-15</dateSortie>
    </bd>
  </serie>
</bibliotheque>
```

| Contrainte de l'énoncé | Dans le schéma |
|---|---|
| une série a un titre, une ou plusieurs BD | `serieType` : `titre` puis `bd` `maxOccurs="unbounded"` |
| auteur(s), illustrateur, résumé, date de sortie | `auteur` répétable, `illustrateur`, `resume`, `dateSortie` en **`xs:date`** |
| couverture, sous-titre facultatifs | `minOccurs="0"` ; la couverture est un chemin d'image (`xs:anyURI`) |
| numéro dans la série | attribut `numero` facultatif, `xs:positiveInteger` |
| personnes différentes selon les BD, une personne auteur **et** illustrateur | références libres : Riad Sattouf (`p3`) est les deux |
| références sans redondance | `xs:key` + deux `xs:keyref` |
| résumé en contenu mixte | `resumeType` avec **`mixed="true"`** et des `<personnage>` |
| données typées | dates, entiers positifs, longueurs de chaînes (`nomType` : 1 à 100 caractères) |

Si une BD référence une personne inexistante (`<illustrateur ref="p9"/>`), `xmllint` refuse le document :

```
Element 'illustrateur': No match found for key-sequence ['p9'] of keyref 'refIllustrateur'.
```

## Exercice 10 : le catalogue

**1. Les erreurs**

| Ligne | Erreur | Règle violée |
|---|---|---|
| `<produit ref=P01 ...>` | valeur sans guillemets | valeurs d'attributs **entre guillemets** |
| `<nom>Stylo</Nom>` | `nom` fermé par `Nom` | **casse** respectée |
| `prix="3,5" prix="4"` | attribut `prix` **deux fois** | un attribut est **unique** dans un élément *(et `3,5` n'est pas un nombre XML Schema : séparateur décimal `.`)* |
| `Cahier & classeur` | `&` dans le texte | `&amp;` |
| `<description>Format <b>A4</description></b>` | balises **entrelacées** | fermer dans l'ordre inverse : `</b></description>` |
| `<catalogue/>` après `</catalogue>` | **deuxième racine** | une seule racine |

**2. Document corrigé** :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalogue>
  <produit ref="P01" prix="12.5">
    <nom>Stylo</nom>
    <stock>40</stock>
  </produit>
  <produit ref="P02" prix="3.5">
    <nom>Cahier &amp; classeur</nom>
    <description>Format <b>A4</b></description>
  </produit>
  <produit ref="P03"/>
</catalogue>
```

**3. Arbre** :

```
catalogue
├── produit (ref="P01", prix="12.5")
│   ├── nom : Stylo
│   └── stock : 40
├── produit (ref="P02", prix="3.5")
│   ├── nom : Cahier & classeur
│   └── description : « Format » + b : A4
└── produit (ref="P03")      ← élément vide
```

## Exercice 11 : l'université

**1.**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<universite>
  <departement code="INFO">
    <nom>Informatique</nom>
    <enseignant>
      <nom>Fredj</nom>
      <grade>Maitre-assistante</grade>
    </enseignant>
    <etudiant id="E1">
      <nom>Ben Ali</nom>
      <prenom>Sami</prenom>
      <moyenne>14.25</moyenne>
    </etudiant>
  </departement>
  <departement code="GEST">
    <nom>Gestion</nom>
    <etudiant id="E2">
      <nom>Trabelsi</nom>
      <prenom>Amel</prenom>
      <moyenne>12.75</moyenne>
    </etudiant>
  </departement>
</universite>
```

**2.** La **racine** est `universite`. Les **feuilles** sont les éléments qui ne contiennent que du texte : `nom` (des départements, de l'enseignant, des étudiants), `grade`, `prenom`, `moyenne`.

**3.** `code` et `id` sont des **identifiants** : courts, uniques, sans structure interne, ils **qualifient** l'élément plutôt qu'ils n'en sont le contenu. En attribut, ils se déclarent en `xs:ID` ou servent de clé (`xs:key`), et on ne risque pas d'en avoir deux. À l'inverse, une donnée qui peut avoir une **structure** ou des **répétitions** (plusieurs prénoms, un nom composé) doit rester un élément.

## Exercice 12 : QCM de la bibliothèque

**Réponse : A.**

| Choix | Verdict |
|---|---|
| **A** | une racine, deux `livre` avec `isbn` entre guillemets et un `titre` : **correct** |
| **B** | `isbn=111` sans guillemets |
| **C** | `<titre>XML</livre></titre>` : balises **entrelacées** |
| **D** | **deux racines** `bibliotheque` |

## Exercice 12 bis : éléments vides et noms

**1.** `<separateur style="trait"/>` et `<separateur style="trait"></separateur>`.

**2.** Le document `<a><b/><b></b><b> </b></a>` est **bien formé**. Les deux premiers `b` sont **vides** ; le troisième contient **un espace** : c'est un nœud texte, il n'est donc pas vide au sens strict (même si un schéma peut ignorer ces espaces).

**3.**

| Nom | Valide ? | Raison |
|---|---|---|
| `<1note>` | **non** | un nom ne commence **pas par un chiffre** |
| `<note-1>` | **oui** | tirets et chiffres autorisés **après** le premier caractère |
| `<Note 1>` | **non** | un nom ne contient **pas d'espace** : le parseur lit l'élément `Note` suivi d'un « attribut » `1` invalide |
| `<_note>` | **oui** | le **tiret bas** est autorisé en premier caractère |

## Exercice 13 : menu d'un restaurant

```xml
<?xml version="1.0" encoding="UTF-8"?>
<restaurant>
  <nom>Dar Mahdia</nom>
  <adresse>Corniche, 5100 Mahdia</adresse>
  <telephone>+216 73 000 000</telephone>
  <carte>
    <rubrique type="entrees">
      <plat vegetarien="true">
        <nom>Salade méchouia</nom>
        <prix devise="TND">9.500</prix>
        <description>Poivrons et <ingredient>tomates grillées</ingredient>, huile d'olive.</description>
      </plat>
      <plat epice="true">
        <nom>Brik à l'œuf</nom>
        <prix devise="TND">6.000</prix>
        <description>Feuille de malsouka, <ingredient>œuf</ingredient> et <ingredient>thon</ingredient>.</description>
        <allergenes><allergene>œuf</allergene><allergene>gluten</allergene><allergene>poisson</allergene></allergenes>
      </plat>
    </rubrique>
    <rubrique type="plats">
      <plat epice="true">
        <nom>Couscous au poisson</nom>
        <prix devise="TND">28.000</prix>
        <description>Semoule et <ingredient>mérou</ingredient> à la sauce harissa.</description>
        <allergenes><allergene>gluten</allergene><allergene>poisson</allergene></allergenes>
      </plat>
      <plat vegetarien="true">
        <nom>Ojja aux légumes</nom>
        <prix devise="TND">15.000</prix>
        <description>Œufs pochés dans une sauce <ingredient>tomate</ingredient> et <ingredient>poivron</ingredient>.</description>
        <allergenes><allergene>œuf</allergene></allergenes>
      </plat>
    </rubrique>
    <rubrique type="desserts">
      <plat vegetarien="true">
        <nom>Assida zgougou</nom>
        <prix devise="TND">8.000</prix>
        <description>Crème de <ingredient>pin d'Alep</ingredient>, fruits secs.</description>
        <allergenes><allergene>fruits à coque</allergene><allergene>lait</allergene></allergenes>
      </plat>
      <plat vegetarien="true">
        <nom>Makroudh</nom>
        <prix devise="TND">5.000</prix>
        <description>Semoule et <ingredient>pâte de dattes</ingredient>, miel.</description>
        <allergenes><allergene>gluten</allergene></allergenes>
      </plat>
    </rubrique>
    <rubrique type="boissons">
      <plat vegetarien="true">
        <nom>Thé aux pignons</nom>
        <prix devise="TND">4.000</prix>
        <description>Thé vert à la menthe et <ingredient>pignons</ingredient>.</description>
        <allergenes><allergene>fruits à coque</allergene></allergenes>
      </plat>
      <plat vegetarien="true">
        <nom>Citronnade</nom>
        <prix devise="TND">3.500</prix>
        <description><ingredient>Citron</ingredient> pressé et fleur d'oranger.</description>
      </plat>
    </rubrique>
  </carte>
</restaurant>
```

**Élément ou attribut ?**

| Donnée | Choix | Raison |
|---|---|---|
| **prix** | élément | c'est **la** donnée principale du plat |
| **devise** | attribut de `prix` | une **métadonnée** qui qualifie la valeur (unité) |
| **végétarien**, **épicé** | attributs booléens | des **marqueurs** oui/non, sans structure |
| **allergènes** | éléments dans une liste | **plusieurs** valeurs possibles : un attribut ne peut contenir qu'une valeur simple |
| **ingrédients mis en évidence** | éléments dans un contenu mixte | ils sont **dans** le texte de la description |
| **rubrique** | attribut `type` | une valeur d'une liste fixe (entrées, plats, desserts, boissons) |

## Exercice 14 : emploi du temps

**1.**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<emploiDuTemps>
  <classe nom="GLSI-D" niveau="3" semestre="1"/>
  <enseignants>
    <enseignant id="ens1"><nom>Aloulou</nom><prenom>Hamdi</prenom></enseignant>
    <enseignant id="ens2"><nom>Fredj</nom><prenom>Raouia</prenom></enseignant>
  </enseignants>
  <semaine>
    <jour nom="lundi">
      <seance debut="08:30" fin="10:00" type="cours" enseignant="ens1">
        <matiere>SOA</matiere>
        <salle>A12</salle>
      </seance>
      <seance debut="10:15" fin="11:45" type="TP" enseignant="ens2">
        <matiere>SOA</matiere>
        <salle>Labo 3</salle>
      </seance>
    </jour>
    <jour nom="mardi">
      <seance debut="08:30" fin="10:00" type="TD" enseignant="ens2">
        <matiere>XML</matiere>
        <salle>B04</salle>
        <annulation motif="Enseignante en mission"/>
      </seance>
      <seance debut="10:15" fin="11:45" type="cours" enseignant="ens1">
        <matiere>Services web REST</matiere>
        <salle>A12</salle>
      </seance>
    </jour>
  </semaine>
</emploiDuTemps>
```

**2. Références id/ref** : chaque enseignant est décrit **une seule fois** dans `enseignants`, avec un attribut `id` ; chaque séance porte un attribut `enseignant="ens1"` qui le **désigne**. Changer le grade ou l'e-mail d'un enseignant se fait à un seul endroit. Pour que l'outil **vérifie** les références :

- en DTD : `<!ATTLIST enseignant id ID #REQUIRED>` et `<!ATTLIST seance enseignant IDREF #REQUIRED>` ;
- en XML Schema : `xs:ID` / `xs:IDREF`, ou mieux `xs:key` / `xs:keyref` comme dans les exercices 9 et 16.

L'annulation est un élément **facultatif** avec son motif ; les horaires, le type (`cours`, `TD`, `TP`) et l'enseignant sont des attributs (valeurs simples).

## Exercice 15 : commandes en ligne

**1.**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<boutique>
  <clients>
    <client id="cl1">
      <nom>Sami Ben Ali</nom>
      <email>sami@exemple.tn</email>
      <adresseLivraison>12 rue de la République, 5100 Mahdia</adresseLivraison>
    </client>
  </clients>
  <commandes>
    <commande numero="CMD00001" date="2026-11-02" statut="livrée" client="cl1">
      <ligne reference="P01" quantite="3" prixUnitaire="12.50"/>
      <ligne reference="P07" quantite="1" prixUnitaire="45.00"/>
      <total devise="TND">82.50</total>
    </commande>
    <commande numero="CMD00002" date="2026-11-07" statut="en cours" client="cl1">
      <ligne reference="P02" quantite="2" prixUnitaire="3.50"/>
      <total devise="TND">7.00</total>
    </commande>
  </commandes>
</boutique>
```

**2. Le client dans chaque commande ou à part ?**

| | Client recopié dans chaque commande | Client à part + référence (`client="cl1"`) |
|---|---|---|
| Redondance | oui : nom, e-mail, adresse répétés | **non** |
| Mise à jour d'un e-mail | à faire dans **toutes** les commandes | à **un** endroit |
| Historique | garde l'**adresse de livraison du moment** | l'adresse actuelle peut avoir changé |

La solution la plus propre : le client **à part**, référencé par la commande, et l'**adresse de livraison** recopiée dans chaque commande si on veut garder la trace de l'adresse réellement utilisée. Le **total** est stocké pour ne pas le recalculer (82,50 = 3 × 12,50 + 45,00), au prix d'un risque d'incohérence si une ligne est modifiée sans le mettre à jour.

## Exercice 16 : gestion d'étudiants (XML Schema)

**1 et 2. Schéma** avec types restreints, `xs:key` et `xs:keyref` :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">

  <xs:simpleType name="idEtudiantType">
    <xs:restriction base="xs:string">
      <xs:pattern value="E[0-9]{4}"/>
    </xs:restriction>
  </xs:simpleType>

  <xs:simpleType name="codeModuleType">
    <xs:restriction base="xs:string">
      <xs:pattern value="[A-Z]{3}"/>
    </xs:restriction>
  </xs:simpleType>

  <xs:simpleType name="coefficientType">
    <xs:restriction base="xs:decimal">
      <xs:minInclusive value="0.5"/>
      <xs:maxInclusive value="5"/>
    </xs:restriction>
  </xs:simpleType>

  <xs:simpleType name="noteType">
    <xs:restriction base="xs:decimal">
      <xs:minInclusive value="0"/>
      <xs:maxInclusive value="20"/>
    </xs:restriction>
  </xs:simpleType>

  <xs:element name="scolarite">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="etudiants">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="etudiant" maxOccurs="unbounded">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="nom" type="xs:string"/>
                    <xs:element name="prenom" type="xs:string"/>
                    <xs:element name="dateNaissance" type="xs:date"/>
                    <xs:element name="email" type="xs:string"/>
                  </xs:sequence>
                  <xs:attribute name="id" type="idEtudiantType" use="required"/>
                </xs:complexType>
              </xs:element>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
        <xs:element name="modules">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="module" maxOccurs="unbounded">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="intitule" type="xs:string"/>
                    <xs:element name="coefficient" type="coefficientType"/>
                  </xs:sequence>
                  <xs:attribute name="code" type="codeModuleType" use="required"/>
                </xs:complexType>
              </xs:element>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
        <xs:element name="inscriptions">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="inscription" minOccurs="0" maxOccurs="unbounded">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="note" type="noteType" minOccurs="0"/>
                  </xs:sequence>
                  <xs:attribute name="etudiant" type="idEtudiantType" use="required"/>
                  <xs:attribute name="module" type="codeModuleType" use="required"/>
                </xs:complexType>
              </xs:element>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>

    <xs:key name="cleEtudiant">
      <xs:selector xpath="etudiants/etudiant"/>
      <xs:field xpath="@id"/>
    </xs:key>
    <xs:key name="cleModule">
      <xs:selector xpath="modules/module"/>
      <xs:field xpath="@code"/>
    </xs:key>
    <xs:keyref name="refEtudiant" refer="cleEtudiant">
      <xs:selector xpath="inscriptions/inscription"/>
      <xs:field xpath="@etudiant"/>
    </xs:keyref>
    <xs:keyref name="refModule" refer="cleModule">
      <xs:selector xpath="inscriptions/inscription"/>
      <xs:field xpath="@module"/>
    </xs:keyref>
    <xs:unique name="inscriptionUnique">
      <xs:selector xpath="inscriptions/inscription"/>
      <xs:field xpath="@etudiant"/>
      <xs:field xpath="@module"/>
    </xs:unique>
  </xs:element>
</xs:schema>
```

| Contrainte | Type |
|---|---|
| identifiant `E` + 4 chiffres | `idEtudiantType` : `pattern` `E[0-9]{4}` |
| code de module : 3 majuscules | `codeModuleType` : `pattern` `[A-Z]{3}` |
| coefficient entre 0,5 et 5 | `coefficientType` : `decimal`, `minInclusive` 0.5, `maxInclusive` 5 |
| note entre 0 et 20, optionnelle | `noteType`, élément `note` en `minOccurs="0"` |
| identifiants uniques | `xs:key` `cleEtudiant` et `cleModule` |
| inscriptions qui pointent vers un étudiant et un module existants | `xs:keyref` `refEtudiant` et `refModule` |
| *(en plus)* pas deux fois la même inscription | `xs:unique` sur le couple (étudiant, module) |

La relation **plusieurs-à-plusieurs** (un étudiant, plusieurs modules ; un module, plusieurs étudiants) passe par l'élément **`inscription`**, comme une table d'association en base de données.

**3. Document valide** (`scolarite.xml validates`) :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<scolarite xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="scolarite.xsd">
  <etudiants>
    <etudiant id="E0001">
      <nom>Ben Ali</nom>
      <prenom>Sami</prenom>
      <dateNaissance>2004-03-12</dateNaissance>
      <email>sami.benali@isima.tn</email>
    </etudiant>
    <etudiant id="E0002">
      <nom>Trabelsi</nom>
      <prenom>Amel</prenom>
      <dateNaissance>2004-09-30</dateNaissance>
      <email>amel.trabelsi@isima.tn</email>
    </etudiant>
  </etudiants>
  <modules>
    <module code="SOA">
      <intitule>Architecture SOA et services Web</intitule>
      <coefficient>2</coefficient>
    </module>
    <module code="BDD">
      <intitule>Big Data</intitule>
      <coefficient>1.5</coefficient>
    </module>
  </modules>
  <inscriptions>
    <inscription etudiant="E0001" module="SOA"><note>15.5</note></inscription>
    <inscription etudiant="E0001" module="BDD"/>
    <inscription etudiant="E0002" module="SOA"><note>12</note></inscription>
  </inscriptions>
</scolarite>
```

**Violations de clé** :

- deux étudiants avec `id="E0001"` :
  ```
  Element 'etudiant': Duplicate key-sequence ['E0001'] in key identity-constraint 'cleEtudiant'.
  ```
- une inscription vers un étudiant qui n'existe pas (`etudiant="E0003"`) :
  ```
  Element 'inscription': No match found for key-sequence ['E0003'] of keyref 'refEtudiant'.
  ```
