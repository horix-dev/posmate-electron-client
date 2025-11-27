# Copilot Instructions for Horix POS Pro

## Project Context

Before making changes, always read `DEVELOPMENT_LOG.md` in the project root for:
- Current architecture and patterns
- Recently implemented features
- Known issues and solutions
- Best practices to follow

## Key Guidelines

### Architecture
- Follow feature-based module structure (each page has own hooks/components)
- Use repository pattern for IndexedDB access
- Encapsulate business logic in custom hooks, not components
- API calls go through service layer (`src/api/services/`)

### Offline Support
- All data fetching hooks must have offline fallback
- Use `src/lib/cache/index.ts` for caching (with TTL)
- Use `useOnlineStatus` hook for online/offline detection
- Queue mutations in IndexedDB when offline

### Error Handling
- Use typed errors from `src/lib/errors/index.ts`
- Use `createAppError()` for consistent error creation
- Always show user-friendly toast messages

### State Management
- Use Zustand stores in `src/stores/`
- Cart store is persisted (offline-capable)
- Sync store manages the sync queue

### Code Style
- TypeScript strict mode
- Use shadcn/ui components from `src/components/ui/`
- Follow existing patterns in similar files

## After Making Changes

Update `DEVELOPMENT_LOG.md` with:
1. Date and feature/fix name
2. Problem description (if bug fix)
3. Solution implemented
4. Files modified/created
