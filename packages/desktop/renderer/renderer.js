// DOM Elements
const settingsSection = document.getElementById('settings-section');
const auditSection = document.getElementById('audit-section');
const resultsSection = document.getElementById('results-section');
const statusMessage = document.getElementById('status-message');
const connectionStatus = document.getElementById('connection-status');
const progressSection = document.getElementById('progress-section');
const progressFill = document.getElementById('progress-fill');
const progressMessage = document.getElementById('progress-message');

// Inputs
const supabaseUrlInput = document.getElementById('supabase-url');
const supabaseKeyInput = document.getElementById('supabase-key');
const dashboardUrlInput = document.getElementById('dashboard-url');

// Buttons
const testConnectionBtn = document.getElementById('test-connection-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const runAuditBtn = document.getElementById('run-audit-btn');
const viewDashboardBtn = document.getElementById('view-dashboard-btn');
const toggleSettingsBtn = document.getElementById('toggle-settings-btn');

// Button text elements
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');

// State
let settings = {};
let isRunning = false;

// Initialize
async function init() {
  // Load settings
  settings = await window.electronAPI.getSettings();

  // Populate inputs
  supabaseUrlInput.value = settings.supabaseUrl || '';
  supabaseKeyInput.value = settings.supabaseKey || '';
  dashboardUrlInput.value = settings.dashboardUrl || '';

  // Check if settings are configured
  if (!settings.supabaseUrl || !settings.supabaseKey) {
    // Show settings on first run
    settingsSection.style.display = 'block';
  } else {
    // Hide settings if already configured
    settingsSection.style.display = 'none';
  }

  // Listen for progress updates
  window.electronAPI.onAuditProgress((message) => {
    showProgress(message);
  });
}

// Toggle settings visibility
toggleSettingsBtn.addEventListener('click', () => {
  if (settingsSection.style.display === 'none') {
    settingsSection.style.display = 'block';
    toggleSettingsBtn.textContent = '⚙️ Hide Settings';
  } else {
    settingsSection.style.display = 'none';
    toggleSettingsBtn.textContent = '⚙️ Settings';
  }
});

// Test connection
testConnectionBtn.addEventListener('click', async () => {
  const url = supabaseUrlInput.value.trim();
  const key = supabaseKeyInput.value.trim();

  if (!url || !key) {
    showConnectionStatus('Please enter both Supabase URL and key', 'error');
    return;
  }

  testConnectionBtn.disabled = true;
  testConnectionBtn.textContent = 'Testing...';

  try {
    const result = await window.electronAPI.testConnection({ supabaseUrl: url, supabaseKey: key });

    if (result.success) {
      showConnectionStatus('✓ Connection successful!', 'success');
    } else {
      showConnectionStatus(`✗ Connection failed: ${result.message}`, 'error');
    }
  } catch (error) {
    showConnectionStatus(`✗ Connection failed: ${error.message}`, 'error');
  } finally {
    testConnectionBtn.disabled = false;
    testConnectionBtn.textContent = 'Test Connection';
  }
});

// Save settings
saveSettingsBtn.addEventListener('click', async () => {
  const newSettings = {
    supabaseUrl: supabaseUrlInput.value.trim(),
    supabaseKey: supabaseKeyInput.value.trim(),
    dashboardUrl: dashboardUrlInput.value.trim(),
  };

  if (!newSettings.supabaseUrl || !newSettings.supabaseKey) {
    showConnectionStatus('Please enter both Supabase URL and key', 'error');
    return;
  }

  saveSettingsBtn.disabled = true;
  saveSettingsBtn.textContent = 'Saving...';

  try {
    await window.electronAPI.saveSettings(newSettings);
    settings = newSettings;
    showConnectionStatus('✓ Settings saved successfully!', 'success');

    // Hide settings after successful save
    setTimeout(() => {
      settingsSection.style.display = 'none';
      toggleSettingsBtn.textContent = '⚙️ Settings';
    }, 1500);
  } catch (error) {
    showConnectionStatus(`✗ Failed to save settings: ${error.message}`, 'error');
  } finally {
    saveSettingsBtn.disabled = false;
    saveSettingsBtn.textContent = 'Save Settings';
  }
});

// Run audit
runAuditBtn.addEventListener('click', async () => {
  console.log('Run Audit button clicked');
  if (isRunning) {
    console.log('Audit already running, ignoring click');
    return;
  }

  // Check if settings are configured
  if (!settings.supabaseUrl || !settings.supabaseKey) {
    console.log('Settings not configured');
    showStatus('Please configure your Supabase settings first', 'error');
    settingsSection.style.display = 'block';
    return;
  }

  // Hardcoded URL for Creative Growth
  const url = 'https://creativegrowth.org';
  console.log('Starting audit for:', url);

  isRunning = true;
  runAuditBtn.disabled = true;
  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline';
  progressSection.style.display = 'block';
  statusMessage.style.display = 'none';

  try {
    console.log('Calling electronAPI.runAudit...');
    const result = await window.electronAPI.runAudit(url);
    console.log('Audit result:', result);

    if (result.success) {
      showStatus('✓ Audit completed successfully!', 'success');

      // Show results section
      resultsSection.style.display = 'block';
      document.getElementById('last-audit-time').textContent =
        `Completed at ${new Date().toLocaleTimeString()}`;

      progressFill.style.width = '100%';
      setTimeout(() => {
        progressSection.style.display = 'none';
        progressFill.style.width = '0%';
      }, 2000);
    } else {
      showStatus(`✗ Audit failed: ${result.message}`, 'error');
      progressSection.style.display = 'none';
    }
  } catch (error) {
    console.error('Audit error:', error);
    showStatus(`✗ Audit failed: ${error.message}`, 'error');
    progressSection.style.display = 'none';
  } finally {
    console.log('Audit finished, resetting UI');
    isRunning = false;
    runAuditBtn.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
  }
});

// View dashboard
viewDashboardBtn.addEventListener('click', async () => {
  const dashboardUrl = settings.dashboardUrl || 'http://localhost:3000';
  await window.electronAPI.openExternal(dashboardUrl);
});

// Helper functions
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

function showConnectionStatus(message, type) {
  connectionStatus.textContent = message;
  connectionStatus.className = `status-message ${type}`;
}

function showProgress(message) {
  progressMessage.textContent = message;

  // Animate progress bar based on message content
  if (message.includes('Starting')) {
    progressFill.style.width = '10%';
  } else if (message.includes('Fetching sitemap')) {
    progressFill.style.width = '20%';
  } else if (message.includes('Classifying')) {
    progressFill.style.width = '30%';
  } else if (message.includes('Testing')) {
    progressFill.style.width = '60%';
  } else if (message.includes('Saving')) {
    progressFill.style.width = '90%';
  } else if (message.includes('completed')) {
    progressFill.style.width = '100%';
  }
}

// Initialize on load
init();
