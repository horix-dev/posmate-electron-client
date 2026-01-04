# Horix POSMATE - Desktop Client

Modern, offline-first Point of Sale system built with React, TypeScript, and Electron. Designed for retail businesses requiring reliable operations even without internet connectivity.

## 🚀 Features

- **Offline-First Architecture** - Full POS functionality works without internet
- **Real-time Sync** - Automatic background synchronization when online
- **Product Management** - Support for simple and variable products with variants
- **Sales & Purchases** - Complete transaction management with payment tracking
- **Stock Adjustments** - Track inventory changes with reason codes
- **Multi-currency Support** - Flexible currency handling
- **Modern UI** - Clean, responsive interface built with shadcn/ui
- **Desktop Native** - Built with Electron for Windows/Mac/Linux

## 🛠️ Tech Stack

- **Frontend Framework**: React 18 + TypeScript 5.9
- **Build Tool**: Vite
- **Desktop**: Electron
- **State Management**: Zustand with persist middleware
- **Data Storage**: IndexedDB (Dexie.js) + SQLite (Electron)
- **API Client**: Axios with interceptors
- **UI Components**: shadcn/ui + Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns

## 📋 Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Backend API**: Laravel REST API (running separately)

## 🏁 Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd posmate-custom-frontend

# Install dependencies
npm install
```

### Configuration

1. Create environment configuration (if needed):
```bash
cp .env.example .env
```

2. Update API endpoint in your configuration to point to the Laravel backend.

### Development

```bash
# Start development server with hot reload
npm run dev

# Start development server with Electron
npm run electron:dev
```

The app will be available at `http://localhost:5173`

### Building

```bash
# Build for production
npm run build

# Build Electron app for current platform
npm run electron:build

# Type check
npm run typecheck

# Lint code
npm run lint

# Run tests
npm run test
```

## 📁 Project Structure

```
src/
├── api/              # API services and configuration
│   └── services/     # Feature-specific API services
├── assets/           # Static assets (images, fonts)
├── components/       # Shared components
│   ├── common/       # Reusable components (StatCard, etc.)
│   ├── layout/       # Layout components (TitleBar, Sidebar)
│   └── ui/           # shadcn/ui components
├── hooks/            # Shared React hooks
├── lib/              # Generic utilities and helpers
│   ├── cache/        # Caching utilities
│   ├── db/           # IndexedDB setup (Dexie)
│   └── errors/       # Error handling utilities
├── pages/            # Feature modules (feature-based structure)
│   ├── dashboard/    # Dashboard page
│   ├── products/     # Products module
│   │   ├── components/
│   │   ├── hooks/
│   │   └── schemas/
│   ├── sales/        # Sales module
│   │   ├── components/
│   │   ├── hooks/
│   │   └── helpers.ts
│   ├── purchases/    # Purchases module
│   └── inventory/    # Inventory/Stock adjustments module
├── stores/           # Zustand state management
├── types/            # TypeScript type definitions
└── App.tsx           # Main application component

electron/             # Electron main process
└── main.ts           # Electron entry point
```

## 🏗️ Architecture

### Offline-First Design

The application is built with an offline-first approach:

1. **Local Data Storage**: All data is cached in IndexedDB for instant access
2. **API Caching**: 5-minute TTL for frequently accessed data
3. **Sync Queue**: Failed requests are queued and retried when online
4. **Optimistic Updates**: UI updates immediately, syncs in background

### State Management

- **Zustand Stores**: Used for global state with localStorage persistence
- **React Query**: Not used (manual cache management for offline support)
- **Local Storage**: Persists authentication, settings, and critical data

### Component Patterns

- **Feature-based modules**: Each page has its own hooks, components, and utilities
- **Reusable components**: Shared components in `components/common/`
- **Consistent styling**: All pages use StatCard and other shared components

## 🔑 Key Concepts

### Authentication
- JWT-based authentication with the Laravel backend
- Token stored in localStorage with auto-refresh
- Automatic logout on token expiration

### Data Synchronization
- Background sync every 5 minutes when online
- Manual sync trigger available in UI
- Conflict resolution (last-write-wins)

### Currency Handling
- Pre-fetched on app load
- Centralized `useCurrency` hook
- Fallback to business default currency

### Error Handling
- Typed errors from `lib/errors/`
- User-friendly toast notifications
- Automatic retry for network failures

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run electron:dev` - Start Electron in development
- `npm run electron:build` - Build Electron app
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI

## 🤝 Contributing

1. Read `DEVELOPMENT_LOG.md` to understand current architecture and patterns
2. Follow the existing code style and patterns
3. Encapsulate business logic in custom hooks, not components
4. Use the repository pattern for IndexedDB access
5. All data fetching hooks must have offline fallback
6. Update `DEVELOPMENT_LOG.md` after making significant changes

### Code Guidelines

- **TypeScript Strict Mode**: Enabled
- **Component Structure**: Use feature-based modules
- **State Management**: Zustand for global state, local state for UI
- **Styling**: Tailwind CSS with shadcn/ui components
- **API Calls**: Through service layer in `src/api/services/`

## 📚 Documentation

- `DEVELOPMENT_LOG.md` - Architecture and implementation history
- `START-HERE.md` - Quick start guide for developers
- `.github/copilot-instructions.md` - Development guidelines and patterns
- `docs/` - Additional documentation

## 🐛 Known Issues

- TypeScript 5.9.3 is not officially supported by @typescript-eslint (works fine)

## 📄 License

[Add your license here]

## 👥 Team

Developed for Horix POS Pro
