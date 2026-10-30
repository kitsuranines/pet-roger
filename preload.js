const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('load'), save: d => ipcRenderer.send('save', d),
  capture: on => ipcRenderer.send('capture', on),
  menu: (w, p) => ipcRenderer.send('menu', w, p), onAction: f => ipcRenderer.on('action', (e, a) => f(a))
});
