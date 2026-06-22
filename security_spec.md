# ScribeSlide AI - Security Specification

This document outlines the zero-trust data access policies, security invariants, and threat vectors designed to safeguard **ScribeSlide AI** workspaces and presentations in Cloud Firestore.

## 1. Data Invariants

- **Ownership Integrity**: A presentation workspace cannot exist without an explicit `ownerId` that matches the authenticated user ID (`request.auth.uid`).
- **Immutable References**:
  - `ownerId` and `createdAt` of a workspace cannot be modified after creation.
  - `workspaceId` of each slide child document is immutable.
- **Hierarchical Access Control**: Slides are nested sub-resources. Write and read access to any slide document under `/workspaces/{workspaceId}/slides/{slideId}` is strictly gated by verification that the current user owns the parent `/workspaces/{workspaceId}` document.
- **Bounded Inputs**: 
  - Slide contents, slide numbers, IDs, and workspace names have strict string length or numerical boundaries to prevent "Denial of Wallet" and database poisoning attacks.
  - Timestamps (`createdAt`, `updatedAt`) are enforced to match `request.time` exactly rather than client-configured values.

## 2. The "Dirty Dozen" Threat Payloads

The following malicious JSON payloads must always be rejected by the security rules:

1. **Identity Spoofing (Create Workspace with arbitrary owner)**:
   ```json
   { "id": "w1", "name": "Hack", "markdownText": "", "ownerId": "victim_uid", "createdAt": "request.time", "updatedAt": "request.time" }
   ```
2. **Identity Escalation (Update Workspace ownerId)**:
   ```json
   { "id": "w1", "name": "Hack", "markdownText": "", "ownerId": "attacker_uid", "createdAt": "request.time", "updatedAt": "request.time" } // when ownerId was victim_uid
   ```
3. **Temporal Spoofing (Create with custom createdAt)**:
   ```json
   { "id": "w1", "name": "Hack", "markdownText": "", "ownerId": "attacker_uid", "createdAt": "2020-01-01T00:00:00Z", "updatedAt": "request.time" }
   ```
4. **Denial of Wallet Name Poisoning (1MB workspace name)**:
   ```json
   { "id": "w1", "name": "A...<1 million chars>...A", "markdownText": "", "ownerId": "attacker_uid", "createdAt": "request.time", "updatedAt": "request.time" }
   ```
5. **ID Poisoning Attack (Injecting massive/malicious document ID)**:
   Workspace ID: `invalid-char-$$$-or-giant-vector` (exceeding 128 characters or containing illegal symbols).
6. **Orphaned Slide Injection (Create slide with mismatched workspaceId)**:
   Creating a slide at `/workspaces/w1/slides/s1` with `{ "id": "s1", "workspaceId": "w2", ... }`.
7. **Cross-Tenant Slide Injection (Create slide in victim's workspace)**:
   Attacker tries to write slide document inside `/workspaces/victim_w1/slides/s1`.
8. **Slide Number Poisoning (Negative slide index)**:
   `{ "id": "s1", "workspaceId": "w1", "slideNumber": -5, "markdownContent": "Hack" }`
9. **Giant Slide Payload Exhaustion (10MB markdown content)**:
   `{ "id": "s1", "workspaceId": "w1", "slideNumber": 1, "markdownContent": "A...<10 million chars>...A" }`
10. **Audio TTS Injection (Hijacking audioUrl value)**:
    `{ "id": "s1", "workspaceId": "w1", "slideNumber": 1, "markdownContent": "Normal", "audioUrl": "A...<invalid long system URL or shell command>...A" }`
11. **Shadow Keys Update (Attempting to inject metadata like `isAdmin: true` into workspace updates)**:
    `{ "id": "w1", "name": "Hack", "markdownText": "", "ownerId": "attacker_uid", "createdAt": "request.time", "updatedAt": "request.time", "isAdmin": true }`
12. **Blanket Query Scraping (Trying to list all workspaces of all users)**:
    Attacker tries to query `/workspaces` without filtering by ownerId.

---

## 3. Test Runner Draft

```typescript
// firestore.rules.test.ts
// Verifies that all Dirty Dozen payloads fail with PERMISSION_DENIED.
// Tested using the Firebase Security Rules Emulator or integrated unit validation.
```
