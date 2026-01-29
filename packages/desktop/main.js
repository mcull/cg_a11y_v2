const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize electron-store for settings
const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f5f5f5',
    icon: path.join(__dirname, 'assets/cgally1.png'),
  });

  mainWindow.loadFile('renderer/index.html');

  // Open DevTools for debugging
  // TODO: Remove this in final production build
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

// Get settings
ipcMain.handle('get-settings', async () => {
  return {
    supabaseUrl: store.get('supabaseUrl', ''),
    supabaseKey: store.get('supabaseKey', ''),
    dashboardUrl: store.get('dashboardUrl', 'http://localhost:3000'),
  };
});

// Save settings
ipcMain.handle('save-settings', async (event, settings) => {
  store.set('supabaseUrl', settings.supabaseUrl);
  store.set('supabaseKey', settings.supabaseKey);
  store.set('dashboardUrl', settings.dashboardUrl);

  // Set environment variables for the CLI
  process.env.SUPABASE_URL = settings.supabaseUrl;
  process.env.SUPABASE_ANON_KEY = settings.supabaseKey;

  return { success: true };
});

// Run audit
ipcMain.handle('run-audit', async (event, url) => {
  try {
    // Ensure settings are loaded
    const settings = store.store;

    // Validate settings
    if (!settings.supabaseUrl || !settings.supabaseKey) {
      return {
        success: false,
        message: 'Supabase credentials not configured. Please check Settings.'
      };
    }

    // Set environment variables
    process.env.SUPABASE_URL = settings.supabaseUrl;
    process.env.SUPABASE_ANON_KEY = settings.supabaseKey;

    // Set Puppeteer to use system Chrome on macOS (in packaged app)
    if (process.platform === 'darwin' && app.isPackaged) {
      process.env.PUPPETEER_EXECUTABLE_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }

    // Send progress updates (with safety check)
    const sendProgress = (message) => {
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('audit-progress', message);
        }
      } catch (err) {
        console.log('Could not send progress:', err.message);
      }
    };

    sendProgress('Starting audit...');

    // Find the CLI path based on whether we're in dev or production
    const isDev = !app.isPackaged;
    const cliCommandPath = isDev
      ? path.join(__dirname, '../cli/dist/commands/audit.js')
      : path.join(process.resourcesPath, 'cli', 'dist', 'commands', 'audit.js');

    const configPath = isDev
      ? path.join(__dirname, '../cli/config.yaml')
      : path.join(process.resourcesPath, 'cli', 'config.yaml');

    // Import and run the audit command directly
    const { auditCommand } = require(cliCommandPath);

    await auditCommand({
      url: url,
      config: configPath,
      output: path.join(app.getPath('temp'), 'audit-results.json'),
      skipDb: false,
      onProgress: (message) => {
        sendProgress(message);
      }
    });

    return {
      success: true,
      message: 'Audit completed successfully!'
    };
  } catch (error) {
    console.error('Audit failed:', error);

    // Extract meaningful error message
    let errorMessage = error.message || 'Audit failed';
    if (errorMessage.includes('Invalid API key')) {
      errorMessage = 'Invalid Supabase credentials. Please check your API key in Settings.';
    }

    return {
      success: false,
      message: errorMessage,
      error: error.toString()
    };
  }
});

// Open external URL
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return { success: true };
});

// Test database connection
ipcMain.handle('test-connection', async (event, { supabaseUrl, supabaseKey }) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const client = createClient(supabaseUrl, supabaseKey);

    // Try a simple query
    const { data, error } = await client.from('audits').select('count').limit(1);

    if (error) {
      return {
        success: false,
        message: error.message
      };
    }

    return {
      success: true,
      message: 'Connection successful!'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
});
