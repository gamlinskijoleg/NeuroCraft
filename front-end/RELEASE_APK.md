# Front-End APK Release Checklist

## ✅ Prerequisites

- [ ] `eas-cli` installed: `npm install -g eas-cli`
- [ ] Expo account created and logged in: `eas login`
- [ ] Android keystore configured (or let EAS manage it)
- [ ] GitHub repository is public or EAS has access

## ✅ Configuration Check

### App Version & Build Number
- [ ] Update `version` in [app.json](app.json) if needed (currently: 1.0.0)
- [ ] Increment `android.versionCode` for each release

### Bundle Identifier
- [ ] Android package name: `com.anonymous.frontend` ✓

### Permissions & Features
- [ ] Photo library permission configured ✓
- [ ] Image picker plugin configured ✓

### API Configuration
- [ ] `EXPO_PUBLIC_API_URL` set to production API
  ```bash
  # For Render deployment:
  $env:EXPO_PUBLIC_API_URL="https://your-api.render.com"
  ```

## 📦 Build Steps

### Step 1: Update Version
```bash
# In app.json, update:
"version": "1.0.1"  # increment patch version
```

### Step 2: Set Production API URL
```bash
# Windows PowerShell
$env:EXPO_PUBLIC_API_URL="https://your-render-api.render.com"

# macOS/Linux
export EXPO_PUBLIC_API_URL="https://your-render-api.render.com"
```

### Step 3: Build APK (Preview)
```bash
npm run build:android:preview
```
- Generates testable APK
- Can be distributed for QA testing
- Not submitted to Play Store

### Step 4: Test APK
- [ ] Download APK from EAS
- [ ] Install on physical device or emulator
- [ ] Test all features:
  - [ ] Traffic signs detection
  - [ ] Road damage detection
  - [ ] API communication
  - [ ] Image upload/processing
  - [ ] Error handling

### Step 5: Build Production APK
```bash
npm run build:android:prod
```
- Generates production-ready APK
- Signed with production certificate
- Ready for Google Play Store

### Step 6: Submit to Google Play Store (Optional)
```bash
npm run submit:android
```
- Requires Google Play Console account
- Requires signed APK
- Includes store listing setup

## 🔐 Secrets & Keys

### EAS Build Secrets (if needed)
```bash
# Set environment variables for build
eas secret:create --scope project --name EXPO_PUBLIC_API_URL
# Enter value: https://your-api.render.com
```

## 📋 Release Notes Template
```
Version 1.0.1
- Fixed API configuration for centralized endpoint
- Updated Python backend deployment
- Improved error handling
- Support for production API URLs
```

## 🚀 Distribution Options

### Direct APK Distribution
1. Download APK from EAS Dashboard
2. Share via:
   - Direct download link
   - GitHub Releases
   - Firebase App Distribution
   - Internal testing

### Google Play Store
1. Create app listing in Google Play Console
2. Upload APK
3. Write store listing details
4. Submit for review (~1-3 days)

## 🔍 Pre-Release Verification

Before building, verify:
- [ ] All code committed to `main` branch
- [ ] No console errors or warnings
- [ ] API endpoints working
- [ ] Models loaded on backend
- [ ] Backend deployed to production
- [ ] `EXPO_PUBLIC_API_URL` points to production API
- [ ] App version incremented
- [ ] No sensitive data in code

## 📱 Device Testing

Test on:
- [ ] Android 11+
- [ ] Android 12+
- [ ] Android 13+
- [ ] Physical device (not just emulator)
- [ ] Different screen sizes

## 🐛 Known Issues

None currently documented. Add any issues here before release.

## 📚 Useful Commands

```bash
# Check build status
eas build:list

# View build logs
eas build:view

# Download APK
# (Available in EAS Dashboard)

# Create local build
eas build --local --platform android --profile preview

# Logout
eas logout
```

## 📖 Documentation Links

- [Expo EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [Google Play Console](https://play.google.com/console)
- [App Configuration](./app.json)
- [API Config](./API_CONFIG.md)
