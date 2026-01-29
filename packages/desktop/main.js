const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { spawn } = require('child_process');

// Don't import CLI directly - we'll run it as a subprocess

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

    // Find the CLI executable path based on whether we're in dev or production
    const isDev = !app.isPackaged;
    const cliPath = isDev
      ? path.join(__dirname, '../cli/dist/cli.js')
      : path.join(process.resourcesPath, 'cli', 'dist', 'cli.js');

    const configPath = isDev
      ? path.join(__dirname, '../cli/config.yaml')
      : path.join(process.resourcesPath, 'cli', 'config.yaml');

    // Run the audit as a subprocess
    await new Promise((resolve, reject) => {
      const auditProcess = spawn('node', [cliPath, 'audit', url, '--config', configPath, '--skip-db=false'], {
        env: {
          ...process.env,
          SUPABASE_URL: settings.supabaseUrl,
          SUPABASE_ANON_KEY: settings.supabaseKey,
        },
      });

      let output = '';
      let errorOutput = '';

      auditProcess.stdout.on('data', (data) => {
        const message = data.toString();
        output += message;
        sendProgress(message.trim());
      });

      auditProcess.stderr.on('data', (data) => {
        const message = data.toString();
        errorOutput += message;
        console.error('Audit stderr:', message);
      });

      auditProcess.on('close', (code) => {
        if (code === 0) {
          sendProgress('Audit completed successfully!');
          resolve();
        } else {
          reject(new Error(errorOutput || `Audit failed with code ${code}`));
        }
      });

      auditProcess.on('error', (err) => {
        reject(err);
      });
    });

    return {
      success: true,
      message: 'Audit completed successfully!',
      outputPath
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
