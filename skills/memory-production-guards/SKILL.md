---
name: memory-production-guards
description: Use when hardening agent memory for production, multi-agent, or org-wide use against corruption and injection.
---

# Memory Production Guards

Prototype memory is one agent + one dir. Production is concurrent writers, shared reads, and adversaries. Four principles (transcript §7) keep it safe.

## Production Problems (transcript §6)

## Production Problems

1. **Concurrent writes.** Two agents edit the same memory; last-write-wins silently drops one update.
2. **Org-wide corruption.** One bad write propagates to every agent. At org scale this is "pretty disastrous" (§6) — a poisoned deploy note breaks the fleet.
3. **Stale / wrong memory.** Procedures rot; a once-correct endpoint becomes a persistent lie.
4. **Injected memory.** Pasted web content, tickets, or transcripts smuggle instructions into the store.

## Workflow

1. **Inventory writers and readers.** List every agent/job that reads or writes each memory dir. No unknown writers.
2. **Apply the 4 principles below.** Versioning, hashing-CAS, permissioning, portability — in that order.
3. **Run the audit checklist.** Every principle must pass before promoting memory to org scope.
4. **Quarantine on failure.** On any FAIL, demote the memory to scratchpad, fix, re-audit. Never patch org memory in place.
5. **Schedule hygiene.** Pair with dreaming curation (`inband-vs-outband`): dedupe, expire, and verify on a cadence.

## The 4 Principles

### 1. Versioning + provenance

Every memory record carries `{ id, version, author, created_at, updated_at, source, confidence }`. History is append-only; updates bump `version`, never rewrite.

### 2. Hashing / CAS ritual

"When an agent decides that it wants to write an update to a memory, it takes the hash..." (§7). Steps:

1. `read` record + record its `hash`.
2. `draft` the update locally (do not write yet).
3. `re-hash`: re-read the live record, compare hashes.
4. If hash matches → `commit` new version.
5. If hash differs → `abort` + re-draft against the new version (merge, don't overwrite).

### 3. Permission tiers

"You wouldn't want one agent to just decide..." (§7) what the org believes. Enforce (docs-only guidance — see Harness gap below):

- `org/*` — read-only for agents; human-approved writers only.
- `team/*` — read for org, write for team leads + curated jobs.
- `agent-scratchpad/*` — full R/W per agent; promotion requires review.

### 4. Portability API

Memory must export/import as plain files + manifest (`memory.jsonl`) [not from talk — repo format]. Any provider swap preserves `{id, version, content, provenance}`. Test restore monthly [not from talk — repo cadence].

## Boundaries

- Do NOT grant org-write to autonomous agents, demos, or eval harnesses.
- Do NOT skip CAS "because conflicts are rare" — rarity is what makes corruption total.
- Do NOT store credentials or customer PII even with versioning; reference external secrets.
- Escalate incident response beyond this skill; this skill prevents, it does not forensically remediate.

## Audit Checklist

| Principle     | Pass                                          | Fail                              |
|---------------|-----------------------------------------------|-----------------------------------|
| Versioning    | Every record has version + author + source    | Any unversioned/anonymous record  |
| Hashing-CAS   | Write path implements 5-step ritual; conflicts logged | Direct overwrite possible   |
| Permissioning | Writers allowlisted; org/ writes need human review | Agent can write org/ directly |
| Portability   | Export + restore tested <30d [not from talk — repo cadence], zero loss | No tested export path |

All four must be Pass for org scope. One Fail → demote to team or scratchpad.

## Harness gap

Principles 3 (permission tiers) and 4 (portability export/restore) are
docs-only guidance here, NOT enforced by the plugin harness: today no
code stops an agent from writing `org/` directly, and no export/restore
path exists in `src/index.ts`. Treat the audit above as a human-run
checklist until the harness enforces it.

## References

- "When an agent decides that it wants to write an update to a memory, it takes the hash..." (§7 — CAS)
- "You wouldn't want one agent to just decide..." (§7 — permissioning)
