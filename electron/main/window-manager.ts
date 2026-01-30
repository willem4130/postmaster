import { BrowserWindow, screen } from 'electron'
import { join } from 'path'

export function createWindowManager(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  const mainWindow = new BrowserWindow({
    width: Math.min(1400, width),
    height: Math.min(900, height),
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for better-sqlite3
      webSecurity: true,
    },
  })

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  // Save window state
  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds()
    // TODO: Save bounds to store
    console.log('Window bounds:', bounds)
  })

  return mainWindow
}
