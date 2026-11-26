# 0003 — Firebase for live use; the public portfolio stays on sample data

- **Status:** Accepted
- **Date:** 2026-11-26

## Context
Proofline needs real accounts, shared data and a way for customers to approve proofs before a shop could use it. It is also a portfolio piece: a recruiter should be able to open it and try every screen in seconds, with no login and no chance of seeing someone else's edits.

## Decision
- **Two stores, one interface.** Every screen calls `useShop()` (`src/lib/shop.tsx`). The demo store keeps sample data in the visitor's tab (0002). The live store (`src/lib/firebase/live-store.tsx`) streams jobs from Firestore and applies moves in transactions. Live mode switches on only when all four `NEXT_PUBLIC_FIREBASE_*` settings are present; the public deployment leaves them empty.
- **Roles are custom auth claims.** `scripts/set-role.ts` sets `role` on an account. The same table in `src/lib/roles.ts` drives the UI and is mirrored, move for move, in `firestore.rules`. A move is checked three times: by the screen (only allowed buttons appear), by the live store's transaction against the latest copy of the job, and by the security rules on the server.
- **Customers never sign in.** Staff get a link from `/api/proof-links`, signed with HMAC-SHA256 for one proof round of one job, valid for 14 days. `/api/proofs/[id]` checks it and writes the answer with the Admin SDK. The token is read in the browser, so the page stays static and the token stays out of server logs. A newer proof makes older links stop working.
- **Undo in live mode** is only offered when the same role may make the reverse move, and it runs through the same checked path as any move.

## Consequences
- The rules tests (`tests-rules/`, `npm run test:rules`) need the Firestore emulator and Java 21+. They walk every allowed shop move for every role against both the role table and the rules, so the two can't drift apart silently.
- `@grpc/grpc-js` is pinned to a patched version through `overrides` (Firebase 13 still depends on an older one). The browser SDK doesn't use gRPC; the pin keeps `npm audit --omit=dev` clean.
- Live "today" is the browser's local date; the demo stays frozen at its snapshot date so screenshots and tests never drift.
- Not built yet: creating jobs from the counter screen, editing customers, and email or text delivery of proof links (staff copy the link for now).
