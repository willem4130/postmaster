---
name: branch
description: Create feature/fix branch with naming convention and safety checks
---

# Create New Branch

This command creates a new git branch following the project's naming conventions with safety checks.

## Step 1: Check Current State

Verify we're on a clean state:

```bash
git status
git branch --show-current
```

If there are uncommitted changes, warn the user and suggest:
- Commit the changes first (`/commit`)
- Stash the changes (`git stash`)
- Discard changes if not needed

## Step 2: Fetch Latest

Ensure we have the latest from remote:

```bash
git fetch origin
```

## Step 3: Determine Branch Type

Ask the user what type of branch they need:

**Branch Types**:
- `feat/` - New feature (e.g., `feat/kanban-view`)
- `fix/` - Bug fix (e.g., `fix/oauth-token-refresh`)
- `chore/` - Maintenance (e.g., `chore/update-deps`)
- `refactor/` - Code refactoring (e.g., `refactor/email-provider`)
- `docs/` - Documentation (e.g., `docs/api-reference`)
- `test/` - Tests (e.g., `test/email-sync`)

## Step 4: Create Branch Name

Generate a branch name based on:
1. The selected type prefix
2. A kebab-case description from the user

**Format**: `<type>/<short-description>`

**Examples**:
- `feat/calendar-integration`
- `fix/imap-connection-timeout`
- `chore/eslint-config-update`

## Step 5: Create and Switch to Branch

Create the branch from the latest main:

```bash
git checkout -b <branch-name> origin/main
```

Or if user wants to branch from current location:
```bash
git checkout -b <branch-name>
```

## Step 6: Push and Set Upstream

Push the new branch to remote:

```bash
git push -u origin <branch-name>
```

## Step 7: Report Success

Confirm the branch creation:
```bash
git branch --show-current
git log -1 --oneline
```

Report:
- Branch name created
- Base commit it branched from
- Ready to start working
