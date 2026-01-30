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
├── electron/                    # Electron process code (Node.js runtime)
│   ├── main/                    # Main process entry & window management
│   ├── preload/                 # Context bridge (secure IPC exposure)
│   └── shared/                  # Shared constants between processes
├── src/
│   ├── main/                    # Main process business logic
│   │   ├── ai/                  # Claude SDK integration
│   │   ├── database/            # SQLite + Drizzle ORM
│   │   ├── email/providers/     # Email provider implementations
│   │   ├── services/            # Main process services (future)
│   │   └── workflows/           # Automation rules engine (future)
│   ├── renderer/                # React app (browser runtime)
│   │   ├── components/
│   │   │   ├── ui/              # Generic UI (shadcn/ui)
│   │   │   ├── email/           # Email feature components
│   │   │   ├── sidebar/         # Navigation components
│   │   │   └── settings/        # Settings feature
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API wrappers for IPC calls
│   │   ├── stores/              # Zustand state stores
│   │   ├── lib/                 # Pure utilities
│   │   ├── styles/              # Global CSS
│   │   └── types/               # Renderer-specific types
│   └── shared/
│       └── types/               # Types shared across main & renderer
├── prisma/                      # PostgreSQL schema (cloud sync)
└── build/                       # Electron build configuration
```

## Organization Rules

**Layer boundaries - NEVER cross these:**

| Folder | Contains | NEVER contains |
|--------|----------|----------------|
| `electron/` | Process entry, IPC setup | Business logic |
| `src/main/` | Node.js backend logic | React, browser APIs |
| `src/renderer/` | React UI code | Node.js APIs, direct DB |
| `components/ui/` | Generic UI components | Business logic, API calls |
| `components/[feature]/` | Feature-specific UI | Direct database access |
| `hooks/` | Custom React hooks | UI components |
| `stores/` | Zustand state | API calls, side effects |
| `services/` | IPC wrappers, API calls | UI components |
| `lib/` | Pure utility functions | React hooks, state |
| `shared/types/` | Type definitions only | Implementation code |

**When creating new files:**
1. Determine if it runs in Main (Node.js) or Renderer (Browser)
2. Pick the correct layer (UI → logic → data)
3. Place in the appropriate folder
4. Import types from `shared/types/` when needed across processes

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
