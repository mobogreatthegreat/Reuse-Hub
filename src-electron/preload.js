const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('backend', {
  request: (method, url, body) =>
    ipcRenderer.invoke('backend:request', method, url, body),

  openFileDialog: () =>
    ipcRenderer.invoke('dialog:openFile'),

  openImageDialog: () =>
    ipcRenderer.invoke('dialog:openImage'),

  getItems: () =>
    ipcRenderer.invoke('backend:request', 'GET', '/api/items'),

  getCategories: () =>
    ipcRenderer.invoke('backend:request', 'GET', '/api/categories'),

  addCategory: (data) =>
    ipcRenderer.invoke('backend:request', 'POST', '/api/categories', data),

  updateCategory: (name, data) =>
    ipcRenderer.invoke('backend:request', 'PUT', `/api/categories/${encodeURIComponent(name)}`, data),

  deleteCategory: (name) =>
    ipcRenderer.invoke('backend:request', 'DELETE', `/api/categories/${encodeURIComponent(name)}`),

  getFileIcon: (filePath) =>
    ipcRenderer.invoke('icon:getFileIcon', filePath),

  addItem: (data) =>
    ipcRenderer.invoke('backend:request', 'POST', '/api/items', data),

  updateItem: (id, data) =>
    ipcRenderer.invoke('backend:request', 'PUT', `/api/items/${id}`, data),

  deleteItem: (id) =>
    ipcRenderer.invoke('backend:request', 'DELETE', `/api/items/${id}`),

  reorderItems: (orderedIds) =>
    ipcRenderer.invoke('backend:request', 'PATCH', '/api/items/reorder', { ordered_ids: orderedIds }),

  launch: (type, pathOrUrl, browser, consoleMode) =>
    ipcRenderer.invoke('backend:request', 'POST', '/api/launch', { type, path_or_url: pathOrUrl, browser, console_mode: consoleMode }),

  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  openUpdateUrl: (url) => ipcRenderer.invoke('update:open', url),
});
