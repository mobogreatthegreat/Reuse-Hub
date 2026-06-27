let items = [];
let categories = [];
let currentCategory = '__all__';
let currentView = 'grid';
let editingId = null;
let searchQuery = '';

const api = window.backend;

const TYPE_BADGES = { link: 'WEB', executable: 'APP', console: 'CMD' };

const DEFAULT_COLORS = [
  '#5b9bd5', '#70ad47', '#ed7d31', '#ff453a', '#af6ee8',
  '#ff9f0a', '#30d158', '#64d2ff', '#ff375f', '#bf5af2',
  '#ff6482', '#0a84ff', '#5e5ce6', '#ffd60a', '#32d74b',
];

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
}

function isImagePath(val) {
  if (!val || !val.trim()) return false;
  const v = val.trim();
  if (v.includes('\\') || v.includes('/')) return true;
  return /\.(png|jpg|jpeg|gif|bmp|ico|svg|webp)$/i.test(v);
}

/* ── Toast ── */

function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; el.style.transition = '0.2s'; }, 2500);
  setTimeout(() => el.remove(), 2800);
}

/* ── Data ── */

async function loadItems() {
  try {
    items = await api.getItems();
    categories = await api.getCategories();
    renderCategories();
    renderItems();
  } catch (e) {
    console.error('Failed to load items:', e);
    toast('Failed to load items', 'error');
  }
}

/* ── Categories ── */

function renderCategories() {
  const list = document.getElementById('cat-list');
  list.innerHTML = '';
  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = `cat-tab${cat === currentCategory ? ' active' : ''}`;
    btn.dataset.cat = cat;
    btn.textContent = cat;
    list.appendChild(btn);
  });
  document.querySelectorAll('.cat-tab[data-cat="__all__"]').forEach((b) => {
    b.classList.toggle('active', currentCategory === '__all__');
  });
}

function selectCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.cat-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  renderItems();
}

/* ── Render ── */

function renderItems() {
  const container = document.getElementById('content');
  let filtered = currentCategory === '__all__'
    ? items
    : items.filter((i) => i.category === currentCategory);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      i.path_or_url.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  }

  container.innerHTML = '';
  container.className = currentView === 'grid' ? 'view-grid' : 'view-list';

  if (currentCategory === '__all__') {
    const grouped = {};
    filtered.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    const catOrder = Object.keys(grouped).sort();
    catOrder.forEach((cat) => {
      const sep = document.createElement('div');
      sep.className = 'category-separator';
      sep.textContent = cat;
      container.appendChild(sep);
      renderCards(container, grouped[cat]);
    });
  } else {
    renderCards(container, filtered);
  }
}

function renderCards(container, itemsToRender) {
  const fragment = document.createDocumentFragment();
  itemsToRender.forEach((item) => {
    const card = createCard(item);
    fragment.appendChild(card);
  });
  container.appendChild(fragment);
}

function createCard(item) {
  const card = document.createElement('div');
  card.className = 'item-card';
  card.dataset.id = item.id;
  card.draggable = true;

  const iconWrap = document.createElement('div');
  iconWrap.className = 'item-icon-wrap';

  if (isImagePath(item.icon)) {
    const img = document.createElement('img');
    img.className = 'item-icon';
    img.src = item.icon;
    img.draggable = false;
    img.onerror = function () {
      this.style.display = 'none';
      const def = document.createElement('div');
      def.className = 'item-icon-default';
      def.style.background = hashColor(item.name);
      def.textContent = item.name.charAt(0).toUpperCase();
      this.parentNode.replaceChild(def, this);
    };
    iconWrap.appendChild(img);
  } else {
    const def = document.createElement('div');
    def.className = 'item-icon-default';
    def.style.background = hashColor(item.name);
    def.textContent = item.name.charAt(0).toUpperCase();
    iconWrap.appendChild(def);
  }

  const name = document.createElement('div');
  name.className = 'item-name';
  name.textContent = item.name;

  const typeBadge = document.createElement('span');
  typeBadge.className = 'item-type-badge';
  typeBadge.textContent = TYPE_BADGES[item.type] || '?';

  card.appendChild(iconWrap);
  card.appendChild(name);
  card.appendChild(typeBadge);

  card.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e.clientX, e.clientY, item); });

  setupDrag(card, item);

  return card;
}

/* ── Drag and Drop ── */

let dragSrcId = null;

