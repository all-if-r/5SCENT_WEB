# 🚀 Installation Guide - Windows PowerShell

## ⚠️ Important: Use PowerShell Commands

You're on Windows, so use PowerShell commands, not bash/Linux commands.

## Quick Install (Copy & Paste)

Open PowerShell and run:

```powershell
# Navigate to project
cd "C:\Users\alifr\Documents\COOLYEAH TELKOM\SEMESTER 5\WEB-5SCENT\frontend\web-5scent"

# Clean old files (PowerShell syntax)
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules, .next
Remove-Item -Force -ErrorAction SilentlyContinue package-lock.json

# Install dependencies
npm install --legacy-peer-deps
```

## What's Fixed

✅ **package.json** - Updated to Next.js 16.1.0 and React 19.0.0
✅ **Exact versions** - Using exact versions (no `^`) for Next.js and eslint-config-next to avoid conflicts
✅ **Overrides** - Added React 19 overrides to handle peer dependencies
✅ **Windows commands** - All commands use PowerShell syntax

## Verify Installation

After installation, check versions:

```powershell
npm list next react react-dom --depth=0
```

Should show:
- next@16.1.0
- react@19.0.0  
- react-dom@19.0.0

## Run the Project

```powershell
npm run dev
```

Visit: http://localhost:3000

## If Installation Still Fails

1. **Clear npm cache:**
   ```powershell
   npm cache clean --force
   ```

2. **Try installing without legacy-peer-deps first:**
   ```powershell
   npm install
   ```

3. **If that fails, use legacy-peer-deps:**
   ```powershell
   npm install --legacy-peer-deps
   ```

## Notes

- The `--legacy-peer-deps` flag is safe to use
- @headlessui/react v2.2.0 supports React 19
- All dependencies are compatible with Next.js 16


