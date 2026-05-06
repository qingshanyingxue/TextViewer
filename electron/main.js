const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ── 安全加固：运行时保护 ──────────────────────────────────
if (!isDev) {
  // 1. 禁止打开 DevTools（生产环境）
  app.on('web-contents-created', (_, contents) => {
    contents.on('devtools-opened', () => {
      contents.closeDevTools()
    })
    // 禁止导航到外部 URL（防止被重定向到恶意页面）
    contents.on('will-navigate', (event) => {
      event.preventDefault()
    })
    // 禁止创建新窗口
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  })

  // 2. 检测调试器附加（简单检测）
  const { exec } = require('child_process')
  setInterval(() => {
    if (process.platform === 'win32') {
      exec('tasklist /fi "imagename eq node.exe" /fi "windowtitle ne N/A"', (err, stdout) => {
        if (stdout.toLowerCase().includes('debugger')) {
          app.quit()
        }
      })
    }
  }, 5000)
}

// // 3. ASAR 完整性校验（防止 asar 被篡改）
// function verifyIntegrity() {
//   if (isDev) return true
//   try {
//     const asarPath = path.join(process.resourcesPath, 'app.asar')
//     if (!fs.existsSync(asarPath)) return false
//     const hash = crypto.createHash('sha256')
//     const fd = fs.openSync(asarPath, 'r')
//     const buffer = Buffer.alloc(65536)
//     let bytesRead
//     while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
//       hash.update(buffer.slice(0, bytesRead))
//     }
//     fs.closeSync(fd)
//     // 生产环境应该把正确的 hash 存到某处对比，这里只做基础校验
//     return true
//   } catch {
//     return false
//   }
// }

// if (!isDev && !verifyIntegrity()) {
//   console.error('完整性校验失败')
//   app.quit()
// }

// native addon：文件统计
let fileStatAddon
try {
  fileStatAddon = require('../native/index.js')
} catch (e) {
  fileStatAddon = null
}

let mainWindow

function createWindow(filePath = null) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    frame: false,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // DevTools 仅开发环境手动打开
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (filePath) {
      openFile(filePath)
    }
  })

  buildMenu()
}

function buildMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开文件...',
          accelerator: 'CmdOrCtrl+O',
          click: () => handleOpenDialog(),
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-save'),
        },
        {
          label: '另存为...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu-save-as'),
        },
        { type: 'separator' },
        {
          label: process.platform === 'darwin' ? '关闭窗口' : '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+W' : 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'copy', label: '复制' },
        { role: 'selectAll', label: '全选' },
      ],
    },
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function openFile(filePath) {
  try {
    const stat = fs.statSync(filePath)
    if (!stat.isFile()) return

    const content = fs.readFileSync(filePath, 'utf-8')
    const ext = path.extname(filePath).toLowerCase().replace('.', '')
    const name = path.basename(filePath)

    mainWindow.webContents.send('file-opened', { content, ext, name, filePath })
    mainWindow.setTitle(`${name} - 文本查看器`)

    // Add to recent documents
    app.addRecentDocument(filePath)
  } catch (err) {
    mainWindow.webContents.send('file-error', err.message)
  }
}

async function handleOpenDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '所有文本文件', extensions: ['txt', 'md', 'markdown', 'log', 'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd', 'csv', 'tsv', 'sql', 'vue', 'svelte', 'mdx'] },
      { name: 'Markdown 文档', extensions: ['md', 'markdown', 'mdx'] },
      { name: '源代码', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'vue', 'svelte'] },
      { name: '配置文件', extensions: ['json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'xml'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  })

  if (!result.canceled && result.filePaths.length > 0) {
    openFile(result.filePaths[0])
  }
}

// Handle file passed via command line (default program association)
function getFileFromArgs(argv) {
  const args = argv.slice(isDev ? 2 : 1)
  const filePath = args.find(arg => !arg.startsWith('-') && fs.existsSync(arg))
  return filePath || null
}

// macOS: open-file event
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (mainWindow) {
    openFile(filePath)
  } else {
    app.once('ready', () => createWindow(filePath))
  }
})

app.whenReady().then(() => {
  const filePath = getFileFromArgs(process.argv)
  createWindow(filePath)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC handlers
ipcMain.handle('open-file-dialog', handleOpenDialog)

ipcMain.handle('read-file', async (_, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const ext = path.extname(filePath).toLowerCase().replace('.', '')
    const name = path.basename(filePath)
    return { content, ext, name, filePath }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('save-file', async (_, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('save-file-as', async (_, content, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'untitled.txt',
    filters: [
      { name: '所有文本文件', extensions: ['txt', 'md', 'markdown', 'json', 'yaml', 'yml', 'toml', 'xml', 'html', 'css', 'js', 'ts', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'sh', 'sql'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  })
  if (result.canceled) return { canceled: true }
  try {
    fs.writeFileSync(result.filePath, content, 'utf-8')
    const ext = path.extname(result.filePath).toLowerCase().replace('.', '')
    const name = path.basename(result.filePath)
    mainWindow.setTitle(`${name} - 文本查看器`)
    return { success: true, filePath: result.filePath, ext, name }
  } catch (err) {
    return { error: err.message }
  }
})

ipcMain.handle('get-platform', () => process.platform)

ipcMain.handle('file-stat', async (_, filePath) => {
  try {
    if (fileStatAddon && typeof fileStatAddon.fileStat === 'function') {
      const stat = fileStatAddon.fileStat(filePath)
      return {
        lines:    Number(stat.lines)  || 0,
        words:    Number(stat.words)  || 0,
        bytes:    Number(stat.bytes)  || 0,
        chars:    Number(stat.chars)  || 0,
        isNative: fileStatAddon.isNative,
      }
    }
    // 降级：纯 JS
    console.log('[file-stat] 使用 JS 降级，fileStatAddon:', fileStatAddon)
    const content = fs.readFileSync(filePath, 'utf-8')
    const bytes = fs.statSync(filePath).size
    const lines = content ? content.split('\n').length : 0
    const words = content.trim() ? content.trim().split(/\s+/).length : 0
    const chars = [...content].length
    return { lines, words, bytes, chars, isNative: false }
  } catch (err) {
    console.error('[file-stat] 错误:', err.message)
    return { error: err.message }
  }
})

ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())
