---
name: fix
description: Run typechecking, linting, and formatting, then spawn parallel agents to fix all issues
---

# Project Code Quality Check

This command runs all linting and typechecking tools for this project, collects errors, groups them by domain, and spawns parallel agents to fix them.

## Step 1: Run Linting and Typechecking

Run these commands to detect issues:

```bash
# TypeScript type checking
npm run typecheck 2>&1

# ESLint
npm run lint 2>&1

# Prettier format check
npm run format:check 2>&1
```

## Step 2: Collect and Parse Errors

Parse the output from each command. Group errors by domain:
- **Type errors**: TypeScript compiler errors (TS2xxx codes)
- **Lint errors**: ESLint warnings and errors
- **Format errors**: Prettier formatting issues

Create a list of all files with issues and the specific problems in each file.

## Step 3: Spawn Parallel Agents

For each domain that has issues, spawn an agent in parallel using the Task tool.

**IMPORTANT**: Use a SINGLE response with MULTIPLE Task tool calls to run agents in parallel.

For **type errors**, spawn a "type-fixer" agent with prompt:
```
Fix all TypeScript type errors in this project. Here are the errors:
[LIST OF TYPE ERRORS]

For each error:
1. Read the file
2. Fix the type issue
3. Run `npm run typecheck` to verify the fix
```

For **lint errors**, spawn a "lint-fixer" agent with prompt:
```
Fix all ESLint errors in this project. Here are the errors:
[LIST OF LINT ERRORS]

For each error:
1. Read the file
2. Fix the linting issue (or add disable comment if appropriate)
3. Run `npm run lint` to verify the fix
```

For **format errors**, spawn a "format-fixer" agent with prompt:
```
Fix all formatting issues in this project by running:
npm run format

Then verify with:
npm run format:check
```

## Step 4: Verify All Fixes

After all agents complete, run the full check again:

```bash
npm run typecheck && npm run lint && npm run format:check
```

Report success if all commands pass with no errors.
