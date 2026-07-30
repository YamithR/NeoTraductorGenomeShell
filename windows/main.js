const { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.yamithr.neotraductor');
}

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const HISTORY_PATH = path.join(app.getPath('userData'), 'history.json');

let mainWindow = null;
let tray = null;
let config = {};
let history = [];
let isQuitting = false;

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {}
  const defaults = {
    'source-lang': 'auto',
    'target-lang': 'en',
    'auto-clipboard': false,
    'shortcut-key': 'Ctrl+Shift+T',
    'history-size': 10,
    'max-text-length': 5000,
    'menu-bg-color': 'default',
    'menu-opacity': 1.0,
    'result-bg-color': 'default',
    'input-bg-color': 'default',
    'window-width': 380,
    'window-height': 520,
    'always-on-top': true
  };
  for (const [key, val] of Object.entries(defaults)) {
    if (config[key] === undefined) config[key] = val;
  }
  return config;
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving config:', e);
  }
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
    }
  } catch {
    history = [];
  }
}

function saveHistory() {
  try {
    const maxSize = config['history-size'] || 10;
    if (history.length > maxSize) history = history.slice(0, maxSize);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving history:', e);
  }
}

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const winWidth = config['window-width'] || 380;
  const winHeight = config['window-height'] || 520;
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  let winIcon;
  try {
    winIcon = nativeImage.createFromPath(iconPath);
    if (winIcon.isEmpty()) winIcon = undefined;
  } catch {
    winIcon = undefined;
  }

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: workArea.width - winWidth - 20,
    y: 60,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: 320,
    minHeight: 400,
    skipTaskbar: true,
    alwaysOnTop: config['always-on-top'] !== false,
    show: false,
    icon: winIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('resize', () => {
    const [w, h] = mainWindow.getSize();
    config['window-width'] = w;
    config['window-height'] = h;
    saveConfig();
  });

  mainWindow.on('blur', () => {
    if (!mainWindow?.isFocused()) {
      mainWindow?.hide();
    }
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showWindow() {
  if (!mainWindow) createWindow();
  if (mainWindow.isVisible()) {
    mainWindow.hide();
    return;
  }
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const winWidth = config['window-width'] || 380;
  mainWindow.setPosition(workArea.width - winWidth - 20, 60);
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('focus-input');
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  let trayIcon;
  try {
    const iconPng = path.join(__dirname, 'assets', 'tray-icon.png');
    const img = nativeImage.createFromPath(iconPng);
    trayIcon = img.isEmpty() ? nativeImage.createEmpty() : img.resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('NeoTraductor');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar/Ocultar',
      click: () => showWindow()
    },
    { type: 'separator' },
    {
      label: 'Configurar atajo...',
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow.webContents.send('open-settings');
        showWindow();
      }
    },
    {
      label: 'Acerca de...',
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow.webContents.send('open-about');
        showWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => showWindow());
}

function registerShortcuts() {
  const shortcut = config['shortcut-key'] || 'Ctrl+Shift+T';
  globalShortcut.unregisterAll();

  const registered = globalShortcut.register(shortcut, () => {
    showWindow();
  });

  if (!registered) {
    console.warn(`Failed to register shortcut: ${shortcut}`);
  }
}

ipcMain.handle('translate', async (event, { text, source, target }) => {
  const { translateText } = require('./utils/translator.js');
  try {
    const result = await translateText(text, source, target, 10000);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-config', () => config);

ipcMain.handle('set-config', (event, updates) => {
  Object.assign(config, updates);
  saveConfig();
  if (updates['shortcut-key']) registerShortcuts();
  if (updates['always-on-top'] !== undefined && mainWindow) {
    mainWindow.setAlwaysOnTop(config['always-on-top'] !== false);
  }
  return config;
});

ipcMain.handle('get-history', () => history);

ipcMain.handle('add-history', (event, entry) => {
  const maxSize = config['history-size'] || 10;
  if (maxSize <= 0) return history;
  history.unshift({
    ...entry,
    timestamp: Date.now()
  });
  if (history.length > maxSize) history = history.slice(0, maxSize);
  saveHistory();
  return history;
});

ipcMain.handle('clear-history', () => {
  history = [];
  saveHistory();
  return history;
});

ipcMain.handle('copy-to-clipboard', (event, text) => {
  if (mainWindow) {
    mainWindow.webContents.clipboard.writeText(text);
  }
});

ipcMain.handle('get-app-info', () => ({
  name: 'NeoTraductor',
  version: '1.2.1',
  description: 'Traductor automático desde la bandeja del sistema',
  author: 'Yamith Romero',
  email: 'yamithr@users.noreply.github.com',
  github: 'https://github.com/YamithR',
  repo: 'https://github.com/YamithR/NeoTraductorGenomeShell'
}));

ipcMain.handle('set-shortcut', (event, shortcut) => {
  config['shortcut-key'] = shortcut;
  saveConfig();
  registerShortcuts();
  return true;
});

app.whenReady().then(() => {
  loadConfig();
  loadHistory();
  createWindow();
  createTray();
  registerShortcuts();
});

ipcMain.on('close-app', () => {
  isQuitting = true;
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});
