const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('matrixAPI', {
  multiply:    (a, b) => ipcRenderer.invoke('matrix-multiply', a, b),
  transpose:   (a)    => ipcRenderer.invoke('matrix-transpose', a),
  determinant: (a)    => ipcRenderer.invoke('matrix-determinant', a),
  toString:    (a)    => ipcRenderer.invoke('matrix-tostring', a),
  isNative:    ()     => ipcRenderer.invoke('matrix-is-native'),
})
