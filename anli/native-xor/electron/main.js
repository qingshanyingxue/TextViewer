const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// 加载原生 XOR 模块
const xor = require('../native/index.js')
console.log('[main] native addon 已加载:', xor.isNative)

function createWindow() {
  const win = new BrowserWindow({
    width: 700,
    height: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  })

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5174')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// IPC：加密
ipcMain.handle('xor-encrypt', (_, text, key) => {
  return xor.xorCipher(text, key)
})

// IPC：解密（XOR 对称，复用同一函数）
ipcMain.handle('xor-decrypt', (_, text, key) => {
  return xor.xorCipher(text, key)
})

// IPC：是否使用 native
ipcMain.handle('is-native', () => xor.isNative)

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
