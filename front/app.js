const API = '/api';

const form = document.getElementById('item-form');
const input = document.getElementById('item-title');
const list = document.getElementById('items');
const errorBox = document.getElementById('error');
const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');
const searchEl = document.getElementById('search');

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = !msg;
}

async function loadHealth() {
  try {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    statusEl.textContent = `API ${data.status} · BDD ${data.db} · version ${data.version}`;
    document.getElementById('env').textContent = data.env;
  } catch {
    statusEl.textContent = 'API injoignable';
  }
}

async function loadItems() {
  try {
    const res = await fetch(`${API}/items`);
    if (!res.ok) throw new Error();
    const search = searchEl.value.toLowerCase();
    const items = (await res.json()).filter((item) => item.title.toLowerCase().includes(search));
    countEl.textContent = `${items.length} élément${items.length > 1 ? 's' : ''}`;
    list.innerHTML = '';
    if (items.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Aucun élément pour le moment.';
      list.appendChild(li);
      return;
    }
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item.title; // textContent : pas d'injection HTML

      const date = document.createElement('small');
      date.className = 'date';
      date.textContent = new Date(item.created_at).toLocaleString('fr-FR');
      li.appendChild(date);

      const del = document.createElement('button');
      del.className = 'delete';
      del.textContent = '✕';
      del.title = 'Supprimer';
      del.addEventListener('click', () => deleteItem(item.id));
      li.appendChild(del);

      list.appendChild(li);
    }
  } catch {
    showError('Impossible de charger les éléments.');
  }
}

async function deleteItem(id) {
  showError('');
  const res = await fetch(`${API}/items/${id}`, { method: 'DELETE' });
  if (!res.ok) showError('Impossible de supprimer cet élément.');
  await loadItems();
}

// Bouton "Tout supprimer"
document.getElementById('clear-all').addEventListener('click', async () => {
  if (!confirm('Supprimer tous les éléments ?')) return;
  await fetch(`${API}/items`, { method: 'DELETE' });
  await loadItems();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  const title = input.value.trim();
  if (!title) return;
  try {
    const res = await fetch(`${API}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erreur lors de l\'ajout');
    }
    input.value = '';
    await loadItems();
  } catch (err) {
    showError(err.message);
  }
});

loadHealth();
loadItems();

// Recherche : on filtre la liste à chaque frappe
searchEl.addEventListener('input', loadItems);

// Mode sombre
document.getElementById('dark-mode').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});
