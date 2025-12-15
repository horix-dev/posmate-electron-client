# Seed Issues (Copy-Ready)

Use these as starting points. Replace specifics and submit via templates.

## Feature: Persist route on reload in Electron

- Title: [Feature] Persist route on reload in Electron
- Labels: type:feature, area:electron, priority:medium

### Summary
Preserve current route across Ctrl+R reloads in Electron by tracking location and appending hash to `loadURL`.

### Scope
- In: `electron/main.ts`, `electron/preload.ts`, `src/components/layout/AppShell.tsx`
- Out: Web-only router changes

### Acceptance Criteria
- Given user is on `/pos`
  - When pressing Ctrl+R
  - Then app reloads and stays on `/pos`

### Technical Notes
- Add `lastRoute` in main
- Expose `trackRoute()` in preload
- Send `location.pathname` from AppShell

### Estimate
2h

### QA Steps
- Navigate to POS, reload → stays
- Navigate to Settings, reload → stays

---

## Bug: Variable product treated as simple offline

- Title: [Bug] Variable product treated as simple when offline
- Labels: type:bug, area:pos, priority:urgent

### Description
When loaded from offline cache, variable products are missing variants and stocks.

### Steps to Reproduce
1. Go offline
2. Open POS and load product 534543
3. Click card → added directly without variant selection

### Expected
Variant selection opens with correct attribute values and stock.

### Actual
Added as simple product; stock appears 0.

### Acceptance Criteria
- Offline cache includes `product_variants` and `variant_stocks`
- POS reads `variants[].stocks[]` for stock

### Technical Notes
- SQLite schema: add tables, upsert variants+stocks
- Update `usePOSData` to preserve arrays

### Estimate
5h

### Logs & Screenshots
N/A

---

## Epic: Variable product end-to-end support

- Title: [Epic] Variable product end-to-end support
- Labels: type:epic, area:products, priority:high

### Goal
Enable full lifecycle management and POS support for variable products.

### Scope
- In: Products CRUD, Variants management UI, POS variant selection, Offline schema
- Out: Advanced reports

### Roadmap
- Phase 1: Schema + Offline
- Phase 2: POS selection + stock calc
- Phase 3: Products UI (VariantManager)

### Tracking
Link child issues for each phase (tracked by).

### Risks
Backend API completeness; ensure Laravel provides variants/attribute values.