function setupDrag(card) {
  card.addEventListener('dragstart', (e) => {
    dragSrcId = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.id);
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.item-card').forEach((c) => c.classList.remove('drag-over'));
    if (dragSrcId) {
      commitReorder();
      dragSrcId = null;
    }
  });

  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragSrcId && dragSrcId !== card.dataset.id) {
      document.querySelectorAll('.item-card').forEach((c) => c.classList.remove('drag-over'));
      card.classList.add('drag-over');
    }
  });

  card.addEventListener('dragleave', () => {
    card.classList.remove('drag-over');
  });

  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('drag-over');
    const fromId = e.dataTransfer.getData('text/plain');
    if (!fromId || fromId === card.dataset.id) return;
    const container = document.getElementById('content');
    const cards = [...container.querySelectorAll('.item-card')];
    const fromIdx = cards.findIndex((c) => c.dataset.id === fromId);
    const toIdx = cards.findIndex((c) => c.dataset.id === card.dataset.id);
    if (fromIdx === -1 || toIdx === -1) return;

    const fromCard = cards[fromIdx];
    if (fromIdx < toIdx) {
      card.parentNode.insertBefore(fromCard, card.nextSibling);
    } else {
      card.parentNode.insertBefore(fromCard, card);
    }
  });
}

async function commitReorder() {
  const container = document.getElementById('content');
  const cards = [...container.querySelectorAll('.item-card')];
  const orderedIds = cards.map((c) => c.dataset.id);
  if (orderedIds.length < 2) return;
  try {
    await api.reorderItems(orderedIds);
    items.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
  } catch (e) {
    console.error('Reorder failed:', e);
    toast('Failed to save new order', 'error');
  }
}

/* ── Launch ── */

async function launchItem(item) {
  try {
    await api.launch(item.type, item.path_or_url, item.browser, item.console_mode);
  } catch (e) {
    toast(`Launch failed: ${e.message || 'Unknown error'}`, 'error');
  }
}

/* ── Delete ── */

async function deleteItem(item) {
  if (!confirm(`Delete "${item.name}"?`)) return;
  try {
    await api.deleteItem(item.id);
    toast(`Deleted "${item.name}"`);
    await loadItems();
  } catch (e) {
    console.error('Delete failed:', e);
    toast('Failed to delete item', 'error');
  }
}

/* ── Context Menu ── */

const contextMenu = document.getElementById('context-menu');

function showContextMenu(x, y, item) {
  contextMenu.innerHTML = '';
  contextMenu.style.left = Math.min(x, window.innerWidth - 150) + 'px';
  contextMenu.style.top = Math.min(y, window.innerHeight - 100) + 'px';

  const editOpt = document.createElement('button');
  editOpt.textContent = 'Edit';
  editOpt.addEventListener('click', () => { hideContextMenu(); openEditModal(item.id); });
  contextMenu.appendChild(editOpt);

  const delOpt = document.createElement('button');
  delOpt.textContent = 'Delete';
  delOpt.addEventListener('click', () => { hideContextMenu(); deleteItem(item); });
  contextMenu.appendChild(delOpt);

  contextMenu.classList.remove('hidden');
}

function hideContextMenu() {
  contextMenu.classList.add('hidden');
}

document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target)) hideContextMenu();
});

/* ── Modal ── */

const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const editIdInput = document.getElementById('edit-id');
const form = document.getElementById('item-form');
const nameInput = document.getElementById('item-name');
const typeSelect = document.getElementById('item-type');
const pathInput = document.getElementById('item-path');
const browserInput = document.getElementById('item-browser');
const iconInput = document.getElementById('item-icon');
const categorySelect = document.getElementById('item-category');
const categoryNewInput = document.getElementById('item-category-new');
const fieldBrowser = document.getElementById('field-browser');
const fieldConsoleMode = document.getElementById('field-console-mode');
const consoleTerminalCheckbox = document.getElementById('item-console-terminal');

function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'Add Item';
  form.reset();
  editIdInput.value = '';
  typeSelect.value = 'link';
  iconInput.value = '';
  consoleTerminalCheckbox.checked = true;
  toggleFormFields('link');
  populateCategorySelect();
  modalOverlay.classList.remove('hidden');
  nameInput.focus();
}

function openEditModal(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  editingId = id;
  modalTitle.textContent = 'Edit Item';
  editIdInput.value = id;
  nameInput.value = item.name;
  typeSelect.value = item.type;
  pathInput.value = item.path_or_url;
  browserInput.value = item.browser || '';
  iconInput.value = item.icon || '';
  consoleTerminalCheckbox.checked = item.console_mode !== 'background';
  toggleFormFields(item.type);
  populateCategorySelect(item.category);
  modalOverlay.classList.remove('hidden');
  nameInput.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  editingId = null;
}

