# Creative Growth Auditor Installation Guide

## macOS Installation

The Creative Growth Auditor is currently unsigned. To install:

### Method 1: Right-Click to Open
1. Double-click the DMG file to mount it
2. Drag "Creative Growth Auditor.app" to Applications
3. **Right-click** (or Control-click) on the app in Applications
4. Select "Open" from the menu
5. Click "Open" in the dialog that appears
6. The app will now run and be trusted for future launches

### Method 2: Command Line
1. Install the app from the DMG
2. Open Terminal
3. Run this command:
   ```bash
   xattr -cr "/Applications/Creative Growth Auditor.app"
   ```
4. Double-click the app to launch

### Why This Happens
This app is not yet code-signed with an Apple Developer certificate. The methods above tell macOS you trust this application.

## First Run Setup

After launching, you'll need to:
1. Click "Configure" to set up your Supabase credentials
2. Enter the Supabase URL and Service Role Key
3. Click "Save Configuration"
4. Start your first audit!
