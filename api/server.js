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

// Retourne la version de l'application (tag de l'image, via APP_VERSION)
app.get('/api/version', (_, res) => {
  res.json({ version: process.env.APP_VERSION || 'dev' });
});

// Liste des éléments
app.get('/api/items', async (req, res) => {
  const result = await db.query('SELECT * FROM items ORDER BY id DESC');
  res.json(result.rows);
});

// Ajout d'un élément
app.post('/api/items', async (req, res) => {
  // Validation : le nom doit être une chaîne non vide de 100 caractères max
  const name = req.body && req.body.name;
  if (typeof name !== 'string' || name.trim() === '' || name.length > 100) {
    return res.sendStatus(400);
  }
  const title = req.body?.title;
  if (!title) {
    return res.status(400).json({ error: 'Le titre est obligatoire' });
  }
  const result = await db.query('INSERT INTO items (title) VALUES ($1) RETURNING *', [title]);
  res.status(201).json(result.rows[0]);
});

// Suppression d'un élément
app.delete('/api/items/:id', async (req, res) => {
  const result = await db.query('DELETE FROM items WHERE id = $1', [Number(req.params.id) || 0]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Élément introuvable' });
  }
  res.status(204).end();
});

// Suppression de tous les éléments
app.delete('/api/items', async (req, res) => {
  await db.query('DELETE FROM items');
  res.status(204).end();
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
