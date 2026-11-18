const express = require('express');
const { Pool } = require('pg');

// Toute la configuration vient des variables d'environnement
// (docker-compose en Dev, ConfigMap/Secret en Val/Prod sur K8s).
const PORT = Number(process.env.PORT || 3000);
const APP_ENV = process.env.APP_ENV || 'dev';
const APP_VERSION = process.env.APP_VERSION || 'local';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'app',
  password: process.env.DB_PASSWORD || 'app',
  database: process.env.DB_NAME || 'appdb',
});

// Création du schéma au démarrage : fonctionne pareil en Dev, Val et Prod,
// sans avoir à monter de script d'init dans le conteneur PostgreSQL.
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id         SERIAL PRIMARY KEY,
      title      VARCHAR(200) NOT NULL,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
}

async function waitForDb(retries = 30, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await initDb();
      console.log('Base de données prête');
      return;
    } catch (err) {
      console.log(`BDD indisponible (tentative ${i}/${retries}) : ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Impossible de joindre la base de données');
}

const app = express();
app.use(express.json());

// Utilisé par les probes K8s et par la CI
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up', env: APP_ENV, version: APP_VERSION });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'down', env: APP_ENV, version: APP_VERSION });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, title, created_at FROM items ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/items', async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title || title.length > 200) {
    return res.status(400).json({ error: 'Le champ "title" est requis (1 à 200 caractères)' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO items (title) VALUES ($1) RETURNING id, title, created_at',
      [title]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

let server;

waitForDb()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`API démarrée sur le port ${PORT} (env=${APP_ENV}, version=${APP_VERSION})`);
    });
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });

// Arrêt propre (K8s envoie SIGTERM lors d'un rolling update)
function shutdown() {
  console.log('Arrêt en cours...');
  if (server) server.close();
  pool.end().finally(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
