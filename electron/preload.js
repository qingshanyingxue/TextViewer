const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  saveFileAs: (content, defaultName) => ipcRenderer.invoke('save-file-as', content, defaultName),
  fileStat: (filePath) => ipcRenderer.invoke('file-stat', filePath),

  onFileOpened: (callback) => {
    ipcRenderer.on('file-opened', (_, data) => callback(data))
  },
  onFileError: (callback) => {
    ipcRenderer.on('file-error', (_, msg) => callback(msg))
  },
  onMenuSave: (callback) => {
    ipcRenderer.on('menu-save', () => callback())
  },
  onMenuSaveAs: (callback) => {
    ipcRenderer.on('menu-save-as', () => callback())
  },

  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
})
