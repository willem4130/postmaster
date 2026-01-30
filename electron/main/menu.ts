import { Menu, app, shell, BrowserWindow } from 'electron'

export function createMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Preferences...',
                accelerator: 'Cmd+,',
                click: () => {
                  const win = BrowserWindow.getFocusedWindow()
                  win?.webContents.send('open-settings')
                },
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Message',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('compose-new')
          },
        },
        { type: 'separator' },
        {
          label: 'Add Account...',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('add-account')
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find...',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('open-search')
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Inbox',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('navigate', 'inbox')
          },
        },
        {
          label: 'Sent',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('navigate', 'sent')
          },
        },
        {
          label: 'Drafts',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('navigate', 'drafts')
          },
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Message',
      submenu: [
        {
          label: 'Reply',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('reply')
          },
        },
        {
          label: 'Reply All',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('reply-all')
          },
        },
        {
          label: 'Forward',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('forward')
          },
        },
        { type: 'separator' },
        {
          label: 'Archive',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('archive')
          },
        },
        {
          label: 'Delete',
          accelerator: 'CmdOrCtrl+Backspace',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('delete')
          },
        },
        { type: 'separator' },
        {
          label: 'Mark as Read',
          accelerator: 'CmdOrCtrl+Shift+U',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('mark-read')
          },
        },
        {
          label: 'Mark as Unread',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            win?.webContents.send('mark-unread')
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' as const }, { role: 'front' as const }, { type: 'separator' as const }, { role: 'window' as const }]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/willem4130/postmaster')
          },
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/willem4130/postmaster/issues')
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