function toggleFormFields(type) {
  const showBrowser = type === 'link';
  const showConsoleMode = type === 'console';

  document.querySelector('#field-path label').textContent =
    type === 'console' ? 'Command' : type === 'executable' ? 'File Path' : 'URL';
  pathInput.placeholder =
    type === 'console' ? 'e.g. ping google.com -t' :
    type === 'executable' ? 'e.g. C:\\Apps\\spotify.exe' :
    'e.g. https://spotify.com';
  document.getElementById('btn-browse').classList.toggle('hidden', type !== 'executable');

  fieldBrowser.classList.toggle('hidden', !showBrowser);
  fieldConsoleMode.classList.toggle('hidden', !showConsoleMode);
}

typeSelect.addEventListener('change', () => { toggleFormFields(typeSelect.value); });

function populateCategorySelect(selected) {
  const sel = categorySelect;
  sel.innerHTML = '<option value="Uncategorized">Uncategorized</option>';
  categories.forEach((cat) => {
    if (cat !== 'Uncategorized') {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    }
  });
  if (selected && selected !== 'Uncategorized') {
    sel.value = selected;
    if (sel.value !== selected) {
      const opt = document.createElement('option');
      opt.value = selected;
      opt.textContent = selected;
      opt.selected = true;
      sel.appendChild(opt);
    }
  } else if (selected === 'Uncategorized') {
    sel.value = 'Uncategorized';
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  let category = categorySelect.value;
  if (categoryNewInput.value.trim()) {
    category = categoryNewInput.value.trim();
  }

  const data = {
    name: nameInput.value.trim(),
    type: typeSelect.value,
    path_or_url: pathInput.value.trim(),
    browser: browserInput.value.trim(),
    icon: iconInput.value.trim(),
    category,
    console_mode: consoleTerminalCheckbox.checked ? 'terminal' : 'background',
  };

  if (!data.name || !data.path_or_url) {
    toast('Name and path/command are required', 'error');
    return;
  }

  const saveBtn = document.getElementById('btn-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    if (editingId) {
      await api.updateItem(editingId, data);
      toast('Item updated');
    } else {
      await api.addItem(data);
      toast('Item added');
    }
    closeModal();
    categoryNewInput.value = '';
    await loadItems();
  } catch (e) {
    console.error('Save failed:', e);
    toast('Failed to save item', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

form.addEventListener('submit', handleFormSubmit);

document.getElementById('btn-add').addEventListener('click', openAddModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('btn-cancel').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.getElementById('btn-browse').addEventListener('click', async () => {
  try {
    const filePath = await api.openFileDialog();
    if (filePath) {
      pathInput.value = filePath;
      typeSelect.value = 'executable';
      toggleFormFields('executable');
    }
  } catch (e) {
    console.error('Browse failed:', e);
  }
});

document.getElementById('btn-icon-browse').addEventListener('click', async () => {
  try {
    const filePath = await api.openImageDialog();
    if (filePath) iconInput.value = filePath;
  } catch (e) {
    console.error('Icon browse failed:', e);
  }
});

document.getElementById('btn-icon-clear').addEventListener('click', () => {
  iconInput.value = '';
});

/* ── View Toggle ── */

document.getElementById('btn-grid').addEventListener('click', () => {
  currentView = 'grid';
  document.getElementById('btn-grid').classList.add('active');
  document.getElementById('btn-list').classList.remove('active');
  renderItems();
});

document.getElementById('btn-list').addEventListener('click', () => {
  currentView = 'list';
  document.getElementById('btn-list').classList.add('active');
  document.getElementById('btn-grid').classList.remove('active');
  renderItems();
});

/* ── Search ── */

let searchTimeout;
document.getElementById('search').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value;
    renderItems();
  }, 150);
});

/* ── Card Click Delegation ── */

document.getElementById('content').addEventListener('click', (e) => {
  const card = e.target.closest('.item-card');
  if (!card) return;
  const item = items.find(i => i.id === card.dataset.id);
  if (item) launchItem(item);
});

/* ── Category Click Delegation ── */

document.getElementById('categories-bar').addEventListener('click', (e) => {
  const tab = e.target.closest('.cat-tab');
  if (tab) selectCategory(tab.dataset.cat);
});

/* ── Window Controls ── */

document.getElementById('btn-minimize').addEventListener('click', () => api.minimize());
document.getElementById('btn-maximize').addEventListener('click', () => api.maximize());
document.getElementById('btn-close').addEventListener('click', () => api.close());

api.isMaximized().then((max) => {
  document.getElementById('btn-maximize').textContent = max ? '❐' : '□';
});

/* ── Keyboard Shortcuts ── */

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!contextMenu.classList.contains('hidden')) hideContextMenu();
    else closeModal();
  }
  if ((e.key === 'n' || e.key === 'N') && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    openAddModal();
  }
});

/* ── Init ── */

loadItems();
