---
date: 2026-11-08
ordre: 1
tags: [virtualisation, docker, tp, correction, conteneurs, nginx, dockerfile, volumes, reseaux, docker-compose]
---
# Correction TP 1 — Virtualisation légère : containers Docker

Énoncé : [[TP 1 - Virtualisation légère - Containers Docker.pdf]] · M. Karim Ghammam · cours : [[Résumé - Chapitre 2 - Principes de la virtualisation (suite)#5. Conteneurs et machines virtuelles|conteneurs et VM]] · avant : [[Correction TP 0 - Virtualisation avec VMware Workstation Pro]] · suite : [[Correction TP 2 - Orchestration et Kubernetes]]

> [!abstract] Ce qu'on construit
> On installe Docker, on distingue **image** et **conteneur**, on publie un **Nginx** sur un port de la machine, on construit **sa propre image** avec un Dockerfile, on garde des données dans un **volume**, on fait communiquer des conteneurs sur un **réseau** personnalisé, puis on décrit le tout dans un fichier **Docker Compose**.

Toutes les commandes ont été exécutées avec Docker 29.9 et Compose v5.7 ; les sorties ci-dessous en sont extraites (identifiants et dates raccourcis).

## Étape 3 : installation

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io
sudo systemctl enable --now docker     # démarre le service et l'active au démarrage
docker --version
sudo systemctl status docker           # Active: active (running)
sudo usermod -aG docker $USER          # ajoute l'utilisateur au groupe docker
reboot                                 # la nouvelle appartenance au groupe est prise en compte à la reconnexion
sudo docker run --rm hello-world
```

`hello-world` affiche « **Hello from Docker! This message shows that your installation appears to be working correctly.** » puis détaille les 4 étapes : le client a contacté le démon, le démon a **téléchargé** l'image depuis Docker Hub, a **créé un conteneur** qui a produit ce message, puis l'a **renvoyé** au client. `--rm` supprime le conteneur à la fin.

Après `usermod` et la reconnexion, `sudo` n'est plus nécessaire devant `docker` : `docker ps` fonctionne directement.

## Étape 4 : images

```sh
sudo docker pull ubuntu:24.04
sudo docker pull nginx:latest
sudo docker images
```

```
REPOSITORY   TAG       IMAGE ID       SIZE
nginx        latest    ...            163MB
ubuntu       24.04     d9b8c34d61a9   78.2MB
```

| | Image | Conteneur |
|---|---|---|
| Nature | **modèle en lecture seule** (couches de fichiers + configuration) | **instance en cours d'exécution** (ou arrêtée) d'une image |
| Relation | une image → plusieurs conteneurs | créé avec `docker run` / `docker create` |
| Modifiable | non (on en construit une nouvelle) | oui : une **couche en écriture** s'ajoute au-dessus de l'image, perdue quand on supprime le conteneur |
| Analogie | une **classe** | un **objet** |

L'image `ubuntu:24.04` ne pèse que 78 Mo : elle ne contient **pas de noyau**, le conteneur utilise celui de l'hôte.

## Étape 5 : conteneur Ubuntu interactif

```sh
sudo docker run -it --name mon_ubuntu ubuntu:24.04 bash
cat /etc/os-release     # PRETTY_NAME="Ubuntu 24.04.5 LTS"
hostname                # 146775df530f : l'ID court du conteneur
apt update && apt install -y curl iputils-ping   # l'image est minimale : ni curl ni ping
exit                    # bash se termine → le conteneur s'arrête
```

| Commande | Effet |
|---|---|
| `docker ps` | conteneurs **en cours d'exécution** |
| `docker ps -a` | **tous** les conteneurs, y compris arrêtés (`mon_ubuntu` : `Exited (0)`) |
| `docker start -ai mon_ubuntu` | **redémarre** le conteneur existant et s'y rattache (`-a`) en interactif (`-i`) ; curl est toujours installé |
| `docker stop mon_ubuntu` | **arrête** proprement (SIGTERM, puis SIGKILL après 10 s) ; le conteneur et ses fichiers restent |
| `docker rm mon_ubuntu` | **supprime** le conteneur arrêté et sa couche en écriture (curl est perdu) |

`-i` garde l'entrée standard ouverte, `-t` alloue un terminal : ensemble, ils donnent un shell utilisable.

## Étape 6 : Nginx

```sh
sudo docker run -d --name mon_nginx -p 8080:80 nginx:latest
sudo docker ps
```

```
NAMES       IMAGE          STATUS         PORTS
mon_nginx   nginx:latest   Up 2 seconds   0.0.0.0:8080->80/tcp, [::]:8080->80/tcp
```

```sh
curl http://localhost:8080          # <title>Welcome to nginx!</title>
sudo docker logs mon_nginx          # ... "GET / HTTP/1.1" 200 896 "-" "curl/8.x"
```

- `-d` (*detached*) : le conteneur tourne **en arrière-plan** et la commande rend la main ;
- `-p 8080:80` : **port de l'hôte : port du conteneur**. Nginx écoute sur le port 80 **dans** le conteneur ; Docker redirige le port 8080 de la machine vers lui ;
- `docker logs` affiche ce que Nginx écrit : chaque requête apparaît, avec l'adresse `172.17.0.1` (la passerelle du réseau Docker).

Cycle de vie : `stop` (arrêt), `start` (relance), `restart` (stop + start), `rm -f` (**force** : arrête puis supprime un conteneur en marche).

## Étape 7 : image personnalisée

```dockerfile
FROM nginx:alpine
COPY site/index.html /usr/share/nginx/html/index.html
EXPOSE 80
```

| Instruction | Rôle |
|---|---|
| `FROM nginx:alpine` | **image de base** : Nginx sur Alpine Linux (63 Mo au lieu de 163 Mo pour `nginx:latest`) |
| `COPY src dest` | copie un fichier du **contexte de build** (le dossier `.`) dans l'image ; ici la page remplace la page d'accueil de Nginx |
| `EXPOSE 80` | **documente** le port écouté par le conteneur ; il ne publie rien : la publication se fait avec `-p` au lancement |

```sh
sudo docker build -t tp4-web:1.0 .     # -t nom:tag ; le point = contexte de build
sudo docker run -d --name tp4_site -p 8081:80 tp4-web:1.0
curl http://localhost:8081             # <h1>Bienvenue dans mon conteneur Docker !</h1>
```

> [!note] Avertissement « legacy builder is deprecated »
> Sans le plugin `buildx`, `docker build` affiche cet avertissement mais construit l'image. Pour l'éviter : `sudo apt install docker-buildx` (le nom du paquet dépend de la version d'Ubuntu).

## Étape 8 : volumes

```sh
sudo docker volume create data_volume
sudo docker run --rm -v data_volume:/data ubuntu:24.04 \
  bash -c 'echo "Donnée persistante du TP4" > /data/message.txt'
sudo docker run --rm -v data_volume:/data ubuntu:24.04 cat /data/message.txt
# Donnée persistante du TP4
sudo docker volume ls
```

Le premier conteneur écrit le fichier puis **disparaît** (`--rm`) ; le second, un **autre** conteneur, lit le même fichier. Le fichier n'est pas dans la couche en écriture du conteneur mais dans le **volume**, géré par Docker sur l'hôte (`/var/lib/docker/volumes/data_volume/_data`), qui **vit indépendamment des conteneurs** : il n'est supprimé que par `docker volume rm`.

**Deuxième partie : montage d'un dossier de l'hôte** (*bind mount*)

```sh
cd /var/www/html/
sudo docker run -d --name nginx1 -p 8080:80 -v .:/usr/share/nginx/html nginx:latest
```

- `-v .:/usr/share/nginx/html` monte **le dossier courant** de l'hôte (`/var/www/html`, la racine d'Apache du TP 0) à la place du dossier servi par Nginx ;
- `http://localhost:8080` : **Nginx** (conteneur) sert la page d'Apache ;
- `http://localhost:80` : **Apache** (installé sur la machine) sert la même page ;
- après `sudo nano /var/www/html/index.html`, **les deux URL affichent la modification** sans redémarrer le conteneur : le fichier n'est pas copié, il est **partagé**.

| | Volume nommé | Montage de dossier (*bind mount*) |
|---|---|---|
| Syntaxe | `-v data_volume:/data` | `-v /chemin/hote:/chemin/conteneur` (ou `.`) |
| Emplacement | géré par Docker | un dossier choisi de l'hôte |
| Usage | données d'application (base de données) | partager du code ou des pages qu'on édite sur l'hôte |

> [!warning] Port 8080 déjà pris
> Si `mon_nginx` de l'étape 6 tourne encore, `nginx1` échoue avec « **port is already allocated** » : un port de l'hôte ne peut être publié que par un seul conteneur. Supprimer l'ancien (`docker rm -f mon_nginx`) ou choisir un autre port (`-p 8082:80`). Même chose si Apache n'est pas installé : `http://localhost:80` ne répond pas.

## Étape 9 : réseau personnalisé

```sh
sudo docker network create mon_reseau
sudo docker run -dit --name ubuntu1 --network mon_reseau ubuntu:24.04 bash
sudo docker run -dit --name ubuntu2 --network mon_reseau ubuntu:24.04 bash
sudo docker network inspect mon_reseau
```

`inspect` montre un réseau `bridge` avec son sous-réseau, sa passerelle et les adresses des conteneurs :

```
Subnet 172.21.0.0/16, Gateway 172.21.0.1, Driver bridge
ubuntu1 172.21.0.2/16    ubuntu2 172.21.0.3/16
```

```sh
sudo docker exec ubuntu1 bash -c 'apt update && apt install -y iputils-ping curl'
sudo docker exec ubuntu1 ping -c 4 ubuntu2       # 4 packets transmitted, 4 received, 0% packet loss
sudo docker run -d --name nginx_reseau --network mon_reseau nginx:alpine
sudo docker exec ubuntu1 curl http://nginx_reseau   # page « Welcome to nginx! »
```

> [!important] L'intérêt du réseau personnalisé : la résolution par nom
> Sur un réseau créé avec `docker network create`, Docker fournit un **DNS interne** : `ubuntu2` et `nginx_reseau` se résolvent **par leur nom de conteneur**, sans connaître leur adresse IP (qui change à chaque recréation). Sur le réseau `bridge` **par défaut**, cette résolution n'existe pas : `getent hosts ubuntu2` ne renvoie rien. Le réseau isole aussi le groupe de conteneurs des autres réseaux.

`nginx_reseau` n'a pas de `-p` : il n'est **pas** accessible depuis l'hôte, seulement depuis les conteneurs du même réseau.

Nettoyage : `docker rm -f ubuntu1 ubuntu2 nginx_reseau` puis `docker network rm mon_reseau`.

## Étape 10 : Docker Compose

```sh
sudo apt install -y docker-compose-v2
sudo docker compose version
```

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8083:80"
    volumes:
      - ./site:/usr/share/nginx/html:ro     # :ro = lecture seule dans le conteneur
    networks:
      - tp4_network
    restart: unless-stopped                 # relancé automatiquement sauf arrêt manuel
  ubuntu:
    image: ubuntu:24.04
    command: ["sleep", "infinity"]          # garde le conteneur en vie
    networks:
      - tp4_network
networks:
  tp4_network:
    driver: bridge
```

```sh
sudo docker compose up -d
sudo docker compose ps
```

```
NAME                 SERVICE   STATUS         PORTS
tp4-docker-ubuntu-1  ubuntu    Up             
tp4-docker-web-1     web       Up             0.0.0.0:8083->80/tcp
```

```sh
curl http://localhost:8083                         # <h1>Bienvenue dans mon conteneur Docker !</h1>
sudo docker compose exec ubuntu bash -c 'apt update && apt install -y curl'
sudo docker compose exec ubuntu curl http://web    # même page : le service « web » est résolu par son nom
sudo docker compose down                           # arrête et supprime conteneurs et réseau du projet
```

- Compose nomme le projet d'après le dossier (`tp4-docker`) et préfixe les conteneurs et le réseau ;
- `ubuntu` a besoin de `sleep infinity` : sans commande qui dure, `bash` sans terminal se termine aussitôt et le conteneur s'arrête ;
- `down` ne supprime **pas** les volumes nommés (il faut `down -v`) ni les images.

## Étape 11 : mini-projet (port 8085)

```
mini-projet/
├── Dockerfile
├── compose.yaml
└── site/
    └── index.html
```

`site/index.html` :

```html
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Mini-projet Docker</title></head>
<body>
  <h1>Mini-projet : mon site conteneurisé</h1>
  <p>Site statique servi par Nginx, image construite avec un Dockerfile et déployée avec Docker Compose sur le port 8085.</p>
</body>
</html>
```

`Dockerfile` :

```dockerfile
FROM nginx:alpine
COPY site/ /usr/share/nginx/html/
EXPOSE 80
```

`compose.yaml` :

```yaml
services:
  web:
    build: .                         # construit l'image avec le Dockerfile du dossier
    image: miniprojet-web:1.0        # nom donné à l'image construite
    ports:
      - "8085:80"
    volumes:
      - ./site:/usr/share/nginx/html:ro   # contenu modifiable sans reconstruire
    networks:
      - mini_net
    restart: unless-stopped
  client:
    image: alpine:3.20
    command: ["sleep", "infinity"]
    networks:
      - mini_net
networks:
  mini_net:
    driver: bridge
```

```sh
docker compose up -d --build
curl -I http://localhost:8085                 # HTTP/1.1 200 OK, Server: nginx
docker compose exec client wget -qO- http://web   # communication entre services par le nom « web »
docker images; docker ps -a; docker volume ls; docker network ls; docker compose ps
docker compose down
```

Résultats obtenus : `HTTP/1.1 200 OK` ; après une modification de `site/index.html`, `curl` affiche immédiatement la nouvelle version grâce au montage du dossier ; le conteneur `client` lit la page via `http://web`.

> [!tip] Volume ou image ?
> Le `COPY` met la page **dans l'image** : l'image est autonome et se déploie n'importe où. Le montage `./site` la **remplace** au lancement pour pouvoir l'éditer sans reconstruire. En production on garde l'image seule ; en développement le montage est pratique.

## Étape 12 : questions de synthèse

1. **VM ou conteneur** : une VM embarque **un système d'exploitation complet** sur du matériel virtuel fourni par un hyperviseur ; un conteneur **partage le noyau de l'hôte** et n'emporte que l'application et ses dépendances, isolée par les **namespaces** et limitée par les **cgroups**. Il démarre en secondes et pèse des mégaoctets, mais l'isolation est moins forte.
2. **Image ou conteneur** : l'image est le **modèle en lecture seule** ; le conteneur est une **instance** de l'image en exécution, avec une couche en écriture.
3. **`-p`** : publie un port du conteneur sur un port de l'hôte (`hôte:conteneur`) pour rendre le service **accessible depuis l'extérieur** du réseau Docker.
4. **Volume** : garder les données **après la suppression du conteneur** et les **partager** entre conteneurs ; la couche en écriture d'un conteneur disparaît avec lui.
5. **Réseau personnalisé** : isoler un groupe de conteneurs et les faire communiquer **par leur nom** grâce au DNS interne de Docker.
6. **`compose.yaml`** décrit dans un fichier **tous les services**, leurs images, ports, volumes et réseaux ; **`docker compose up -d`** crée et démarre l'ensemble en arrière-plan en une commande.
7. **`docker stop`** arrête **un** conteneur, qui existe toujours ; **`docker rm`** supprime **un** conteneur arrêté ; **`docker compose down`** arrête **et** supprime **tous** les conteneurs et réseaux du projet Compose (les volumes nommés restent sauf `-v`).
