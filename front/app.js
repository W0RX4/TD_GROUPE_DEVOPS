const API = '/api';

const form = document.getElementById('item-form');
const input = document.getElementById('item-title');
const list = document.getElementById('items');
const errorBox = document.getElementById('error');
const statusEl = document.getElementById('status');
const badge = document.getElementById('env-badge');

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = !msg;
}

async function loadHealth() {
  try {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    badge.textContent = data.env.toUpperCase();
    badge.className = `badge badge-${data.env}`;
    statusEl.textContent = `API ${data.status} · BDD ${data.db} · version ${data.version}`;
  } catch {
    badge.textContent = '?';
    statusEl.textContent = 'API injoignable';
  }
}

async function loadItems() {
  try {
    const res = await fetch(`${API}/items`);
    if (!res.ok) throw new Error();
    const items = await res.json();
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
      list.appendChild(li);
    }
  } catch {
    showError('Impossible de charger les éléments.');
  }
}

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
