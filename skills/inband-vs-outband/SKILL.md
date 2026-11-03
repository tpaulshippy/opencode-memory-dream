---
name: inband-vs-outband
description: Use when deciding what agent learning stays in-session versus moves to async dreaming curation.
---

# In-Band vs Out-of-Band Memory

In-band learning is the agent writing memory while serving you. Dreaming is curation running async, with its own budget. Confuse them and you get slow sessions and rotten memory.

## In-Band Limits

1. **Split-focus optimization problem.** The serving agent optimizes for your answer, not for library science. Memory writes are rushed afterthoughts.
2. **Latency tax.** Every in-band summarize-and-save step delays the response you are waiting for.
3. **Single-session visibility.** Trigger signal: "When you get frustrated your agent keeps making the same mistake over sessions..." (§4) — in-band never sees the pattern; it sees one transcript.
4. **Staleness.** "The intelligence alone is not going to compound because they need this context..." (§0) — in-band appends context but never revisits, dedupes, or expires it.

## Out-of-Band Curation

"Dreaming which is a process that runs in batch and asynchronously. With its own allocated resources..." (§7). Properties:

- **Own budget.** Separate tokens/compute; zero user-facing latency.
- **Fleet visibility.** Reads transcripts across sessions and agents to find repeats.
- **Hygiene mandate.** "multiplying the intelligence" (§0) comes from compounding clean context: merge dupes, correct errors, expire rot, promote durable patterns to skills.

## Workflow

1. **Triage the candidate learning.** Capture it in-band as a raw note (`scratchpad/YYYY-MM-DD-<topic>.md`, ≤10 lines). Do not curate live.
2. **Apply the decision rule below.** Label each note: STAYS-IN-BAND or MOVES-TO-DREAMING.
3. **Batch for dreaming.** Dreaming input contract: "The agent will additionally give you examples of transcripts..." (§7) — bundle raw notes + source transcript excerpts.
4. **Dream async.** Run dedupe/merge/verify/promote with fleet context. Example catch: "Everybody's using too many em dashes..." (§7) becomes one style skill, not fifty notes.
5. **Promote or expire.** Durable → skill or `team/` memory with provenance. Ephemeral → archive. Think: "Think about a school..." (§8) — nightly janitor pass, not live janitor following students.

## Decision Rule

- **STAYS in-band:** session-local facts (file paths, current branch, user prefs stated today), scratch notes, anything needed within this session only.
- **MOVES to dreaming:** repeats across sessions, corrections ("never do X again"), procedural knowledge, style norms, anything 2+ agents should share, anything contradicting existing memory.

Heuristic: if it helps only this answer → in-band. If it prevents next week's repeat — "do the simple thing that works" (§0) and queue it for dreaming.

## Latency Rule of Thumb

- In-band write budget: ≤30s and ≤500 tokens per turn; anything larger degrades the answer.
- Dreaming budget: minutes to hours, full transcripts, cross-session joins — work that would time out live.
- When unsure, capture raw and defer. A queued note is cheap; a blocked response is not.

## Worked Example

- In-band note: "User prefers pnpm over npm in this repo." Stays session-local until confirmed twice.
- Dreaming promotion: third session repeats the pnpm correction → dreaming merges three transcripts into `skills/js-package-manager/SKILL.md` with provenance links.
- Expiry: nodes untouched for 90 days with no fleet hits get archived, not deleted — "Keep thinking, keep learning and keep dreaming." (§9).

## Boundaries

- Do NOT do fleet-wide rewrites in-band; queue them for dreaming with transcript evidence.
- Do NOT run dreaming synchronously inside the serving turn; it needs its own allocation.
- Do NOT promote scratchpad to org scope without the `memory-production-guards` audit.
- Scope note: "This by no means is just specific to coding..." (§9) — same split applies to support, research, and ops agents.

## References

- "Dreaming which is a process that runs in batch and asynchronously. With its own allocated resources..." (§7)
- "When you get frustrated your agent keeps making the same mistake over sessions..." (§4 — why in-band fails)
