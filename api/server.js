const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// Connexion à PostgreSQL (les valeurs viennent de docker-compose ou de K8s)
const db = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Si la BDD coupe la connexion, on l'affiche au lieu de faire planter l'API
db.on('error', (err) => console.error('Erreur BDD :', err.message));

// Vérifie que l'API et la base de données répondent
app.get('/api/health', async (req, res) => {
  await db.query('SELECT 1');
  res.json({ status: 'ok', db: 'up', version: process.env.APP_VERSION });
});

// Liste des éléments
app.get('/api/items', async (req, res) => {
  const result = await db.query('SELECT * FROM items ORDER BY id DESC');
  res.json(result.rows);
});

// Ajout d'un élément
app.post('/api/items', async (req, res) => {
  const title = req.body?.title;
  if (!title) {
    return res.status(400).json({ error: 'Le titre est obligatoire' });
  }
  const result = await db.query('INSERT INTO items (title) VALUES ($1) RETURNING *', [title]);
  res.status(201).json(result.rows[0]);
});

// Au démarrage : on crée la table si elle n'existe pas, puis on lance le serveur
db.query(`
  CREATE TABLE IF NOT EXISTS items (
    id         SERIAL PRIMARY KEY,
    title      TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).then(() => {
  app.listen(3000, () => console.log('API démarrée sur le port 3000'));
});

// Arrêt immédiat quand Docker / K8s arrête le conteneur
process.on('SIGTERM', () => process.exit(0));
