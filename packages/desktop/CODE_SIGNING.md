# Code Signing Guide for macOS Distribution

## Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com

2. **Developer ID Application Certificate**
   - Log into Apple Developer portal
   - Go to Certificates, Identifiers & Profiles
   - Create a "Developer ID Application" certificate
   - Download and install in Keychain Access

## Configuration

### 1. Find Your Certificate Identity

Open Terminal and run:
```bash
security find-identity -v -p codesigning
```

Look for "Developer ID Application: Your Name (TEAM_ID)"

### 2. Update package.json

Add code signing configuration to `packages/desktop/package.json`:

```json
{
  "build": {
    "appId": "org.creativegrowth.auditor",
    "productName": "Creative Growth Auditor",
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": ["dmg"],
      "icon": "assets/cgally1.png",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    },
    "afterSign": "build/notarize.js"
  }
}
```

### 3. Create Entitlements File

Create `packages/desktop/build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

### 4. Set Up Notarization

Install dependencies:
```bash
npm install electron-notarize --save-dev
```

Create `packages/desktop/build/notarize.js`:

```javascript
const { notarize } = require('electron-notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'org.creativegrowth.auditor',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID
  });
};
```

### 5. Set Environment Variables

Create `.env` file (never commit this!):
```bash
APPLE_ID=your-apple-id@example.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=XXXXXXXXXX
```

To get an app-specific password:
1. Go to https://appleid.apple.com
2. Sign in
3. Security > App-Specific Passwords
4. Generate a new password

### 6. Build Signed App

```bash
cd packages/desktop
npm run build:mac
```

The resulting DMG will be signed and notarized, allowing it to open on any Mac without warnings.

## Testing

After building, test the signed app:
```bash
spctl -a -vvv -t install "/path/to/Creative Growth Auditor.dmg"
```

Should show: "accepted" and "source=Notarized Developer ID"
