# 📦 Installation Instructions - Next.js 16 Upgrade

## Step 1: Clean Previous Installation

```bash
cd frontend/web-5scent
rm -rf node_modules package-lock.json .next
```

## Step 2: Install Dependencies

```bash
npm install
```

**If you encounter peer dependency warnings**, use:

```bash
npm install --legacy-peer-deps
```

This is safe because:
- @headlessui/react v2.2.0 supports React 19 (the peer dependency warning is a false positive)
- All other dependencies are compatible

## Step 3: Verify Installation

### Check versions:
```bash
npm list next react react-dom
```

Should show:
- next@16.1.0
- react@19.0.0
- react-dom@19.0.0

### Run development server:
```bash
npm run dev
```

### Run linter:
```bash
npm run lint
```

### Build for production:
```bash
npm run build
```

## Troubleshooting

### Issue: ESLint errors about flat config
**Solution:** Make sure `eslint.config.mjs` exists and `.eslintrc.json` is deleted.

### Issue: Tailwind CSS not working
**Solution:** 
1. Check `postcss.config.mjs` has `@tailwindcss/postcss` plugin
2. Check `app/globals.css` has `@import "tailwindcss"` at the top

### Issue: TypeScript errors
**Solution:** 
1. Delete `node_modules` and reinstall
2. Run `npm run build` to see specific errors

### Issue: React 19 type errors
**Solution:** Make sure `@types/react` and `@types/react-dom` are version 19.x

## What Changed

✅ Next.js 14 → 16.1.0
✅ React 18 → 19.0.0
✅ ESLint 8 → 9 (flat config)
✅ Tailwind CSS → v4
✅ All dependencies updated to latest stable

See `UPGRADE_SUMMARY.md` for complete details.


