# TD_GROUPE_DEVOPS

Application 3 services déployée sur 3 environnements (Dev / Val / Prod).

| Service | Techno | Dossier | Port conteneur |
|---|---|---|---|
| **front** | HTML/JS statique servi par nginx (non-root) | `front/` | 8080 |
| **api** | Node.js 20 + Express 5 | `api/` | 3000 |
| **db** | PostgreSQL 16 (image officielle) | — | 5432 |

Le front sert les fichiers statiques et redirige `/api/*` vers l'API (`API_UPSTREAM`, `api:3000` par défaut).
L'API crée son schéma au démarrage (`CREATE TABLE IF NOT EXISTS`), aucun script d'init n'est à monter dans la BDD.

## Environnement de Dev (local)

Prérequis : Docker + Docker Compose.

```bash
cp .env.example .env        # optionnel, pour changer les ports / identifiants
docker compose up --build   # ajouter -d pour lancer en arrière-plan
```

- Front : http://localhost:8080
- API : http://localhost:3000/api/health

Arrêter : `docker compose down` (ajouter `-v` pour supprimer aussi les données).

## API

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/health` | État de l'API et de la BDD, environnement, version (probes K8s) |
| GET | `/api/items` | Liste des éléments |
| POST | `/api/items` | Ajoute un élément — body `{"title": "..."}` |

## Variables d'environnement

| Service | Variable | Défaut | Rôle |
|---|---|---|---|
| api | `APP_VERSION` | — | SHA du commit / tag de l'image (affiché dans le front) |
| api | `DB_HOST` | — | Adresse de PostgreSQL (`db`) |
| api | `DB_USER` / `DB_PASSWORD` / `DB_NAME` | — | Identifiants BDD (Secret K8s en Val/Prod) |
| front | `API_UPSTREAM` | `api:3000` | Service vers lequel nginx redirige `/api` |

## Images Docker

Contextes de build pour la CI :

- `./api`   → `<dockerhub>/td-api:<sha>`
- `./front` → `<dockerhub>/td-front:<sha>`

## Workflow Git

`feature/*` → PR vers `dev` → PR vers `val` → PR vers `main` (prod). Jamais de push direct sur `main`.
