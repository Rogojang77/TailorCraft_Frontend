# Legacy / Deprecated Screens

This folder contains deprecated screens that are no longer part of the primary user flows.
They are preserved for reference or potential deep-link compatibility.

## Why Deprecated?

The primary new-order flow was refactored to use API-driven garment types and definitions.
These legacy screens rely on static configuration from `constants/garments` instead.

## Deprecated Screens

### `new-order-garment/[garmentId].tsx`

- **Original location:** `app/new-order/[garmentId].tsx`
- **Deprecation date:** 2025-01-31
- **Reason:** Not reachable from the primary new-order flow. The main flow uses:
  - `index` → garment selection (API)
  - `client-data` → client selection
  - `measurements` → all garments in one screen (API-driven definitions)
  - `summary` → order confirmation
- **Data source:** Uses `constants/garments` (static jacket, vest, pants) instead of API `garmentTypes` and `garmentTypeDefinitions`
- **Route:** `/legacy/new-order-garment/[garmentId]` (e.g. `/legacy/new-order-garment/jacket`)
- **No in-app links** point to this screen; it was only reachable via direct URL or deep link.
