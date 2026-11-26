# 0002 — Keep each visitor's demo changes in their browser tab

- **Status:** Accepted
- **Date:** 2026-11-19

## Context
Version 0.2 adds screens that change data: the production board moves jobs, and the customer proof screen approves proofs or sends them back. The in-memory repository from decision 0001 lives on the server. On a deployed demo, server memory is shared by every visitor and is not kept between serverless instances, so one visitor's moves could leak into another's view or vanish at random.

## Decision
The server renders the seeded snapshot. A client store (`src/lib/demo-store.tsx`) holds the visitor's copy, applies every change through the pure rules in `src/lib/workflow.ts`, and saves it to `sessionStorage` for that tab only. All four screens read from the same store, so a move on the board shows up on the jobs table, the proofs list and the dashboard at once. The rail shows **Reset demo** once anything has changed, and each screen that makes a change offers **Undo**.

## Consequences
- Every visitor starts from the same shop week, which keeps the case study, screenshots and tests consistent.
- The workflow rules are plain functions with unit tests (`tests/workflow.test.ts`), so the Firestore version can reuse them in security rules and server actions.
- The store applies changes immediately and synchronously. The Firestore switch must add loading, failure and rollback states (optimistic updates), as noted in 0001.
- If `sessionStorage` is blocked, the demo still works; changes simply don't survive a reload.
