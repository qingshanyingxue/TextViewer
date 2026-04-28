const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  encrypt: (text, key) => ipcRenderer.invoke('xor-encrypt', text, key),
  decrypt: (text, key) => ipcRenderer.invoke('xor-decrypt', text, key),
  isNative: ()         => ipcRenderer.invoke('is-native'),
})
