---
name: commit
description: Run checks, commit with AI message, and push
---

# Smart Commit

This command runs all code quality checks, then creates a commit with an AI-generated message and pushes to remote.

## Step 1: Run Pre-Commit Checks

Run all quality checks before committing:

```bash
npm run typecheck && npm run lint && npm run format:check
```

If any check fails, fix the issues first (you can use `/fix` command).

## Step 2: Review Changes

Check what will be committed:

```bash
git status
git diff --staged
```

If nothing is staged, stage the relevant files:
```bash
git add -A  # Or add specific files
```

## Step 3: Generate Commit Message

Analyze the changes and generate an appropriate commit message following Conventional Commits:

**Format**: `<type>(<scope>): <description>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or fixing tests
- `chore`: Maintenance tasks (deps, build, etc.)

**Examples**:
- `feat(email): add Microsoft OAuth integration`
- `fix(ui): correct button alignment in sidebar`
- `chore(deps): update React to v19`

## Step 4: Create Commit

Create the commit with the generated message:

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

<optional body with more details>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

## Step 5: Push to Remote

Push to the remote repository:

```bash
git push origin HEAD
```

If the branch doesn't have an upstream, set it:
```bash
git push -u origin HEAD
```

## Step 6: Report Result

Report the commit hash and branch name:
```bash
git log -1 --oneline
git branch --show-current
```
