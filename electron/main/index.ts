import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { createWindowManager } from './window-manager'
import { registerIpcHandlers, setMainWindow } from './ipc-handlers'
import { createMenu } from './menu'
import { initDatabase } from '../../src/main/database/sqlite'

// Disable hardware acceleration for stability
app.disableHardwareAcceleration()

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

  async function createWindow() {
    mainWindow = createWindowManager()

    // Open DevTools in development
    if (VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(VITE_DEV_SERVER_URL)
      mainWindow.webContents.openDevTools()
    } else {
      mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
    }

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:') || url.startsWith('http:')) {
        shell.openExternal(url)
      }
      return { action: 'deny' }
    })

    // Set main window reference for IPC handlers (bulk analysis progress)
    setMainWindow(mainWindow)

    mainWindow.on('closed', () => {
      mainWindow = null
    })
  }

  // Handle second instance
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    // Initialize local database
    await initDatabase()

    // Register IPC handlers
    registerIpcHandlers(ipcMain)

    // Create native menu
    createMenu()

    // Create main window
    await createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  // Handle certificate errors in development
  app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
    if (process.env.NODE_ENV === 'development') {
      event.preventDefault()
      callback(true)
    } else {
      callback(false)
    }
  })
}
