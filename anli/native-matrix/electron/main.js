const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const matrix = require('../native/index.js')

console.log('[main] matrix native:', matrix.isNative)

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  })
  !app.isPackaged
    ? win.loadURL('http://localhost:5174')
    : win.loadFile(path.join(__dirname, '../dist/index.html'))
}

ipcMain.handle('matrix-multiply',    (_, a, b) => matrix.multiply(a, b))
ipcMain.handle('matrix-transpose',   (_, a)    => matrix.transpose(a))
ipcMain.handle('matrix-determinant', (_, a)    => matrix.determinant(a))
ipcMain.handle('matrix-tostring',    (_, a)    => matrix.toString(a))
ipcMain.handle('matrix-is-native',   ()        => matrix.isNative)

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
