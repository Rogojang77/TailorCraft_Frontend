# Path alias resolution & utils architecture

This document describes the canonical fix for `Unable to resolve "@/utils/..."` bundling failures (Metro/iOS) and how to prevent them.

## 1. Root-cause analysis (repeated alias failures)

| Cause | Description |
|-------|-------------|
| **Missing or renamed files** | The module file (e.g. `utils/pdfGenerator.ts`) does not exist or was moved without updating imports. |
| **Incorrect folder structure** | File lives under `lib/` or `src/` instead of `utils/`. |
| **Filename / casing** | Wrong name (e.g. `pdfgenerator.ts`) or wrong case (e.g. `GarmentIcons.tsx`); iOS/Metro can be case-sensitive. |
| **Barrel vs direct imports** | Direct `@/utils/garmentIcons` can break when Metro resolves differently than TypeScript; barrel `@/utils` is the single resolution point. |
| **tsconfig works, Metro/Babel does not** | TypeScript resolves `paths`; Metro does not read tsconfig. Without Babel `module-resolver`, Metro fails at bundle time. |
| **expo-router entry** | expo-router does not change module resolution; the issue is Metro/alias config. |
| **Stale Metro cache** | Old resolution cached; clear with `npx expo start --clear`. |

## 2. Project-wide audit plan

1. **Locate every `@/utils/*` import**
   - Run: `rg "from ['\"]@/utils/" --type-add 'source:*.{ts,tsx}' -t source .`
   - Or: search in IDE for `@/utils/`.

2. **Verify file existence**
   - For each imported path (e.g. `@/utils/pdfGenerator`), ensure `utils/pdfGenerator.ts` or `utils/pdfGenerator.tsx` exists.

3. **Detect casing mismatches**
   - Compare import path segment after `@/utils/` with the actual filename (e.g. `garmentIcons` vs `GarmentIcons`). Use exact casing.

4. **Detect orphaned imports**
   - Ensure every export used in the app is re-exported from `utils/index.ts` (the barrel).

5. **Enforce canonical pattern**
   - Run: `npm run check:aliases`. This fails if any file imports from `@/utils/...` instead of `@/utils`.

## 3. Canonical solution (implemented)

- **tsconfig.json**: `baseUrl: "."` and `paths: { "@/*": ["./*"] }` so TypeScript resolves `@/` to project root.
- **babel.config.js**: `babel-plugin-module-resolver` with `alias: { "@": path.resolve(__dirname, '.') }` and `extensions` including `.ts`/`.tsx` so Metro (via Babel) resolves `@/` at bundle time.
- **metro.config.js**: No change; Babel rewrites imports before Metro sees them.
- **Single import pattern**: Use `import { ... } from '@/utils'` only; do not use `@/utils/garmentIcons` etc.

## 4. Utils architecture

```
utils/
├── index.ts          # Barrel: re-exports all utils (required)
├── snapshotDisplay.ts
├── garmentIcons.tsx
└── pdfGenerator.ts
```

- **Barrel**: `utils/index.ts` re-exports every public symbol from the modules above.
- **Naming**: One module per concern; PascalCase for components, camelCase for util files.
- **New utils**: Add the module, then add the export to `utils/index.ts`. Import only from `@/utils`.

## 5. Cache clear & rebuild (Expo)

Run from project root (`TailorCraft-Frontend`):

```bash
# Metro cache
npx expo start --clear

# Full clean (if native build still misbehaves)
rm -rf node_modules/.cache
npx expo start --clear
# Then in another terminal:
npx expo run:ios
```

For a full iOS clean build:

```bash
cd ios && xcodebuild clean -workspace *.xcworkspace -scheme TailorCraft 2>/dev/null; cd ..
npx expo run:ios
```

## 6. Prevention (CI & guarantees)

- **TypeScript**: `npm run typecheck` (`tsc --noEmit`) fails on any unresolved module. Run in CI.
- **Alias pattern**: `npm run check:aliases` fails if any source file imports from `@/utils/...` (direct path). Run in CI.
- **CI script**: `npm run ci` runs `typecheck`, `check:aliases`, and `lint`. Use this in your pipeline.

Add to CI (e.g. GitHub Actions):

```yaml
- run: npm run ci
```

## 7. Adding a new util

1. Create `utils/<name>.ts` (or `.tsx` if it contains JSX).
2. Export the function/symbol from that file.
3. In `utils/index.ts`, add: `export { ... } from './<name>';`
4. In app code, use only: `import { ... } from '@/utils';`
5. Run `npm run check:aliases` and `npm run typecheck`.
