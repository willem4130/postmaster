# Postmaster - AI-Powered Desktop Email Client

Modern macOS email client built with Electron, supporting Microsoft 365, Gmail, Hotmail, and custom IMAP domains.

**Stack**: Electron + Vite + React 19 + TypeScript + shadcn/ui + SQLite (Drizzle) + PostgreSQL (Prisma) + Claude AI

**Repository**: https://github.com/willem4130/postmaster

## Quick Start

```bash
# Clone the repository
git clone https://github.com/willem4130/postmaster.git
cd postmaster
```

```bash
# Install dependencies
npm install

# Generate Prisma client (for cloud sync)
npx prisma generate

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development
npm run dev
```

## Project Structure

```
postmaster/
├── electron/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Main entry
│   │   ├── window-manager.ts    # BrowserWindow management
│   │   ├── ipc-handlers.ts      # IPC handlers (accounts, emails, sync, AI)
│   │   └── menu.ts              # Native menu
│   ├── preload/
│   │   └── index.ts             # Context bridge API
│   └── shared/
│       └── ipc-channels.ts      # IPC channel constants
├── src/
│   ├── main/                    # Main process modules
│   │   ├── database/
│   │   │   ├── sqlite.ts        # SQLite connection (better-sqlite3)
│   │   │   ├── schema.ts        # Drizzle schema
│   │   │   └── sync-manager.ts  # Local ↔ Cloud sync
│   │   ├── email/
│   │   │   └── providers/
│   │   │       ├── base-provider.ts      # Abstract provider
│   │   │       ├── microsoft-provider.ts # Microsoft Graph API
│   │   │       ├── gmail-provider.ts     # Gmail API
│   │   │       └── imap-provider.ts      # Generic IMAP
│   │   └── ai/
│   │       └── claude-client.ts # Anthropic SDK integration
│   ├── renderer/                # React app
│   │   ├── App.tsx              # Main app component
│   │   ├── main.tsx             # Entry point
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── email/           # Email components
│   │   │   ├── sidebar/         # Sidebar navigation
│   │   │   └── settings/        # Settings modals
│   │   ├── stores/
│   │   │   ├── email-store.ts   # Email state (Zustand)
│   │   │   └── ui-store.ts      # UI state
│   │   └── lib/
│   │       └── utils.ts         # Utilities (cn, formatDate, etc.)
│   └── shared/
│       └── types/
│           └── email.ts         # Shared TypeScript types
└── prisma/
    └── schema.prisma            # PostgreSQL schema (cloud sync)
```

## Key Commands

```bash
# Development
npm run dev              # Start Electron + Vite dev server
npm run build            # Build for production

# Type checking
npm run typecheck        # Run TypeScript type check

# Database
npm run db:generate      # Generate Drizzle migrations
npm run db:push          # Push Drizzle schema to SQLite
npm run db:studio        # Open Drizzle Studio

# Prisma (Cloud)
npm run prisma:generate  # Generate Prisma client
npm run prisma:push      # Push schema to PostgreSQL
npm run prisma:studio    # Open Prisma Studio

# Code quality
npm run lint             # ESLint
npm run format           # Prettier format
npm run format:check     # Check formatting
```

## Email Providers

| Provider | Authentication | Sync Method |
|----------|---------------|-------------|
| Microsoft 365 | OAuth 2.0 (MSAL) | Graph API delta queries |
| Hotmail/Outlook.com | OAuth 2.0 (MSAL) | Graph API delta queries |
| Gmail | OAuth 2.0 | Gmail History API |
| IMAP (scex.nl, etc.) | Username/Password | UIDVALIDITY + UID tracking |

## AI Features (Claude)

- **Categorization**: Auto-categorize emails (work, personal, finance, etc.)
- **Priority Scoring**: 0-100 priority score with urgency level
- **Summarization**: Thread summaries with key points & action items
- **Entity Extraction**: Dates, amounts, contacts, organizations
- **Reply Suggestions**: AI-generated reply drafts

## Environment Variables

```bash
# Database (PostgreSQL for cloud sync)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Microsoft OAuth
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_TENANT_ID="common"

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Anthropic Claude
ANTHROPIC_API_KEY=""
```

## Data Flow

```
Email Provider (MS/Gmail/IMAP)
         │
         ▼
   ┌─────────────┐
   │ Local SQLite │ ◄── Primary storage, offline-first
   └──────┬──────┘
          │
          │ Background sync (settings, tags, AI metadata)
          ▼
   ┌─────────────┐
   │ Cloud PgSQL │ ◄── Cross-device sync, iPhone app ready
   └─────────────┘
```

## Adding Features

### New Email Provider

1. Create `src/main/email/providers/new-provider.ts`
2. Extend `BaseEmailProvider`
3. Implement required methods: `connect()`, `performInitialSync()`, etc.
4. Add to `ipc-handlers.ts` switch statement

### New AI Feature

1. Add method to `src/main/ai/claude-client.ts`
2. Add IPC handler in `electron/main/ipc-handlers.ts`
3. Add channel to `electron/shared/ipc-channels.ts`
4. Expose in `electron/preload/index.ts`
5. Use in React components via `window.electron.ai.newFeature()`

### New UI Component

1. Add shadcn component: `npx shadcn@latest add <component>`
2. Create custom component in `src/renderer/components/`
3. Use Tailwind + cn() utility for styling

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘N | New message |
| ⌘R | Reply |
| ⌘⇧R | Reply all |
| ⌘⇧F | Forward |
| ⌘E | Archive |
| ⌘⌫ | Delete |
| ⌘K | Command palette |
| ⌘1-3 | Navigate views |
| ⌘, | Settings |

## Tech Decisions

- **Electron**: Native macOS feel, same as pocket-agent
- **SQLite + Drizzle**: Fast local storage, offline-first
- **PostgreSQL + Prisma**: Cloud sync for multi-device
- **TanStack Query**: Server state caching & background sync
- **Zustand**: Simple client state management
- **shadcn/ui**: Modern, accessible, dark-mode-ready components

## Git Workflow

**Main branch**: `main`
**Remote**: `origin` → https://github.com/willem4130/postmaster.git

### Branch Naming Convention
- `feat/<name>` - New features
- `fix/<name>` - Bug fixes
- `chore/<name>` - Maintenance tasks
- `refactor/<name>` - Code refactoring

### Available Commands
- `/fix` - Run typechecking, linting, and auto-fix issues
- `/commit` - Run checks, commit with AI message, and push
- `/update-app` - Update dependencies and fix deprecations
- `/branch` - Create a new feature/fix branch

### Commit Message Format
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
