const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

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
    // mainWindow.webContents.openDevTools()
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

ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())
