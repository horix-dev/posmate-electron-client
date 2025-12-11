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

## Backend/API Requirements

**Important:** If you identify a solution that requires changes at the backend/API level, **STOP and inform the user instead of attempting to implement a workaround in the frontend**.

This includes:
- **Data structure issues**: Missing fields, incorrect relationships, or incomplete response data
- **Industry standard requirements**: Solutions that need to follow REST API best practices, proper HTTP status codes, or data validation
- **Architectural patterns**: Changes that affect how data flows between frontend and backend
- **Data integrity**: Issues that require database-level changes or business logic in the backend

In these cases:
1. **Identify the problem** clearly
2. **Explain why** a frontend-only solution is inadequate or violates best practices
3. **Provide the recommended backend changes** with specific implementation details
4. **Wait for backend completion** before implementing the frontend integration

This ensures proper architecture and avoids technical debt from frontend workarounds.

## After Making Changes

Update `DEVELOPMENT_LOG.md` with:
1. Date and feature/fix name
2. Problem description (if bug fix)
3. Solution implemented
4. Files modified/created
