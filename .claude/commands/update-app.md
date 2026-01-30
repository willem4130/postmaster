---
name: update-app
description: Update dependencies, fix deprecations and warnings
---

# Update Dependencies

This command updates all project dependencies and fixes any deprecation warnings.

## Step 1: Check for Outdated Packages

Run the following to see what's outdated:

```bash
npm outdated
```

## Step 2: Update Dependencies

Update packages in order of risk (lowest to highest):

### 2a. Update Patch Versions (Safe)
```bash
npm update
```

### 2b. Check for Major Updates
```bash
npx npm-check-updates
```

Review the list and update packages that are safe to upgrade.

### 2c. Update Major Versions (One at a Time)
For each major version update:
1. Update the package: `npm install package@latest`
2. Run type check: `npm run typecheck`
3. Run lint: `npm run lint`
4. Fix any breaking changes

## Step 3: Fix Deprecation Warnings

After updating, run:
```bash
npm run dev 2>&1 | head -50
```

Look for deprecation warnings and fix them:
- Update deprecated API usage
- Replace deprecated packages with recommended alternatives
- Update configuration files if needed

## Step 4: Verify Everything Works

Run the full validation suite:
```bash
npm run typecheck && npm run lint && npm run build
```

## Step 5: Commit Updates

If all checks pass, the changes are ready to commit:
```bash
git add package.json package-lock.json
git commit -m "chore: update dependencies"
```
