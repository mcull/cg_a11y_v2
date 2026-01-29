# Creative Growth Accessibility Auditor - Desktop App

A native macOS application for running accessibility audits with a simple, user-friendly interface.

## Features

- 🖥️ **Native Mac App**: Beautiful, native interface that feels at home on macOS
- 🚀 **One-Click Audits**: Run comprehensive accessibility audits with a single button click
- 📊 **Automatic Sync**: Results automatically saved to Supabase and displayed in the web dashboard
- ⚙️ **Easy Configuration**: Simple setup wizard for first-time users
- 🔒 **Secure**: Credentials stored securely in your system keychain
- 📈 **Progress Tracking**: Real-time progress updates during audit execution

## Quick Start

### For End Users (Receiving the .dmg file)

1. **Download** the `Creative Growth Auditor.dmg` file
2. **Open** the .dmg file by double-clicking it
3. **Drag** the app icon to your Applications folder
4. **Launch** the app from Applications
5. **First-time setup**: Enter your Supabase credentials (provided separately)
6. **Run** your first audit!

### For Developers

#### Prerequisites

- Node.js 18+
- npm 9+
- macOS 10.15+ (for building)

#### Installation

```bash
# Navigate to the desktop package
cd packages/desktop

# Install dependencies
npm install

# Run in development mode
npm run dev
```

#### Build for Distribution

```bash
# Build CLI first (required dependency)
cd ../cli
npm install
npm run build

# Build desktop app
cd ../desktop
npm install
npm run build:mac
```

This creates `dist/Creative Growth Auditor-1.0.0.dmg` ready for distribution.

## First-Time Configuration

When you first launch the app, you'll need to configure:

### 1. Supabase Connection

- **Supabase URL**: Your Supabase project URL (e.g., `https://xxx.supabase.co`)
- **Supabase Anon Key**: Your Supabase anonymous key (starts with `eyJ...`)

*Note: These credentials should be provided to you securely. Never share them publicly.*

### 2. Dashboard URL

- **Dashboard URL**: Where audit results are displayed (e.g., `https://your-project.vercel.app`)

### 3. Test Connection

Click "Test Connection" to verify your Supabase credentials work correctly before saving.

## Using the App

### Running an Audit

1. **Enter Website URL**: Type or paste the website URL you want to audit (default: https://creativegrowth.org)
2. **Click "Run Audit"**: The audit will begin immediately
3. **Monitor Progress**: Watch the progress bar and status messages
4. **View Results**: When complete, click "View Results in Dashboard" to see detailed findings

### Audit Process

The audit typically takes **10-15 minutes** and performs:

- ✅ **Sitemap Analysis**: Fetches and parses the website's sitemap
- ✅ **Page Classification**: Categorizes pages by type (Artist, Artwork, Blog, etc.)
- ✅ **Adaptive Sampling**: Tests 30-100 pages per type based on consistency
- ✅ **Dual-Engine Testing**: Runs both axe-core and Pa11y accessibility tests
- ✅ **Results Storage**: Saves all findings to your Supabase database

### Accessibility Standards Tested

- **WCAG 2.0** Level A & AA
- **WCAG 2.1** Level A & AA
- **WCAG 2.2** Level A & AA
- **Section 508** (US Federal Standard)
- **Best Practices**

## Troubleshooting

### App won't open

- **macOS Security**: Right-click the app and select "Open" instead of double-clicking
- **Quarantine flag**: Run `xattr -d com.apple.quarantine "/Applications/Creative Growth Auditor.app"` in Terminal

### Connection errors

- Verify your Supabase URL and key are correct
- Click "Test Connection" to diagnose the issue
- Ensure your computer has internet access
- Check that Supabase project is active (not paused)

### Audit failures

- **Website unreachable**: Ensure the target website is online
- **Network issues**: Check your internet connection
- **Timeout errors**: Some large websites may take longer; this is normal

### Progress bar stuck

- **Normal behavior**: Some phases (like testing thousands of pages) take time
- **Check console**: If running in dev mode, check the console for errors
- **Restart**: If truly stuck (>30 min), close and restart the app

## Settings

Access settings anytime by clicking "⚙️ Settings" at the bottom of the app.

### Available Settings

- **Supabase URL**: Your database connection URL
- **Supabase Anon Key**: Your database authentication key
- **Dashboard URL**: Where to view results online
- **Default Website URL**: Pre-filled URL for convenience

Settings are saved locally and persist between app launches.

## Technical Details

### Architecture

```
Electron App (Desktop)
  ├── Main Process (Node.js)
  │   └── Runs CLI audit command
  └── Renderer Process (HTML/CSS/JS)
      └── User interface

Results → Supabase Database → Web Dashboard
```

### Dependencies

- **Electron**: ^28.1.0 - Desktop app framework
- **electron-store**: ^8.1.0 - Secure settings storage
- **@cg-a11y/cli**: Your existing CLI package (bundled)
- **Puppeteer**: Headless Chrome for testing (via CLI)
- **axe-core**: Accessibility testing engine (via CLI)
- **Pa11y**: Accessibility testing engine (via CLI)

### File Structure

```
packages/desktop/
├── main.js           # Electron main process
├── preload.js        # IPC bridge (security layer)
├── renderer/
│   ├── index.html    # UI structure
│   ├── styles.css    # UI styling
│   └── renderer.js   # UI logic
├── assets/           # Icons and resources
└── package.json      # App configuration
```

### Security

- **No Node.js in renderer**: Uses `contextIsolation` for security
- **IPC Bridge**: Controlled communication via preload script
- **Secure Storage**: Credentials stored in system keychain
- **No remote code**: All code bundled with app

## Building Updates

When you release a new version:

1. **Update version** in `package.json`
2. **Build**: Run `npm run build:mac`
3. **Test**: Install the .dmg and verify functionality
4. **Distribute**: Share the .dmg file with users

### Auto-Updates (Future Enhancement)

The app structure supports `electron-updater` for automatic updates. To enable:

1. Set up update server (GitHub Releases, etc.)
2. Add `autoUpdater` configuration
3. App will check for updates on launch

## Support

### For Users

Contact your administrator or technical support for:
- Supabase credentials
- Dashboard access issues
- General questions about accessibility findings

### For Developers

Issues and questions:
- Check the main project README
- Review CLI documentation in `packages/cli/`
- Check Electron documentation: https://www.electronjs.org/docs

## License

MIT License - Copyright 2025 Marc Cull

---

**Made with [Electron](https://www.electronjs.org/) + [Creative Growth Accessibility CLI](../cli/)**
