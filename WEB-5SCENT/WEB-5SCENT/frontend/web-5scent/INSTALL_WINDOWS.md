# 🪟 Windows PowerShell Installation Guide

## Quick Install (Recommended)

**Option 1: Run the PowerShell script**
```powershell
cd "C:\Users\alifr\Documents\COOLYEAH TELKOM\SEMESTER 5\WEB-5SCENT\frontend\web-5scent"
.\INSTALL_WINDOWS.ps1
```

**Option 2: Manual commands**

### Step 1: Navigate to Directory
```powershell
cd "C:\Users\alifr\Documents\COOLYEAH TELKOM\SEMESTER 5\WEB-5SCENT\frontend\web-5scent"
```

### Step 2: Clean Previous Installation
```powershell
# Remove node_modules
if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }

# Remove package-lock.json
if (Test-Path package-lock.json) { Remove-Item -Force package-lock.json }

# Remove .next build folder
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
```

**Or use this single command:**
```powershell
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules, .next; Remove-Item -Force -ErrorAction SilentlyContinue package-lock.json
```

### Step 3: Install Dependencies
```powershell
npm install --legacy-peer-deps
```

### Step 4: Verify Installation
```powershell
# Check installed versions
npm list next react react-dom --depth=0

# Should show:
# next@16.1.0
# react@19.0.0
# react-dom@19.0.0
```

## Troubleshooting

### Issue: "eslint-config-next@16.1.0 not found"
**Solution:** The package.json now uses exact version `16.1.0` (without `^`). If it still fails:
```powershell
npm cache clean --force
npm install --legacy-peer-deps
```

### Issue: Peer dependency warnings
**Solution:** This is normal. The `--legacy-peer-deps` flag handles this. The warnings are safe to ignore because:
- @headlessui/react v2.2.0 works with React 19
- All other packages are compatible

### Issue: "Cannot find path" error
**Solution:** Make sure you're in the correct directory:
```powershell
# Check current directory
Get-Location

# Should show: C:\Users\alifr\Documents\COOLYEAH TELKOM\SEMESTER 5\WEB-5SCENT\frontend\web-5scent
```

## After Installation

```powershell
# Start development server
npm run dev

# In another terminal, test linting
npm run lint

# Build for production
npm run build
```

## What's Installed

- ✅ Next.js 16.1.0
- ✅ React 19.0.0
- ✅ React DOM 19.0.0
- ✅ ESLint 9 with flat config
- ✅ Tailwind CSS v4
- ✅ All latest dependencies
